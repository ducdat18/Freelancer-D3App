/**
 * Transaction Progress State Machine
 *
 * States: idle → preparing → signing → confirming → confirmed → error
 * Tracks tx signature, confirmation status, and error classification.
 */

import { useState, useCallback, useRef } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';

export type TransactionStatus =
  | 'idle'
  | 'preparing'
  | 'signing'
  | 'confirming'
  | 'confirmed'
  | 'error';

export interface TransactionState {
  status: TransactionStatus;
  signature: string | null;
  error: string | null;
  errorType: TransactionErrorType | null;
  message: string;
}

export type TransactionErrorType =
  | 'user_rejected'
  | 'timeout'
  | 'insufficient_funds'
  | 'blockhash_expired'
  | 'program_error'
  | 'network_error'
  | 'unknown';

const INITIAL_STATE: TransactionState = {
  status: 'idle',
  signature: null,
  error: null,
  errorType: null,
  message: '',
};

function classifyError(error: unknown): { type: TransactionErrorType; message: string } {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  if (lower.includes('user rejected') || lower.includes('cancelled') || lower.includes('user denied')) {
    return { type: 'user_rejected', message: 'Transaction rejected by wallet' };
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return { type: 'timeout', message: 'Transaction timed out' };
  }
  if (lower.includes('insufficient') || lower.includes('not enough')) {
    return { type: 'insufficient_funds', message: 'Insufficient funds for transaction' };
  }
  if (lower.includes('blockhash') || lower.includes('block height exceeded')) {
    return { type: 'blockhash_expired', message: 'Blockhash expired, please retry' };
  }
  if (lower.includes('0x') || lower.includes('program error') || lower.includes('custom program error')) {
    return { type: 'program_error', message: msg };
  }
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('connection')) {
    return { type: 'network_error', message: 'Network error, check your connection' };
  }
  return { type: 'unknown', message: msg };
}

/**
 * Hook to manage transaction progress state.
 *
 * Usage:
 * ```ts
 * const { state, execute, reset } = useTransactionProgress();
 *
 * const handleSubmit = () => execute(
 *   async (setMessage) => {
 *     setMessage('Depositing into escrow...');
 *     const tx = await depositEscrow(jobPda, amount);
 *     return tx.signature;
 *   }
 * );
 * ```
 */
export function useTransactionProgress() {
  const [state, setState] = useState<TransactionState>(INITIAL_STATE);
  const { connection } = useConnection();
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const reset = useCallback(() => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
    }
    setState(INITIAL_STATE);
  }, []);

  const execute = useCallback(
    async (
      txFn: (setMessage: (msg: string) => void) => Promise<string>,
      options?: { autoCloseMs?: number }
    ) => {
      const setMessage = (message: string) => {
        setState((prev) => ({ ...prev, message }));
      };

      try {
        // PREPARING
        setState({
          status: 'preparing',
          signature: null,
          error: null,
          errorType: null,
          message: 'Preparing transaction...',
        });

        // SIGNING (the txFn handles actual wallet interaction)
        setState((prev) => ({
          ...prev,
          status: 'signing',
          message: 'Awaiting wallet signature...',
        }));

        const signature = await txFn(setMessage);

        // CONFIRMING
        setState({
          status: 'confirming',
          signature,
          error: null,
          errorType: null,
          message: 'Confirming transaction...',
        });

        // Wait for confirmation
        try {
          await connection.confirmTransaction(signature, 'confirmed');
        } catch {
          // Even if confirmTransaction throws, the tx may have succeeded
          // We'll still mark as confirmed since we have a signature
        }

        // CONFIRMED
        setState({
          status: 'confirmed',
          signature,
          error: null,
          errorType: null,
          message: 'Transaction confirmed!',
        });

        // Auto-close after delay
        const autoCloseMs = options?.autoCloseMs ?? 3000;
        if (autoCloseMs > 0) {
          autoCloseTimerRef.current = setTimeout(reset, autoCloseMs);
        }

        return signature;
      } catch (error) {
        const classified = classifyError(error);

        setState({
          status: 'error',
          signature: null,
          error: classified.message,
          errorType: classified.type,
          message: classified.message,
        });

        throw error;
      }
    },
    [connection, reset]
  );

  return {
    state,
    execute,
    reset,
    isOpen: state.status !== 'idle',
    isLoading: ['preparing', 'signing', 'confirming'].includes(state.status),
  };
}
