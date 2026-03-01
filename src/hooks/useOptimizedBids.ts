import { useQuery } from '@tanstack/react-query';
import { useSolanaProgram } from './useSolanaProgram';
import { useWallet } from '@solana/wallet-adapter-react';
import { web3, BN } from '@coral-xyz/anchor';
import { retryWithBackoff } from '../utils/rpcRetry';
import type { PublicKey } from '../types/solana';

const { LAMPORTS_PER_SOL } = web3;

export interface BidData {
  job: PublicKey;
  freelancer: PublicKey;
  proposedBudget: BN;
  proposal: string;
  timelineDays: number;
  cvUri: string;
  status: any;
  createdAt: BN;
}

export interface BidWithDetails {
  publicKey: PublicKey;
  account: BidData;
  budgetInSol: number;
  isMyBid: boolean;
  jobTitle?: string;
  clientAddress?: string;
}

/**
 * Fetch bids for a specific job with caching and rate-limit handling
 */
export function useOptimizedJobBids(jobPda: PublicKey | null) {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();

  const {
    data: bids = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['bids', 'job', jobPda?.toBase58()],
    queryFn: async (): Promise<BidWithDetails[]> => {
      if (!program || !jobPda) return [];

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

      const bidsWithDetails = bidsRaw.map((bid: any) => ({
        publicKey: bid.publicKey,
        account: bid.account as BidData,
        budgetInSol: bid.account.proposedBudget.toNumber() / LAMPORTS_PER_SOL,
        isMyBid: publicKey ? bid.account.freelancer.equals(publicKey) : false,
      }));

      return bidsWithDetails;
    },
    enabled: !!program && !!jobPda,
    staleTime: 3 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    bids,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}

/**
 * Fetch bids by freelancer with caching and rate-limit handling
 */
export function useOptimizedFreelancerBids(freelancerPubkey: PublicKey | null) {
  const { program } = useSolanaProgram();

  const {
    data: bids = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['bids', 'freelancer', freelancerPubkey?.toBase58()],
    queryFn: async (): Promise<BidWithDetails[]> => {
      if (!program || !freelancerPubkey) return [];

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
          // Ignore errors, use defaults
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
    },
    enabled: !!program && !!freelancerPubkey,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    bids,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}

/**
 * Helper: Get bid status text
 */
export function getBidStatusText(status: any): string {
  if (typeof status === 'object') {
    const key = Object.keys(status)[0];
    if (key === 'pending') return 'Pending';
    if (key === 'accepted') return 'Accepted';
    if (key === 'rejected') return 'Rejected';
  }
  return 'Unknown';
}

/**
 * Helper: Get bid status color
 */
export function getBidStatusColor(status: any): 'default' | 'primary' | 'success' | 'error' | 'info' | 'warning' {
  if (typeof status === 'object') {
    const key = Object.keys(status)[0];
    if (key === 'pending') return 'warning';
    if (key === 'accepted') return 'success';
    if (key === 'rejected') return 'error';
  }
  return 'default';
}

