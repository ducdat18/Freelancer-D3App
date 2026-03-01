import { useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { web3 } from "@coral-xyz/anchor";
import { useSolanaProgram } from "./useSolanaProgram";
import { deriveReputationPDA, deriveReviewPDA } from "../utils/pda";
import type { PublicKey, BN } from "../types/solana";

const { SystemProgram } = web3;

export interface ReputationData {
  user: PublicKey;
  totalReviews: number;
  averageRating: number;
  completedJobs: number;
  totalEarned: BN;
}

export interface ReviewData {
  job: PublicKey;
  reviewer: PublicKey;
  reviewee: PublicKey;
  rating: number;
  comment: string;
  createdAt: BN;
}

export function useReputation() {
  const { program, wallet } = useSolanaProgram();
  const { publicKey } = useWallet();

  /**
   * Initialize reputation for current user
   */
  const initializeReputation = useCallback(async () => {
    if (!program || !publicKey) throw new Error("Wallet not connected");

    const [reputationPda] = deriveReputationPDA(publicKey);

    console.log('🔄 Initializing reputation account:', reputationPda.toString());

    // @ts-ignore - Program methods type inference issue
    const tx = await program.methods
      .initializeReputation()
      .accounts({
        reputation: reputationPda,
        user: publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc({ commitment: 'confirmed' }); // Wait for confirmation

    console.log('✅ Reputation initialized, tx:', tx);

    return { signature: tx, reputationPda };
  }, [program, publicKey]);

  /**
   * Submit a review/rating
   */
  const submitReview = useCallback(
    async (
      jobPda: PublicKey,
      revieweePubkey: PublicKey,
      rating: number,
      comment: string
    ) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const [reviewPda] = deriveReviewPDA(jobPda, publicKey);
      const [revieweeReputationPda] = deriveReputationPDA(revieweePubkey);

      // @ts-ignore - Program methods type inference issue
      const tx = await program.methods
        .submitReview(rating, comment)
        .accounts({
          review: reviewPda,
          job: jobPda,
          revieweeReputation: revieweeReputationPda,
          reviewer: publicKey,
          reviewee: revieweePubkey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return { signature: tx, reviewPda };
    },
    [program, publicKey]
  );

  /**
   * Fetch reputation for a user
   */
  const fetchReputation = useCallback(
    async (userPubkey: PublicKey): Promise<ReputationData | null> => {
      if (!program) return null;

      const [reputationPda] = deriveReputationPDA(userPubkey);

      try {
        // @ts-ignore - Program account types from IDL
        const reputation = await program.account.reputation.fetch(reputationPda);
        return reputation as ReputationData;
      } catch (error: any) {
        console.error("Error fetching reputation:", error);
        // Throw error for account not existing so caller can handle it
        if (error.message?.includes('Account does not exist') || 
            error.message?.includes('could not find account') ||
            error.toString().includes('AccountNotInitialized')) {
          throw new Error(`Account does not exist or has no data ${reputationPda.toString()}`);
        }
        return null;
      }
    },
    [program]
  );

  /**
   * Fetch reviews for a user
   */
  const fetchUserReviews = useCallback(
    async (userPubkey: PublicKey): Promise<
      Array<{ publicKey: PublicKey; account: ReviewData }>
    > => {
      if (!program) return [];

      try {
        // @ts-ignore - Program account types from IDL
        const reviews = await program.account.review.all([
          {
            memcmp: {
              offset: 8 + 32, // After discriminator + job pubkey
              bytes: userPubkey.toBase58(),
            },
          },
        ]);
        return reviews as Array<{ publicKey: PublicKey; account: ReviewData }>;
      } catch (error) {
        console.error("Error fetching reviews:", error);
        return [];
      }
    },
    [program]
  );

  /**
   * Check if user has initialized reputation
   */
  const hasReputation = useCallback(
    async (userPubkey: PublicKey): Promise<boolean> => {
      if (!program) return false;

      try {
        const [reputationPda] = deriveReputationPDA(userPubkey);
        // @ts-ignore - Program account types from IDL
        await program.account.reputation.fetch(reputationPda);
        return true;
      } catch {
        return false;
      }
    },
    [program]
  );

  return {
    initializeReputation,
    submitReview,
    fetchReputation,
    fetchUserReviews,
    hasReputation,
  };
}
