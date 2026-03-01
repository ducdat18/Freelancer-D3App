import { useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { web3, BN } from "@coral-xyz/anchor";
import { useSolanaProgram } from "./useSolanaProgram";
import {
  deriveDisputeConfigPDA,
  deriveJurorRegistryPDA,
  deriveJurorStakePDA,
  deriveJurorSelectionPDA,
  deriveStakedVotePDA,
  deriveEscrowPDA,
} from "../utils/pda";
import type { PublicKey } from "../types/solana";

const { SystemProgram } = web3;
const TOKEN_PROGRAM_ID = new web3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

export interface DisputeConfigData {
  admin: PublicKey;
  stakingTokenMint: PublicKey;
  minStakeAmount: BN;
  jurorCount: number;
  votingPeriod: BN;
  slashPercentage: number;
  rewardPercentage: number;
  quorumPercentage: number;
}

export interface JurorRegistryData {
  admin: PublicKey;
  totalJurors: number;
  jurorList: PublicKey[];
}

export interface JurorStakeData {
  juror: PublicKey;
  amount: BN;
  stakedAt: BN;
  active: boolean;
  disputesParticipated: number;
  disputesCorrect: number;
  activeDisputeCount: number;
}

export interface JurorSelectionData {
  dispute: PublicKey;
  selectedJurors: PublicKey[];
  selectionSeed: number[];
  votingDeadline: BN;
  votesCast: number;
  quorumMet: boolean;
  resolved: boolean;
}

export interface StakedVoteRecordData {
  dispute: PublicKey;
  juror: PublicKey;
  voteForClient: boolean;
  votedAt: BN;
  stakeLocked: BN;
  rewardClaimed: boolean;
  slashed: boolean;
}

export function useStakingDispute() {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();

  const initDisputeConfig = useCallback(
    async (
      stakingTokenMint: PublicKey,
      minStakeAmount: number,
      jurorCount: number,
      votingPeriod: number,
      slashPercentage: number,
      rewardPercentage: number,
      quorumPercentage: number
    ) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const [configPda] = deriveDisputeConfigPDA();

      // @ts-ignore
      const tx = await program.methods
        .initDisputeConfig(
          new BN(minStakeAmount),
          jurorCount,
          new BN(votingPeriod),
          slashPercentage,
          rewardPercentage,
          quorumPercentage
        )
        .accounts({
          disputeConfig: configPda,
          stakingTokenMint,
          admin: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ skipPreflight: false, commitment: "confirmed" });

      return { signature: tx, configPda };
    },
    [program, publicKey]
  );

  const initJurorRegistry = useCallback(async () => {
    if (!program || !publicKey) throw new Error("Wallet not connected");

    const [registryPda] = deriveJurorRegistryPDA();

    // @ts-ignore
    const tx = await program.methods
      .initJurorRegistry()
      .accounts({
        jurorRegistry: registryPda,
        admin: publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc({ skipPreflight: false, commitment: "confirmed" });

    return { signature: tx, registryPda };
  }, [program, publicKey]);

  const stakeForJury = useCallback(
    async (amount: BN, jurorTokenAccount: PublicKey, juryVault: PublicKey) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

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
        .rpc({ skipPreflight: false, commitment: "confirmed" });

      return { signature: tx, stakePda };
    },
    [program, publicKey]
  );

  const unstakeFromJury = useCallback(
    async (jurorTokenAccount: PublicKey, juryVault: PublicKey) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const [stakePda] = deriveJurorStakePDA(publicKey);
      const [configPda] = deriveDisputeConfigPDA();
      const [registryPda] = deriveJurorRegistryPDA();

      // @ts-ignore
      const tx = await program.methods
        .unstakeFromJury()
        .accounts({
          jurorStake: stakePda,
          disputeConfig: configPda,
          jurorRegistry: registryPda,
          jurorTokenAccount,
          juryVault,
          juror: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc({ skipPreflight: false, commitment: "confirmed" });

      return { signature: tx };
    },
    [program, publicKey]
  );

  const selectJurors = useCallback(
    async (disputePda: PublicKey) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const [selectionPda] = deriveJurorSelectionPDA(disputePda);
      const [configPda] = deriveDisputeConfigPDA();
      const [registryPda] = deriveJurorRegistryPDA();

      // @ts-ignore
      const tx = await program.methods
        .selectJurors()
        .accounts({
          jurorSelection: selectionPda,
          dispute: disputePda,
          disputeConfig: configPda,
          jurorRegistry: registryPda,
          authority: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ skipPreflight: false, commitment: "confirmed" });

      return { signature: tx, selectionPda };
    },
    [program, publicKey]
  );

  const castStakedVote = useCallback(
    async (disputePda: PublicKey, voteForClient: boolean) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const [selectionPda] = deriveJurorSelectionPDA(disputePda);
      const [votePda] = deriveStakedVotePDA(disputePda, publicKey);
      const [stakePda] = deriveJurorStakePDA(publicKey);
      const [configPda] = deriveDisputeConfigPDA();

      // @ts-ignore
      const tx = await program.methods
        .castStakedVote(voteForClient)
        .accounts({
          stakedVoteRecord: votePda,
          jurorSelection: selectionPda,
          jurorStake: stakePda,
          dispute: disputePda,
          disputeConfig: configPda,
          juror: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ skipPreflight: false, commitment: "confirmed" });

      return { signature: tx, votePda };
    },
    [program, publicKey]
  );

  const resolveStakedDispute = useCallback(
    async (
      disputePda: PublicKey,
      jobPda: PublicKey,
      clientPubkey: PublicKey,
      freelancerPubkey: PublicKey
    ) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const [selectionPda] = deriveJurorSelectionPDA(disputePda);
      const [escrowPda] = deriveEscrowPDA(jobPda);

      // @ts-ignore
      const tx = await program.methods
        .resolveStakedDispute()
        .accounts({
          jurorSelection: selectionPda,
          dispute: disputePda,
          escrow: escrowPda,
          job: jobPda,
          client: clientPubkey,
          freelancer: freelancerPubkey,
          resolver: publicKey,
        })
        .rpc({ skipPreflight: false, commitment: "confirmed" });

      return { signature: tx };
    },
    [program, publicKey]
  );

  const claimStakingReward = useCallback(
    async (
      disputePda: PublicKey,
      jurorTokenAccount: PublicKey,
      juryVault: PublicKey
    ) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const [selectionPda] = deriveJurorSelectionPDA(disputePda);
      const [votePda] = deriveStakedVotePDA(disputePda, publicKey);
      const [stakePda] = deriveJurorStakePDA(publicKey);
      const [configPda] = deriveDisputeConfigPDA();

      // @ts-ignore
      const tx = await program.methods
        .claimStakingReward()
        .accounts({
          jurorSelection: selectionPda,
          dispute: disputePda,
          stakedVoteRecord: votePda,
          jurorStake: stakePda,
          disputeConfig: configPda,
          juryVault,
          jurorTokenAccount,
          juror: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc({ skipPreflight: false, commitment: "confirmed" });

      return { signature: tx };
    },
    [program, publicKey]
  );

  // ==================== FETCH FUNCTIONS ====================

  const fetchDisputeConfig = useCallback(async (): Promise<DisputeConfigData | null> => {
    if (!program) return null;
    try {
      const [configPda] = deriveDisputeConfigPDA();
      // @ts-ignore
      return (await program.account.disputeConfig.fetch(configPda)) as DisputeConfigData;
    } catch {
      return null;
    }
  }, [program]);

  const fetchJurorRegistry = useCallback(async (): Promise<JurorRegistryData | null> => {
    if (!program) return null;
    try {
      const [registryPda] = deriveJurorRegistryPDA();
      // @ts-ignore
      return (await program.account.jurorRegistry.fetch(registryPda)) as JurorRegistryData;
    } catch {
      return null;
    }
  }, [program]);

  const fetchJurorStake = useCallback(
    async (jurorPubkey: PublicKey): Promise<JurorStakeData | null> => {
      if (!program) return null;
      try {
        const [stakePda] = deriveJurorStakePDA(jurorPubkey);
        // @ts-ignore
        return (await program.account.jurorStake.fetch(stakePda)) as JurorStakeData;
      } catch {
        return null;
      }
    },
    [program]
  );

  const fetchJurorSelection = useCallback(
    async (disputePda: PublicKey): Promise<JurorSelectionData | null> => {
      if (!program) return null;
      try {
        const [selectionPda] = deriveJurorSelectionPDA(disputePda);
        // @ts-ignore
        return (await program.account.disputeJurorSelection.fetch(selectionPda)) as JurorSelectionData;
      } catch {
        return null;
      }
    },
    [program]
  );

  const fetchStakedVote = useCallback(
    async (disputePda: PublicKey, jurorPubkey: PublicKey): Promise<StakedVoteRecordData | null> => {
      if (!program) return null;
      try {
        const [votePda] = deriveStakedVotePDA(disputePda, jurorPubkey);
        // @ts-ignore
        return (await program.account.stakedVoteRecord.fetch(votePda)) as StakedVoteRecordData;
      } catch {
        return null;
      }
    },
    [program]
  );

  const isSelectedJuror = useCallback(
    async (disputePda: PublicKey, jurorPubkey: PublicKey): Promise<boolean> => {
      const selection = await fetchJurorSelection(disputePda);
      if (!selection) return false;
      return selection.selectedJurors.some(
        (j) => j.toString() === jurorPubkey.toString()
      );
    },
    [fetchJurorSelection]
  );

  return {
    // Instructions
    initDisputeConfig,
    initJurorRegistry,
    stakeForJury,
    unstakeFromJury,
    selectJurors,
    castStakedVote,
    resolveStakedDispute,
    claimStakingReward,
    // Queries
    fetchDisputeConfig,
    fetchJurorRegistry,
    fetchJurorStake,
    fetchJurorSelection,
    fetchStakedVote,
    isSelectedJuror,
  };
}
