/**
 * Optimized Jobs Query using React Query
 * Automatic caching, deduplication, and background updates
 * With rate-limit handling via exponential backoff
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@solana/wallet-adapter-react';
import { web3, BN } from '@coral-xyz/anchor';
import { useSolanaProgram } from '../useSolanaProgram';
import { deriveJobPDA, deriveBidPDA } from '../../utils/pda';
import { retryWithBackoff, isRateLimitError } from '../../utils/rpcRetry';
import type { PublicKey } from '../../types/solana';

const { SystemProgram, LAMPORTS_PER_SOL } = web3;

export interface JobData {
  client: PublicKey;
  title: string;
  description: string;
  budget: BN;
  metadataUri: string;
  status: any;
  selectedFreelancer: PublicKey | null;
  createdAt: BN;
  updatedAt: BN;
  bidCount: number;
  escrowAmount: BN;
}

export interface JobWithKey {
  publicKey: PublicKey;
  account: JobData;
}

import { queryKeys } from './queryKeys';
import { jobListCacheConfig, jobDetailCacheConfig } from './cacheConfig';

/**
 * @deprecated Use queryKeys.jobs from './queryKeys' instead.
 */
export const jobKeys = queryKeys.jobs;

/**
 * Core fetch function - shared by all job queries
 */
async function fetchAllJobsFromChain(program: any): Promise<JobWithKey[]> {
  if (!program) return [];

  try {
    const jobs = await retryWithBackoff(
      // @ts-ignore
      async () => program.account.job.all(),
      { maxRetries: 3, baseDelayMs: 1000 }
    );
    return jobs as JobWithKey[];
  } catch (firstError) {
    // Fallback: manual decode from raw program accounts
    try {
      const allAccounts = await retryWithBackoff(
        async () => program.provider.connection.getProgramAccounts(program.programId),
        { maxRetries: 3, baseDelayMs: 1000 }
      );

      const validJobs: JobWithKey[] = [];
      for (const { pubkey, account } of allAccounts) {
        try {
          const decoded = program.coder.accounts.decode('job', account.data);
          validJobs.push({ publicKey: pubkey, account: decoded as JobData });
        } catch {
          continue;
        }
      }
      return validJobs;
    } catch {
      return [];
    }
  }
}

/**
 * Fetch all jobs (no filter) - replaces useJobs.fetchAllJobs
 */
export function useAllJobsQuery() {
  const { program } = useSolanaProgram();

  return useQuery({
    queryKey: queryKeys.jobs.list('all'),
    queryFn: () => fetchAllJobsFromChain(program),
    enabled: !!program,
    ...jobListCacheConfig,
  });
}

/**
 * Fetch jobs with optional status filter
 */
export function useJobsQuery(status?: string) {
  const { program } = useSolanaProgram();

  return useQuery({
    queryKey: queryKeys.jobs.list(status || 'all'),
    queryFn: async (): Promise<JobWithKey[]> => {
      const allJobs = await fetchAllJobsFromChain(program);

      if (!status) return allJobs;

      return allJobs.filter((j) => {
        const jobStatus = j.account.status;
        const statusKey = typeof jobStatus === 'object'
          ? Object.keys(jobStatus)[0]
          : jobStatus;
        return statusKey === status;
      });
    },
    enabled: !!program,
    ...jobListCacheConfig,
  });
}

/**
 * Fetch jobs posted by a specific client
 */
export function useMyJobsQuery(clientPubkey: PublicKey | null) {
  const { program } = useSolanaProgram();

  return useQuery({
    queryKey: [...queryKeys.jobs.lists(), 'my', clientPubkey?.toBase58() || ''],
    queryFn: async (): Promise<JobWithKey[]> => {
      if (!clientPubkey) return [];
      const allJobs = await fetchAllJobsFromChain(program);
      return allJobs.filter(
        (j) => j.account.client.toBase58() === clientPubkey.toBase58()
      );
    },
    enabled: !!program && !!clientPubkey,
    ...jobListCacheConfig,
  });
}

/**
 * Fetch single job with caching and rate-limit handling
 */
