import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { web3, BN } from "@coral-xyz/anchor";
import { useSolanaProgram } from "./useSolanaProgram";
import {
  deriveDAOConfigPDA,
  deriveProposalPDA,
  deriveDAOVotePDA,
  deriveDAOTreasuryPDA,
  deriveTokenStakePDA,
  deriveSBTCounterPDA,
} from "../utils/pda";
import type { PublicKey } from "../types/solana";
import type {
  DAOConfigData,
  ProposalData,
  DAOVoteData,
} from "../types";
import { GovernanceProposalStatus, GovernanceProposalType } from "../types";
import {
  getSimDAOConfig,
  getSimProposals,
  getSimProposal,
  simCreateProposal,
  simCastVote,
  simFinalizeProposal,
  simExecuteProposal,
} from "../utils/governanceSimulator";

const { SystemProgram } = web3;

export function useDAOGovernance() {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();

  const [daoConfig, setDaoConfig] = useState<DAOConfigData | null>(null);
  const [proposals, setProposals] = useState<ProposalData[]>([]);
  const [currentProposal, setCurrentProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==================== FETCH FUNCTIONS ====================

  const fetchDAOConfig = useCallback(async (): Promise<DAOConfigData | null> => {
    setLoading(true);
    setError(null);
    try {
      // @ts-ignore
      if (!program || !program.account.daoConfig) {
        const sim = getSimDAOConfig();
        setDaoConfig(sim);
        return sim;
      }
      const [configPda] = deriveDAOConfigPDA();
      // @ts-ignore
      const config = await program.account.daoConfig.fetch(configPda);
      const data = config as DAOConfigData;
      setDaoConfig(data);
      return data;
    } catch (err: any) {
      const sim = getSimDAOConfig();
      setDaoConfig(sim);
      return sim;
    } finally {
      setLoading(false);
    }
  }, [program]);

  const fetchProposal = useCallback(
    async (proposalId: number): Promise<ProposalData | null> => {
      setLoading(true);
      setError(null);
      try {
        // @ts-ignore
        if (!program || !program.account.proposal) {
          const sim = getSimProposal(proposalId);
          setCurrentProposal(sim);
          return sim;
        }
        const [proposalPda] = deriveProposalPDA(proposalId);
        // @ts-ignore
        const proposal = await program.account.proposal.fetch(proposalPda);
        const data = proposal as ProposalData;
        setCurrentProposal(data);
        return data;
      } catch (err: any) {
        const sim = getSimProposal(proposalId);
        setCurrentProposal(sim);
        return sim;
      } finally {
        setLoading(false);
      }
    },
    [program]
  );

  const fetchAllProposals = useCallback(async (): Promise<ProposalData[]> => {
    setLoading(true);
    setError(null);
    try {
      // @ts-ignore
      if (!program || !program.account.proposal) {
        const sim = getSimProposals();
        setProposals(sim);
        return sim;
      }
      // @ts-ignore
      const allProposals = await program.account.proposal.all();
      const data = allProposals.map(
        (p: any) => p.account as ProposalData
      );
      setProposals(data);
      return data;
    } catch (err: any) {
      const sim = getSimProposals();
      setProposals(sim);
      return sim;
    } finally {
      setLoading(false);
    }
  }, [program]);

  // ==================== INSTRUCTION FUNCTIONS ====================

  const createProposal = useCallback(
    async (
      title: string,
      descriptionUri: string,    // in simulation mode: the actual description text
      proposalType: GovernanceProposalType
    ) => {
      if (!publicKey) throw new Error("Wallet not connected");
      setLoading(true);
      setError(null);
      try {
        // @ts-ignore
        if (!program || typeof (program as any).methods.createProposal !== 'function') {
          const { sig, proposalId } = await simCreateProposal(
            publicKey.toBase58(),
            title,
            descriptionUri,
            proposalType,
          );
          return { signature: sig, proposalId };
        }

        const [configPda] = deriveDAOConfigPDA();
        const [stakePda] = deriveTokenStakePDA(publicKey);
        // @ts-ignore
        const config = await program.account.daoConfig.fetch(configPda);
        const proposalId = (config as DAOConfigData).proposalCount;
        const [proposalPda] = deriveProposalPDA(proposalId);

        // @ts-ignore
        const tx = await program.methods
          .createProposal(title, descriptionUri, proposalType)
          .accounts({
            proposal: proposalPda,
            daoConfig: configPda,
            tokenStake: stakePda,
            proposer: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc({ skipPreflight: false, commitment: "confirmed" });

        return { signature: tx, proposalPda, proposalId };
      } catch (err: any) {
        setError(err.message || "Failed to create proposal");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  const castDAOVote = useCallback(
    async (
      proposalId: number,
      voteFor: boolean,
      tokenAmount: number,
      sbtCount: number
    ) => {
      if (!publicKey) throw new Error("Wallet not connected");
      setLoading(true);
      setError(null);
      try {
        // @ts-ignore
        if (!program || typeof (program as any).methods.castDaoVote !== 'function') {
          const sig = await simCastVote(publicKey.toBase58(), proposalId, voteFor, tokenAmount);
          return { signature: sig };
        }

        const [proposalPda] = deriveProposalPDA(proposalId);
        const [votePda] = deriveDAOVotePDA(proposalPda, publicKey);
        const [stakePda] = deriveTokenStakePDA(publicKey);
        const [sbtCounterPda] = deriveSBTCounterPDA(publicKey);

        // @ts-ignore
        const tx = await program.methods
          .castDaoVote(voteFor, new BN(tokenAmount), sbtCount)
          .accounts({
            daoVote: votePda,
            proposal: proposalPda,
            tokenStake: stakePda,
            sbtCounter: sbtCounterPda,
            voter: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc({ skipPreflight: false, commitment: "confirmed" });

        return { signature: tx, votePda };
      } catch (err: any) {
        setError(err.message || "Failed to cast vote");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  const finalizeProposal = useCallback(
    async (proposalId: number) => {
      if (!publicKey) throw new Error("Wallet not connected");
      setLoading(true);
      setError(null);
      try {
        // @ts-ignore
        if (!program || typeof (program as any).methods.finalizeProposal !== 'function') {
          const sig = await simFinalizeProposal(proposalId);
          return { signature: sig };
        }

        const [proposalPda] = deriveProposalPDA(proposalId);
        const [configPda] = deriveDAOConfigPDA();

        // @ts-ignore
        const tx = await program.methods
          .finalizeProposal()
          .accounts({
            proposal: proposalPda,
            daoConfig: configPda,
            authority: publicKey,
          })
          .rpc({ skipPreflight: false, commitment: "confirmed" });

        return { signature: tx };
      } catch (err: any) {
        setError(err.message || "Failed to finalize proposal");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  const executeProposal = useCallback(
    async (proposalId: number) => {
      if (!publicKey) throw new Error("Wallet not connected");
      setLoading(true);
      setError(null);
      try {
        // @ts-ignore
        if (!program || typeof (program as any).methods.executeProposal !== 'function') {
          const sig = await simExecuteProposal(proposalId);
          return { signature: sig };
        }

        const [proposalPda] = deriveProposalPDA(proposalId);
        const [configPda] = deriveDAOConfigPDA();
        const [treasuryPda] = deriveDAOTreasuryPDA();

        // @ts-ignore
        const tx = await program.methods
          .executeProposal()
          .accounts({
            proposal: proposalPda,
            daoConfig: configPda,
            daoTreasury: treasuryPda,
            executor: publicKey,
          })
          .rpc({ skipPreflight: false, commitment: "confirmed" });

        return { signature: tx };
      } catch (err: any) {
        setError(err.message || "Failed to execute proposal");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  const fundDAOTreasury = useCallback(
    async (amount: number) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");
      // @ts-ignore
      if (typeof (program as any).methods.fundDaoTreasury !== 'function') throw new Error('DAO Governance is not yet deployed on-chain');
      setLoading(true);
      setError(null);
      try {
        const [treasuryPda] = deriveDAOTreasuryPDA();
        const [configPda] = deriveDAOConfigPDA();

        // @ts-ignore
        const tx = await program.methods
          .fundDaoTreasury(new BN(amount))
          .accounts({
            daoTreasury: treasuryPda,
            daoConfig: configPda,
            funder: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc({ skipPreflight: false, commitment: "confirmed" });

        return { signature: tx };
      } catch (err: any) {
        setError(err.message || "Failed to fund treasury");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  return {
    // State
    daoConfig,
    proposals,
    currentProposal,
    loading,
    error,
    // Fetch
    fetchDAOConfig,
    fetchProposal,
    fetchAllProposals,
    // Instructions
    createProposal,
    castDAOVote,
    finalizeProposal,
    executeProposal,
    fundDAOTreasury,
  };
}
