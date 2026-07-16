import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { ReactNode } from 'react';
import { isRateLimitError } from '../utils/rpcRetry';

/**
 * Custom retry function that handles rate limiting with exponential backoff
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  // Max 3 retries
  if (failureCount >= 3) return false;

  // Always retry rate limit errors
  if (isRateLimitError(error)) return true;

  // Don't retry other errors after first failure
  return failureCount === 0;
}

/**
 * Calculate retry delay with exponential backoff for rate limits
 */
function getRetryDelay(attemptIndex: number, error: unknown): number {
  // For rate limit errors, use exponential backoff with jitter
  if (isRateLimitError(error)) {
    const baseDelay = 1000;
    const exponentialDelay = baseDelay * Math.pow(2, attemptIndex);
    const jitter = exponentialDelay * 0.3 * Math.random();
    return Math.min(exponentialDelay + jitter, 30000);
  }

  // For other errors, use a short delay
  return 1000;
}

// How long a persisted cache entry is allowed to be restored from storage.
// gcTime must be >= this so entries survive in-memory GC long enough to be
// re-persisted; both are set to 24h.
const PERSIST_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

// Bump this to invalidate ALL persisted caches after a breaking data/shape
// change or a deploy (old caches with a different buster are discarded).
const PERSIST_BUSTER = 'v1';

// Create a client with optimized defaults for Solana RPC
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 3 * 60 * 1000, // Data stays fresh for 3 minutes
      gcTime: PERSIST_MAX_AGE, // Keep in cache long enough to be persisted
      refetchOnWindowFocus: false, // Don't spam RPC on tab focus
      refetchOnMount: false, // Don't refetch if data exists
      refetchOnReconnect: false, // Don't refetch on network reconnect
      retry: shouldRetry,
      retryDelay: getRetryDelay,
      // Stagger refetch intervals to prevent request bursts
      refetchInterval: false,
    },
    mutations: {
      retry: false, // Don't retry mutations (transactions)
    },
  },
});

// Persist the whole query cache to localStorage so on-chain data survives a
// full page reload — no refetch storm on load when the data hasn't changed.
// `storage: undefined` on the server makes the persister a safe no-op (SSR).
const persister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: 'FREELANCECHAIN_RQ_CACHE',
});

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: PERSIST_MAX_AGE,
        buster: PERSIST_BUSTER,
        dehydrateOptions: {
          // Only persist successful queries; never persist errors/pending so a
          // reload doesn't restore a failed RPC state as if it were data.
          shouldDehydrateQuery: (query) =>
            query.state.status === 'success' && query.state.data !== undefined,
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

// Export for use in tests or custom configurations
export { queryClient };
