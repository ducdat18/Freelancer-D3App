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

/** Format SOL amount with enough decimals to always show non-zero values.
 *  e.g. 0.0018 → "0.0018", 1.5 → "1.50", 0.00001234 → "0.00001234" */
export const formatSol = (sol: number): string => {
  if (sol === 0) return '0';
  if (sol >= 1) return sol.toFixed(2);
  // find first significant digit after decimal
  const str = sol.toPrecision(4);
  // remove trailing zeros but keep at least 4 sig figs
  return parseFloat(str).toString();
};
