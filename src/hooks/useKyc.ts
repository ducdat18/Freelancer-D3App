import { useCallback, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { web3 } from '@coral-xyz/anchor';
import { useSolanaProgram } from './useSolanaProgram';
import { deriveKycPDA } from '../utils/pda';

export type KycStatusOnChain = 'pending' | 'verified' | 'rejected' | 'none';

export interface KycRecordOnChain {
  authority: string;
  status: KycStatusOnChain;
  idType: 'national_id' | 'passport' | 'drivers_license';
  submittedAt: number;
  verifiedAt: number;
  faceDistanceBp: number;
}

function parseStatus(raw: any): KycStatusOnChain {
  if (!raw) return 'none';
  if (raw.verified !== undefined) return 'verified';
  if (raw.rejected !== undefined) return 'rejected';
  if (raw.pending !== undefined) return 'pending';
  return 'none';
}

function parseIdType(raw: any): KycRecordOnChain['idType'] {
  if (!raw) return 'national_id';
  if (raw.passport !== undefined) return 'passport';
  if (raw.driversLicense !== undefined) return 'drivers_license';
  return 'national_id';
}

function toIdTypeArg(idType: KycRecordOnChain['idType']) {
  if (idType === 'passport') return { passport: {} };
  if (idType === 'drivers_license') return { driversLicense: {} };
  return { nationalId: {} };
}

export function useKyc() {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKycRecord = useCallback(async (address: web3.PublicKey): Promise<KycRecordOnChain | null> => {
    if (!program) return null;
    try {
      const [pda] = deriveKycPDA(address);
      // @ts-ignore
      const record = await program.account.kycRecord.fetch(pda);
      return {
        authority: record.authority.toBase58(),
        status: parseStatus(record.status),
        idType: parseIdType(record.idType),
        submittedAt: record.submittedAt.toNumber(),
        verifiedAt: record.verifiedAt.toNumber(),
        faceDistanceBp: record.faceDistanceBp,
      };
    } catch {
      return null;
    }
  }, [program]);

  const submitKyc = useCallback(async (idType: KycRecordOnChain['idType']): Promise<string> => {
    if (!program || !publicKey) throw new Error('Wallet not connected');
    setLoading(true);
    setError(null);
    try {
      const [kycPda] = deriveKycPDA(publicKey);
      // @ts-ignore
      const tx = await program.methods
        .submitKyc(toIdTypeArg(idType))
        .accounts({
          kycRecord: kycPda,
          user: publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();
      return tx;
    } catch (err: any) {
      setError(err.message ?? String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey]);

  const finalizeKyc = useCallback(async (
    idType: KycRecordOnChain['idType'],
    distance: number,
    matched: boolean,
  ): Promise<string> => {
    if (!program || !publicKey) throw new Error('Wallet not connected');
    setLoading(true);
    setError(null);
    try {
      const [kycPda] = deriveKycPDA(publicKey);
      // Convert float distance to basis points (x10000), capped at u32 max
      const faceDistanceBp = Math.min(Math.round(distance * 10000), 65535);
      // @ts-ignore
      const tx = await program.methods
        .finalizeKyc(toIdTypeArg(idType), faceDistanceBp, matched)
        .accounts({
          kycRecord: kycPda,
          user: publicKey,
        })
        .rpc();
      return tx;
    } catch (err: any) {
      setError(err.message ?? String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey]);

  const resetKycOnChain = useCallback(async (): Promise<string> => {
    if (!program || !publicKey) throw new Error('Wallet not connected');
    setLoading(true);
    setError(null);
    try {
      const [kycPda] = deriveKycPDA(publicKey);
      // @ts-ignore
      const tx = await program.methods
        .resetKyc()
        .accounts({
          kycRecord: kycPda,
          user: publicKey,
        })
        .rpc();
      return tx;
    } catch (err: any) {
      setError(err.message ?? String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey]);

  return { fetchKycRecord, submitKyc, finalizeKyc, resetKycOnChain, loading, error };
}

/** Fetch on-chain KYC status for any address (read-only, no hook state) */
export async function fetchKycStatusOnChain(
  program: any,
  address: web3.PublicKey,
): Promise<KycStatusOnChain> {
  if (!program) return 'none';
  try {
    const [pda] = deriveKycPDA(address);
    // @ts-ignore
    const record = await program.account.kycRecord.fetch(pda);
    return parseStatus(record.status);
  } catch {
    return 'none';
  }
}
