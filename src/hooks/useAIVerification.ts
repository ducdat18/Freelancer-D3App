import { useCallback, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { web3 } from "@coral-xyz/anchor";
import { useSolanaProgram } from "./useSolanaProgram";
import { deriveAIOracleConfigPDA, deriveAIVerificationPDA } from "../utils/pda";
import type { AIOracleConfigData, AIVerificationResultData } from "../types";

export function useAIVerification() {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();
  const [oracleConfig, setOracleConfig] = useState<AIOracleConfigData | null>(null);
  const [verificationResult, setVerificationResult] = useState<AIVerificationResultData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOracleConfig = useCallback(async () => {
    if (!program) return null;
    try {
      setLoading(true);
      const [configPDA] = deriveAIOracleConfigPDA();
      // @ts-ignore
      const config = await program.account.aiOracleConfig.fetch(configPDA);
      const data: AIOracleConfigData = {
        admin: config.admin.toString(),
        oracleAuthorities: config.oracleAuthorities.map((o: web3.PublicKey) => o.toString()),
        minConfidence: config.minConfidence,
        minOracleConsensus: config.minOracleConsensus,
        totalVerifications: config.totalVerifications.toNumber(),
        active: config.active,
      };
      setOracleConfig(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [program]);

  const fetchVerificationResult = useCallback(async (jobPda: web3.PublicKey) => {
    if (!program) return null;
    try {
      setLoading(true);
      const [verificationPDA] = deriveAIVerificationPDA(jobPda);
      // @ts-ignore
      const result = await program.account.aiVerificationResult.fetch(verificationPDA);
      const data: AIVerificationResultData = {
        job: result.job.toString(),
        verificationType: result.verificationType,
        oracleCount: result.oracleCount,
        oracleScores: (Array.from(result.oracleScores) as number[]).slice(0, result.oracleCount),
        oracleConfidences: (Array.from(result.oracleConfidences) as number[]).slice(0, result.oracleCount),
        finalScore: result.finalScore,
        finalConfidence: result.finalConfidence,
        consensusReached: result.consensusReached,
        autoApproved: result.autoApproved,
        resultUri: result.resultUri,
        disputed: result.disputed,
        disputeReason: result.disputeReason,
        humanReviewed: result.humanReviewed,
        resolutionUri: result.resolutionUri,
      };
      setVerificationResult(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [program]);

  const requestVerification = useCallback(async (
    jobPda: web3.PublicKey,
    verificationType: number,
    deliverableUri: string,
  ) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/ai/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobAddress: jobPda.toString(),
          verificationType,
          deliverableUri,
        }),
      });
      if (!response.ok) throw new Error("Failed to request verification");
      const data = await response.json();
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const disputeVerification = useCallback(async (
    jobPda: web3.PublicKey,
    reason: string,
  ) => {
    if (!program || !publicKey) throw new Error("Wallet not connected");
    try {
      setLoading(true);
      setError(null);
      const [verificationPDA] = deriveAIVerificationPDA(jobPda);
      // @ts-ignore
      const tx = await program.methods
        .disputeAiVerification(reason)
        .accounts({
          aiVerificationResult: verificationPDA,
          disputer: publicKey,
        })
        .rpc();
      return tx;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey]);

  return {
    oracleConfig,
    verificationResult,
    loading,
    error,
    fetchOracleConfig,
    fetchVerificationResult,
    requestVerification,
    disputeVerification,
  };
}
