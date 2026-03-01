import { useCallback, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { web3 } from "@coral-xyz/anchor";
import { useSolanaProgram } from "./useSolanaProgram";
import { deriveZKVerifierConfigPDA, deriveZKCredentialPDA, deriveZKCounterPDA } from "../utils/pda";
import type { ZKCredentialData } from "../types";

export function useZKCredentials() {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();
  const [credentials, setCredentials] = useState<ZKCredentialData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserCredentials = useCallback(async (user?: web3.PublicKey) => {
    if (!program) return [];
    try {
      setLoading(true);
      const userKey = user || publicKey;
      if (!userKey) return [];

      const [counterPDA] = deriveZKCounterPDA(userKey);
      let count = 0;
      try {
        // @ts-ignore
        const counter = await program.account.userZkCounter.fetch(counterPDA);
        count = counter.count;
      } catch {
        setCredentials([]);
        return [];
      }

      const creds: ZKCredentialData[] = [];
      for (let i = 0; i < count; i++) {
        try {
          const [credPDA] = deriveZKCredentialPDA(userKey, i);
          // @ts-ignore
          const cred = await program.account.zkCredential.fetch(credPDA);
          creds.push({
            user: cred.user.toString(),
            credentialType: cred.credentialType,
            commitment: new Uint8Array(cred.commitment),
            proofHash: new Uint8Array(cred.proofHash),
            publicInputsHash: new Uint8Array(cred.publicInputsHash),
            verifier: cred.verifier.toString(),
            submittedAt: cred.submittedAt.toNumber(),
            verifiedAt: cred.verifiedAt ? cred.verifiedAt.toNumber() : null,
            validUntil: cred.validUntil ? cred.validUntil.toNumber() : null,
            verified: cred.verified,
            revoked: cred.revoked,
            credentialIndex: cred.credentialIndex,
          });
        } catch {
          // Skip missing credentials
        }
      }
      setCredentials(creds);
      return creds;
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [program, publicKey]);

  const submitZKCredential = useCallback(async (
    credentialType: string,
    commitment: Uint8Array,
    proofHash: Uint8Array,
    publicInputsHash: Uint8Array,
    validUntil?: number,
  ) => {
    if (!program || !publicKey) throw new Error("Wallet not connected");
    try {
      setLoading(true);
      setError(null);
      const [counterPDA] = deriveZKCounterPDA(publicKey);

      let currentCount = 0;
      try {
        // @ts-ignore
        const counter = await program.account.userZkCounter.fetch(counterPDA);
        currentCount = counter.count;
      } catch {
        // Counter will be initialized
      }

      const [credPDA] = deriveZKCredentialPDA(publicKey, currentCount);

      // @ts-ignore
      const tx = await program.methods
        .submitZkCredential(
          credentialType,
          Array.from(commitment),
          Array.from(proofHash),
          Array.from(publicInputsHash),
          validUntil ? validUntil : null,
          currentCount,
        )
        .accounts({
          zkCredential: credPDA,
          userZkCounter: counterPDA,
          user: publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();
      await fetchUserCredentials();
      return tx;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey, fetchUserCredentials]);

  const revokeZKCredential = useCallback(async (credentialIndex: number) => {
    if (!program || !publicKey) throw new Error("Wallet not connected");
    try {
      setLoading(true);
      setError(null);
      const [credPDA] = deriveZKCredentialPDA(publicKey, credentialIndex);
      const [configPDA] = deriveZKVerifierConfigPDA();
      // @ts-ignore
      const tx = await program.methods
        .revokeZkCredential()
        .accounts({
          zkCredential: credPDA,
          zkVerifierConfig: configPDA,
          authority: publicKey,
        })
        .rpc();
      await fetchUserCredentials();
      return tx;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey, fetchUserCredentials]);

  const getVerifiedCredentials = useCallback(() => {
    return credentials.filter(c => c.verified && !c.revoked);
  }, [credentials]);

  return {
    credentials,
    loading,
    error,
    fetchUserCredentials,
    submitZKCredential,
    revokeZKCredential,
    getVerifiedCredentials,
  };
}
