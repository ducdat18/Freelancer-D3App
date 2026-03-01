import React, { FC, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { ConnectionConfig } from "@solana/web3.js";
import { getCurrentRpcUrl, getConnectionConfig } from "../config/rpc";
import { createDedupedRetryFetch } from "../utils/rpcRetry";

// Import wallet adapter CSS
import "@solana/wallet-adapter-react-ui/styles.css";

interface SolanaWalletProviderProps {
  children: React.ReactNode;
}

export const SolanaWalletProvider: FC<SolanaWalletProviderProps> = ({
  children,
}) => {
  // Network can be 'devnet', 'testnet', or 'mainnet-beta'
  const network = WalletAdapterNetwork.Devnet;

  // RPC endpoint with retry logic and rate limit handling
  const endpoint = useMemo(() => {
    const rpcUrl = getCurrentRpcUrl();
    console.log('Solana Network Configuration:');
    console.log('  Network:', network);
    console.log('  RPC Endpoint:', rpcUrl);
    console.log('  Make sure your wallet (Phantom/Solflare) is also set to DEVNET!');
    return rpcUrl;
  }, [network]);

  // Connection config with custom fetch that handles 403/429 rate limits
  const connectionConfig: ConnectionConfig = useMemo(() => {
    const baseConfig = getConnectionConfig('confirmed');
    return {
      ...baseConfig,
      // Custom fetch with exponential backoff and request deduplication
      fetch: createDedupedRetryFetch({
        maxRetries: 5,
        baseDelayMs: 1000,
        maxDelayMs: 30000,
      }),
    };
  }, []);

  // Wallet adapters
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint} config={connectionConfig}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
