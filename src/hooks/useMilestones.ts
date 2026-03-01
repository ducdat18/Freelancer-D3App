import { useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { web3, BN } from "@coral-xyz/anchor";
import { useSolanaProgram } from "./useSolanaProgram";
import {
  deriveJobMilestoneConfigPDA,
  deriveMilestonePDA,
  deriveMilestoneEscrowPDA,
  deriveMilestoneDisputePDA,
} from "../utils/pda";
import type { PublicKey } from "../types/solana";

const { SystemProgram, LAMPORTS_PER_SOL } = web3;

export interface MilestoneConfigData {
  job: PublicKey;
  client: PublicKey;
  totalMilestones: number;
  createdCount: number;
  fundedCount: number;
  approvedCount: number;
  totalFunded: BN;
}

export interface MilestoneData {
  job: PublicKey;
  milestoneIndex: number;
  title: string;
  description: string;
  amount: BN;
  status: Record<string, unknown>;
  deliverableUri: string;
  submittedAt: BN | null;
  approvedAt: BN | null;
}

export interface MilestoneEscrowData {
  job: PublicKey;
  milestone: PublicKey;
  client: PublicKey;
  freelancer: PublicKey;
  amount: BN;
  locked: boolean;
  released: boolean;
  disputed: boolean;
  createdAt: BN;
}

export function useMilestones() {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();

  const initJobMilestones = useCallback(
    async (jobPda: PublicKey, totalMilestones: number) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const [configPda] = deriveJobMilestoneConfigPDA(jobPda);

      const maxRetries = 3;
      let lastError: unknown;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // @ts-ignore
          const tx = await program.methods
            .initJobMilestones(totalMilestones)
            .accounts({
              milestoneConfig: configPda,
              job: jobPda,
              client: publicKey,
              systemProgram: SystemProgram.programId,
            })
            .rpc({ skipPreflight: false, commitment: "confirmed", maxRetries: 3 });

          return { signature: tx, configPda };
        } catch (error: any) {
          lastError = error;
          if (error.message?.includes("Blockhash not found") && attempt < maxRetries) {
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }
          throw error;
        }
      }
      throw lastError;
    },
    [program, publicKey]
  );

  const createMilestone = useCallback(
    async (
      jobPda: PublicKey,
      milestoneIndex: number,
      title: string,
      description: string,
      amountSol: number
    ) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const [milestonePda] = deriveMilestonePDA(jobPda, milestoneIndex);
      const [configPda] = deriveJobMilestoneConfigPDA(jobPda);
      const amount = new BN(amountSol * LAMPORTS_PER_SOL);

      // @ts-ignore
      const tx = await program.methods
        .createMilestone(milestoneIndex, title, description, amount)
        .accounts({
          milestone: milestonePda,
          milestoneConfig: configPda,
          job: jobPda,
          client: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ skipPreflight: false, commitment: "confirmed" });

      return { signature: tx, milestonePda };
    },
    [program, publicKey]
  );

  const fundMilestone = useCallback(
    async (jobPda: PublicKey, milestoneIndex: number, amountSol: number) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const [milestonePda] = deriveMilestonePDA(jobPda, milestoneIndex);
      const [escrowPda] = deriveMilestoneEscrowPDA(milestonePda);
      const [configPda] = deriveJobMilestoneConfigPDA(jobPda);
      const amount = new BN(amountSol * LAMPORTS_PER_SOL);

      // @ts-ignore
      const tx = await program.methods
        .fundMilestone(amount)
        .accounts({
          milestoneEscrow: escrowPda,
          milestone: milestonePda,
          milestoneConfig: configPda,
          job: jobPda,
          client: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ skipPreflight: false, commitment: "confirmed" });

      return { signature: tx, escrowPda };
    },
    [program, publicKey]
  );

  const submitMilestoneWork = useCallback(
    async (jobPda: PublicKey, milestoneIndex: number, deliverableUri: string) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const [milestonePda] = deriveMilestonePDA(jobPda, milestoneIndex);

      // @ts-ignore
      const tx = await program.methods
        .submitMilestoneWork(deliverableUri)
        .accounts({
          milestone: milestonePda,
          job: jobPda,
          freelancer: publicKey,
        })
        .rpc({ skipPreflight: false, commitment: "confirmed" });

      return { signature: tx };
    },
    [program, publicKey]
  );

  const approveMilestone = useCallback(
    async (jobPda: PublicKey, milestoneIndex: number, freelancerPubkey: PublicKey) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const [milestonePda] = deriveMilestonePDA(jobPda, milestoneIndex);
      const [escrowPda] = deriveMilestoneEscrowPDA(milestonePda);
      const [configPda] = deriveJobMilestoneConfigPDA(jobPda);

      // @ts-ignore
      const tx = await program.methods
        .approveMilestone()
        .accounts({
          milestone: milestonePda,
          milestoneEscrow: escrowPda,
          milestoneConfig: configPda,
          job: jobPda,
          client: publicKey,
          freelancer: freelancerPubkey,
        })
        .rpc({ skipPreflight: false, commitment: "confirmed" });

      return { signature: tx };
    },
    [program, publicKey]
  );

  const rejectMilestone = useCallback(
    async (jobPda: PublicKey, milestoneIndex: number, reason: string) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const [milestonePda] = deriveMilestonePDA(jobPda, milestoneIndex);

      // @ts-ignore
      const tx = await program.methods
        .rejectMilestone(reason)
        .accounts({
          milestone: milestonePda,
          job: jobPda,
          client: publicKey,
        })
        .rpc({ skipPreflight: false, commitment: "confirmed" });

      return { signature: tx };
    },
    [program, publicKey]
  );

  const disputeMilestone = useCallback(
    async (jobPda: PublicKey, milestoneIndex: number, reason: string) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const [milestonePda] = deriveMilestonePDA(jobPda, milestoneIndex);
      const [escrowPda] = deriveMilestoneEscrowPDA(milestonePda);
      const [disputePda] = deriveMilestoneDisputePDA(milestonePda);

      // @ts-ignore
      const tx = await program.methods
        .disputeMilestone(reason)
        .accounts({
          milestoneDispute: disputePda,
          milestone: milestonePda,
          milestoneEscrow: escrowPda,
          job: jobPda,
          initiator: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ skipPreflight: false, commitment: "confirmed" });

      return { signature: tx, disputePda };
    },
    [program, publicKey]
  );

  const fetchMilestoneConfig = useCallback(
    async (jobPda: PublicKey): Promise<MilestoneConfigData | null> => {
      if (!program) return null;
      try {
        const [configPda] = deriveJobMilestoneConfigPDA(jobPda);
        // @ts-ignore
        const config = await program.account.jobMilestoneConfig.fetch(configPda);
        return config as MilestoneConfigData;
      } catch {
        return null;
      }
    },
    [program]
  );

  const fetchMilestone = useCallback(
    async (jobPda: PublicKey, milestoneIndex: number): Promise<MilestoneData | null> => {
      if (!program) return null;
      try {
        const [milestonePda] = deriveMilestonePDA(jobPda, milestoneIndex);
        // @ts-ignore
        const milestone = await program.account.milestone.fetch(milestonePda);
        return milestone as MilestoneData;
      } catch {
        return null;
      }
    },
    [program]
  );

  const fetchAllMilestones = useCallback(
    async (jobPda: PublicKey): Promise<MilestoneData[]> => {
      if (!program) return [];

      const config = await fetchMilestoneConfig(jobPda);
      if (!config) return [];

      const milestones: MilestoneData[] = [];
      for (let i = 0; i < config.createdCount; i++) {
        const ms = await fetchMilestone(jobPda, i);
        if (ms) milestones.push(ms);
      }
      return milestones;
    },
    [program, fetchMilestoneConfig, fetchMilestone]
  );

  const fetchMilestoneEscrow = useCallback(
    async (milestonePda: PublicKey): Promise<MilestoneEscrowData | null> => {
      if (!program) return null;
      try {
        const [escrowPda] = deriveMilestoneEscrowPDA(milestonePda);
        // @ts-ignore
        const escrow = await program.account.milestoneEscrow.fetch(escrowPda);
        return escrow as MilestoneEscrowData;
      } catch {
        return null;
      }
    },
    [program]
  );

  return {
    initJobMilestones,
    createMilestone,
    fundMilestone,
    submitMilestoneWork,
    approveMilestone,
    rejectMilestone,
    disputeMilestone,
    fetchMilestoneConfig,
    fetchMilestone,
    fetchAllMilestones,
    fetchMilestoneEscrow,
  };
}
