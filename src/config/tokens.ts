import { PublicKey } from '@solana/web3.js';

export interface TokenConfig {
  mint: string; // Mint address
  symbol: string;
  name: string;
  decimals: number;
  icon: string; // URL or local path
  isNative?: boolean; // SOL
  coingeckoId?: string; // For price fetching (optional)
}

// Native SOL (wrapped SOL mint)
export const NATIVE_SOL: TokenConfig = {
  mint: 'So11111111111111111111111111111111111111112',
  symbol: 'SOL',
  name: 'Solana',
  decimals: 9,
  icon: '/tokens/sol.svg',
  isNative: true,
  coingeckoId: 'solana'
};

// USDC on Devnet
export const USDC_DEVNET: TokenConfig = {
  mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  icon: '/tokens/usdc.svg',
  coingeckoId: 'usd-coin'
};

// USDT on Devnet
export const USDT_DEVNET: TokenConfig = {
  mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  symbol: 'USDT',
  name: 'Tether USD',
  decimals: 6,
  icon: '/tokens/usdt.svg',
  coingeckoId: 'tether'
};

// All supported tokens (configurable based on network)
export const SUPPORTED_TOKENS: TokenConfig[] = [
  NATIVE_SOL,
  USDC_DEVNET,
  USDT_DEVNET
];

// Helper functions
export const getTokenByMint = (mint: string): TokenConfig | undefined => {
  // Handle native SOL (no mint address)
  if (!mint || mint === 'native' || mint === 'SOL') {
    return NATIVE_SOL;
  }

  return SUPPORTED_TOKENS.find(
    token => token.mint.toLowerCase() === mint.toLowerCase()
  );
};

export const getTokenBySymbol = (symbol: string): TokenConfig | undefined => {
  return SUPPORTED_TOKENS.find(
    token => token.symbol.toUpperCase() === symbol.toUpperCase()
  );
};

export const formatTokenAmount = (
  amount: number,
  decimals: number,
  maxDecimals: number = 6
): string => {
  // Convert from lamports/smallest unit to human readable
  const value = amount / Math.pow(10, decimals);

  // Format with appropriate decimal places
  if (value === 0) return '0';
  if (value < 0.01) return value.toFixed(maxDecimals);
  if (value < 1) return value.toFixed(4);
  if (value < 1000) return value.toFixed(2);

  // For large numbers, use K/M notation
  if (value >= 1_000_000) {
    return (value / 1_000_000).toFixed(2) + 'M';
  }
  if (value >= 1_000) {
    return (value / 1_000).toFixed(2) + 'K';
  }

  return value.toFixed(2);
};

export const parseTokenAmount = (
  amount: string | number,
  decimals: number
): number => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return 0;

  // Convert to smallest unit (lamports)
  return Math.floor(numAmount * Math.pow(10, decimals));
};

export const getTokenPublicKey = (token: TokenConfig): PublicKey | null => {
  try {
    return new PublicKey(token.mint);
  } catch {
    return null;
  }
};

// Validate token mint address
export const isValidTokenMint = (mint: string): boolean => {
  try {
    new PublicKey(mint);
    return true;
  } catch {
    return false;
  }
};

// Get default token (SOL)
export const getDefaultToken = (): TokenConfig => NATIVE_SOL;
