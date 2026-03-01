import { PublicKey as SolanaPublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

export type PublicKey = SolanaPublicKey;
export { BN };

// Helper functions for type conversion
export const bnToNumber = (bn: BN): number => bn.toNumber();
export const bnToString = (bn: BN): string => bn.toString();
export const lamportsToSol = (lamports: number | BN): number => {
  const value = typeof lamports === 'number' ? lamports : lamports.toNumber();
  return value / 1_000_000_000; // 1 SOL = 1e9 lamports
};
export const solToLamports = (sol: number): number => {
  return Math.floor(sol * 1_000_000_000);
};
