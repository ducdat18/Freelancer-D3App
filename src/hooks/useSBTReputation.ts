import { useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { web3, BN } from "@coral-xyz/anchor";
import { useSolanaProgram } from "./useSolanaProgram";
import {
  deriveSBTCounterPDA,
  deriveSBTPDA,
  deriveReputationPDA,
} from "../utils/pda";
import type { PublicKey } from "../types/solana";

const { SystemProgram } = web3;

export interface SBTCounterData {
  user: PublicKey;
  count: number;
}

export interface ReputationSBTData {
  user: PublicKey;
  job: PublicKey;
  rater: PublicKey;
  rating: number;
  comment: string;
  jobAmount: BN;
  jobTitle: string;
  metadataUri: string;
  issuedAt: BN;
  sbtIndex: number;
  verificationHash: number[];
  revoked: boolean;
}

export function useSBTReputation() {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();

  const initSBTCounter = useCallback(async () => {
    if (!program || !publicKey) throw new Error("Wallet not connected");

    const [counterPda] = deriveSBTCounterPDA(publicKey);

    // @ts-ignore
    const tx = await program.methods
      .initSbtCounter()
      .accounts({
        sbtCounter: counterPda,
        user: publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc({ skipPreflight: false, commitment: "confirmed" });

    return { signature: tx, counterPda };
  }, [program, publicKey]);

  const mintReputationSBT = useCallback(
    async (
      jobPda: PublicKey,
      revieweePubkey: PublicKey,
      rating: number,
      comment: string,
      jobTitle: string,
      metadataUri: string
    ) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const [counterPda] = deriveSBTCounterPDA(revieweePubkey);
      const [reputationPda] = deriveReputationPDA(revieweePubkey);

      // Fetch current counter to get the next index
      let counter: SBTCounterData;
      try {
        // @ts-ignore
        counter = await program.account.userSbtCounter.fetch(counterPda);
      } catch {
        throw new Error("SBT counter not initialized for this user. Call initSBTCounter first.");
      }

      const [sbtPda] = deriveSBTPDA(revieweePubkey, counter.count);

      const maxRetries = 3;
      let lastError: unknown;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // @ts-ignore
          const tx = await program.methods
            .mintReputationSbt(rating, comment, jobTitle, metadataUri)
            .accounts({
              reputationSbt: sbtPda,
              sbtCounter: counterPda,
              job: jobPda,
              reputation: reputationPda,
              reviewer: publicKey,
              reviewee: revieweePubkey,
              systemProgram: SystemProgram.programId,
            })
            .rpc({ skipPreflight: false, commitment: "confirmed", maxRetries: 3 });

          return { signature: tx, sbtPda };
        } catch (error: any) {
          lastError = error;
          if (error.message?.includes("Blockhash not found") && attempt < maxRetries) {
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }
          throw error;
        }
      }
      throw lastError;
    },
    [program, publicKey]
  );

  const fetchSBTCounter = useCallback(
    async (userPubkey: PublicKey): Promise<SBTCounterData | null> => {
      if (!program) return null;
      try {
        const [counterPda] = deriveSBTCounterPDA(userPubkey);
        // @ts-ignore
        const counter = await program.account.userSbtCounter.fetch(counterPda);
        return counter as SBTCounterData;
      } catch {
        return null;
      }
    },
    [program]
  );

  const fetchSBT = useCallback(
    async (userPubkey: PublicKey, index: number): Promise<ReputationSBTData | null> => {
      if (!program) return null;
      try {
        const [sbtPda] = deriveSBTPDA(userPubkey, index);
        // @ts-ignore
        const sbt = await program.account.reputationSbt.fetch(sbtPda);
        return sbt as ReputationSBTData;
      } catch {
        return null;
      }
    },
    [program]
  );

  const fetchAllUserSBTs = useCallback(
    async (userPubkey: PublicKey): Promise<ReputationSBTData[]> => {
      if (!program) return [];

      const counter = await fetchSBTCounter(userPubkey);
      if (!counter || counter.count === 0) return [];

      const sbts: ReputationSBTData[] = [];
      for (let i = 0; i < counter.count; i++) {
        const sbt = await fetchSBT(userPubkey, i);
        if (sbt && !sbt.revoked) sbts.push(sbt);
      }
      return sbts;
    },
    [program, fetchSBTCounter, fetchSBT]
  );

  const verifySBT = useCallback(
    async (userPubkey: PublicKey, index: number): Promise<boolean> => {
      const sbt = await fetchSBT(userPubkey, index);
      if (!sbt || sbt.revoked) return false;
      // The verification hash exists on-chain and can be cross-checked
      // with the job, rater, rating, and timestamp data
      return sbt.verificationHash.length === 32;
    },
    [fetchSBT]
  );

  return {
    initSBTCounter,
    mintReputationSBT,
    fetchSBTCounter,
    fetchSBT,
    fetchAllUserSBTs,
    verifySBT,
  };
}
