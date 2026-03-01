import { useCallback, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { web3, BN } from "@coral-xyz/anchor";
import { useSolanaProgram } from "./useSolanaProgram";
import {
  deriveReferralConfigPDA,
  deriveReferralAccountPDA,
  deriveReferralPayoutPDA,
} from "../utils/pda";
import type { ReferralConfig, ReferralAccountData } from "../types";
import type { PublicKey } from "../types/solana";

const { SystemProgram } = web3;

export function useReferral() {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();

  const [referralConfig, setReferralConfig] = useState<ReferralConfig | null>(null);
  const [referralAccount, setReferralAccount] = useState<ReferralAccountData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch ReferralConfig account
   */
  const fetchReferralConfig = useCallback(async (): Promise<ReferralConfig | null> => {
    // @ts-ignore
    if (!program || !program.account.referralConfig) return null;

    setLoading(true);
    setError(null);

    try {
      const [configPda] = deriveReferralConfigPDA();
      // @ts-ignore - Program account types from IDL
      const config = await program.account.referralConfig.fetch(configPda);
      const result = config as ReferralConfig;
      setReferralConfig(result);
      return result;
    } catch (err: any) {
      console.error("Error fetching referral config:", err);
      setError(err.message || "Failed to fetch referral config");
      return null;
    } finally {
      setLoading(false);
    }
  }, [program]);

  /**
   * Fetch ReferralAccount for a user
   */
  const fetchReferralAccount = useCallback(
    async (user: PublicKey): Promise<ReferralAccountData | null> => {
      // @ts-ignore
      if (!program || !program.account.referralAccount) return null;

      setLoading(true);
      setError(null);

      try {
        const [referralPda] = deriveReferralAccountPDA(user);
        // @ts-ignore - Program account types from IDL
        const account = await program.account.referralAccount.fetch(referralPda);
        const result = account as ReferralAccountData;
        setReferralAccount(result);
        return result;
      } catch (err: any) {
        console.error("Error fetching referral account:", err);
        setError(err.message || "Failed to fetch referral account");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [program]
  );

  /**
   * Register a referral with a referrer
   */
  const registerReferral = useCallback(
    async (referrerPubkey: PublicKey) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      // @ts-ignore
      if (typeof (program as any).methods.registerReferral !== 'function') throw new Error('Referral is not yet deployed on-chain');
      setLoading(true);
      setError(null);

      try {
        const [configPda] = deriveReferralConfigPDA();
        const [referralPda] = deriveReferralAccountPDA(publicKey);
        const [referrerReferralPda] = deriveReferralAccountPDA(referrerPubkey);

        // @ts-ignore - Program methods type inference issue
        const tx = await program.methods
          .registerReferral()
          .accounts({
            referralConfig: configPda,
            referralAccount: referralPda,
            referrerAccount: referrerReferralPda,
            referrer: referrerPubkey,
            user: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc({ skipPreflight: false, commitment: "confirmed" });

        return { signature: tx, referralPda };
      } catch (err: any) {
        console.error("Error registering referral:", err);
        setError(err.message || "Failed to register referral");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  /**
   * Distribute referral commission for a completed job
   */
  const distributeReferralCommission = useCallback(
    async (
      jobPda: PublicKey,
      referrerPubkey: PublicKey,
      referredUserPubkey: PublicKey,
      jobAmount: number
    ) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      // @ts-ignore
      if (typeof (program as any).methods.distributeReferralCommission !== 'function') throw new Error('Referral is not yet deployed on-chain');
      setLoading(true);
      setError(null);

      try {
        const [configPda] = deriveReferralConfigPDA();
        const [referrerReferralPda] = deriveReferralAccountPDA(referrerPubkey);
        const [referredUserReferralPda] = deriveReferralAccountPDA(referredUserPubkey);
        const [payoutPda] = deriveReferralPayoutPDA(jobPda, referrerPubkey);

        // @ts-ignore - Program methods type inference issue
        const tx = await program.methods
          .distributeReferralCommission(new BN(jobAmount))
          .accounts({
            referralConfig: configPda,
            referrerAccount: referrerReferralPda,
            referredUserAccount: referredUserReferralPda,
            referralPayout: payoutPda,
            job: jobPda,
            referrer: referrerPubkey,
            referredUser: referredUserPubkey,
            authority: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc({ skipPreflight: false, commitment: "confirmed" });

        return { signature: tx, payoutPda };
      } catch (err: any) {
        console.error("Error distributing referral commission:", err);
        setError(err.message || "Failed to distribute referral commission");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  return {
    // State
    referralConfig,
    referralAccount,
    loading,
    error,
    // Queries
    fetchReferralConfig,
    fetchReferralAccount,
    // Instructions
    registerReferral,
    distributeReferralCommission,
  };
}
