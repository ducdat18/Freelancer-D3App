/**
 * Milestones Query Hook
 *
 * Wraps milestone fetching with TanStack Query caching.
 * Provides queries for milestone config, individual milestones, and all milestones for a job.
 * Includes mutations with optimistic updates for fund/submit/approve.
 */

import { useQuery } from '@tanstack/react-query';
import { useWallet } from '@solana/wallet-adapter-react';
import { web3, BN } from '@coral-xyz/anchor';
import { useSolanaProgram } from '../useSolanaProgram';
import {
  deriveJobMilestoneConfigPDA,
  deriveMilestonePDA,
  deriveMilestoneEscrowPDA,
} from '../../utils/pda';
import { retryWithBackoff } from '../../utils/rpcRetry';
import { queryKeys } from './queryKeys';
import { milestoneCacheConfig } from './cacheConfig';
import { useOptimisticMutation } from '../useOptimisticMutations';
import type {
  MilestoneConfigData,
  MilestoneData,
  MilestoneEscrowData,
} from '../useMilestones';
import type { PublicKey } from '../../types/solana';

const { SystemProgram, LAMPORTS_PER_SOL } = web3;

/**
 * Fetch milestone config for a job.
 */
export function useMilestoneConfigQuery(jobPubkey: PublicKey | null) {
  const { program } = useSolanaProgram();
  const jobKey = jobPubkey?.toBase58() || '';

  return useQuery({
    queryKey: queryKeys.milestones.config(jobKey),
    queryFn: async (): Promise<MilestoneConfigData | null> => {
      if (!program || !jobPubkey) return null;

      return retryWithBackoff(async () => {
        const [configPda] = deriveJobMilestoneConfigPDA(jobPubkey);
        // @ts-ignore
        const config = await program.account.jobMilestoneConfig.fetch(configPda);
        return config as MilestoneConfigData;
      }, { maxRetries: 3, baseDelayMs: 1000 });
    },
    enabled: !!program && !!jobPubkey,
    ...milestoneCacheConfig,
  });
}

/**
 * Fetch all milestones for a job.
 * Depends on milestone config to know how many to fetch.
 */
export function useMilestonesForJobQuery(jobPubkey: PublicKey | null) {
  const { program } = useSolanaProgram();
  const jobKey = jobPubkey?.toBase58() || '';
  const { data: config } = useMilestoneConfigQuery(jobPubkey);

  return useQuery({
    queryKey: queryKeys.milestones.forJob(jobKey),
    queryFn: async (): Promise<MilestoneData[]> => {
      if (!program || !jobPubkey || !config) return [];

      const milestones: MilestoneData[] = [];
      for (let i = 0; i < config.createdCount; i++) {
        try {
          const [milestonePda] = deriveMilestonePDA(jobPubkey, i);
          // @ts-ignore
          const ms = await program.account.milestone.fetch(milestonePda);
          milestones.push(ms as MilestoneData);
        } catch {
          // Milestone not found, skip
        }
      }
      return milestones;
    },
    enabled: !!program && !!jobPubkey && !!config && config.createdCount > 0,
    ...milestoneCacheConfig,
  });
}

/**
 * Fetch milestone escrow data.
 */
export function useMilestoneEscrowQuery(milestonePubkey: PublicKey | null) {
  const { program } = useSolanaProgram();
  const msKey = milestonePubkey?.toBase58() || '';

  return useQuery({
    queryKey: queryKeys.escrow.milestoneEscrow(msKey),
    queryFn: async (): Promise<MilestoneEscrowData | null> => {
      if (!program || !milestonePubkey) return null;

      return retryWithBackoff(async () => {
        const [escrowPda] = deriveMilestoneEscrowPDA(milestonePubkey);
        // @ts-ignore
        const escrow = await program.account.milestoneEscrow.fetch(escrowPda);
        return escrow as MilestoneEscrowData;
      }, { maxRetries: 3, baseDelayMs: 1000 });
    },
    enabled: !!program && !!milestonePubkey,
    ...milestoneCacheConfig,
  });
}

/**
 * Fund milestone with optimistic update.
 */
