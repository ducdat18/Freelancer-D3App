/**
 * Optimized Bids Query using React Query
 * With rate-limit handling via exponential backoff
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@solana/wallet-adapter-react';
import { web3 } from '@coral-xyz/anchor';
import { useSolanaProgram } from '../useSolanaProgram';
import { retryWithBackoff } from '../../utils/rpcRetry';
import { queryKeys } from './queryKeys';
import { bidsCacheConfig } from './cacheConfig';
import type { PublicKey } from '../../types/solana';

const { LAMPORTS_PER_SOL } = web3;

export interface BidData {
  job: PublicKey;
  freelancer: PublicKey;
  proposedBudget: any;
  proposal: string;
  timelineDays: number;
  cvUri: string;
  status: any;
  createdAt: any;
}

export interface BidWithKey {
  publicKey: PublicKey;
  account: BidData;
}

export interface BidWithDetails extends BidWithKey {
  jobTitle?: string;
  clientAddress?: string;
  budgetInSol: number;
  isMyBid: boolean;
}

/**
 * @deprecated Use queryKeys.bids from './queryKeys' instead.
 */
export const bidKeys = queryKeys.bids;

/**
 * Fetch bids for a specific job with rate-limit handling
 */
export function useJobBidsQuery(jobPda: PublicKey | null) {
  const { program } = useSolanaProgram();

  return useQuery({
    queryKey: queryKeys.bids.byJob(jobPda?.toBase58() || ''),
    queryFn: async (): Promise<BidWithKey[]> => {
      if (!program || !jobPda) return [];

      return retryWithBackoff(
        async () => {
          // @ts-ignore
          const bids = await program.account.bid.all([
            {
              memcmp: {
                offset: 8,
                bytes: jobPda.toBase58(),
              },
            },
          ]);
          return bids as BidWithKey[];
        },
        { maxRetries: 3, baseDelayMs: 1000 }
      );
    },
    enabled: !!program && !!jobPda,
    ...bidsCacheConfig,
  });
}

/**
 * Fetch bids by freelancer with rate-limit handling
 */
export function useFreelancerBidsQuery(freelancerPubkey: PublicKey | null) {
  const { program } = useSolanaProgram();

  return useQuery({
    queryKey: queryKeys.bids.byFreelancer(freelancerPubkey?.toBase58() || ''),
    queryFn: async (): Promise<BidWithKey[]> => {
      if (!program || !freelancerPubkey) return [];

      return retryWithBackoff(
        async () => {
          // @ts-ignore
          const bids = await program.account.bid.all([
            {
              memcmp: {
                offset: 8 + 32,
                bytes: freelancerPubkey.toBase58(),
              },
            },
          ]);
          return bids as BidWithKey[];
        },
        { maxRetries: 3, baseDelayMs: 1000 }
      );
    },
    enabled: !!program && !!freelancerPubkey,
    ...bidsCacheConfig,
  });
}

/**
 * Fetch freelancer bids WITH job details (parallelized)
 * Replaces the sequential fetch pattern in useOptimizedBids
 */
export function useFreelancerBidsWithDetailsQuery(freelancerPubkey: PublicKey | null) {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();

  return useQuery({
    queryKey: [...queryKeys.bids.byFreelancer(freelancerPubkey?.toBase58() || ''), 'details'],
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

      // Fetch all job details in parallel (with concurrency limiting via Promise.allSettled)
      const jobFetchPromises = bidsRaw.map((bid: any) =>
        retryWithBackoff(
          // @ts-ignore
          async () => program.account.job.fetch(bid.account.job),
          { maxRetries: 2, baseDelayMs: 500 }
        ).catch(() => null)
      );

      const jobResults = await Promise.allSettled(jobFetchPromises);

      return bidsRaw.map((bid: any, index: number) => {
        const jobResult = jobResults[index];
        const job = jobResult.status === 'fulfilled' ? jobResult.value : null;

        return {
          publicKey: bid.publicKey,
          account: bid.account as BidData,
          jobTitle: job?.title || 'Unknown Job',
          clientAddress: job?.client?.toBase58() || '',
          budgetInSol: bid.account.proposedBudget.toNumber() / LAMPORTS_PER_SOL,
          isMyBid: publicKey ? bid.account.freelancer.equals(publicKey) : false,
        };
      });
    },
    enabled: !!program && !!freelancerPubkey,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Accept bid mutation (client selects a winning bid)
 */
export function useAcceptBidMutation() {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobPda, bidPda }: { jobPda: PublicKey; bidPda: PublicKey }) => {
      if (!program || !publicKey) throw new Error('Wallet not connected');

      const tx = await program.methods
        .selectBid()
        .accounts({
          job: jobPda,
          bid: bidPda,
          client: publicKey,
        })
        .rpc();

      return { signature: tx };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bids.byJob(variables.jobPda.toBase58()) });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(variables.jobPda.toBase58()) });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.lists() });
    },
  });
}

/**
 * Helper to invalidate bids cache
 */
export function useInvalidateBids() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: queryKeys.bids.all }),
    invalidateJobBids: (jobId: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.bids.byJob(jobId) }),
    invalidateFreelancerBids: (freelancerId: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.bids.byFreelancer(freelancerId) }),
  };
}

/**
 * Pure utility functions for bid status display
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

export function getBidStatusColor(status: any): 'default' | 'primary' | 'success' | 'error' | 'info' | 'warning' {
  if (typeof status === 'object') {
    const key = Object.keys(status)[0];
    if (key === 'pending') return 'warning';
    if (key === 'accepted') return 'success';
    if (key === 'rejected') return 'error';
  }
  return 'default';
}
