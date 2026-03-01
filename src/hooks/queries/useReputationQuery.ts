/**
 * Optimized Reputation Query using React Query
 * With rate-limit handling via exponential backoff
 */

import { useQuery } from '@tanstack/react-query';
import { useSolanaProgram } from '../useSolanaProgram';
import { deriveReputationPDA } from '../../utils/pda';
import { retryWithBackoff, isRateLimitError } from '../../utils/rpcRetry';
import type { PublicKey } from '../../types/solana';

export interface ReputationData {
  user: PublicKey;
  totalReviews: number;
  averageRating: number;
  completedJobs: number;
  totalEarned: any;
}

// Query Keys
export const reputationKeys = {
  all: ['reputation'] as const,
  detail: (userId: string) => [...reputationKeys.all, userId] as const,
};

/**
 * Fetch user reputation with caching and rate-limit handling
 */
export function useReputationQuery(userPubkey: PublicKey | null) {
  const { program } = useSolanaProgram();

  return useQuery({
    queryKey: reputationKeys.detail(userPubkey?.toBase58() || ''),
    queryFn: async (): Promise<ReputationData | null> => {
      if (!program || !userPubkey) return null;

      try {
        return await retryWithBackoff(
          async () => {
            const [reputationPda] = deriveReputationPDA(userPubkey);
            // @ts-ignore
            const reputation = await program.account.reputation.fetch(reputationPda);
            return reputation as ReputationData;
          },
          { maxRetries: 3, baseDelayMs: 1000 }
        );
      } catch (error) {
        // Only log if it's not a rate limit error (those are handled by retry)
        if (!isRateLimitError(error)) {
          // No reputation account found
        }
        return null;
      }
    },
    enabled: !!program && !!userPubkey,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Check if user has reputation initialized
 */
export function useHasReputationQuery(userPubkey: PublicKey | null) {
  const { data: reputation, isLoading } = useReputationQuery(userPubkey);

  return {
    hasReputation: reputation !== null,
    isLoading,
  };
}

