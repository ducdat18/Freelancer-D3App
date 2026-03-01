/**
 * SBT Reputation Query Hook
 *
 * Wraps SBT/reputation fetching with TanStack Query caching.
 * SBTs are on-chain immutable tokens → long staleTime (30min).
 */

import { useQuery } from '@tanstack/react-query';
import { useSolanaProgram } from '../useSolanaProgram';
import { deriveSBTCounterPDA, deriveSBTPDA } from '../../utils/pda';
import { retryWithBackoff } from '../../utils/rpcRetry';
import { queryKeys } from './queryKeys';
import { sbtCacheConfig } from './cacheConfig';
import type { SBTCounterData, ReputationSBTData } from '../useSBTReputation';
import type { PublicKey } from '../../types/solana';

/**
 * Fetch SBT counter for a user.
 */
export function useSBTCounterQuery(userPubkey: PublicKey | null) {
  const { program } = useSolanaProgram();
  const userKey = userPubkey?.toBase58() || '';

  return useQuery({
    queryKey: queryKeys.sbt.counter(userKey),
    queryFn: async (): Promise<SBTCounterData | null> => {
      if (!program || !userPubkey) return null;

      return retryWithBackoff(async () => {
        const [counterPda] = deriveSBTCounterPDA(userPubkey);
        // @ts-ignore
        const counter = await program.account.userSbtCounter.fetch(counterPda);
        return counter as SBTCounterData;
      }, { maxRetries: 3, baseDelayMs: 1000 });
    },
    enabled: !!program && !!userPubkey,
    ...sbtCacheConfig,
  });
}

/**
 * Fetch all SBTs for a user.
 * Depends on counter to know how many SBTs exist.
 */
export function useUserSBTsQuery(userPubkey: PublicKey | null) {
  const { program } = useSolanaProgram();
  const userKey = userPubkey?.toBase58() || '';
  const { data: counter } = useSBTCounterQuery(userPubkey);

  return useQuery({
    queryKey: queryKeys.sbt.user(userKey),
    queryFn: async (): Promise<ReputationSBTData[]> => {
      if (!program || !userPubkey || !counter || counter.count === 0) return [];

      const sbts: ReputationSBTData[] = [];
      for (let i = 0; i < counter.count; i++) {
        try {
          const [sbtPda] = deriveSBTPDA(userPubkey, i);
          // @ts-ignore
          const sbt = await program.account.reputationSbt.fetch(sbtPda);
          const data = sbt as ReputationSBTData;
          if (!data.revoked) sbts.push(data);
        } catch {
          // SBT not found or revoked, skip
        }
      }
      return sbts;
    },
    enabled: !!program && !!userPubkey && !!counter && counter.count > 0,
    ...sbtCacheConfig,
  });
}

/**
 * Fetch a single SBT by user + index.
 */
export function useSBTDetailQuery(userPubkey: PublicKey | null, index: number) {
  const { program } = useSolanaProgram();
  const userKey = userPubkey?.toBase58() || '';

  return useQuery({
    queryKey: queryKeys.sbt.detail(userKey, index),
    queryFn: async (): Promise<ReputationSBTData | null> => {
      if (!program || !userPubkey) return null;

      return retryWithBackoff(async () => {
        const [sbtPda] = deriveSBTPDA(userPubkey, index);
        // @ts-ignore
        const sbt = await program.account.reputationSbt.fetch(sbtPda);
        return sbt as ReputationSBTData;
      }, { maxRetries: 3, baseDelayMs: 1000 });
    },
    enabled: !!program && !!userPubkey && index >= 0,
    ...sbtCacheConfig,
  });
}

/**
 * Verify SBT on-chain (checks existence + verification hash).
 */
export function useSBTVerificationQuery(userPubkey: PublicKey | null, index: number) {
  const { program } = useSolanaProgram();
  const userKey = userPubkey?.toBase58() || '';

  return useQuery({
    queryKey: queryKeys.sbt.verification(userKey, index),
    queryFn: async (): Promise<boolean> => {
      if (!program || !userPubkey) return false;

      try {
        const [sbtPda] = deriveSBTPDA(userPubkey, index);
        // @ts-ignore
        const sbt = await program.account.reputationSbt.fetch(sbtPda);
        const data = sbt as ReputationSBTData;
        return !data.revoked && data.verificationHash.length === 32;
      } catch {
        return false;
      }
    },
    enabled: !!program && !!userPubkey && index >= 0,
    // Verification is immutable, cache for a long time
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
  });
}
