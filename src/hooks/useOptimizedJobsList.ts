import { useQuery } from '@tanstack/react-query';
import { useSolanaProgram } from './useSolanaProgram';
import { web3, BN } from '@coral-xyz/anchor';
import { retryWithBackoff } from '../utils/rpcRetry';
import type { PublicKey } from '../types/solana';

const { LAMPORTS_PER_SOL } = web3;

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

/**
 * Fetch jobs list with caching and rate-limit handling
 */
export function useOptimizedJobsList(statusFilter?: string) {
  const { program } = useSolanaProgram();

  const {
    data: jobs = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['jobs', statusFilter],
    queryFn: async (): Promise<JobWithKey[]> => {
      if (!program) {
        console.log('[Jobs] Program not initialized, skipping fetch');
        return [];
      }

      console.log('[Jobs] Fetching from blockchain...');
      const startTime = Date.now();

      const allJobs = await retryWithBackoff(
        async () => {
          // @ts-ignore
          return await program.account.job.all();
        },
        { maxRetries: 3, baseDelayMs: 1000 }
      );

      const duration = Date.now() - startTime;
      console.log(`[Jobs] Fetched ${allJobs.length} jobs in ${duration}ms`);

      if (statusFilter) {
        const filtered = allJobs.filter((job: any) => {
          const status = job.account.status;
          const statusKey = typeof status === 'object' ? Object.keys(status)[0] : status;
          return statusKey === statusFilter;
        });
        console.log(`[Jobs] Filtered to ${filtered.length} jobs with status: ${statusFilter}`);
        return filtered as JobWithKey[];
      }

      return allJobs as JobWithKey[];
    },
    enabled: !!program,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  return {
    jobs,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}

/**
 * Fetch single job by PDA with caching and rate-limit handling
 */
export function useOptimizedJob(jobPda: PublicKey | null) {
  const { program } = useSolanaProgram();

  const {
    data: job,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['job', jobPda?.toBase58()],
    queryFn: async (): Promise<JobData | null> => {
      if (!program || !jobPda) return null;

      console.log(`[Job] Fetching: ${jobPda.toBase58().slice(0, 8)}...`);

      const jobData = await retryWithBackoff(
        async () => {
          // @ts-ignore
          return await program.account.job.fetch(jobPda);
        },
        { maxRetries: 3, baseDelayMs: 1000 }
      );

      console.log(`[Job] Fetched: ${jobData.title}`);
      return jobData as JobData;
    },
    enabled: !!program && !!jobPda,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    job,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}

/**
 * Get jobs count with rate-limit handling
 */
export function useJobsCount() {
  const { program } = useSolanaProgram();

  const { data: count = 0 } = useQuery({
    queryKey: ['jobs-count'],
    queryFn: async (): Promise<number> => {
      if (!program) return 0;

      try {
        const jobs = await retryWithBackoff(
          async () => {
            // @ts-ignore
            return await program.account.job.all();
          },
          { maxRetries: 2, baseDelayMs: 1000 }
        );
        return jobs.length;
      } catch {
        return 0;
      }
    },
    enabled: !!program,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return count;
}

