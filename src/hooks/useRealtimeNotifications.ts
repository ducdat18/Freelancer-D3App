import { useEffect, useRef, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useNotificationContext } from '../contexts/NotificationContext';
import { NotificationType } from '../types';

/**
 * Real-time notifications via two channels:
 * 1. SSE (/api/notifications/stream) — instant chat + app events, always works
 * 2. Solana WebSocket — on-chain events (only with premium RPC)
 */
export function useRealtimeNotifications() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { addNotification } = useNotificationContext();
  const subscriptionIdsRef = useRef<number[]>([]);
  const processedSignaturesRef = useRef<Set<string>>(new Set());
  const eventSourceRef = useRef<EventSource | null>(null);

  // ─── SSE channel ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!publicKey) return;

    const wallet = publicKey.toBase58();
    const url = `/api/notifications/stream?wallet=${wallet}`;

    let es: EventSource;
    let retryTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      es = new EventSource(url);
      eventSourceRef.current = es;

      es.addEventListener('new_message', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          const shortSender = `${(data.sender as string).slice(0, 6)}...`;
          addNotification(
            NotificationType.PROPOSAL_RECEIVED,
            `New message from ${shortSender}`,
            data.content,
            '/messages'
          );
        } catch { /* ignore parse errors */ }
      });

      es.addEventListener('new_bid', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          addNotification(
            NotificationType.PROPOSAL_RECEIVED,
            'New Bid Received!',
            `Someone bid on your job: ${data.jobTitle ?? ''}`,
            data.jobLink
          );
        } catch { /* ignore */ }
      });

      es.addEventListener('bid_accepted', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          addNotification(
            NotificationType.PROPOSAL_ACCEPTED,
            'Bid Accepted!',
            `Your bid on "${data.jobTitle ?? 'a job'}" was accepted`,
            data.jobLink
          );
        } catch { /* ignore */ }
      });

      es.addEventListener('milestone_submitted', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          addNotification(
            NotificationType.JOB_COMPLETED,
            'Milestone Submitted',
            `Freelancer submitted work for milestone: ${data.milestoneTitle ?? ''}`,
            data.jobLink
          );
        } catch { /* ignore */ }
      });

      es.addEventListener('payment_released', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          addNotification(
            NotificationType.PAYMENT_RECEIVED,
            'Payment Released!',
            `${data.amountSol ?? ''} SOL released from escrow`,
            data.jobLink
          );
        } catch { /* ignore */ }
      });

      es.onerror = () => {
        es.close();
        // Reconnect after 5s on error
        retryTimeout = setTimeout(connect, 5_000);
      };
    };

    connect();

    return () => {
      clearTimeout(retryTimeout);
      es?.close();
      eventSourceRef.current = null;
    };
  }, [publicKey, addNotification]);

  // ─── Solana WebSocket channel (premium RPC only) ─────────────────────────

  const subscribeToAccount = useCallback(
    async (accountPubkey: PublicKey, accountType: string) => {
      if (!connection) return;
      try {
        const subscriptionId = connection.onAccountChange(
          accountPubkey,
          (_accountInfo, context) => {
            console.log(`[Real-time] ${accountType} account changed at slot ${context.slot}`);
            if (accountType === 'job') {
              addNotification(
                NotificationType.JOB_STARTED,
                'Job Updated',
                'A job you\'re watching has been updated',
                `/jobs/${accountPubkey.toBase58()}`
              );
            }
          },
          'confirmed'
        );
        subscriptionIdsRef.current.push(subscriptionId);
      } catch (err) {
        console.error(`Error subscribing to ${accountType}:`, err);
      }
    },
    [connection, addNotification]
  );

  const subscribeToProgramLogs = useCallback(() => {
    if (!connection || !publicKey) return;

    const rpcEndpoint = connection.rpcEndpoint;
    if (rpcEndpoint.includes('api.devnet.solana.com') || rpcEndpoint.includes('api.mainnet-beta.solana.com')) {
      console.warn('[Real-time] Public RPC does not support reliable WebSocket. Using SSE only.');
      return;
    }

    const programId = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID || 'FStwCj8zLzNkz7gTavooDcqF4FSyDcF9o9SCh96yyP7i');

    try {
      const subscriptionId = connection.onLogs(
        programId,
        (logs) => {
          const sig = logs.signature;
          if (processedSignaturesRef.current.has(sig)) return;
          processedSignaturesRef.current.add(sig);

          logs.logs.forEach(log => {
            if (log.includes('BidSubmitted')) {
              addNotification(NotificationType.PROPOSAL_RECEIVED, 'New Bid!', 'Someone bid on your job', undefined, sig);
            }
            if (log.includes('BidAccepted')) {
              addNotification(NotificationType.PROPOSAL_ACCEPTED, 'Bid Accepted!', 'Your bid was accepted', undefined, sig);
            }
            if (log.includes('WorkSubmitted')) {
              addNotification(NotificationType.JOB_COMPLETED, 'Work Submitted', 'Freelancer submitted work for review', undefined, sig);
            }
            if (log.includes('EscrowReleased')) {
              addNotification(NotificationType.PAYMENT_RECEIVED, 'Payment Released!', 'Payment has been released from escrow', undefined, sig);
            }
            if (log.includes('DisputeOpened')) {
              addNotification(NotificationType.DISPUTE_RAISED, 'Dispute Opened', 'A dispute has been opened', '/disputes', sig);
            }
          });

          if (processedSignaturesRef.current.size > 100) {
            const arr = Array.from(processedSignaturesRef.current);
            processedSignaturesRef.current = new Set(arr.slice(-50));
          }
        },
        'confirmed'
      );
      subscriptionIdsRef.current.push(subscriptionId);
      console.log('[Real-time] ✅ Subscribed to program logs via WebSocket');
    } catch (err) {
      console.error('[Real-time] ❌ WebSocket subscription failed:', err);
    }
  }, [connection, publicKey, addNotification]);

  const subscribeToSignature = useCallback(
    (signature: string, message: string) => {
      if (!connection) return;
      try {
        const subscriptionId = connection.onSignature(
          signature,
          (result) => {
            if (result.err) {
              addNotification(NotificationType.DISPUTE_RAISED, 'Transaction Failed', `Transaction failed: ${result.err}`, undefined, signature);
            } else {
              addNotification(NotificationType.JOB_CREATED, 'Transaction Confirmed', message, undefined, signature);
            }
          },
          'confirmed'
        );
        subscriptionIdsRef.current.push(subscriptionId);
      } catch (err) {
        console.error('Error subscribing to signature:', err);
      }
    },
    [connection, addNotification]
  );

  useEffect(() => {
    if (!connection || !publicKey) return;
    subscribeToProgramLogs();
    return () => {
      subscriptionIdsRef.current.forEach(id => {
        try { connection.removeAccountChangeListener(id); } catch { /* already removed */ }
      });
      subscriptionIdsRef.current = [];
    };
  }, [connection, publicKey, subscribeToProgramLogs]);

  return { subscribeToAccount, subscribeToSignature };
}
