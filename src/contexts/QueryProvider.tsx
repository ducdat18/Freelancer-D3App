import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

// Create a client with optimized defaults for Solana RPC
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 3 * 60 * 1000, // Data stays fresh for 3 minutes
      gcTime: 10 * 60 * 1000, // Keep unused data in cache for 10 minutes
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

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// Export for use in tests or custom configurations
export { queryClient };

