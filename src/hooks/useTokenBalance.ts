import { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { TokenConfig } from '../config/tokens';

export function useTokenBalance(token: TokenConfig | null) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number>(0);
  const [rawBalance, setRawBalance] = useState<bigint>(BigInt(0));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!publicKey || !token) {
      setBalance(0);
      setRawBalance(BigInt(0));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (token.isNative) {
        // Fetch SOL balance
        const bal = await connection.getBalance(publicKey);
        setRawBalance(BigInt(bal));
        setBalance(bal / LAMPORTS_PER_SOL);
      } else {
        // Fetch SPL token balance
        const mintPubkey = new PublicKey(token.mint);
        const associatedTokenAddress = await getAssociatedTokenAddress(
          mintPubkey,
          publicKey
        );

        try {
          const tokenAccount = await getAccount(connection, associatedTokenAddress);
          setRawBalance(tokenAccount.amount);
          setBalance(Number(tokenAccount.amount) / Math.pow(10, token.decimals));
        } catch (err: any) {
          // Account might not exist (balance is 0)
          if (err.message?.includes('could not find account')) {
            setRawBalance(BigInt(0));
            setBalance(0);
          } else {
            throw err;
          }
        }
      }
    } catch (err) {
      console.error(`Error fetching ${token.symbol} balance:`, err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
      setBalance(0);
      setRawBalance(BigInt(0));
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey, token]);

  // Auto-fetch balance on mount and when dependencies change
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Refetch balance every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchBalance();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchBalance]);

  return {
    balance, // Human-readable balance
    rawBalance, // Raw balance in smallest unit (lamports/base units)
    loading,
    error,
    refetch: fetchBalance
  };
}

// Hook to fetch balances for multiple tokens
export function useMultipleTokenBalances(tokens: TokenConfig[]) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    if (!publicKey) {
      setBalances({});
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const balancePromises = tokens.map(async (token) => {
        try {
          let balance = 0;

          if (token.isNative) {
            const bal = await connection.getBalance(publicKey);
            balance = bal / LAMPORTS_PER_SOL;
          } else {
            const mintPubkey = new PublicKey(token.mint);
            const associatedTokenAddress = await getAssociatedTokenAddress(
              mintPubkey,
              publicKey
            );

            try {
              const tokenAccount = await getAccount(connection, associatedTokenAddress);
              balance = Number(tokenAccount.amount) / Math.pow(10, token.decimals);
            } catch (err: any) {
              if (!err.message?.includes('could not find account')) {
                throw err;
              }
              // Account doesn't exist, balance is 0
            }
          }

          return { symbol: token.symbol, balance };
        } catch (err) {
          console.error(`Error fetching ${token.symbol} balance:`, err);
          return { symbol: token.symbol, balance: 0 };
        }
      });

      const results = await Promise.all(balancePromises);
      const balanceMap: Record<string, number> = {};
      results.forEach(({ symbol, balance }) => {
        balanceMap[symbol] = balance;
      });

      setBalances(balanceMap);
    } catch (err) {
      console.error('Error fetching token balances:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balances');
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey, tokens]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  // Refetch every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchBalances();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchBalances]);

  return {
    balances,
    loading,
    error,
    refetch: fetchBalances
  };
}
