/**
 * Optimistic Updates Helper
 *
 * Shared utilities for the optimistic update pattern:
 * 1. Snapshot previous data
 * 2. Apply optimistic update immediately
 * 3. On error → rollback to snapshot
 * 4. On settled → invalidate queries for fresh data
 */

import { useMutation, useQueryClient, type QueryKey, type UseMutationOptions } from '@tanstack/react-query';

interface OptimisticMutationConfig<TData, TVariables, TContext = unknown> {
  /** The mutation function (e.g., send a Solana transaction) */
  mutationFn: (variables: TVariables) => Promise<TData>;
  /** Query keys to invalidate on success/settle */
  invalidateKeys: QueryKey[];
  /** Optional: query key + updater for optimistic update */
  optimisticUpdate?: {
    queryKey: QueryKey;
    updater: (oldData: any, variables: TVariables) => any;
  };
  /** Optional callbacks */
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables, context: TContext | undefined) => void;
}

/**
 * Creates a mutation with optimistic update support.
 *
 * Usage:
 * ```ts
 * const mutation = useOptimisticMutation({
 *   mutationFn: async (vars) => program.methods.depositEscrow(...).rpc(),
 *   invalidateKeys: [queryKeys.escrow.detail(jobPubkey)],
 *   optimisticUpdate: {
 *     queryKey: queryKeys.escrow.detail(jobPubkey),
 *     updater: (old, vars) => ({ ...old, locked: true, amount: vars.amount }),
 *   },
 * });
 * ```
 */
export function useOptimisticMutation<TData, TVariables>(
  config: OptimisticMutationConfig<TData, TVariables, { previousData?: any }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: config.mutationFn,

    onMutate: async (variables: TVariables) => {
      if (!config.optimisticUpdate) return { previousData: undefined };

      const { queryKey, updater } = config.optimisticUpdate;

      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous data
      const previousData = queryClient.getQueryData(queryKey);

      // Apply optimistic update
      queryClient.setQueryData(queryKey, (old: any) => updater(old, variables));

      return { previousData };
    },

    onError: (_error, variables, context) => {
      // Rollback on error
      if (config.optimisticUpdate && context?.previousData !== undefined) {
        queryClient.setQueryData(
          config.optimisticUpdate.queryKey,
          context.previousData
        );
      }
      config.onError?.(_error as Error, variables, context as { previousData?: any } | undefined);
    },

    onSuccess: (data, variables) => {
      config.onSuccess?.(data, variables);
    },

    onSettled: () => {
      // Always invalidate to ensure consistency with on-chain state
      config.invalidateKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });
}

/**
 * Helper to batch-invalidate multiple query keys at once.
 * Useful after a transaction that affects multiple domains.
 */
export function useInvalidateQueries() {
  const queryClient = useQueryClient();

  return (...keys: QueryKey[]) => {
    keys.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: key });
    });
  };
}

/**
 * Helper to prefetch data before navigation.
 * Warms the cache so the next page loads instantly.
 */
export function usePrefetch() {
  const queryClient = useQueryClient();

  return <T>(queryKey: QueryKey, queryFn: () => Promise<T>, staleTime?: number) => {
    queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: staleTime ?? 60_000,
    });
  };
}
