import { useCallback, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { web3 } from "@coral-xyz/anchor";
import { useSolanaProgram } from "./useSolanaProgram";
import { deriveRecoveryConfigPDA, deriveRecoveryRequestPDA } from "../utils/pda";
import type { RecoveryConfigData, RecoveryRequestData } from "../types";

const { PublicKey } = web3;

export function useSocialRecovery() {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();
  const [recoveryConfig, setRecoveryConfig] = useState<RecoveryConfigData | null>(null);
  const [recoveryRequest, setRecoveryRequest] = useState<RecoveryRequestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecoveryConfig = useCallback(async (owner?: web3.PublicKey) => {
    if (!program) return null;
    // @ts-ignore
    if (!program.account?.recoveryConfig) return null; // not deployed in current IDL
    try {
      setLoading(true);
      const userKey = owner || publicKey;
      if (!userKey) return null;
      const [configPDA] = deriveRecoveryConfigPDA(userKey);
      // @ts-ignore
      const config = await program.account.recoveryConfig.fetch(configPDA);
      const data: RecoveryConfigData = {
        owner: config.owner.toString(),
        guardians: config.guardians.map((g: web3.PublicKey) => g.toString()),
        threshold: config.threshold,
        timelockPeriod: config.timelockPeriod.toNumber(),
        active: config.active,
        createdAt: config.createdAt.toNumber(),
        updatedAt: config.updatedAt.toNumber(),
      };
      setRecoveryConfig(data);
      return data;
    } catch (err: any) {
      // "Account does not exist" is expected for users who haven't set up recovery yet
      if (!err.message?.includes('has no instructions')) setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey]);

  const fetchRecoveryRequest = useCallback(async (owner?: web3.PublicKey) => {
    if (!program) return null;
    // @ts-ignore
    if (!program.account?.recoveryRequest) return null; // not deployed in current IDL
    try {
      setLoading(true);
      const userKey = owner || publicKey;
      if (!userKey) return null;
      const [requestPDA] = deriveRecoveryRequestPDA(userKey);
      // @ts-ignore
      const request = await program.account.recoveryRequest.fetch(requestPDA);
      const data: RecoveryRequestData = {
        owner: request.owner.toString(),
        newOwner: request.newOwner.toString(),
        initiatedBy: request.initiatedBy.toString(),
        approvals: request.approvals.map((a: web3.PublicKey) => a.toString()),
        initiatedAt: request.initiatedAt.toNumber(),
        executableAt: request.executableAt.toNumber(),
        executed: request.executed,
        cancelled: request.cancelled,
      };
      setRecoveryRequest(data);
      return data;
    } catch (err: any) {
      // "Account does not exist" is expected — no active recovery request
      if (!err.message?.includes('has no instructions')) setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey]);

  const setupRecovery = useCallback(async (
    guardians: string[],
    threshold: number,
    timelockPeriod: number,
  ) => {
    if (!program || !publicKey) throw new Error("Wallet not connected");
    try {
      setLoading(true);
      setError(null);
      const guardianKeys = guardians.map(g => new PublicKey(g));
      const [configPDA] = deriveRecoveryConfigPDA(publicKey);
      // @ts-ignore
      const tx = await program.methods
        .setupRecovery(guardianKeys, threshold, timelockPeriod)
        .accounts({
          recoveryConfig: configPDA,
          owner: publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();
      await fetchRecoveryConfig();
      return tx;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey, fetchRecoveryConfig]);

  const updateGuardians = useCallback(async (
    newGuardians: string[],
    newThreshold: number,
  ) => {
    if (!program || !publicKey) throw new Error("Wallet not connected");
    try {
      setLoading(true);
      setError(null);
      const guardianKeys = newGuardians.map(g => new PublicKey(g));
      const [configPDA] = deriveRecoveryConfigPDA(publicKey);
      // @ts-ignore
      const tx = await program.methods
        .updateGuardians(guardianKeys, newThreshold)
        .accounts({
          recoveryConfig: configPDA,
          owner: publicKey,
        })
        .rpc();
      await fetchRecoveryConfig();
      return tx;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey, fetchRecoveryConfig]);

  const initiateRecovery = useCallback(async (
    ownerAddress: string,
    newOwnerAddress: string,
  ) => {
    if (!program || !publicKey) throw new Error("Wallet not connected");
    try {
      setLoading(true);
      setError(null);
      const ownerKey = new PublicKey(ownerAddress);
      const newOwnerKey = new PublicKey(newOwnerAddress);
      const [configPDA] = deriveRecoveryConfigPDA(ownerKey);
      const [requestPDA] = deriveRecoveryRequestPDA(ownerKey);
      // @ts-ignore
      const tx = await program.methods
        .initiateRecovery(newOwnerKey)
        .accounts({
          recoveryConfig: configPDA,
          recoveryRequest: requestPDA,
          guardian: publicKey,
          systemProgram: web3.SystemProgram.programId,
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

  const approveRecovery = useCallback(async (ownerAddress: string) => {
    if (!program || !publicKey) throw new Error("Wallet not connected");
    try {
      setLoading(true);
      setError(null);
      const ownerKey = new PublicKey(ownerAddress);
      const [configPDA] = deriveRecoveryConfigPDA(ownerKey);
      const [requestPDA] = deriveRecoveryRequestPDA(ownerKey);
      // @ts-ignore
      const tx = await program.methods
        .approveRecovery()
        .accounts({
          recoveryConfig: configPDA,
          recoveryRequest: requestPDA,
          guardian: publicKey,
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

  const executeRecovery = useCallback(async (ownerAddress: string) => {
    if (!program || !publicKey) throw new Error("Wallet not connected");
    try {
      setLoading(true);
      setError(null);
      const ownerKey = new PublicKey(ownerAddress);
      const [configPDA] = deriveRecoveryConfigPDA(ownerKey);
      const [requestPDA] = deriveRecoveryRequestPDA(ownerKey);
      // @ts-ignore
      const tx = await program.methods
        .executeRecovery()
        .accounts({
          recoveryConfig: configPDA,
          recoveryRequest: requestPDA,
          executor: publicKey,
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

  const cancelRecovery = useCallback(async () => {
    if (!program || !publicKey) throw new Error("Wallet not connected");
    try {
      setLoading(true);
      setError(null);
      const [configPDA] = deriveRecoveryConfigPDA(publicKey);
      const [requestPDA] = deriveRecoveryRequestPDA(publicKey);
      // @ts-ignore
      const tx = await program.methods
        .cancelRecovery()
        .accounts({
          recoveryConfig: configPDA,
          recoveryRequest: requestPDA,
          owner: publicKey,
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
    recoveryConfig,
    recoveryRequest,
    loading,
    error,
    fetchRecoveryConfig,
    fetchRecoveryRequest,
    setupRecovery,
    updateGuardians,
    initiateRecovery,
    approveRecovery,
    executeRecovery,
    cancelRecovery,
  };
}