export function useFundMilestoneMutation(jobPubkey: PublicKey | null) {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();
  const jobKey = jobPubkey?.toBase58() || '';

  return useOptimisticMutation({
    mutationFn: async ({
      milestoneIndex,
      amountSol,
    }: {
      milestoneIndex: number;
      amountSol: number;
    }) => {
      if (!program || !publicKey || !jobPubkey)
        throw new Error('Wallet not connected');

      const [milestonePda] = deriveMilestonePDA(jobPubkey, milestoneIndex);
      const [escrowPda] = deriveMilestoneEscrowPDA(milestonePda);
      const [configPda] = deriveJobMilestoneConfigPDA(jobPubkey);
      const amount = new BN(amountSol * LAMPORTS_PER_SOL);

      // @ts-ignore
      const tx = await program.methods
        .fundMilestone(amount)
        .accounts({
          milestoneEscrow: escrowPda,
          milestone: milestonePda,
          milestoneConfig: configPda,
          job: jobPubkey,
          client: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ skipPreflight: false, commitment: 'confirmed' });

      return { signature: tx, escrowPda };
    },
    invalidateKeys: [
      queryKeys.milestones.forJob(jobKey),
      queryKeys.milestones.config(jobKey),
      queryKeys.balance.wallet(publicKey?.toBase58() || ''),
    ],
  });
}

/**
 * Submit milestone work.
 */
export function useSubmitMilestoneWorkMutation(jobPubkey: PublicKey | null) {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();
  const jobKey = jobPubkey?.toBase58() || '';

  return useOptimisticMutation({
    mutationFn: async ({
      milestoneIndex,
      deliverableUri,
    }: {
      milestoneIndex: number;
      deliverableUri: string;
    }) => {
      if (!program || !publicKey || !jobPubkey)
        throw new Error('Wallet not connected');

      const [milestonePda] = deriveMilestonePDA(jobPubkey, milestoneIndex);

      // @ts-ignore
      const tx = await program.methods
        .submitMilestoneWork(deliverableUri)
        .accounts({
          milestone: milestonePda,
          job: jobPubkey,
          freelancer: publicKey,
        })
        .rpc({ skipPreflight: false, commitment: 'confirmed' });

      return { signature: tx };
    },
    invalidateKeys: [
      queryKeys.milestones.forJob(jobKey),
      queryKeys.jobs.detail(jobKey),
    ],
    optimisticUpdate: {
      queryKey: queryKeys.milestones.forJob(jobKey),
      updater: (old: MilestoneData[] | null, vars: { milestoneIndex: number }) => {
        if (!old) return old;
        return old.map((ms, i) =>
          i === vars.milestoneIndex
            ? { ...ms, status: { submitted: {} } }
            : ms
        );
      },
    },
  });
}

/**
 * Approve milestone with optimistic update.
 */
export function useApproveMilestoneMutation(jobPubkey: PublicKey | null) {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();
  const jobKey = jobPubkey?.toBase58() || '';

  return useOptimisticMutation({
    mutationFn: async ({
      milestoneIndex,
      freelancerPubkey,
    }: {
      milestoneIndex: number;
      freelancerPubkey: PublicKey;
    }) => {
      if (!program || !publicKey || !jobPubkey)
        throw new Error('Wallet not connected');

      const [milestonePda] = deriveMilestonePDA(jobPubkey, milestoneIndex);
      const [escrowPda] = deriveMilestoneEscrowPDA(milestonePda);
      const [configPda] = deriveJobMilestoneConfigPDA(jobPubkey);

      // @ts-ignore
      const tx = await program.methods
        .approveMilestone()
        .accounts({
          milestone: milestonePda,
          milestoneEscrow: escrowPda,
          milestoneConfig: configPda,
          job: jobPubkey,
          client: publicKey,
          freelancer: freelancerPubkey,
        })
        .rpc({ skipPreflight: false, commitment: 'confirmed' });

      return { signature: tx };
    },
    invalidateKeys: [
      queryKeys.milestones.forJob(jobKey),
      queryKeys.milestones.config(jobKey),
      queryKeys.balance.wallet(publicKey?.toBase58() || ''),
      queryKeys.jobs.detail(jobKey),
    ],
    optimisticUpdate: {
      queryKey: queryKeys.milestones.forJob(jobKey),
      updater: (old: MilestoneData[] | null, vars: { milestoneIndex: number }) => {
        if (!old) return old;
        return old.map((ms, i) =>
          i === vars.milestoneIndex
            ? { ...ms, status: { approved: {} } }
            : ms
        );
      },
    },
  });
}
