/**
 * WebSocket-to-Cache Invalidation Bridge
 *
 * Subscribes to Solana WebSocket events and invalidates
 * relevant TanStack Query cache entries when on-chain data changes.
 *
 * Only activates when:
 * 1. Wallet is connected
 * 2. RPC endpoint supports WebSocket (not public devnet)
 */

import { useEffect, useRef, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queries/queryKeys';

interface WebSocketSyncOptions {
  /** Enable/disable the sync. Default: true */
  enabled?: boolean;
  /** Program ID to subscribe to. Falls back to env var. */
  programId?: string;
}

/**
 * Bridge between Solana WebSocket events and TanStack Query cache.
 *
 * Listens for on-chain events and invalidates the relevant cache entries
 * so the UI stays in sync without polling.
 */
export function useWebSocketSync(options: WebSocketSyncOptions = {}) {
  const { enabled = true } = options;
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();
  const subscriptionIdsRef = useRef<number[]>([]);
  const processedSignaturesRef = useRef<Set<string>>(new Set());

  const isWebSocketSupported = useCallback(() => {
    const rpcEndpoint = connection.rpcEndpoint;
    // Public devnet doesn't support reliable WebSocket
    return !rpcEndpoint.includes('api.devnet.solana.com');
  }, [connection]);

  // Subscribe to wallet balance changes
  const subscribeToBalance = useCallback(() => {
    if (!publicKey) return;

    try {
      const id = connection.onAccountChange(
        publicKey,
        () => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.balance.wallet(publicKey.toBase58()),
          });
        },
        'confirmed'
      );
      subscriptionIdsRef.current.push(id);
    } catch (err) {
      console.warn('[WebSocketSync] Failed to subscribe to balance:', err);
    }
  }, [connection, publicKey, queryClient]);

  // Subscribe to program logs for targeted invalidation
  const subscribeToProgramLogs = useCallback(() => {
    const programIdStr =
      options.programId ||
      process.env.NEXT_PUBLIC_PROGRAM_ID ||
      'FStwCj8zLzNkz7gTavooDcqF4FSyDcF9o9SCh96yyP7i';

    try {
      const programId = new PublicKey(programIdStr);

      const id = connection.onLogs(
        programId,
        (logs) => {
          const signature = logs.signature;

          // Deduplicate
          if (processedSignaturesRef.current.has(signature)) return;
          processedSignaturesRef.current.add(signature);

          // Parse log lines for event types and invalidate relevant caches
          for (const log of logs.logs) {
            // Job events
            if (log.includes('JobCreated') || log.includes('JobUpdated')) {
              queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
            }

            // Bid events
            if (log.includes('BidSubmitted') || log.includes('BidAccepted')) {
              queryClient.invalidateQueries({ queryKey: queryKeys.bids.all });
              queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
            }

            // Escrow events
            if (
              log.includes('EscrowDeposited') ||
              log.includes('EscrowReleased') ||
              log.includes('WorkSubmitted')
            ) {
              queryClient.invalidateQueries({ queryKey: queryKeys.escrow.all });
              queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
              if (publicKey) {
                queryClient.invalidateQueries({
                  queryKey: queryKeys.balance.wallet(publicKey.toBase58()),
                });
              }
            }

            // Milestone events
            if (
              log.includes('MilestoneCreated') ||
              log.includes('MilestoneFunded') ||
              log.includes('MilestoneSubmitted') ||
              log.includes('MilestoneApproved')
            ) {
              queryClient.invalidateQueries({ queryKey: queryKeys.milestones.all });
              if (publicKey) {
                queryClient.invalidateQueries({
                  queryKey: queryKeys.balance.wallet(publicKey.toBase58()),
                });
              }
            }

            // SBT events
            if (log.includes('SBTMinted') || log.includes('SBTRevoked')) {
              queryClient.invalidateQueries({ queryKey: queryKeys.sbt.all });
            }

            // Dispute events
            if (
              log.includes('DisputeOpened') ||
              log.includes('DisputeResolved') ||
              log.includes('VoteCast') ||
              log.includes('JurorsSelected') ||
              log.includes('StakeDeposited') ||
              log.includes('RewardClaimed')
            ) {
              queryClient.invalidateQueries({ queryKey: queryKeys.disputes.all });
            }
          }

          // Cleanup old signatures (keep last 100)
          if (processedSignaturesRef.current.size > 100) {
            const arr = Array.from(processedSignaturesRef.current);
            processedSignaturesRef.current = new Set(arr.slice(-50));
          }
        },
        'confirmed'
      );

      subscriptionIdsRef.current.push(id);
      console.log('[WebSocketSync] Subscribed to program logs');
    } catch (err) {
      console.warn('[WebSocketSync] Failed to subscribe to program logs:', err);
    }
  }, [connection, publicKey, queryClient, options.programId]);

  // Subscribe to a specific account for targeted invalidation
  const subscribeToAccount = useCallback(
    (accountPubkey: PublicKey, invalidateKey: readonly unknown[]) => {
      try {
        const id = connection.onAccountChange(
          accountPubkey,
          () => {
            queryClient.invalidateQueries({ queryKey: invalidateKey as any });
          },
          'confirmed'
        );
        subscriptionIdsRef.current.push(id);
        return id;
      } catch (err) {
        console.warn('[WebSocketSync] Failed to subscribe to account:', err);
        return null;
      }
    },
    [connection, queryClient]
  );

  // Initialize subscriptions
  useEffect(() => {
    if (!enabled || !publicKey || !isWebSocketSupported()) {
      return;
    }

    console.log('[WebSocketSync] Initializing WebSocket subscriptions...');

    subscribeToBalance();
    subscribeToProgramLogs();

    return () => {
      console.log('[WebSocketSync] Cleaning up subscriptions...');
      subscriptionIdsRef.current.forEach((id) => {
        try {
          connection.removeAccountChangeListener(id);
        } catch {
          // Subscription may already be removed
        }
      });
      subscriptionIdsRef.current = [];
      processedSignaturesRef.current.clear();
    };
  }, [
    enabled,
    publicKey,
    isWebSocketSupported,
    subscribeToBalance,
    subscribeToProgramLogs,
    connection,
  ]);

  return {
    subscribeToAccount,
    isActive: enabled && !!publicKey && isWebSocketSupported(),
  };
}
