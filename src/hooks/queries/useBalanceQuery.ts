/**
 * Balance Query Hook
 *
 * Replaces manual balance polling with TanStack Query.
 * Auto-refetches every 15s for near-realtime balance updates.
 */

import { useQuery } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { queryKeys } from './queryKeys';
import { balanceCacheConfig } from './cacheConfig';
import { retryWithBackoff } from '../../utils/rpcRetry';

/**
 * Fetch wallet SOL balance with automatic caching and polling.
 *
 * @returns balance in lamports, balanceInSol, loading state, refetch fn
 */
export function useBalanceQuery() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const address = publicKey?.toBase58() || '';

  const query = useQuery({
    queryKey: queryKeys.balance.wallet(address),
    queryFn: async () => {
      if (!publicKey) return 0;

      return retryWithBackoff(
        () => connection.getBalance(publicKey),
        { maxRetries: 3, baseDelayMs: 500 }
      );
    },
    enabled: !!publicKey,
    ...balanceCacheConfig,
  });

  return {
    balance: query.data ?? 0,
    balanceInSol: (query.data ?? 0) / LAMPORTS_PER_SOL,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
