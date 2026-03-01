/**
 * Staking Dispute Query Hook
 *
 * Wraps staking dispute system fetching with TanStack Query caching.
 * Provides queries for config, registry, stakes, selections, and votes.
 * Includes mutations with optimistic updates for stake/vote/claim.
 */

import { useQuery } from '@tanstack/react-query';
import { useWallet } from '@solana/wallet-adapter-react';
import { web3, BN } from '@coral-xyz/anchor';
import { useSolanaProgram } from '../useSolanaProgram';
import {
  deriveDisputeConfigPDA,
  deriveJurorRegistryPDA,
  deriveJurorStakePDA,
  deriveJurorSelectionPDA,
  deriveStakedVotePDA,
  deriveEscrowPDA,
} from '../../utils/pda';
import { retryWithBackoff } from '../../utils/rpcRetry';
import { queryKeys } from './queryKeys';
import {
  disputeConfigCacheConfig,
  disputeDetailCacheConfig,
  stakeCacheConfig,
} from './cacheConfig';
import { useOptimisticMutation } from '../useOptimisticMutations';
import type {
  DisputeConfigData,
  JurorRegistryData,
  JurorStakeData,
  JurorSelectionData,
  StakedVoteRecordData,
} from '../useStakingDispute';
import type { PublicKey } from '../../types/solana';

const { SystemProgram } = web3;
const TOKEN_PROGRAM_ID = new web3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

// ==================== CONFIG QUERIES ====================

/**
 * Fetch dispute config (singleton, nearly static).
 */
export function useDisputeConfigQuery() {
  const { program } = useSolanaProgram();

  return useQuery({
    queryKey: queryKeys.disputes.config(),
    queryFn: async (): Promise<DisputeConfigData | null> => {
      if (!program) return null;

      return retryWithBackoff(async () => {
        const [configPda] = deriveDisputeConfigPDA();
        // @ts-ignore
        return (await program.account.disputeConfig.fetch(configPda)) as DisputeConfigData;
      }, { maxRetries: 3, baseDelayMs: 1000 });
    },
    enabled: !!program,
    ...disputeConfigCacheConfig,
  });
}

/**
 * Fetch juror registry (singleton).
 */
export function useJurorRegistryQuery() {
  const { program } = useSolanaProgram();

  return useQuery({
    queryKey: queryKeys.disputes.registry(),
    queryFn: async (): Promise<JurorRegistryData | null> => {
      if (!program) return null;

      return retryWithBackoff(async () => {
        const [registryPda] = deriveJurorRegistryPDA();
        // @ts-ignore
        return (await program.account.jurorRegistry.fetch(registryPda)) as JurorRegistryData;
      }, { maxRetries: 3, baseDelayMs: 1000 });
    },
    enabled: !!program,
    ...stakeCacheConfig,
  });
}

// ==================== STAKE QUERIES ====================

/**
 * Fetch juror stake data for a specific juror.
 */
export function useJurorStakeQuery(jurorPubkey: PublicKey | null) {
  const { program } = useSolanaProgram();
  const jurorKey = jurorPubkey?.toBase58() || '';

  return useQuery({
    queryKey: queryKeys.disputes.stake(jurorKey),
    queryFn: async (): Promise<JurorStakeData | null> => {
      if (!program || !jurorPubkey) return null;

      return retryWithBackoff(async () => {
        const [stakePda] = deriveJurorStakePDA(jurorPubkey);
        // @ts-ignore
        return (await program.account.jurorStake.fetch(stakePda)) as JurorStakeData;
      }, { maxRetries: 3, baseDelayMs: 1000 });
    },
    enabled: !!program && !!jurorPubkey,
    ...stakeCacheConfig,
  });
}

// ==================== DISPUTE-SPECIFIC QUERIES ====================

/**
 * Fetch juror selection for a dispute.
 */
export function useJurorSelectionQuery(disputePubkey: PublicKey | null) {
  const { program } = useSolanaProgram();
  const disputeKey = disputePubkey?.toBase58() || '';

  return useQuery({
    queryKey: queryKeys.disputes.selection(disputeKey),
    queryFn: async (): Promise<JurorSelectionData | null> => {
      if (!program || !disputePubkey) return null;

      return retryWithBackoff(async () => {
        const [selectionPda] = deriveJurorSelectionPDA(disputePubkey);
        // @ts-ignore
        return (await program.account.disputeJurorSelection.fetch(selectionPda)) as JurorSelectionData;
      }, { maxRetries: 3, baseDelayMs: 1000 });
    },
    enabled: !!program && !!disputePubkey,
    ...disputeDetailCacheConfig,
  });
}

/**
 * Fetch a staked vote record for a juror on a dispute.
 */
export function useStakedVoteQuery(
  disputePubkey: PublicKey | null,
  jurorPubkey: PublicKey | null
) {
  const { program } = useSolanaProgram();
  const disputeKey = disputePubkey?.toBase58() || '';
  const jurorKey = jurorPubkey?.toBase58() || '';

  return useQuery({
    queryKey: queryKeys.disputes.vote(disputeKey, jurorKey),
    queryFn: async (): Promise<StakedVoteRecordData | null> => {
      if (!program || !disputePubkey || !jurorPubkey) return null;

      try {
        const [votePda] = deriveStakedVotePDA(disputePubkey, jurorPubkey);
        // @ts-ignore
        return (await program.account.stakedVoteRecord.fetch(votePda)) as StakedVoteRecordData;
      } catch {
        return null;
      }
    },
    enabled: !!program && !!disputePubkey && !!jurorPubkey,
    ...disputeDetailCacheConfig,
  });
}

