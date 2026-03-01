/**
 * Escrow Query Hook
 *
 * Wraps escrow account fetching with TanStack Query caching.
 * Provides mutations with optimistic updates for deposit/release/submit.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@solana/wallet-adapter-react';
import { web3, BN } from '@coral-xyz/anchor';
import { useSolanaProgram } from '../useSolanaProgram';
import { deriveEscrowPDA, deriveWorkSubmissionPDA } from '../../utils/pda';
import { retryWithBackoff } from '../../utils/rpcRetry';
import { queryKeys } from './queryKeys';
import { escrowCacheConfig } from './cacheConfig';
import { useOptimisticMutation } from '../useOptimisticMutations';
import type { EscrowData } from '../useEscrow';
import type { PublicKey } from '../../types/solana';

const { SystemProgram, LAMPORTS_PER_SOL } = web3;

/**
 * Fetch escrow data for a job with caching.
 */
export function useEscrowDetailQuery(jobPubkey: PublicKey | null) {
  const { program } = useSolanaProgram();
  const jobKey = jobPubkey?.toBase58() || '';

  return useQuery({
    queryKey: queryKeys.escrow.detail(jobKey),
    queryFn: async (): Promise<EscrowData | null> => {
      if (!program || !jobPubkey) return null;

      try {
        return await retryWithBackoff(
          async () => {
            const [escrowPda] = deriveEscrowPDA(jobPubkey);
            // @ts-ignore
            const escrow = await program.account.escrow.fetch(escrowPda);
            return escrow as EscrowData;
          },
          { maxRetries: 3, baseDelayMs: 1000 }
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Escrow not created yet — expected for open jobs with no accepted bid
        if (msg.includes('Account does not exist') || msg.includes('has no data')) {
          return null;
        }
        throw err;
      }
    },
    enabled: !!program && !!jobPubkey,
    ...escrowCacheConfig,
  });
}

/**
 * Deposit funds into escrow with optimistic update.
 */
export function useDepositEscrowMutation(jobPubkey: PublicKey | null) {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();
  const jobKey = jobPubkey?.toBase58() || '';

  return useOptimisticMutation({
    mutationFn: async ({ amountSol }: { amountSol: number }) => {
      if (!program || !publicKey || !jobPubkey)
        throw new Error('Wallet not connected');

      const [escrowPda] = deriveEscrowPDA(jobPubkey);
      const amount = new BN(amountSol * LAMPORTS_PER_SOL);

      // @ts-ignore
      const tx = await program.methods
        .depositEscrow(amount)
        .accounts({
          escrow: escrowPda,
          job: jobPubkey,
          client: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ skipPreflight: false, commitment: 'confirmed', maxRetries: 3 });

      return { signature: tx, escrowPda };
    },
    invalidateKeys: [
      queryKeys.escrow.detail(jobKey),
      queryKeys.balance.wallet(publicKey?.toBase58() || ''),
      queryKeys.jobs.detail(jobKey),
    ],
    optimisticUpdate: {
      queryKey: queryKeys.escrow.detail(jobKey),
      updater: (old: EscrowData | null, vars: { amountSol: number }) => {
        if (!old) return old;
        return {
          ...old,
          locked: true,
          amount: new BN(vars.amountSol * LAMPORTS_PER_SOL),
        };
      },
    },
  });
}

/**
 * Submit work deliverables with cache invalidation.
 */
export function useSubmitWorkMutation(jobPubkey: PublicKey | null) {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();
  const jobKey = jobPubkey?.toBase58() || '';

  return useOptimisticMutation({
    mutationFn: async ({ deliverableUri }: { deliverableUri: string }) => {
      if (!program || !publicKey || !jobPubkey)
        throw new Error('Wallet not connected');

      const [workSubmissionPda] = deriveWorkSubmissionPDA(jobPubkey);

      // @ts-ignore
      const tx = await program.methods
        .submitWork(deliverableUri)
        .accounts({
          workSubmission: workSubmissionPda,
          job: jobPubkey,
          freelancer: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ skipPreflight: false, commitment: 'confirmed', maxRetries: 3 });

      return { signature: tx, workSubmissionPda };
    },
    invalidateKeys: [
      queryKeys.escrow.detail(jobKey),
      queryKeys.jobs.detail(jobKey),
      queryKeys.jobs.lists(),
    ],
  });
}

/**
 * Release escrow payment with cache invalidation.
 */
export function useReleaseEscrowMutation(jobPubkey: PublicKey | null) {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();
  const jobKey = jobPubkey?.toBase58() || '';

  return useOptimisticMutation({
    mutationFn: async ({ freelancerPubkey }: { freelancerPubkey: PublicKey }) => {
      if (!program || !publicKey || !jobPubkey)
        throw new Error('Wallet not connected');

      const [escrowPda] = deriveEscrowPDA(jobPubkey);

      // @ts-ignore
      const tx = await program.methods
        .releaseEscrow()
        .accounts({
          escrow: escrowPda,
          job: jobPubkey,
          freelancer: freelancerPubkey,
          client: publicKey,
        })
        .rpc();

      return { signature: tx };
    },
    invalidateKeys: [
      queryKeys.escrow.detail(jobKey),
      queryKeys.balance.wallet(publicKey?.toBase58() || ''),
      queryKeys.jobs.detail(jobKey),
      queryKeys.jobs.lists(),
    ],
    optimisticUpdate: {
      queryKey: queryKeys.escrow.detail(jobKey),
      updater: (old: EscrowData | null) => {
        if (!old) return old;
        return { ...old, released: true, locked: false };
      },
    },
  });
}
