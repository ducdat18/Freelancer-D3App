/**
 * Solana RPC Configuration
 *
 * Centralized configuration for RPC endpoints with rate-limit handling.
 * Supports easy swapping between public endpoints and private providers.
 */

import { Commitment, ConnectionConfig } from '@solana/web3.js';

// RPC Provider options
export type RpcProvider = 'public' | 'helius' | 'quicknode' | 'alchemy' | 'custom';

interface RpcEndpointConfig {
  url: string;
  rateLimit?: number; // requests per second
  wsUrl?: string;
}

// Get RPC endpoint based on provider
export function getRpcEndpoint(provider?: RpcProvider): RpcEndpointConfig {
  const selectedProvider = provider || (process.env.NEXT_PUBLIC_RPC_PROVIDER as RpcProvider) || 'public';

  switch (selectedProvider) {
    case 'helius':
      const heliusKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
      if (!heliusKey) {
        console.warn('NEXT_PUBLIC_HELIUS_API_KEY not set, falling back to public RPC');
        return getPublicEndpoint();
      }
      return {
        url: `https://devnet.helius-rpc.com/?api-key=${heliusKey}`,
        wsUrl: `wss://devnet.helius-rpc.com/?api-key=${heliusKey}`,
        rateLimit: 50, // Helius free tier
      };

    case 'quicknode':
      const quicknodeUrl = process.env.NEXT_PUBLIC_QUICKNODE_RPC_URL;
      if (!quicknodeUrl) {
        console.warn('NEXT_PUBLIC_QUICKNODE_RPC_URL not set, falling back to public RPC');
        return getPublicEndpoint();
      }
      return {
        url: quicknodeUrl,
        wsUrl: quicknodeUrl.replace('https://', 'wss://'),
        rateLimit: 25,
      };

    case 'alchemy':
      const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
      if (!alchemyKey) {
        console.warn('NEXT_PUBLIC_ALCHEMY_API_KEY not set, falling back to public RPC');
        return getPublicEndpoint();
      }
      return {
        url: `https://solana-devnet.g.alchemy.com/v2/${alchemyKey}`,
        rateLimit: 30,
      };

    case 'custom':
      const customUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
      if (!customUrl) {
        console.warn('NEXT_PUBLIC_SOLANA_RPC_URL not set, falling back to public RPC');
        return getPublicEndpoint();
      }
      return {
        url: customUrl,
        wsUrl: process.env.NEXT_PUBLIC_SOLANA_WS_URL,
        rateLimit: parseInt(process.env.NEXT_PUBLIC_RPC_RATE_LIMIT || '10', 10),
      };

    case 'public':
    default:
      return getPublicEndpoint();
  }
}

function getPublicEndpoint(): RpcEndpointConfig {
  return {
    url: 'https://api.devnet.solana.com',
    rateLimit: 10, // Public devnet is heavily rate-limited
  };
}

// Connection configuration with sensible defaults
export function getConnectionConfig(commitment: Commitment = 'confirmed'): ConnectionConfig {
  const rpcConfig = getRpcEndpoint();

  return {
    commitment,
    confirmTransactionInitialTimeout: 60000,
    disableRetryOnRateLimit: false, // Let the connection handle retries
    wsEndpoint: rpcConfig.wsUrl,
    // Custom fetch with retry logic is applied separately
  };
}

// Export current RPC URL for use in ConnectionProvider
export function getCurrentRpcUrl(): string {
  return getRpcEndpoint().url;
}

// Export current rate limit
export function getCurrentRateLimit(): number {
  return getRpcEndpoint().rateLimit || 10;
}
