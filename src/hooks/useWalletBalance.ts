import { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export function useWalletBalance() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBalance = async () => {
    if (!publicKey || !connected) {
      setBalance(null);
      return;
    }

    try {
      setLoading(true);
      const lamports = await connection.getBalance(publicKey);
      const solBalance = lamports / LAMPORTS_PER_SOL;
      setBalance(solBalance);
      console.log('💰 Wallet Balance:', solBalance, 'SOL');
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();

    // Set up interval to refresh balance every 10 seconds
    const interval = setInterval(fetchBalance, 10000);

    return () => clearInterval(interval);
  }, [publicKey, connected, connection]);

  return {
    balance,
    loading,
    refetch: fetchBalance,
  };
}
