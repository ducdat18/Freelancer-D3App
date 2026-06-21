import { useCallback, useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { web3, BN } from "@coral-xyz/anchor";
import { useSolanaProgram } from "./useSolanaProgram";
import { deriveJobPDA, deriveBidPDA, deriveEscrowPDA } from "../utils/pda";
import { retryWithBackoff } from "../utils/rpcRetry";
import { isGarbageMetadataUri, uploadToIPFS, fetchFromIPFS } from "../services/ipfs";
import type { PublicKey } from "../types/solana";
import type { JobMetadata } from "../types";

const { SystemProgram, LAMPORTS_PER_SOL } = web3;

export interface JobData {
  client: PublicKey;
  title: string;
  description: string;
  budget: BN;
  metadataUri: string;
  status: any; // JobStatus enum
  selectedFreelancer: PublicKey | null;
  createdAt: BN;
  updatedAt: BN;
  bidCount: number;
  escrowAmount: BN;
}

export interface BidData {
  job: PublicKey;
  freelancer: PublicKey;
  proposedBudget: BN;
  proposal: string;
  timelineDays: number;
  cvUri: string;
  status: any; // BidStatus enum
  createdAt: BN;
}

export interface UseJobsParams {
  status?: any;
  autoFetch?: boolean;
  /** Filter out jobs with invalid/garbage metadata CIDs */
  filterInvalidMetadata?: boolean;
}

export function useJobs(params?: UseJobsParams) {
  const { program, wallet } = useSolanaProgram();
  const { publicKey, signTransaction } = useWallet();

  // State management
  const [jobs, setJobs] = useState<Array<{ publicKey: PublicKey; account: JobData }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a new job on-chain.
   * Returns { signature, jobPda, jobId } so callers can use the correct jobPda
   * for milestone initialisation instead of re-deriving it with a different seed.
   */
  const createJob = useCallback(
    async (
      title: string,
      description: string,
      budgetSol: string,
      deadline: number,
      metadataUri: string,
      tokenMint?: string | null
    ) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      setLoading(true);
      setError(null);

      try {
        const jobId = Date.now();
        const [jobPda] = deriveJobPDA(publicKey, jobId);

        const budgetLamports = parseFloat(budgetSol) * LAMPORTS_PER_SOL;
        const budget = new BN(budgetLamports);

        const mintPubkey = tokenMint ? new web3.PublicKey(tokenMint) : null;

        // @ts-ignore - Program methods type inference issue
        const tx = await program.methods
          .createJob(new BN(jobId), title, description, budget, metadataUri, mintPubkey)
          .accounts({
            job: jobPda,
            client: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        setLoading(false);
        return { signature: tx, jobPda, jobId };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create job";
        setError(message);
        setLoading(false);
        throw err;
      }
    },
    [program, publicKey]
  );

  /**
   * Deposit SOL into the escrow account for a job.
   * Call this after createJob to lock funds on-chain.
   */
  const depositJobEscrow = useCallback(
    async (jobPda: PublicKey, amountSol: string) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const [escrowPda] = deriveEscrowPDA(jobPda);
      const amountLamports = parseFloat(amountSol) * LAMPORTS_PER_SOL;
      const amount = new BN(amountLamports);

      // @ts-ignore - Program methods type inference issue
      const tx = await program.methods
        .depositEscrow(amount)
        .accounts({
          escrow: escrowPda,
          job: jobPda,
          client: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return { signature: tx, escrowPda };
    },
    [program, publicKey]
  );

  /**
   * Update a job's IPFS metadata.
   * Uploads new metadata to IPFS and stores the latest CID override in
   * localStorage (keyed by jobPda) since there is no on-chain update_job
   * instruction yet.  The job detail page checks this override first.
   */
  const updateJobMetadata = useCallback(
    async (jobPda: PublicKey, newMetadata: JobMetadata): Promise<string> => {
      const newCid = await uploadToIPFS(newMetadata);
      if (!newCid) throw new Error("Failed to upload updated metadata to IPFS");

      const overrideKey = `job_metadata_override_${jobPda.toBase58()}`;
      if (typeof window !== "undefined") {
        localStorage.setItem(overrideKey, newCid);
      }

      return newCid;
    },
    []
  );

  /**
   * Repost a cancelled or expired job by creating a new job on-chain
   * using the original job's metadata with an updated deadline.
   */
  const repostJob = useCallback(
    async (
      originalJobPda: PublicKey,
      newDeadline: Date,
      newBudgetSol?: string
    ) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const originalJob = await fetchJob(originalJobPda);
      if (!originalJob) throw new Error("Original job not found");

      const overrideKey = `job_metadata_override_${originalJobPda.toBase58()}`;
      const overrideCid = typeof window !== "undefined"
        ? localStorage.getItem(overrideKey)
        : null;

      const metadataCid = overrideCid || originalJob.metadataUri;
      const existingMeta: JobMetadata | null = await fetchFromIPFS(metadataCid);

      const budgetSol = newBudgetSol
        ?? (originalJob.budget.toNumber() / LAMPORTS_PER_SOL).toString();

      const newMeta: JobMetadata = {
        ...(existingMeta ?? {
          title: originalJob.title,
          description: originalJob.description,
          category: "",
          skills: [],
        }),
        deadline: Math.floor(newDeadline.getTime() / 1000),
        budgetSol,
      };

      const newCid = await uploadToIPFS(newMeta);
      if (!newCid) throw new Error("Failed to upload repost metadata to IPFS");

      return createJob(
        originalJob.title,
        originalJob.description,
        budgetSol,
        Math.floor(newDeadline.getTime() / 1000),
        newCid,
        undefined
      );
    },
    [program, publicKey, fetchJob, createJob]
  );

  /**
   * Submit a bid for a job
   */
  const submitBid = useCallback(
    async (
      jobPda: PublicKey,
      proposedBudgetSol: number,
      proposal: string,
      timelineDays: number,
      cvUri?: string
    ) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const [bidPda] = deriveBidPDA(jobPda, publicKey);
      const proposedBudget = new BN(proposedBudgetSol * LAMPORTS_PER_SOL);

      const tx = await program.methods
        .submitBid(proposedBudget, proposal, timelineDays, cvUri || null)
        .accounts({
          bid: bidPda,
          job: jobPda,
          freelancer: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return { signature: tx, bidPda };
    },
    [program, publicKey]
  );

  /**
   * Select a winning bid
   */
  const selectBid = useCallback(
    async (jobPda: PublicKey, bidPda: PublicKey) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const tx = await program.methods
        .selectBid()
        .accounts({
          job: jobPda,
          bid: bidPda,
          client: publicKey,
        })
        .rpc();

      return { signature: tx };
    },
    [program, publicKey]
  );

  /**
   * Complete a job and release payment to freelancer
   */
  const completeJob = useCallback(
    async (jobPda: PublicKey, escrowPda: PublicKey, freelancerPubkey: PublicKey) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const tx = await program.methods
        .completeJob()
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
   * Cancel a job and refund escrow if applicable
   */
  const cancelJob = useCallback(
    async (jobPda: PublicKey, escrowPda?: PublicKey) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const accounts: any = {
        job: jobPda,
        client: publicKey,
      };

      if (escrowPda) {
        accounts.escrow = escrowPda;
      }

      const tx = await program.methods
        .cancelJob()
        .accounts(accounts)
        .rpc();

      return { signature: tx };
    },
    [program, publicKey]
  );

  /**
   * Fetch job data
   */
  const fetchJob = useCallback(
    async (jobPda: PublicKey): Promise<JobData | null> => {
      if (!program) return null;

      try {
        // @ts-ignore - Program account types from IDL
        const job = await program.account.job.fetch(jobPda);
        return job as JobData;
      } catch (error) {
        console.error("Error fetching job:", error);
        return null;
      }
    },
    [program]
  );

  /**
   * Fetch all jobs with rate-limit handling and fallback decode
   */
  const fetchAllJobs = useCallback(async (): Promise<
    Array<{ publicKey: PublicKey; account: JobData }>
  > => {
    if (!program) return [];

    try {
      // Try standard method first with retry logic
      try {
        const jobs = await retryWithBackoff(
          async () => {
            // @ts-ignore
            return await program.account.job.all();
          },
          { maxRetries: 3, baseDelayMs: 1000 }
        );
        return jobs as Array<{ publicKey: PublicKey; account: JobData }>;
      } catch (firstError) {
        // Fetch all program accounts with retry
        const allAccounts = await retryWithBackoff(
          async () => program.provider.connection.getProgramAccounts(program.programId),
          { maxRetries: 3, baseDelayMs: 1000 }
        );

        const validJobs: Array<{ publicKey: PublicKey; account: JobData }> = [];
        for (const { pubkey, account } of allAccounts) {
          try {
            // @ts-ignore
            const decoded = program.coder.accounts.decode('job', account.data);
            validJobs.push({ publicKey: pubkey, account: decoded as JobData });
          } catch {
            continue;
          }
        }

        return validJobs;
      }
    } catch (error) {
      console.error("[Jobs] Error fetching:", error);
      return [];
    }
  }, [program]);

  /**
   * Auto-fetch jobs on mount if enabled
   */
  useEffect(() => {
    if (!program || params?.autoFetch === false) return;

    const loadJobs = async () => {
      setLoading(true);
      setError(null);
      try {
        let allJobs = await fetchAllJobs();

        // Filter out jobs with invalid/garbage metadata CIDs
        if (params?.filterInvalidMetadata) {
          const beforeCount = allJobs.length;
          allJobs = allJobs.filter(j => !isGarbageMetadataUri(j.account.metadataUri));
          const filteredCount = beforeCount - allJobs.length;
        }

        // Apply status filter if provided
        const filtered = params?.status !== undefined
          ? allJobs.filter(j => {
              const status = j.account.status;
              return typeof status === 'object'
                ? Object.keys(status)[0] === params.status
                : status === params.status;
            })
          : allJobs;

        setJobs(filtered);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load jobs";
        setError(message);
        console.error("[Jobs] Error loading:", err);
      } finally {
        setLoading(false);
      }
    };

    loadJobs();
  }, [program, params?.status, params?.autoFetch, params?.filterInvalidMetadata, fetchAllJobs]);

  /**
   * Fetch bids for a job
   */
  const fetchJobBids = useCallback(
    async (jobPda: PublicKey): Promise<
      Array<{ publicKey: PublicKey; account: BidData }>
    > => {
      if (!program) return [];

      try {
        // @ts-ignore - Program account types from IDL
        const bids = await program.account.bid.all([
          {
            memcmp: {
              offset: 8, // After discriminator
              bytes: jobPda.toBase58(),
            },
          },
        ]);
        return bids as Array<{ publicKey: PublicKey; account: BidData }>;
      } catch (error) {
        console.error("Error fetching bids:", error);
        return [];
      }
    },
    [program]
  );

  return {
    // State
    jobs,
    loading,
    error,

    // Functions
    createJob,
    depositJobEscrow,
    updateJobMetadata,
    repostJob,
    submitBid,
    selectBid,
    completeJob,
    cancelJob,
    fetchJob,
    fetchAllJobs,
    fetchJobBids,

    // Manual refresh
    refetch: () => {
      if (program) {
        fetchAllJobs().then(setJobs).catch(err => {
          setError(err instanceof Error ? err.message : "Failed to refetch");
        });
      }
    },
  };
}

// Backward compatibility exports
export const useClientJobs = useJobs;
export const useFreelancerJobs = useJobs;
export const useJob = useJobs;
