import { useQuery } from '@tanstack/react-query';
import { useSolanaProgram } from '../useSolanaProgram';
import { retryWithBackoff } from '../../utils/rpcRetry';
import { queryKeys } from './queryKeys';

export interface FreelancerSummary {
  address: string;
  averageRating: number;
  totalReviews: number;
  completedJobs: number;
  score: number;
}

const FREELANCERS_CACHE_CONFIG = {
  staleTime: 5 * 60 * 1000,
  gcTime: 15 * 60 * 1000,
  refetchOnWindowFocus: false,
};

export function useTopFreelancersQuery(limit: number = 6) {
  const { program } = useSolanaProgram();

  return useQuery({
    queryKey: queryKeys.freelancers.top(limit),
    queryFn: async (): Promise<FreelancerSummary[]> => {
      if (!program) return [];

      const reputationAccounts = await retryWithBackoff(
        async () => {
          // @ts-ignore
          return await program.account.reputation.all();
        },
        { maxRetries: 3, baseDelayMs: 1000 }
      );

      const freelancers: FreelancerSummary[] = reputationAccounts
        .map((account: any) => {
          const avg = account.account.averageRating || 0;
          const completed = account.account.completedJobs || 0;
          return {
            address: account.account.user.toBase58(),
            averageRating: avg,
            totalReviews: account.account.totalReviews || 0,
            completedJobs: completed,
            score: avg * Math.log2(completed + 1),
          };
        })
        .filter((f: FreelancerSummary) => f.totalReviews > 0)
        .sort((a: FreelancerSummary, b: FreelancerSummary) => b.score - a.score)
        .slice(0, limit);

      return freelancers;
    },
    enabled: !!program,
    ...FREELANCERS_CACHE_CONFIG,
  });
}
