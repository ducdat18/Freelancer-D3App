import { useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { web3, BN } from "@coral-xyz/anchor";
import { useSolanaProgram } from "./useSolanaProgram";
import { deriveEscrowPDA } from "../utils/pda";
import type { PublicKey } from "../types/solana";

const { SystemProgram, LAMPORTS_PER_SOL, ComputeBudgetProgram } = web3;

/**
 * Hook for composite transactions that combine multiple instructions
 * This solves Issue C: Auto-execute deposit on bid acceptance
 */
export function useCompositeTransactions() {
  const { program, connection } = useSolanaProgram();
  const { publicKey, sendTransaction } = useWallet();

  /**
   * Accept bid AND deposit escrow in a single atomic transaction
   * This ensures that:
   * 1. The freelancer is selected
   * 2. Payment is locked in escrow
   * 3. Both actions succeed or both fail (atomic)
   * 
   * Fixes Issue C: Auto-Execute Deposit on Bid Acceptance
   */
  const acceptBidWithDeposit = useCallback(
    async (
      jobPda: PublicKey,
      bidPda: PublicKey,
      freelancerPubkey: PublicKey,
      bidAmountSol: number
    ) => {
      if (!program || !publicKey || !connection) {
        throw new Error("Wallet not connected or program not initialized");
      }

      console.log("🚀 Starting composite transaction: Accept Bid + Deposit Escrow");
      console.log({
        jobPda: jobPda.toBase58(),
        bidPda: bidPda.toBase58(),
        freelancer: freelancerPubkey.toBase58(),
        amount: bidAmountSol,
      });

      // Retry logic for blockhash issues
      const maxRetries = 3;
      let lastError: any;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🔄 Composite transaction attempt ${attempt}/${maxRetries}...`);

          const [escrowPda] = deriveEscrowPDA(jobPda);
          const amountLamports = new BN(bidAmountSol * LAMPORTS_PER_SOL);

          // Get FRESH blockhash for each attempt
          const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

          // Create transaction with multiple instructions
          const transaction = new web3.Transaction();
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = publicKey;

          // ========================================
          // INSTRUCTION 1: Increase Compute Units
          // ========================================
          // Fixes Issue A: "Security check failed" - Ensure enough compute budget
          const computeUnitsIx = ComputeBudgetProgram.setComputeUnitLimit({
            units: 400_000, // Increased compute units for composite transaction
          });
          transaction.add(computeUnitsIx);

          // ========================================
          // INSTRUCTION 2: Set Priority Fee
          // ========================================
          // Optional: Add priority fee to get faster confirmation
          const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: 1, // Small priority fee
          });
          transaction.add(priorityFeeIx);

          // ========================================
          // INSTRUCTION 3: Select Bid
          // ========================================
          const selectBidIx = await program.methods
            .selectBid()
            .accounts({
              job: jobPda,
              bid: bidPda,
              client: publicKey,
            })
            .instruction();
          transaction.add(selectBidIx);

          // ========================================
          // INSTRUCTION 4: Deposit Escrow
          // ========================================
          // This executes IMMEDIATELY after bid acceptance in the same transaction
          const depositEscrowIx = await program.methods
            .depositEscrow(amountLamports)
            .accounts({
              escrow: escrowPda,
              job: jobPda,
              client: publicKey,
              systemProgram: SystemProgram.programId,
            })
            .instruction();
          transaction.add(depositEscrowIx);

          console.log("📦 Transaction composed with 4 instructions:");
          console.log("   1. Set Compute Units (400k)");
          console.log("   2. Set Priority Fee");
          console.log("   3. Select Bid");
          console.log("   4. Deposit Escrow");

          // ========================================
          // Send Transaction with Simulation
          // ========================================
          // Fixes Issue A: Add proper preflight checks
          const signature = await sendTransaction(transaction, connection, {
            skipPreflight: false, // Always simulate first
            preflightCommitment: 'confirmed',
            maxRetries: 3,
          });

          console.log("✅ Transaction sent:", signature);

          // Wait for confirmation
          const confirmation = await connection.confirmTransaction(
            {
              signature,
              blockhash,
              lastValidBlockHeight,
            },
            'confirmed'
          );

          if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
          }

          console.log(`✅ Transaction confirmed on attempt ${attempt}!`);
          console.log("   - Bid accepted");
          console.log("   - Escrow deposited");
          console.log("   - Job status: InProgress");
          console.log("   - Funds locked: ✅");

          return {
            signature,
            escrowPda,
            success: true,
          };
        } catch (error: any) {
          lastError = error;
          console.error(`❌ Attempt ${attempt} failed:`, error.message);
          
          // Enhanced error handling for Issue A
          if (error.message?.includes("0x1")) {
            throw new Error(
              "Insufficient funds. Please ensure you have enough SOL to cover the bid amount plus transaction fees (~0.01 SOL)."
            );
          } else if (error.message?.includes("0x0")) {
            throw new Error(
              "Transaction simulation failed. This may be due to incorrect accounts or program state. Please refresh and try again."
            );
          } else if (
            (error.message?.includes("blockhash not found") ||
              error.message?.includes("Blockhash not found") ||
              error.message?.includes("block height exceeded")) &&
            attempt < maxRetries
          ) {
            console.log(`⏳ Blockhash expired. Waiting 2s before retry...`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            continue; // Retry with fresh blockhash
          } else if (error.logs) {
            console.error("Transaction logs:", error.logs);
            throw new Error(
              `Transaction failed: ${error.message}. Check console for detailed logs.`
            );
          }
          
          // For other errors or last attempt, throw
          if (attempt === maxRetries) {
            throw error;
          }
        }
      }

      throw lastError;
    },
    [program, publicKey, connection, sendTransaction]
  );

  /**
   * Check if user has enough SOL for bid acceptance + deposit
   */
  const checkSufficientBalance = useCallback(
    async (requiredSol: number): Promise<{ sufficient: boolean; balance: number; required: number }> => {
      if (!publicKey || !connection) {
        return { sufficient: false, balance: 0, required: requiredSol };
      }

      try {
        const balance = await connection.getBalance(publicKey);
        const balanceSol = balance / LAMPORTS_PER_SOL;
        const requiredWithFees = requiredSol + 0.01; // Add ~0.01 SOL for transaction fees

        return {
          sufficient: balanceSol >= requiredWithFees,
          balance: balanceSol,
          required: requiredWithFees,
        };
      } catch (error) {
        console.error("Error checking balance:", error);
        return { sufficient: false, balance: 0, required: requiredSol };
      }
    },
    [publicKey, connection]
  );

  /**
   * Estimate transaction fees for bid acceptance + deposit
   */
  const estimateTransactionFee = useCallback(
    async (): Promise<number> => {
      if (!connection) return 0.01; // Default estimate

      try {
        // Get recent blockhash to estimate fees
        const result = await connection.getRecentBlockhashAndContext();
        const feeCalc = (result as any)?.value?.feeCalculator ?? (result as any)?.feeCalculator;

        // Estimate: 4 signatures (compute budget, priority, select_bid, deposit_escrow)
        const estimatedLamports = feeCalc?.lamportsPerSignature
          ? feeCalc.lamportsPerSignature * 4
          : 20000; // Fallback estimate
        
        return estimatedLamports / LAMPORTS_PER_SOL;
      } catch (error) {
        console.warn("Could not estimate fees, using default:", error);
        return 0.01; // Safe default
      }
    },
    [connection]
  );

  return {
    acceptBidWithDeposit,
    checkSufficientBalance,
    estimateTransactionFee,
  };
}

