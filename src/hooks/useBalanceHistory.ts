import { useCallback, useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, ParsedTransactionWithMeta } from '@solana/web3.js';

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const isRateLimit = (e: any) =>
  /429|too many requests|rate/i.test(e?.message || String(e));

/**
 * Reconstructs a wallet's SOL balance timeline from its on-chain transaction
 * history. For each signature we read the parsed transaction's pre/post balances
 * for this wallet's account index — `postBalances[i]` is the exact balance right
 * after that tx, so no client-side running-sum guesswork is needed.
 *
 * Public devnet RPC rate-limits `getParsedTransactions` hard, so we fetch in
 * small throttled chunks with backoff and surface whatever we managed to load.
 */
export function useBalanceHistory(limit = 15): UseBalanceHistoryResult {
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

    const owner = publicKey.toBase58();

    /** Fetch one chunk of parsed txs with up to 3 retries on rate-limit. */
    const getChunk = async (sigs: string[]): Promise<(ParsedTransactionWithMeta | null)[]> => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          return await connection.getParsedTransactions(sigs, {
            maxSupportedTransactionVersion: 0,
          });
        } catch (e) {
          if (isRateLimit(e) && attempt < 2) {
            await sleep(600 * (attempt + 1)); // 600ms, 1200ms backoff
            continue;
          }
          throw e;
        }
      }
      return sigs.map(() => null);
    };

    try {
      setLoading(true);
      setError(null);

      const signatures = await connection.getSignaturesForAddress(publicKey, { limit });
      if (signatures.length === 0) {
        setHistory([]);
        return;
      }

      const toPoint = (
        sigInfo: (typeof signatures)[number],
        tx: ParsedTransactionWithMeta | null,
      ): BalanceHistoryPoint | null => {
        if (!tx || !tx.meta) return null;
        const keys = tx.transaction.message.accountKeys;
        const i = keys.findIndex((k) => k.pubkey.toBase58() === owner);
        if (i === -1) return null;
        const pre = tx.meta.preBalances[i] ?? 0;
        const post = tx.meta.postBalances[i] ?? 0;
        return {
          signature: sigInfo.signature,
          blockTime: sigInfo.blockTime ?? tx.blockTime ?? null,
          change: (post - pre) / LAMPORTS_PER_SOL,
          balanceAfter: post / LAMPORTS_PER_SOL,
          failed: !!tx.meta.err,
        };
      };

      // Fetch in small chunks (newest → oldest) and stream partial results in.
      const CHUNK = 5;
      const collected: BalanceHistoryPoint[] = [];
      let sawError = false;

      for (let start = 0; start < signatures.length; start += CHUNK) {
        const slice = signatures.slice(start, start + CHUNK);
        try {
          const txs = await getChunk(slice.map((s) => s.signature));
          slice.forEach((sigInfo, j) => {
            const pt = toPoint(sigInfo, txs[j]);
            if (pt) collected.push(pt);
          });
          // Render progressively (oldest → newest).
          setHistory([...collected].reverse());
        } catch (e) {
          sawError = true;
          break; // stop hammering the RPC; keep what we have
        }
        if (start + CHUNK < signatures.length) await sleep(250); // gentle throttle
      }

      if (collected.length === 0 && sawError) {
        setError('RPC rate limit reached. Try again, or set a dedicated RPC (NEXT_PUBLIC_SOLANA_RPC_URL).');
      } else if (sawError) {
        setError(`Showing ${collected.length} of ${signatures.length} — RPC rate limit hit, retry for more.`);
      }
    } catch (err: any) {
      console.error('Error fetching balance history:', err);
      setError(
        isRateLimit(err)
          ? 'RPC rate limit reached. Try again in a moment, or configure a dedicated RPC.'
          : err?.message || 'Failed to load balance history',
      );
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey, connected, limit]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { history, loading, error, refetch: fetchHistory };
}