export function useJobQuery(jobPda: PublicKey | null) {
  const { program } = useSolanaProgram();

  return useQuery({
    queryKey: queryKeys.jobs.detail(jobPda?.toBase58() || ''),
    queryFn: async (): Promise<JobData | null> => {
      if (!program || !jobPda) return null;

      return retryWithBackoff(
        async () => {
          // @ts-ignore
          const job = await program.account.job.fetch(jobPda);
          return job as JobData;
        },
        { maxRetries: 3, baseDelayMs: 1000 }
      );
    },
    enabled: !!program && !!jobPda,
    ...jobDetailCacheConfig,
  });
}

/**
 * Create job mutation with automatic cache update
 */
export function useCreateJobMutation() {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      description,
      budgetSol,
      metadataUri,
    }: {
      title: string;
      description: string;
      budgetSol: string;
      metadataUri: string;
    }) => {
      if (!program || !publicKey) throw new Error('Wallet not connected');

      const jobId = Date.now();
      const [jobPda] = deriveJobPDA(publicKey, jobId);
      const budgetLamports = parseFloat(budgetSol) * LAMPORTS_PER_SOL;
      const budget = new BN(budgetLamports);

      const tx = await program.methods
        .createJob(new BN(jobId), title, description, budget, metadataUri, null)
        .accounts({
          job: jobPda,
          client: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return { signature: tx, jobPda };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.lists() });
    },
  });
}

/**
 * Submit bid mutation
 */
export function useSubmitBidMutation() {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      jobPda,
      proposedBudgetSol,
      proposal,
      timelineDays,
      cvUri,
    }: {
      jobPda: PublicKey;
      proposedBudgetSol: number;
      proposal: string;
      timelineDays: number;
      cvUri?: string;
    }) => {
      if (!program || !publicKey) throw new Error('Wallet not connected');

      const [bidPda] = deriveBidPDA(jobPda, publicKey);
      const proposedBudget = new BN(proposedBudgetSol * LAMPORTS_PER_SOL);

      const tx = await program.methods
        .submitBid(proposedBudget, proposal, timelineDays, cvUri || null)
        .accounts({
          bid: bidPda,
          job: jobPda,
          freelancer: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return { signature: tx, bidPda };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bids.byJob(variables.jobPda.toBase58()) });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(variables.jobPda.toBase58()) });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.lists() });
    },
  });
}

/**
 * Select bid mutation (client accepts a bid)
 */
export function useSelectBidMutation() {
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
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(variables.jobPda.toBase58()) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bids.byJob(variables.jobPda.toBase58()) });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.lists() });
    },
  });
}

/**
 * Complete job mutation
 */
export function useCompleteJobMutation() {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      jobPda,
      escrowPda,
      freelancerPubkey,
    }: {
      jobPda: PublicKey;
      escrowPda: PublicKey;
      freelancerPubkey: PublicKey;
    }) => {
      if (!program || !publicKey) throw new Error('Wallet not connected');

      const tx = await program.methods
        .completeJob()
        .accounts({
          escrow: escrowPda,
          job: jobPda,
          freelancer: freelancerPubkey,
          client: publicKey,
        })
        .rpc();

      return { signature: tx };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.escrow.detail(variables.jobPda.toBase58()) });
      queryClient.invalidateQueries({ queryKey: queryKeys.balance.all });
    },
  });
}

/**
 * Cancel job mutation
 */
export function useCancelJobMutation() {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobPda, escrowPda }: { jobPda: PublicKey; escrowPda?: PublicKey }) => {
      if (!program || !publicKey) throw new Error('Wallet not connected');

      const accounts: any = {
        job: jobPda,
        client: publicKey,
      };
      if (escrowPda) accounts.escrow = escrowPda;

      const tx = await program.methods
        .cancelJob()
        .accounts(accounts)
        .rpc();

      return { signature: tx };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
    },
  });
}

/**
 * Helper to invalidate job cache after mutations
 */
export function useInvalidateJobs() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all }),
    invalidateList: (status?: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.list(status || 'all') }),
    invalidateJob: (jobId: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) }),
  };
}
