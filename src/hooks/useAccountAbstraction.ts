import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { web3, BN } from "@coral-xyz/anchor";
import { useSolanaProgram } from "./useSolanaProgram";
import {
  deriveFeePayerConfigPDA,
  deriveSessionKeyPDA,
  deriveUserSessionCounterPDA,
  deriveGasUsagePDA,
} from "../utils/pda";
import type { PublicKey } from "../types/solana";
import type {
  FeePayerConfigData,
  SessionKeyData,
} from "../types";
import { SessionActions } from "../types";

const { SystemProgram } = web3;

export function useAccountAbstraction() {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();

  const [feePayerConfig, setFeePayerConfig] = useState<FeePayerConfigData | null>(null);
  const [sessions, setSessions] = useState<SessionKeyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==================== FETCH FUNCTIONS ====================

  const fetchFeePayerConfig = useCallback(async (): Promise<FeePayerConfigData | null> => {
    if (!program) return null;
    setLoading(true);
    setError(null);
    try {
      const [configPda] = deriveFeePayerConfigPDA();
      // @ts-ignore
      const config = await program.account.feePayerConfig.fetch(configPda);
      const data = config as FeePayerConfigData;
      setFeePayerConfig(data);
      return data;
    } catch (err: any) {
      setError(err.message || "Failed to fetch fee payer config");
      return null;
    } finally {
      setLoading(false);
    }
  }, [program]);

  const fetchSessionKey = useCallback(
    async (owner: PublicKey, sessionPubkey: PublicKey): Promise<SessionKeyData | null> => {
      if (!program) return null;
      setLoading(true);
      setError(null);
      try {
        const [sessionPda] = deriveSessionKeyPDA(owner, sessionPubkey);
        // @ts-ignore
        const session = await program.account.sessionKey.fetch(sessionPda);
        return session as SessionKeyData;
      } catch (err: any) {
        setError(err.message || "Failed to fetch session key");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [program]
  );

  const fetchUserSessions = useCallback(async (): Promise<SessionKeyData[]> => {
    if (!program || !publicKey) return [];
    setLoading(true);
    setError(null);
    try {
      // @ts-ignore
      const allSessions = await program.account.sessionKey.all([
        {
          memcmp: {
            offset: 8, // account discriminator
            bytes: publicKey.toBase58(),
          },
        },
      ]);
      const data = allSessions.map(
        (s: any) => s.account as SessionKeyData
      );
      setSessions(data);
      return data;
    } catch (err: any) {
      setError(err.message || "Failed to fetch user sessions");
      return [];
    } finally {
      setLoading(false);
    }
  }, [program, publicKey]);

  // ==================== INSTRUCTION FUNCTIONS ====================

  const createSessionKey = useCallback(
    async (
      sessionPubkey: PublicKey,
      validUntil: number,
      maxAmount: number,
      allowedActions: number
    ) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");
      setLoading(true);
      setError(null);
      try {
        const [sessionPda] = deriveSessionKeyPDA(publicKey, sessionPubkey);
        const [counterPda] = deriveUserSessionCounterPDA(publicKey);

        // @ts-ignore
        const tx = await program.methods
          .createSessionKey(
            sessionPubkey,
            new BN(validUntil),
            new BN(maxAmount),
            allowedActions
          )
          .accounts({
            sessionKey: sessionPda,
            userSessionCounter: counterPda,
            owner: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc({ skipPreflight: false, commitment: "confirmed" });

        return { signature: tx, sessionPda };
      } catch (err: any) {
        setError(err.message || "Failed to create session key");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  const revokeSessionKey = useCallback(
    async (sessionPubkey: PublicKey) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");
      setLoading(true);
      setError(null);
      try {
        const [sessionPda] = deriveSessionKeyPDA(publicKey, sessionPubkey);

        // @ts-ignore
        const tx = await program.methods
          .revokeSessionKey()
          .accounts({
            sessionKey: sessionPda,
            owner: publicKey,
          })
          .rpc({ skipPreflight: false, commitment: "confirmed" });

        return { signature: tx };
      } catch (err: any) {
        setError(err.message || "Failed to revoke session key");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  const useSessionKey = useCallback(
    async (
      sessionPubkey: PublicKey,
      actionType: number,
      amount: number
    ) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");
      setLoading(true);
      setError(null);
      try {
        const [sessionPda] = deriveSessionKeyPDA(publicKey, sessionPubkey);
        const [feePayerConfigPda] = deriveFeePayerConfigPDA();
        const [gasUsagePda] = deriveGasUsagePDA(publicKey);

        // @ts-ignore
        const tx = await program.methods
          .useSessionKey(actionType, new BN(amount))
          .accounts({
            sessionKey: sessionPda,
            feePayerConfig: feePayerConfigPda,
            gasUsage: gasUsagePda,
            owner: publicKey,
            sessionSigner: sessionPubkey,
          })
          .rpc({ skipPreflight: false, commitment: "confirmed" });

        return { signature: tx };
      } catch (err: any) {
        setError(err.message || "Failed to use session key");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  return {
    // State
    feePayerConfig,
    sessions,
    loading,
    error,
    // Fetch
    fetchFeePayerConfig,
    fetchSessionKey,
    fetchUserSessions,
    // Instructions
    createSessionKey,
    revokeSessionKey,
    useSessionKey,
  };
}
