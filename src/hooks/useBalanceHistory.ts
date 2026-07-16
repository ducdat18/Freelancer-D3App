import { useCallback, useEffect, useRef, useState } from 'react';
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
  hasLoaded: boolean;
  /** Manually trigger a fetch (nothing runs on mount to avoid RPC bursts). */
  load: () => void;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const isRateLimit = (e: any) =>
  /429|too many requests|rate/i.test(e?.message || String(e));

/**
 * Past transactions are immutable (postBalances are historical facts), so the
 * reconstructed timeline can be cached in localStorage and reused across page
 * reloads and re-visits without hitting the RPC again. A manual refresh simply
 * re-fetches and appends any newer transactions. Keyed per wallet + limit.
 */
const CACHE_VERSION = 'v1';
const cacheKeyFor = (owner: string, limit: number) =>
  `balhist_${CACHE_VERSION}_${owner}_${limit}`;

function readCache(owner: string, limit: number): BalanceHistoryPoint[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(cacheKeyFor(owner, limit));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.history) ? (parsed.history as BalanceHistoryPoint[]) : null;
  } catch {
    return null;
  }
}

function writeCache(owner: string, limit: number, history: BalanceHistoryPoint[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      cacheKeyFor(owner, limit),
      JSON.stringify({ savedAt: Date.now(), history }),
    );
  } catch {
    /* quota / private mode — cache is best-effort */
  }
}

/**
 * Reconstructs a wallet's SOL balance timeline from its on-chain transaction
 * history. `postBalances[i]` is the exact balance right after each tx, so no
 * client-side running-sum guesswork is needed.
 *
 * IMPORTANT: this does NOT auto-fetch on mount. The public devnet RPC
 * (api.devnet.solana.com) rate-limits `getParsedTransactions` aggressively and
 * firing it on page load contributes to app-wide 429s. Fetching is user-driven
 * (via `load`) and throttled into small chunks with backoff.
 */
export function useBalanceHistory(limit = 10): UseBalanceHistoryResult {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [history, setHistory] = useState<BalanceHistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const inFlight = useRef(false);

  const owner = publicKey?.toBase58() ?? null;

  // Hydrate from the per-wallet localStorage cache on mount / wallet switch so
  // a re-visit or full page reload shows the last result instantly — no RPC.
  useEffect(() => {
    if (!owner) {
      setHistory([]);
      setHasLoaded(false);
      return;
    }
    const cached = readCache(owner, limit);
    if (cached) {
      setHistory(cached);
      setHasLoaded(true);
    } else {
      // A different wallet with no cache — don't show the previous wallet's data.
      setHistory([]);
      setHasLoaded(false);
    }
  }, [owner, limit]);

  const load = useCallback(async () => {
    if (!publicKey || !connected || inFlight.current) return;
    inFlight.current = true;

    const owner = publicKey.toBase58();

    const getChunk = async (sigs: string[]): Promise<(ParsedTransactionWithMeta | null)[]> => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          return await connection.getParsedTransactions(sigs, { maxSupportedTransactionVersion: 0 });
        } catch (e) {
          if (isRateLimit(e) && attempt < 2) {
            await sleep(800 * (attempt + 1)); // 800ms, 1600ms backoff
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
        writeCache(owner, limit, []);
        setHasLoaded(true);
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

      const CHUNK = 4;
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
          setHistory([...collected].reverse());
        } catch (e) {
          sawError = true;
          break;
        }
        if (start + CHUNK < signatures.length) await sleep(400);
      }

      // Persist so the next visit / reload restores instantly without an RPC
      // call. Don't overwrite a good cache with nothing if the RPC threw early.
      if (collected.length > 0) {
        writeCache(owner, limit, [...collected].reverse());
      }

      setHasLoaded(true);
      if (collected.length === 0 && sawError) {
        setError('RPC rate limit reached. Public devnet is throttling — retry, or set a dedicated RPC (NEXT_PUBLIC_SOLANA_RPC_URL).');
      } else if (sawError) {
        setError(`Showing ${collected.length} of ${signatures.length} — public RPC throttled the rest. Retry for more.`);
      }
    } catch (err: any) {
      console.error('Error fetching balance history:', err);
      setHasLoaded(true);
      setError(
        isRateLimit(err)
          ? 'RPC rate limit reached. Public devnet is throttling — retry in a moment, or configure a dedicated RPC.'
          : err?.message || 'Failed to load balance history',
      );
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }, [connection, publicKey, connected, limit]);

  return { history, loading, error, hasLoaded, load };
}
