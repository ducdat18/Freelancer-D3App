import { useCallback, useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { web3, BN } from "@coral-xyz/anchor";
import { useSolanaProgram } from "./useSolanaProgram";
import { deriveBidPDA } from "../utils/pda";
import { retryWithBackoff } from "../utils/rpcRetry";
import { logger } from "../utils/logger";
import type { PublicKey } from "../types/solana";

const { LAMPORTS_PER_SOL } = web3;

export interface BidData {
  job: PublicKey;
  freelancer: PublicKey;
  proposedBudget: BN;
  proposal: string;
  timelineDays: number;
  cvUri: string;
  status: any; // BidStatus enum: { pending } | { accepted } | { rejected }
  createdAt: BN;
}

export interface BidWithDetails {
  publicKey: PublicKey;
  account: BidData;
  jobTitle?: string;
  clientAddress?: string;
  budgetInSol: number;
  isMyBid: boolean;
}

export interface UseBidsParams {
  jobPda?: PublicKey; // Filter bids by job
  freelancerPubkey?: PublicKey; // Filter bids by freelancer
  autoFetch?: boolean;
}

export function useBids(params?: UseBidsParams) {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();

  const [bids, setBids] = useState<BidWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch bids for a specific job with rate-limit handling
   */
  const fetchJobBids = useCallback(
    async (jobPda: PublicKey): Promise<BidWithDetails[]> => {
      if (!program) return [];

      try {
        const bidsRaw = await retryWithBackoff(
          async () => {
            // @ts-ignore
            return await program.account.bid.all([
              {
                memcmp: {
                  offset: 8,
                  bytes: jobPda.toBase58(),
                },
              },
            ]);
          },
          { maxRetries: 3, baseDelayMs: 1000 }
        );

        return bidsRaw.map((bid: any) => ({
          publicKey: bid.publicKey,
          account: bid.account as BidData,
          budgetInSol: bid.account.proposedBudget.toNumber() / LAMPORTS_PER_SOL,
          isMyBid: publicKey ? bid.account.freelancer.equals(publicKey) : false,
        }));
      } catch (error) {
        logger.error("[Bids] Error fetching job bids:", error);
        return [];
      }
    },
    [program, publicKey]
  );

  /**
   * Fetch all bids by a freelancer with rate-limit handling
   */
  const fetchFreelancerBids = useCallback(
    async (freelancerPubkey: PublicKey): Promise<BidWithDetails[]> => {
      if (!program) return [];

      try {
        const bidsRaw = await retryWithBackoff(
          async () => {
            // @ts-ignore
            return await program.account.bid.all([
              {
                memcmp: {
                  offset: 8 + 32,
                  bytes: freelancerPubkey.toBase58(),
                },
              },
            ]);
          },
          { maxRetries: 3, baseDelayMs: 1000 }
        );

        // Fetch job details sequentially to avoid rate limits
        const bidsWithDetails: BidWithDetails[] = [];
        for (const bid of bidsRaw) {
          let jobTitle = "Unknown Job";
          let clientAddress = "";

          try {
            const job = await retryWithBackoff(
              // @ts-ignore
              async () => program.account.job.fetch(bid.account.job),
              { maxRetries: 2, baseDelayMs: 500 }
            );
            jobTitle = job.title;
            clientAddress = job.client.toBase58();
          } catch {
            // Ignore - use defaults
          }

          bidsWithDetails.push({
            publicKey: bid.publicKey,
            account: bid.account as BidData,
            jobTitle,
            clientAddress,
            budgetInSol: bid.account.proposedBudget.toNumber() / LAMPORTS_PER_SOL,
            isMyBid: true,
          });
        }

        return bidsWithDetails;
      } catch (error) {
        logger.error("[Bids] Error fetching freelancer bids:", error);
        return [];
      }
    },
    [program]
  );

  /**
   * Fetch all bids with rate-limit handling
   */
  const fetchAllBids = useCallback(async (): Promise<BidWithDetails[]> => {
    if (!program) return [];

    try {
      if (params?.jobPda) {
        return await fetchJobBids(params.jobPda);
      }

      if (params?.freelancerPubkey) {
        return await fetchFreelancerBids(params.freelancerPubkey);
      }

      const allBids = await retryWithBackoff(
        async () => {
          // @ts-ignore
          return await program.account.bid.all();
        },
        { maxRetries: 3, baseDelayMs: 1000 }
      );

      return allBids.map((bid: any) => ({
        publicKey: bid.publicKey,
        account: bid.account as BidData,
        budgetInSol: bid.account.proposedBudget.toNumber() / LAMPORTS_PER_SOL,
        isMyBid: publicKey ? bid.account.freelancer.equals(publicKey) : false,
      }));
    } catch (error) {
      logger.error("[Bids] Error fetching all:", error);
      return [];
    }
  }, [program, params?.jobPda, params?.freelancerPubkey, publicKey, fetchJobBids, fetchFreelancerBids]);

  /**
   * Accept a bid (client only)
   */
  const acceptBid = useCallback(
    async (jobPda: PublicKey, bidPda: PublicKey) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      try {
        // @ts-ignore
        const tx = await program.methods
          .selectBid()
          .accounts({
            job: jobPda,
            bid: bidPda,
            client: publicKey,
          })
          .rpc();

        return { signature: tx };
      } catch (error) {
        logger.error("Error accepting bid:", error);
        throw error;
      }
    },
    [program, publicKey]
  );

  /**
   * Get bid status text
   */
  const getBidStatusText = (status: any): string => {
    if (typeof status === 'object') {
      const key = Object.keys(status)[0];
      if (key === 'pending') return 'Pending';
      if (key === 'accepted') return 'Accepted';
      if (key === 'rejected') return 'Rejected';
    }
    return 'Unknown';
  };

  /**
   * Get bid status color
   */
  const getBidStatusColor = (status: any): 'default' | 'primary' | 'success' | 'error' | 'info' | 'warning' => {
    if (typeof status === 'object') {
      const key = Object.keys(status)[0];
      if (key === 'pending') return 'warning';
      if (key === 'accepted') return 'success';
      if (key === 'rejected') return 'error';
    }
    return 'default';
  };

  /**
   * Auto-fetch on mount if enabled
   */
  useEffect(() => {
    if (!program || params?.autoFetch === false) return;

    const loadBids = async () => {
      setLoading(true);
      setError(null);
      try {
        const allBids = await fetchAllBids();
        setBids(allBids);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load bids";
        setError(message);
        logger.error("Error loading bids:", err);
      } finally {
        setLoading(false);
      }
    };

    loadBids();
  }, [program, params?.autoFetch, params?.jobPda, params?.freelancerPubkey, fetchAllBids]);

  /**
   * Manual refresh
   */
  const refetch = useCallback(async () => {
    if (!program) return;

    setLoading(true);
    setError(null);
    try {
      const allBids = await fetchAllBids();
      setBids(allBids);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to refetch bids";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [program, fetchAllBids]);

  return {
    // State
    bids,
    loading,
    error,

    // Functions
    fetchJobBids,
    fetchFreelancerBids,
    fetchAllBids,
    acceptBid,
    getBidStatusText,
    getBidStatusColor,
    refetch,
  };
}
