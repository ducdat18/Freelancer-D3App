import { useEffect, useRef, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useNotificationContext } from '../contexts/NotificationContext';
import { NotificationType } from '../types';

/**
 * Real-time notifications using Solana WebSocket subscriptions
 * Monitors on-chain events and shows instant notifications
 */
export function useRealtimeNotifications() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { addNotification } = useNotificationContext();
  const subscriptionIdsRef = useRef<number[]>([]);
  const processedSignaturesRef = useRef<Set<string>>(new Set());

  // Subscribe to account changes
  const subscribeToAccount = useCallback(
    async (accountPubkey: PublicKey, accountType: string) => {
      if (!connection) return;

      try {
        const subscriptionId = connection.onAccountChange(
          accountPubkey,
          (accountInfo, context) => {
            console.log(`[Real-time] ${accountType} account changed:`, {
              slot: context.slot,
              lamports: accountInfo.lamports
            });

            // Parse account data and trigger notifications
            // Note: You need to deserialize the account data based on your program's IDL
            try {
              // Example: Job account changed
              if (accountType === 'job') {
                addNotification(
                  NotificationType.JOB_STARTED,
                  'Job Updated',
                  'A job you\'re watching has been updated',
                  `/jobs/${accountPubkey.toBase58()}`
                );
              }
            } catch (err) {
              console.error('Error parsing account data:', err);
            }
          },
          'confirmed'
        );

        subscriptionIdsRef.current.push(subscriptionId);
        console.log(`[Real-time] Subscribed to ${accountType}:`, accountPubkey.toBase58());
      } catch (err) {
        console.error(`Error subscribing to ${accountType}:`, err);
      }
    },
    [connection, addNotification]
  );

  // Subscribe to program logs (events)
  const subscribeToProgramLogs = useCallback(() => {
    if (!connection || !publicKey) return;

    try {
      // Check if WebSocket is supported by testing the RPC endpoint
      const rpcEndpoint = connection.rpcEndpoint;
      const isPublicDevnet = rpcEndpoint.includes('api.devnet.solana.com');
      
      if (isPublicDevnet) {
        console.warn('[Real-time] ⚠️ Public devnet endpoint does not support reliable WebSocket connections.');
        console.warn('[Real-time] Please use a custom RPC provider (Helius, QuickNode, or local validator)');
        console.warn('[Real-time] Set NEXT_PUBLIC_SOLANA_RPC_URL in your .env.local file');
        return;
      }

      // Replace with your program ID
      const programId = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID || 'FStwCj8zLzNkz7gTavooDcqF4FSyDcF9o9SCh96yyP7i');

      console.log('[Real-time] Subscribing to program logs...');
      const subscriptionId = connection.onLogs(
        programId,
        (logs, context) => {
          console.log('[Real-time] Program logs:', logs);

          const signature = logs.signature;

          // Avoid processing same signature multiple times
          if (processedSignaturesRef.current.has(signature)) {
            return;
          }
          processedSignaturesRef.current.add(signature);

          // Parse logs for events
          logs.logs.forEach(log => {
            // BidSubmitted event
            if (log.includes('BidSubmitted')) {
              addNotification(
                NotificationType.PROPOSAL_RECEIVED,
                'New Bid!',
                'Someone submitted a bid on your job',
                undefined,
                signature
              );
            }

            // BidAccepted event
            if (log.includes('BidAccepted')) {
              addNotification(
                NotificationType.PROPOSAL_ACCEPTED,
                'Bid Accepted!',
                'Your bid has been accepted',
                undefined,
                signature
              );
            }

            // WorkSubmitted event
            if (log.includes('WorkSubmitted')) {
              addNotification(
                NotificationType.JOB_COMPLETED,
                'Work Submitted',
                'Freelancer submitted work for review',
                undefined,
                signature
              );
            }

            // EscrowReleased event
            if (log.includes('EscrowReleased')) {
              addNotification(
                NotificationType.PAYMENT_RECEIVED,
                'Payment Released!',
                'Payment has been released from escrow',
                undefined,
                signature
              );
            }

            // ReviewSubmitted event
            if (log.includes('ReviewSubmitted')) {
              addNotification(
                NotificationType.RATING_RECEIVED,
                'New Review',
                'You received a new review',
                undefined,
                signature
              );
            }

            // DisputeOpened event
            if (log.includes('DisputeOpened')) {
              addNotification(
                NotificationType.DISPUTE_RAISED,
                'Dispute Opened',
                'A dispute has been opened',
                '/disputes',
                signature
              );
            }
          });

          // Clean up old signatures (keep last 100)
          if (processedSignaturesRef.current.size > 100) {
            const signaturesArray = Array.from(processedSignaturesRef.current);
            processedSignaturesRef.current = new Set(signaturesArray.slice(-50));
          }
        },
        'confirmed'
      );

      subscriptionIdsRef.current.push(subscriptionId);
      console.log('[Real-time] ✅ Successfully subscribed to program logs');
    } catch (err) {
      console.error('[Real-time] ❌ Error subscribing to program logs:', err);
      if (err instanceof Error) {
        console.error('[Real-time] Error details:', err.message);
      }
    }
  }, [connection, publicKey, addNotification]);

  // Subscribe to signature status (for transaction confirmations)
  const subscribeToSignature = useCallback(
    (signature: string, message: string) => {
      if (!connection) return;

      try {
        const subscriptionId = connection.onSignature(
          signature,
          (result, context) => {
            console.log('[Real-time] Signature confirmed:', signature);

            if (result.err) {
              addNotification(
                NotificationType.DISPUTE_RAISED,
                'Transaction Failed',
                `Transaction failed: ${result.err}`,
                undefined,
                signature
              );
            } else {
              addNotification(
                NotificationType.JOB_CREATED,
                'Transaction Confirmed',
                message,
                undefined,
                signature
              );
            }
          },
          'confirmed'
        );

        subscriptionIdsRef.current.push(subscriptionId);
        console.log('[Real-time] Subscribed to signature:', signature);
      } catch (err) {
        console.error('Error subscribing to signature:', err);
      }
    },
    [connection, addNotification]
  );

  // Initialize real-time subscriptions
  useEffect(() => {
    if (!connection || !publicKey) return;

    console.log('[Real-time] Initializing real-time notifications...');

    // Subscribe to program logs
    subscribeToProgramLogs();

    // Cleanup function
    return () => {
      console.log('[Real-time] Cleaning up subscriptions...');
      subscriptionIdsRef.current.forEach(id => {
        try {
          connection.removeAccountChangeListener(id);
        } catch (err) {
          // Subscription might already be removed
        }
      });
      subscriptionIdsRef.current = [];
    };
  }, [connection, publicKey, subscribeToProgramLogs]);

  return {
    subscribeToAccount,
    subscribeToSignature,
  };
}
