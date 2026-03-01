import { useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { web3 } from '@coral-xyz/anchor';
import { useSolanaProgram } from './useSolanaProgram';
import { deriveEscrowPDA, deriveDisputePDA } from '../utils/pda';
import type { PublicKey } from '../types/solana';

const { SystemProgram } = web3;

export interface DisputeData {
  job: PublicKey;
  escrow: PublicKey;
  client: PublicKey;
  freelancer: PublicKey;
  initiator: PublicKey;
  reason: string;
  status: any; // DisputeStatus enum
  votesForClient: number;
  votesForFreelancer: number;
  createdAt: number;
  resolvedAt: number | null;
}

export function useDispute() {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();

  /**
   * Raise a dispute after work is rejected
   * This opens the DAO voting mechanism
   */
  const raiseDispute = useCallback(
    async (jobPda: PublicKey, reason: string) => {
      if (!program || !publicKey) throw new Error('Wallet not connected');

      const [disputePda] = deriveDisputePDA(jobPda);
      const [escrowPda] = deriveEscrowPDA(jobPda);

      // @ts-ignore - Program methods type inference issue
      const tx = await program.methods
        .raiseDispute(reason)
        .accounts({
          dispute: disputePda,
          job: jobPda,
          escrow: escrowPda,
          freelancer: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return { signature: tx, disputePda };
    },
    [program, publicKey]
  );

  /**
   * Fetch dispute data for a job
   */
  const fetchDispute = useCallback(
    async (jobPda: PublicKey): Promise<DisputeData | null> => {
      if (!program) return null;

      try {
        const [disputePda] = deriveDisputePDA(jobPda);
        // @ts-ignore - Program account types from IDL
        const dispute = await program.account.dispute.fetch(disputePda);
        return dispute as DisputeData;
      } catch (error) {
        console.error('Error fetching dispute:', error);
        return null;
      }
    },
    [program]
  );

  /**
   * Client approves submitted work
   * Releases payment from escrow to freelancer
   */
  const approveWork = useCallback(
    async (jobPda: PublicKey, freelancerPubkey: PublicKey) => {
      if (!program || !publicKey) throw new Error('Wallet not connected');

      const [escrowPda] = deriveEscrowPDA(jobPda);
      const [workSubmissionPda] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from('work'), jobPda.toBuffer()],
        program.programId
      );

      // @ts-ignore - Program methods type inference issue
      const tx = await program.methods
        .approveWork()
        .accounts({
          workSubmission: workSubmissionPda,
          job: jobPda,
          escrow: escrowPda,
          client: publicKey,
          freelancer: freelancerPubkey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return { signature: tx };
    },
    [program, publicKey]
  );

  /**
   * Client rejects submitted work
   * Funds remain in escrow, freelancer can raise dispute
   */
  const rejectWork = useCallback(
    async (jobPda: PublicKey, reason: string) => {
      if (!program || !publicKey) throw new Error('Wallet not connected');

      const [escrowPda] = deriveEscrowPDA(jobPda);
      const [workSubmissionPda] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from('work'), jobPda.toBuffer()],
        program.programId
      );

      // @ts-ignore - Program methods type inference issue
      const tx = await program.methods
        .rejectWork(reason)
        .accounts({
          workSubmission: workSubmissionPda,
          job: jobPda,
          escrow: escrowPda,
          client: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return { signature: tx };
    },
    [program, publicKey]
  );

  return {
    raiseDispute,
    fetchDispute,
    approveWork,
    rejectWork,
  };
}

