import { useState, useEffect, useCallback } from 'react';

export type VerificationStatus = 'none' | 'pending' | 'verified' | 'rejected';

export interface IdentityRecord {
  address: string;
  status: VerificationStatus;
  idType: 'national_id' | 'passport' | 'drivers_license';
  submittedAt: number;
  verifiedAt?: number;
  rejectedAt?: number;
  /** Euclidean distance from face comparison (0 = identical, <0.45 = same person) */
  faceDistance?: number;
}

const storageKey = (address: string) => `identity_verification_${address}`;

export function useIdentityVerification(address: string | null) {
  const [record, setRecord] = useState<IdentityRecord | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!address || typeof window === 'undefined') {
      setLoaded(true);
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey(address));
      setRecord(raw ? JSON.parse(raw) : null);
    } catch {
      setRecord(null);
    }
    setLoaded(true);
  }, [address]);

  const save = (rec: IdentityRecord) => {
    localStorage.setItem(storageKey(rec.address), JSON.stringify(rec));
    setRecord(rec);
  };

  /** Call when user starts the verification process */
  const startPending = useCallback(
    (idType: IdentityRecord['idType']) => {
      if (!address) return;
      save({
        address,
        status: 'pending',
        idType,
        submittedAt: Date.now(),
      });
    },
    [address]
  );

  /** Call with the real face comparison result */
  const finalise = useCallback(
    (idType: IdentityRecord['idType'], distance: number) => {
      if (!address) return;

      // Threshold: distance < 0.50 = verified (lenient for real-world lighting variance)
      const matched = distance < 0.50;

      const rec: IdentityRecord = {
        address,
        status: matched ? 'verified' : 'rejected',
        idType,
        submittedAt: record?.submittedAt ?? Date.now(),
        faceDistance: distance,
        ...(matched ? { verifiedAt: Date.now() } : { rejectedAt: Date.now() }),
      };
      save(rec);
    },
    [address, record]
  );

  const reset = useCallback(() => {
    if (!address) return;
    localStorage.removeItem(storageKey(address));
    setRecord(null);
  }, [address]);

  const status: VerificationStatus = record?.status ?? 'none';
  const isVerified = status === 'verified';

  return { record, status, isVerified, loaded, startPending, finalise, reset };
}

/** Lightweight helper — just checks localStorage, no state */
export function getVerificationStatus(address: string): VerificationStatus {
  if (typeof window === 'undefined') return 'none';
  try {
    const raw = localStorage.getItem(storageKey(address));
    if (!raw) return 'none';
    return (JSON.parse(raw) as IdentityRecord).status;
  } catch {
    return 'none';
  }
}
