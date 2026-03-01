import { useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { web3, BN } from "@coral-xyz/anchor";
import { useSolanaProgram } from "./useSolanaProgram";
import {
  deriveEscrowPDA,
  deriveWorkSubmissionPDA,
  deriveDisputePDA,
  deriveVoteRecordPDA,
} from "../utils/pda";
import { logger } from "../utils/logger";
import type { PublicKey } from "../types/solana";

const { SystemProgram, LAMPORTS_PER_SOL } = web3;

export interface EscrowData {
  job: PublicKey;
  client: PublicKey;
  freelancer: PublicKey;
  amount: BN;
  locked: boolean;
  released: boolean;
  disputed: boolean;
  createdAt: BN;
}

export function useEscrow() {
  const { program, wallet } = useSolanaProgram();
  const { publicKey } = useWallet();

  /**
   * Deposit funds into escrow
   */
  const depositEscrow = useCallback(
    async (jobPda: PublicKey, amountSol: number) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const [escrowPda] = deriveEscrowPDA(jobPda);
      const amount = new BN(amountSol * LAMPORTS_PER_SOL);

      // Retry logic for blockhash issues
      const maxRetries = 3;
      let lastError: any;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // @ts-ignore - Program methods type inference issue
          const tx = await program.methods
            .depositEscrow(amount)
            .accounts({
              escrow: escrowPda,
              job: jobPda,
              client: publicKey,
              systemProgram: SystemProgram.programId,
            })
            .rpc({
              skipPreflight: false,
              commitment: 'confirmed',
              maxRetries: 3,
            });
          return { signature: tx, escrowPda };
        } catch (error: any) {
          lastError = error;
          logger.error(`Deposit escrow attempt ${attempt} failed:`, error.message);

          // If blockhash expired and we have retries left, wait and retry
          if (
            (error.message?.includes('Blockhash not found') ||
              error.message?.includes('block height exceeded')) &&
            attempt < maxRetries
          ) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            continue;
          }

          // For other errors or last attempt, throw immediately
          throw error;
        }
      }

      throw lastError;
    },
    [program, publicKey]
  );

  /**
   * Submit work deliverables
   */
  const submitWork = useCallback(
    async (jobPda: PublicKey, deliverableUri: string) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const [workSubmissionPda] = deriveWorkSubmissionPDA(jobPda);

      // Retry logic for blockhash issues
      const maxRetries = 3;
      let lastError: any;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // @ts-ignore - Program methods type inference issue
          const tx = await program.methods
            .submitWork(deliverableUri)
            .accounts({
              workSubmission: workSubmissionPda,
              job: jobPda,
              freelancer: publicKey,
              systemProgram: SystemProgram.programId,
            })
            .rpc({
              skipPreflight: false,
              commitment: 'confirmed',
              maxRetries: 3,
            });
          return { signature: tx, workSubmissionPda };
        } catch (error: any) {
          lastError = error;
          logger.error(`Submit work attempt ${attempt} failed:`, error.message);

          // If blockhash expired and we have retries left, wait and retry
          if (
            (error.message?.includes('Blockhash not found') ||
              error.message?.includes('block height exceeded')) &&
            attempt < maxRetries
          ) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            continue;
          }

          // For other errors or last attempt, throw immediately
          throw error;
        }
      }

      throw lastError;
    },
    [program, publicKey]
  );

  /**
   * Release escrow payment (client approves work)
   */
  const releaseEscrow = useCallback(
    async (jobPda: PublicKey, freelancerPubkey: PublicKey) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const [escrowPda] = deriveEscrowPDA(jobPda);

      // @ts-ignore - Program methods type inference issue
      const tx = await program.methods
        .releaseEscrow()
        .accounts({
          escrow: escrowPda,
          job: jobPda,
          freelancer: freelancerPubkey,
          client: publicKey,
        })
        .rpc();

      return { signature: tx };
    },
    [program, publicKey]
  );

  /**
   * Open a dispute
   */
  const openDispute = useCallback(
    async (jobPda: PublicKey, reason: string) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const [disputePda] = deriveDisputePDA(jobPda);
      const [escrowPda] = deriveEscrowPDA(jobPda);

      // @ts-ignore - Program methods type inference issue
      const tx = await program.methods
        .openDispute(reason)
        .accounts({
          dispute: disputePda,
          escrow: escrowPda,
          job: jobPda,
          initiator: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return { signature: tx, disputePda };
    },
    [program, publicKey]
  );

  /**
   * Vote on a dispute (for arbitrators)
   * AUTO-RESOLVES when 2 votes are reached
   */
  const voteDispute = useCallback(
    async (
      disputePda: PublicKey,
      voterReputationPda: PublicKey,
      voteForClient: boolean,
      jobPda: PublicKey,
      clientPubkey: PublicKey,
      freelancerPubkey: PublicKey
    ) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const [voteRecordPda] = deriveVoteRecordPDA(disputePda, publicKey);
      const [escrowPda] = deriveEscrowPDA(jobPda);

      // @ts-ignore - Program methods type inference issue
      const tx = await program.methods
        .voteDispute(voteForClient)
        .accounts({
          dispute: disputePda,
          voteRecord: voteRecordPda,
          voterReputation: voterReputationPda,
          voter: publicKey,
          escrow: escrowPda,
          job: jobPda,
          client: clientPubkey,
          freelancer: freelancerPubkey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return { signature: tx, voteRecordPda };
    },
    [program, publicKey]
  );

  /**
   * Resolve dispute
   */
  const resolveDispute = useCallback(
    async (
      disputePda: PublicKey,
      jobPda: PublicKey,
      clientPubkey: PublicKey,
      freelancerPubkey: PublicKey
    ) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const [escrowPda] = deriveEscrowPDA(jobPda);

      // @ts-ignore - Program methods type inference issue
      const tx = await program.methods
        .resolveDispute()
        .accounts({
          dispute: disputePda,
          escrow: escrowPda,
          job: jobPda,
          client: clientPubkey,
          freelancer: freelancerPubkey,
          resolver: publicKey,
        })
        .rpc();

      return { signature: tx };
    },
    [program, publicKey]
  );

  /**
   * Fetch escrow data
   */
  const fetchEscrow = useCallback(
    async (jobPda: PublicKey): Promise<EscrowData | null> => {
      if (!program) return null;

      try {
        const [escrowPda] = deriveEscrowPDA(jobPda);
        // @ts-ignore - Program account types from IDL
        const escrow = await program.account.escrow.fetch(escrowPda);
        return escrow as EscrowData;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        // Escrow not created yet (open job, no bid accepted) — completely normal
        if (!msg.includes('Account does not exist') && !msg.includes('has no data')) {
          logger.error("Error fetching escrow:", error);
        }
        return null;
      }
    },
    [program]
  );

  /**
   * Fetch all disputes from the blockchain
   */
  const fetchDisputes = useCallback(async () => {
    if (!program) return [];

    try {
      // @ts-ignore - Program account types from IDL
      const disputes = await program.account.dispute.all();
      return disputes;
    } catch (error) {
      logger.error("Error fetching disputes:", error);
      return [];
    }
  }, [program]);

  /**
   * Fetch a single dispute by PDA
   */
  const fetchDispute = useCallback(
    async (disputePda: PublicKey) => {
      if (!program) return null;

      try {
        // @ts-ignore - Program account types from IDL
        const dispute = await program.account.dispute.fetch(disputePda);
        return dispute;
      } catch (error) {
        logger.error("Error fetching dispute:", error);
        return null;
      }
    },
    [program]
  );

  /**
   * Check if user has already voted on a dispute
   */
  const hasVoted = useCallback(
    async (disputePda: PublicKey, voterPubkey: PublicKey): Promise<boolean> => {
      if (!program) return false;

      try {
        const [voteRecordPda] = deriveVoteRecordPDA(disputePda, voterPubkey);
        // @ts-ignore - Program account types from IDL
        await program.account.voteRecord.fetch(voteRecordPda);
        return true;
      } catch {
        return false;
      }
    },
    [program]
  );

  /**
   * Get user's vote details (who they voted for)
   */
  const getUserVote = useCallback(
    async (disputePda: PublicKey, voterPubkey: PublicKey): Promise<{ votedFor: 'client' | 'freelancer' } | null> => {
      if (!program) return null;

      try {
        const [voteRecordPda] = deriveVoteRecordPDA(disputePda, voterPubkey);
        // @ts-ignore - Program account types from IDL
        const voteRecord = await program.account.voteRecord.fetch(voteRecordPda);
        return {
          votedFor: voteRecord.voteForClient ? 'client' : 'freelancer'
        };
      } catch {
        return null;
      }
    },
    [program]
  );

  /**
   * Fetch vote records for a specific arbitrator
   */
  const fetchArbitratorVotes = useCallback(
    async (arbitratorPubkey: PublicKey) => {
      if (!program) return [];

      try {
        // @ts-ignore - Program account types from IDL
        const votes = await program.account.voteRecord.all([
          {
            memcmp: {
              offset: 8 + 32, // After discriminator + dispute pubkey
              bytes: arbitratorPubkey.toBase58(),
            },
          },
        ]);
        return votes;
      } catch (error) {
        logger.error("Error fetching arbitrator votes:", error);
        return [];
      }
    },
    [program]
  );

  /**
   * Claim arbitrator fee for voting on a dispute
   * @param disputePda - Dispute PDA
   * @param escrowFeeVaultPda - Escrow fee vault PDA (where fees are stored)
   */
  const claimArbitratorFee = useCallback(
    async (disputePda: PublicKey, escrowFeeVaultPda: PublicKey) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const [voteRecordPda] = deriveVoteRecordPDA(disputePda, publicKey);

      // @ts-ignore - Program methods type inference issue
      const tx = await program.methods
        .claimArbitratorFee()
        .accounts({
          dispute: disputePda,
          voteRecord: voteRecordPda,
          escrowFeeVault: escrowFeeVaultPda,
          arbitrator: publicKey,
        })
        .rpc();

      return { signature: tx };
    },
    [program, publicKey]
  );

  /**
   * Add evidence to an existing dispute
   * @param disputePda - Dispute PDA
   * @param evidenceUri - IPFS URI of the evidence (e.g. "ipfs://Qm...")
   */
  const addDisputeEvidence = useCallback(
    async (disputePda: PublicKey, evidenceUri: string) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      // Retry logic for blockhash issues
      const maxRetries = 3;
      let lastError: any;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // @ts-ignore - Program methods type inference issue
          const tx = await program.methods
            .addDisputeEvidence(evidenceUri)
            .accounts({
              dispute: disputePda,
              uploader: publicKey,
              systemProgram: SystemProgram.programId,
            })
            .rpc({
              skipPreflight: false,
              commitment: 'confirmed',
              maxRetries: 3,
            });
          return { signature: tx };
        } catch (error: any) {
          lastError = error;
          logger.error(`Add dispute evidence attempt ${attempt} failed:`, error.message);

          // If blockhash expired and we have retries left, wait and retry
          if (
            (error.message?.includes('Blockhash not found') ||
              error.message?.includes('block height exceeded')) &&
            attempt < maxRetries
          ) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            continue;
          }

          // For other errors or last attempt, throw immediately
          throw error;
        }
      }

      throw lastError;
    },
    [program, publicKey]
  );

  return {
    depositEscrow,
    submitWork,
    releaseEscrow,
    openDispute,
    voteDispute,
    resolveDispute,
    fetchEscrow,
    fetchDisputes,
    fetchDispute,
    hasVoted,
    getUserVote,
    fetchArbitratorVotes,
    claimArbitratorFee,
    addDisputeEvidence,
  };
}
