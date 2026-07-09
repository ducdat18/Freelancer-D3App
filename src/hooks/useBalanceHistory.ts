import { useCallback, useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export interface BalanceHistoryPoint {
  signature: string;
  blockTime: number | null; // unix seconds
  /** SOL delta for this wallet in this tx (can be negative). Includes fees when fee payer. */
  change: number;
  /** On-chain SOL balance of this wallet immediately AFTER this tx. */
  balanceAfter: number;
  failed: boolean;
}

interface UseBalanceHistoryResult {
  history: BalanceHistoryPoint[]; // oldest → newest
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Reconstructs a wallet's SOL balance timeline from its on-chain transaction
 * history. For each signature we read the parsed transaction's pre/post balances
 * for this wallet's account index — `postBalances[i]` is the exact balance right
 * after that tx, so no client-side running-sum guesswork is needed.
 */
export function useBalanceHistory(limit = 25): UseBalanceHistoryResult {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [history, setHistory] = useState<BalanceHistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!publicKey || !connected) {
      setHistory([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const signatures = await connection.getSignaturesForAddress(publicKey, { limit });
      if (signatures.length === 0) {
        setHistory([]);
        return;
      }

      // Batch fetch parsed transactions (newest → oldest, as returned).
      const txs = await connection.getParsedTransactions(
        signatures.map((s) => s.signature),
        { maxSupportedTransactionVersion: 0 },
      );

      const owner = publicKey.toBase58();
      const points: BalanceHistoryPoint[] = [];

      signatures.forEach((sigInfo, idx) => {
        const tx = txs[idx];
        if (!tx || !tx.meta) return;

        const keys = tx.transaction.message.accountKeys;
        const accountIndex = keys.findIndex((k) => k.pubkey.toBase58() === owner);
        if (accountIndex === -1) return;

        const pre = tx.meta.preBalances[accountIndex] ?? 0;
        const post = tx.meta.postBalances[accountIndex] ?? 0;

        points.push({
          signature: sigInfo.signature,
          blockTime: sigInfo.blockTime ?? tx.blockTime ?? null,
          change: (post - pre) / LAMPORTS_PER_SOL,
          balanceAfter: post / LAMPORTS_PER_SOL,
          failed: !!tx.meta.err,
        });
      });

      // Return oldest → newest for a left-to-right timeline.
      points.reverse();
      setHistory(points);
    } catch (err: any) {
      console.error('Error fetching balance history:', err);
      setError(err?.message || 'Failed to load balance history');
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey, connected, limit]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { history, loading, error, refetch: fetchHistory };
}