/**
 * Check if a juror is selected for a dispute.
 */
export function useIsSelectedJurorQuery(
  disputePubkey: PublicKey | null,
  jurorPubkey: PublicKey | null
) {
  const { data: selection } = useJurorSelectionQuery(disputePubkey);

  const jurorKey = jurorPubkey?.toBase58() || '';
  const isSelected = selection?.selectedJurors?.some(
    (j) => j.toString() === jurorKey
  ) ?? false;

  return { isSelected, selection };
}

// ==================== MUTATIONS ====================

/**
 * Stake for jury duty with cache invalidation.
 */
export function useStakeForJuryMutation() {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();

  return useOptimisticMutation({
    mutationFn: async ({
      amount,
      jurorTokenAccount,
      juryVault,
    }: {
      amount: BN;
      jurorTokenAccount: PublicKey;
      juryVault: PublicKey;
    }) => {
      if (!program || !publicKey) throw new Error('Wallet not connected');

      const [stakePda] = deriveJurorStakePDA(publicKey);
      const [configPda] = deriveDisputeConfigPDA();
      const [registryPda] = deriveJurorRegistryPDA();

      // @ts-ignore
      const tx = await program.methods
        .stakeForJury(amount)
        .accounts({
          jurorStake: stakePda,
          disputeConfig: configPda,
          jurorRegistry: registryPda,
          jurorTokenAccount,
          juryVault,
          juror: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ skipPreflight: false, commitment: 'confirmed' });

      return { signature: tx, stakePda };
    },
    invalidateKeys: [
      queryKeys.disputes.stake(publicKey?.toBase58() || ''),
      queryKeys.disputes.registry(),
      queryKeys.balance.wallet(publicKey?.toBase58() || ''),
    ],
  });
}

/**
 * Cast staked vote with optimistic update.
 */
export function useCastStakedVoteMutation(disputePubkey: PublicKey | null) {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();
  const disputeKey = disputePubkey?.toBase58() || '';

  return useOptimisticMutation({
    mutationFn: async ({ voteForClient }: { voteForClient: boolean }) => {
      if (!program || !publicKey || !disputePubkey)
        throw new Error('Wallet not connected');

      const [selectionPda] = deriveJurorSelectionPDA(disputePubkey);
      const [votePda] = deriveStakedVotePDA(disputePubkey, publicKey);
      const [stakePda] = deriveJurorStakePDA(publicKey);
      const [configPda] = deriveDisputeConfigPDA();

      // @ts-ignore
      const tx = await program.methods
        .castStakedVote(voteForClient)
        .accounts({
          stakedVoteRecord: votePda,
          jurorSelection: selectionPda,
          jurorStake: stakePda,
          dispute: disputePubkey,
          disputeConfig: configPda,
          juror: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ skipPreflight: false, commitment: 'confirmed' });

      return { signature: tx, votePda };
    },
    invalidateKeys: [
      queryKeys.disputes.vote(disputeKey, publicKey?.toBase58() || ''),
      queryKeys.disputes.selection(disputeKey),
      queryKeys.disputes.detail(disputeKey),
    ],
  });
}

/**
 * Claim staking reward.
 */
export function useClaimStakingRewardMutation(disputePubkey: PublicKey | null) {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();
  const disputeKey = disputePubkey?.toBase58() || '';

  return useOptimisticMutation({
    mutationFn: async ({
      jurorTokenAccount,
      juryVault,
    }: {
      jurorTokenAccount: PublicKey;
      juryVault: PublicKey;
    }) => {
      if (!program || !publicKey || !disputePubkey)
        throw new Error('Wallet not connected');

      const [selectionPda] = deriveJurorSelectionPDA(disputePubkey);
      const [votePda] = deriveStakedVotePDA(disputePubkey, publicKey);
      const [stakePda] = deriveJurorStakePDA(publicKey);
      const [configPda] = deriveDisputeConfigPDA();

      // @ts-ignore
      const tx = await program.methods
        .claimStakingReward()
        .accounts({
          jurorSelection: selectionPda,
          dispute: disputePubkey,
          stakedVoteRecord: votePda,
          jurorStake: stakePda,
          disputeConfig: configPda,
          juryVault,
          jurorTokenAccount,
          juror: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc({ skipPreflight: false, commitment: 'confirmed' });

      return { signature: tx };
    },
    invalidateKeys: [
      queryKeys.disputes.vote(disputeKey, publicKey?.toBase58() || ''),
      queryKeys.disputes.stake(publicKey?.toBase58() || ''),
      queryKeys.balance.wallet(publicKey?.toBase58() || ''),
    ],
    optimisticUpdate: {
      queryKey: queryKeys.disputes.vote(disputeKey, publicKey?.toBase58() || ''),
      updater: (old: StakedVoteRecordData | null) => {
        if (!old) return old;
        return { ...old, rewardClaimed: true };
      },
    },
  });
}
