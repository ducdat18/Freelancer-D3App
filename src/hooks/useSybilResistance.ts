import { useCallback, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { web3, BN } from "@coral-xyz/anchor";
import { useSolanaProgram } from "./useSolanaProgram";
import {
  deriveSybilConfigPDA,
  deriveIdentityStampsPDA,
} from "../utils/pda";
import type { PublicKey } from "../types/solana";
import type { SybilConfigData, IdentityStampsData } from "../types";

const { SystemProgram } = web3;

export function useSybilResistance() {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();

  const [sybilConfig, setSybilConfig] = useState<SybilConfigData | null>(null);
  const [identityStamps, setIdentityStamps] = useState<IdentityStampsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==================== FETCH FUNCTIONS ====================

  const fetchSybilConfig = useCallback(async (): Promise<SybilConfigData | null> => {
    if (!program) return null;

    setLoading(true);
    setError(null);

    try {
      const [configPda] = deriveSybilConfigPDA();
      // @ts-ignore
      const config = await program.account.sybilConfig.fetch(configPda);
      const data = config as SybilConfigData;
      setSybilConfig(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch sybil config";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [program]);

  const fetchIdentityStamps = useCallback(
    async (user?: PublicKey): Promise<IdentityStampsData | null> => {
      const target = user || publicKey;
      if (!program || !target) return null;

      setLoading(true);
      setError(null);

      try {
        const [stampsPda] = deriveIdentityStampsPDA(target);
        // @ts-ignore
        const stamps = await program.account.identityStamps.fetch(stampsPda);
        const data = stamps as IdentityStampsData;
        setIdentityStamps(data);
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch identity stamps";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  // ==================== INSTRUCTION FUNCTIONS ====================

  const addIdentityStamp = useCallback(
    async (
      stampType: number,
      providerHash: number[],
      weight: number,
      expiresAt?: number
    ) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      setLoading(true);
      setError(null);

      try {
        const [configPda] = deriveSybilConfigPDA();
        const [stampsPda] = deriveIdentityStampsPDA(publicKey);

        const expiresAtArg = expiresAt ? new BN(expiresAt) : null;

        // @ts-ignore
        const tx = await program.methods
          .addIdentityStamp(stampType, providerHash, weight, expiresAtArg)
          .accounts({
            sybilConfig: configPda,
            identityStamps: stampsPda,
            user: publicKey,
            oracle: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc({ skipPreflight: false, commitment: "confirmed" });

        return { signature: tx, stampsPda };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to add identity stamp";
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  const removeIdentityStamp = useCallback(
    async (stampType: number) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      setLoading(true);
      setError(null);

      try {
        const [configPda] = deriveSybilConfigPDA();
        const [stampsPda] = deriveIdentityStampsPDA(publicKey);

        // @ts-ignore
        const tx = await program.methods
          .removeIdentityStamp(stampType)
          .accounts({
            sybilConfig: configPda,
            identityStamps: stampsPda,
            user: publicKey,
            oracle: publicKey,
          })
          .rpc({ skipPreflight: false, commitment: "confirmed" });

        return { signature: tx };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to remove identity stamp";
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  const recalculateHumanityScore = useCallback(async () => {
    if (!program || !publicKey) throw new Error("Wallet not connected");

    setLoading(true);
    setError(null);

    try {
      const [configPda] = deriveSybilConfigPDA();
      const [stampsPda] = deriveIdentityStampsPDA(publicKey);

      // @ts-ignore
      const tx = await program.methods
        .recalculateHumanityScore()
        .accounts({
          sybilConfig: configPda,
          identityStamps: stampsPda,
          user: publicKey,
        })
        .rpc({ skipPreflight: false, commitment: "confirmed" });

      return { signature: tx };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to recalculate humanity score";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [program, publicKey]);

  // ==================== UTILITY FUNCTIONS ====================

  const getHumanityScore = useCallback(
    async (user?: PublicKey): Promise<number | null> => {
      const target = user || publicKey;
      if (!program || !target) return null;

      try {
        const [stampsPda] = deriveIdentityStampsPDA(target);
        // @ts-ignore
        const stamps = await program.account.identityStamps.fetch(stampsPda);
        return (stamps as IdentityStampsData).humanityScore;
      } catch {
        return null;
      }
    },
    [program, publicKey]
  );

  const checkThreshold = useCallback(
    async (user?: PublicKey): Promise<boolean> => {
      const target = user || publicKey;
      if (!program || !target) return false;

      try {
        const [stampsPda] = deriveIdentityStampsPDA(target);
        // @ts-ignore
        const stamps = await program.account.identityStamps.fetch(stampsPda);
        return (stamps as IdentityStampsData).thresholdReached;
      } catch {
        return false;
      }
    },
    [program, publicKey]
  );

  return {
    // State
    sybilConfig,
    identityStamps,
    loading,
    error,
    // Fetch
    fetchSybilConfig,
    fetchIdentityStamps,
    // Instructions (oracle only)
    addIdentityStamp,
    removeIdentityStamp,
    // Instructions
    recalculateHumanityScore,
    // Utilities
    getHumanityScore,
    checkThreshold,
  };
}
