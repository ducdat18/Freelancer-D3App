import { useCallback, useState, useEffect, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { web3, BN } from "@coral-xyz/anchor";
import { useSolanaProgram } from "./useSolanaProgram";
import { deriveJobPDA, deriveBidPDA } from "../utils/pda";
import { retryWithBackoff } from "../utils/rpcRetry";
import type { PublicKey } from "../types/solana";

const { SystemProgram, LAMPORTS_PER_SOL } = web3;

// Global cache shared across all components
const jobsCache: {
  data: Array<{ publicKey: PublicKey; account: any }> | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0,
};

const CACHE_DURATION = 30000; // 30 seconds cache

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

export interface UseJobsParams {
  status?: any;
  autoFetch?: boolean;
}

export function useOptimizedJobs(params?: UseJobsParams) {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();

  const [jobs, setJobs] = useState<Array<{ publicKey: PublicKey; account: JobData }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Optimized fetch with caching and rate-limit handling
   */
  const fetchAllJobs = useCallback(async (): Promise<
    Array<{ publicKey: PublicKey; account: JobData }>
  > => {
    if (!program) return [];

    // Check cache first
    const now = Date.now();
    if (jobsCache.data && now - jobsCache.timestamp < CACHE_DURATION) {
      console.log('[Jobs] Using cached data');
      return jobsCache.data;
    }

    try {
      console.log('[Jobs] Fetching fresh data...');

      const allJobs = await retryWithBackoff(
        async () => {
          // @ts-ignore
          return await program.account.job.all();
        },
        { maxRetries: 3, baseDelayMs: 1000 }
      );

      // Update cache
      jobsCache.data = allJobs as Array<{ publicKey: PublicKey; account: JobData }>;
      jobsCache.timestamp = now;

      console.log(`[Jobs] Fetched ${allJobs.length} jobs`);
      return jobsCache.data;
    } catch (error) {
      console.error("[Jobs] Error fetching:", error);
      return jobsCache.data || [];
    }
  }, [program]);

  /**
   * Filtered and memoized jobs
   */
  const filteredJobs = useMemo(() => {
    if (params?.status === undefined) return jobs;

    return jobs.filter(j => {
      const status = j.account.status;
      return typeof status === 'object'
        ? Object.keys(status)[0] === params.status
        : status === params.status;
    });
  }, [jobs, params?.status]);

  /**
   * Load jobs with cache check
   */
  useEffect(() => {
    if (!program || params?.autoFetch === false) return;

    const loadJobs = async () => {
      // Don't show loading if using cache
      const isUsingCache = jobsCache.data && 
        Date.now() - jobsCache.timestamp < CACHE_DURATION;
      
      if (!isUsingCache) {
        setLoading(true);
      }
      
      setError(null);
      
      try {
        const allJobs = await fetchAllJobs();
        setJobs(allJobs);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load jobs";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadJobs();
  }, [program, params?.autoFetch, fetchAllJobs]);

  /**
   * Force refresh (bypass cache)
   */
  const refetch = useCallback(async () => {
    if (!program) return;

    // Clear cache to force fresh data
    jobsCache.data = null;
    jobsCache.timestamp = 0;

    setLoading(true);
    setError(null);
    
    try {
      const allJobs = await fetchAllJobs();
      setJobs(allJobs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refetch");
    } finally {
      setLoading(false);
    }
  }, [program, fetchAllJobs]);

  /**
   * Invalidate cache (for after mutations)
   */
  const invalidateCache = useCallback(() => {
    jobsCache.data = null;
    jobsCache.timestamp = 0;
  }, []);

  return {
    jobs: filteredJobs,
    allJobs: jobs, // Unfiltered
    loading,
    error,
    refetch,
    invalidateCache,
  };
}

