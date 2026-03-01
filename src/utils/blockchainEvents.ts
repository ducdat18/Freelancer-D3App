/**
 * Blockchain Event Parsing Utilities
 * Parse events from Solana transaction logs
 */

import { Connection } from '@solana/web3.js';

export interface BlockchainEvent {
  type: string;
  data: Record<string, any>;
  timestamp: number;
}

/**
 * Parse events from transaction signature
 * @param connection - Solana connection
 * @param signature - Transaction signature
 * @returns Parsed events
 */
export async function parseEventsFromTransaction(
  connection: Connection,
  signature: string
): Promise<BlockchainEvent[]> {
  try {
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx || !tx.meta || !tx.meta.logMessages) {
      return [];
    }

    const events: BlockchainEvent[] = [];
    const logs = tx.meta.logMessages;

    // Parse program logs for events
    for (const log of logs) {
      // Look for event emissions in logs
      // Anchor emits events as: "Program data: <base64_encoded_event>"
      if (log.includes('Program data:')) {
        try {
          // Extract event type and data from log
          const eventMatch = log.match(/Program data: (.+)/);
          if (eventMatch) {
            // This is a simplified parser
            // In production, you'd decode the actual event data from base64
            events.push({
              type: 'UnknownEvent',
              data: { raw: eventMatch[1] },
              timestamp: tx.blockTime || Date.now() / 1000,
            });
          }
        } catch (err) {
          console.error('Error parsing event:', err);
        }
      }

      // Parse common event patterns
      if (log.includes('BidAccepted')) {
        events.push({
          type: 'BidAccepted',
          data: {},
          timestamp: tx.blockTime || Date.now() / 1000,
        });
      }

      if (log.includes('WorkSubmitted')) {
        events.push({
          type: 'WorkSubmitted',
          data: {},
          timestamp: tx.blockTime || Date.now() / 1000,
        });
      }

      if (log.includes('JobCompleted')) {
        events.push({
          type: 'JobCompleted',
          data: {},
          timestamp: tx.blockTime || Date.now() / 1000,
        });
      }

      if (log.includes('DisputeOpened')) {
        events.push({
          type: 'DisputeOpened',
          data: {},
          timestamp: tx.blockTime || Date.now() / 1000,
        });
      }

      if (log.includes('DisputeVoted')) {
        events.push({
          type: 'DisputeVoted',
          data: {},
          timestamp: tx.blockTime || Date.now() / 1000,
        });
      }

      if (log.includes('DisputeResolved')) {
        events.push({
          type: 'DisputeResolved',
          data: {},
          timestamp: tx.blockTime || Date.now() / 1000,
        });
      }
    }

    return events;
  } catch (err) {
    console.error('Error parsing transaction events:', err);
    return [];
  }
}

/**
 * Get user-friendly notification message for event
 * @param event - Blockchain event
 * @returns Notification title and message
 */
export function getEventNotification(event: BlockchainEvent): {
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
} {
  switch (event.type) {
    case 'BidAccepted':
      return {
        title: 'Bid Accepted',
        message: 'Your bid has been accepted! Start working on the job.',
        type: 'success',
      };

    case 'WorkSubmitted':
      return {
        title: 'Work Submitted',
        message: 'Deliverables have been submitted and are awaiting client review.',
        type: 'info',
      };

    case 'JobCompleted':
      return {
        title: 'Job Completed',
        message: 'The job has been completed and payment has been released.',
        type: 'success',
      };

    case 'DisputeOpened':
      return {
        title: 'Dispute Opened',
        message: 'A dispute has been opened for this job.',
        type: 'warning',
      };

    case 'DisputeVoted':
      return {
        title: 'Vote Recorded',
        message: 'Your vote on the dispute has been recorded.',
        type: 'info',
      };

    case 'DisputeResolved':
      return {
        title: 'Dispute Resolved',
        message: 'The dispute has been resolved and funds have been distributed.',
        type: 'success',
      };

    case 'ReviewSubmitted':
      return {
        title: 'Review Submitted',
        message: 'Your review has been recorded on the blockchain.',
        type: 'success',
      };

    case 'EscrowDeposited':
      return {
        title: 'Escrow Deposited',
        message: 'Funds have been securely deposited into escrow.',
        type: 'success',
      };

    case 'EscrowReleased':
      return {
        title: 'Payment Released',
        message: 'Escrow funds have been released to the freelancer.',
        type: 'success',
      };

    default:
      return {
        title: 'Blockchain Event',
        message: 'A transaction has been processed successfully.',
        type: 'info',
      };
  }
}

/**
 * Show notification for transaction success
 * @param signature - Transaction signature
 * @param defaultTitle - Default notification title
 * @param defaultMessage - Default notification message
 */
export function createTransactionNotification(
  signature: string,
  defaultTitle: string = 'Transaction Successful',
  defaultMessage: string = 'Your transaction has been confirmed on the blockchain.'
): {
  title: string;
  message: string;
  link: string;
} {
  const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;

  return {
    title: defaultTitle,
    message: `${defaultMessage}\n\nTransaction: ${signature.slice(0, 8)}...`,
    link: explorerUrl,
  };
}
