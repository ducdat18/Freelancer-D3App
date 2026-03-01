import { useCallback, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { web3, BN } from "@coral-xyz/anchor";
import { useSolanaProgram } from "./useSolanaProgram";
import {
  deriveDIDDocumentPDA,
  deriveVCAnchorPDA,
  deriveVCCounterPDA,
} from "../utils/pda";
import type { PublicKey } from "../types/solana";
import type { DIDDocumentData, VCAnchorData } from "../types";

const { SystemProgram } = web3;

export function useDID() {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();

  const [didDocument, setDidDocument] = useState<DIDDocumentData | null>(null);
  const [credentials, setCredentials] = useState<VCAnchorData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==================== FETCH FUNCTIONS ====================

  const fetchDIDDocument = useCallback(
    async (user?: PublicKey): Promise<DIDDocumentData | null> => {
      const target = user || publicKey;
      // @ts-ignore
      if (!program || !target || !program.account.didDocument) return null;

      setLoading(true);
      setError(null);

      try {
        const [didPda] = deriveDIDDocumentPDA(target);
        // @ts-ignore
        const doc = await program.account.didDocument.fetch(didPda);
        const data = doc as DIDDocumentData;
        setDidDocument(data);
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch DID document";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  const fetchUserCredentials = useCallback(
    async (user: PublicKey): Promise<VCAnchorData[]> => {
      // @ts-ignore
      if (!program || !program.account.vcCounter) return [];

      setLoading(true);
      setError(null);

      try {
        const [counterPda] = deriveVCCounterPDA(user);
        // @ts-ignore
        const counter = await program.account.vcCounter.fetch(counterPda);
        const count = (counter as any).count as number;

        const vcs: VCAnchorData[] = [];
        for (let i = 0; i < count; i++) {
          try {
            const [vcPda] = deriveVCAnchorPDA(user, i);
            // @ts-ignore
            const vc = await program.account.vcAnchor.fetch(vcPda);
            vcs.push(vc as VCAnchorData);
          } catch {
            // Skip VCs that may have been deleted or are inaccessible
          }
        }

        setCredentials(vcs);
        return vcs;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch credentials";
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [program]
  );

  // ==================== INSTRUCTION FUNCTIONS ====================

  const createDIDDocument = useCallback(async () => {
    if (!program || !publicKey) throw new Error("Wallet not connected");

      // @ts-ignore
      if (typeof (program as any).methods.createDidDocument !== 'function') throw new Error('Identity (DID) is not yet deployed on-chain');
    setLoading(true);
    setError(null);

    try {
      const [didPda] = deriveDIDDocumentPDA(publicKey);

      // @ts-ignore
      const tx = await program.methods
        .createDidDocument()
        .accounts({
          didDocument: didPda,
          owner: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ skipPreflight: false, commitment: "confirmed" });

      return { signature: tx, didPda };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create DID document";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [program, publicKey]);

  const addVerificationMethod = useCallback(
    async (methodType: number, vmPublicKey: PublicKey) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      // @ts-ignore
      if (typeof (program as any).methods.addVerificationMethod !== 'function') throw new Error('Identity (DID) is not yet deployed on-chain');
      setLoading(true);
      setError(null);

      try {
        const [didPda] = deriveDIDDocumentPDA(publicKey);

        // @ts-ignore
        const tx = await program.methods
          .addVerificationMethod(methodType, vmPublicKey)
          .accounts({
            didDocument: didPda,
            owner: publicKey,
          })
          .rpc({ skipPreflight: false, commitment: "confirmed" });

        return { signature: tx };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to add verification method";
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  const removeVerificationMethod = useCallback(
    async (methodIndex: number) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      // @ts-ignore
      if (typeof (program as any).methods.removeVerificationMethod !== 'function') throw new Error('Identity (DID) is not yet deployed on-chain');
      setLoading(true);
      setError(null);

      try {
        const [didPda] = deriveDIDDocumentPDA(publicKey);

        // @ts-ignore
        const tx = await program.methods
          .removeVerificationMethod(methodIndex)
          .accounts({
            didDocument: didPda,
            owner: publicKey,
          })
          .rpc({ skipPreflight: false, commitment: "confirmed" });

        return { signature: tx };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to remove verification method";
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  const addServiceEndpoint = useCallback(
    async (serviceType: number, endpointUri: string) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      // @ts-ignore
      if (typeof (program as any).methods.addServiceEndpoint !== 'function') throw new Error('Identity (DID) is not yet deployed on-chain');
      setLoading(true);
      setError(null);

      try {
        const [didPda] = deriveDIDDocumentPDA(publicKey);

        // @ts-ignore
        const tx = await program.methods
          .addServiceEndpoint(serviceType, endpointUri)
          .accounts({
            didDocument: didPda,
            owner: publicKey,
          })
          .rpc({ skipPreflight: false, commitment: "confirmed" });

        return { signature: tx };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to add service endpoint";
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  const verifyServiceEndpoint = useCallback(
    async (endpointIndex: number) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      // @ts-ignore
      if (typeof (program as any).methods.verifyServiceEndpoint !== 'function') throw new Error('Identity (DID) is not yet deployed on-chain');
      setLoading(true);
      setError(null);

      try {
        const [didPda] = deriveDIDDocumentPDA(publicKey);

        // @ts-ignore
        const tx = await program.methods
          .verifyServiceEndpoint(endpointIndex)
          .accounts({
            didDocument: didPda,
            owner: publicKey,
          })
          .rpc({ skipPreflight: false, commitment: "confirmed" });

        return { signature: tx };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to verify service endpoint";
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  const deactivateDID = useCallback(async () => {
    if (!program || !publicKey) throw new Error("Wallet not connected");

      // @ts-ignore
      if (typeof (program as any).methods.deactivateDid !== 'function') throw new Error('Identity (DID) is not yet deployed on-chain');
    setLoading(true);
    setError(null);

    try {
      const [didPda] = deriveDIDDocumentPDA(publicKey);

      // @ts-ignore
      const tx = await program.methods
        .deactivateDid()
        .accounts({
          didDocument: didPda,
          owner: publicKey,
        })
        .rpc({ skipPreflight: false, commitment: "confirmed" });

      return { signature: tx };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to deactivate DID";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [program, publicKey]);

  const anchorVC = useCallback(
    async (
      credentialType: string,
      metadataUri: string,
      expiresAt?: number
    ) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      // @ts-ignore
      if (typeof (program as any).methods.anchorVerifiableCredential !== 'function') throw new Error('Identity (DID) is not yet deployed on-chain');
      setLoading(true);
      setError(null);

      try {
        const [counterPda] = deriveVCCounterPDA(publicKey);

        // Fetch current counter to determine next VC index
        let currentCount = 0;
        try {
          // @ts-ignore
          const counter = await program.account.vcCounter.fetch(counterPda);
          currentCount = (counter as any).count as number;
        } catch {
          // Counter doesn't exist yet; will be initialized by the instruction
        }

        const [vcAnchorPda] = deriveVCAnchorPDA(publicKey, currentCount);
        const [didPda] = deriveDIDDocumentPDA(publicKey);

        const expiresAtArg = expiresAt ? new BN(expiresAt) : null;

        // @ts-ignore
        const tx = await program.methods
          .anchorVerifiableCredential(credentialType, metadataUri, expiresAtArg, currentCount)
          .accounts({
            vcAnchor: vcAnchorPda,
            vcCounter: counterPda,
            didDocument: didPda,
            issuer: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc({ skipPreflight: false, commitment: "confirmed" });

        return { signature: tx, vcAnchorPda, vcIndex: currentCount };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to anchor verifiable credential";
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  const revokeCredential = useCallback(
    async (vcAnchorPda: PublicKey) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");
      // @ts-ignore
      if (typeof (program as any).methods.revokeCredential !== 'function') throw new Error('Identity (DID) is not yet deployed on-chain');

      setLoading(true);
      setError(null);

      try {
        // @ts-ignore
        const tx = await program.methods
          .revokeCredential()
          .accounts({
            vcAnchor: vcAnchorPda,
            issuer: publicKey,
          })
          .rpc({ skipPreflight: false, commitment: "confirmed" });

        return { signature: tx };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to revoke credential";
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  return {
    // State
    didDocument,
    credentials,
    loading,
    error,
    // Fetch
    fetchDIDDocument,
    fetchUserCredentials,
    // Instructions
    createDIDDocument,
    addVerificationMethod,
    removeVerificationMethod,
    addServiceEndpoint,
    verifyServiceEndpoint,
    deactivateDID,
    anchorVC,
    revokeCredential,
  };
}
