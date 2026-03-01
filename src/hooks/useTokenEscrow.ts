import { useCallback, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import BN from 'bn.js';
import { useSolanaProgram } from './useSolanaProgram';
import { TokenConfig, parseTokenAmount } from '../config/tokens';

export function useTokenEscrow() {
  const { program, connection } = useSolanaProgram();
  const { publicKey: wallet } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derive token escrow PDA
  const deriveTokenEscrowPDA = useCallback(async (jobPda: PublicKey) => {
    if (!program) throw new Error('Program not initialized');

    const [tokenEscrowPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('token-escrow'), jobPda.toBuffer()],
      program.programId
    );

    return tokenEscrowPda;
  }, [program]);

  // Derive escrow vault PDA (token account owned by escrow)
  const deriveEscrowVaultPDA = useCallback(async (jobPda: PublicKey, tokenMint: PublicKey) => {
    if (!program) throw new Error('Program not initialized');

    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('escrow-vault'), jobPda.toBuffer(), tokenMint.toBuffer()],
      program.programId
    );

    return vaultPda;
  }, [program]);

  // Deposit SPL tokens into escrow
  const depositTokenEscrow = useCallback(async (
    jobPda: PublicKey,
    token: TokenConfig,
    amount: number // Human-readable amount
  ) => {
    if (!program || !wallet) {
      throw new Error('Wallet not connected or program not initialized');
    }

    setLoading(true);
    setError(null);

    try {
      const tokenMint = new PublicKey(token.mint);

      // Convert amount to smallest unit
      const amountInSmallestUnit = parseTokenAmount(amount, token.decimals);

      // Derive PDAs
      const tokenEscrowPda = await deriveTokenEscrowPDA(jobPda);
      const escrowVaultPda = await deriveEscrowVaultPDA(jobPda, tokenMint);

      // Get client's token account
      const clientTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        wallet
      );

      // Check if vault account exists, if not, we'll create it
      const vaultAccountInfo = await connection.getAccountInfo(escrowVaultPda);

      let transaction = program.methods
        .depositTokenEscrow(new BN(amountInSmallestUnit))
        .accounts({
          tokenEscrow: tokenEscrowPda,
          job: jobPda,
          tokenMint: tokenMint,
          clientTokenAccount: clientTokenAccount,
          escrowTokenAccount: escrowVaultPda,
          client: wallet,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        });

      // If vault doesn't exist, add instruction to create it
      if (!vaultAccountInfo) {
        const createVaultIx = createAssociatedTokenAccountInstruction(
          wallet, // payer
          escrowVaultPda, // associated token account
          tokenEscrowPda, // owner (the escrow PDA)
          tokenMint // mint
        );
        // Note: This might need to be handled in the smart contract itself
      }

      const signature = await transaction.rpc();

      console.log('Token escrow deposited:', signature);

      return {
        signature,
        tokenEscrow: tokenEscrowPda,
        amount: amountInSmallestUnit
      };
    } catch (err) {
      console.error('Error depositing token escrow:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to deposit token escrow';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [program, wallet, connection, deriveTokenEscrowPDA, deriveEscrowVaultPDA]);

  // Release SPL tokens from escrow
  const releaseTokenEscrow = useCallback(async (
    jobPda: PublicKey,
    token: TokenConfig,
    freelancerWallet: PublicKey
  ) => {
    if (!program || !wallet) {
      throw new Error('Wallet not connected or program not initialized');
    }

    setLoading(true);
    setError(null);

    try {
      const tokenMint = new PublicKey(token.mint);

      // Derive PDAs
      const tokenEscrowPda = await deriveTokenEscrowPDA(jobPda);
      const escrowVaultPda = await deriveEscrowVaultPDA(jobPda, tokenMint);

      // Get freelancer's token account
      const freelancerTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        freelancerWallet
      );

      // Check if freelancer token account exists
      const freelancerAccountInfo = await connection.getAccountInfo(freelancerTokenAccount);

      let transaction = program.methods
        .releaseTokenEscrow()
        .accounts({
          tokenEscrow: tokenEscrowPda,
          job: jobPda,
          tokenMint: tokenMint,
          escrowTokenAccount: escrowVaultPda,
          freelancerTokenAccount: freelancerTokenAccount,
          client: wallet,
          freelancer: freelancerWallet,
          tokenProgram: TOKEN_PROGRAM_ID,
        });

      // If freelancer token account doesn't exist, create it
      if (!freelancerAccountInfo) {
        const createFreelancerTokenAccountIx = createAssociatedTokenAccountInstruction(
          wallet, // payer (client pays for creation)
          freelancerTokenAccount,
          freelancerWallet,
          tokenMint
        );
        // Add this instruction before the transaction
        // This might need special handling
      }

      const signature = await transaction.rpc();

      console.log('Token escrow released:', signature);

      return {
        signature,
        tokenEscrow: tokenEscrowPda
      };
    } catch (err) {
      console.error('Error releasing token escrow:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to release token escrow';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [program, wallet, connection, deriveTokenEscrowPDA, deriveEscrowVaultPDA]);

  // Fetch token escrow data
  const fetchTokenEscrow = useCallback(async (jobPda: PublicKey) => {
    if (!program) throw new Error('Program not initialized');

    try {
      const tokenEscrowPda = await deriveTokenEscrowPDA(jobPda);
      // @ts-ignore - TokenEscrow account type from IDL
      const escrowData = await program.account.tokenEscrow.fetch(tokenEscrowPda);

      return {
        publicKey: tokenEscrowPda,
        account: escrowData
      };
    } catch (err) {
      console.error('Error fetching token escrow:', err);
      return null;
    }
  }, [program, deriveTokenEscrowPDA]);

  // Open token dispute
  const openTokenDispute = useCallback(async (
    jobPda: PublicKey,
    reason: string
  ) => {
    if (!program || !wallet) {
      throw new Error('Wallet not connected or program not initialized');
    }

    setLoading(true);
    setError(null);

    try {
      // Derive dispute PDA
      const [disputePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('token-dispute'), jobPda.toBuffer()],
        program.programId
      );

      const signature = await program.methods
        .openTokenDispute(reason)
        .accounts({
          dispute: disputePda,
          job: jobPda,
          initiator: wallet,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('Token dispute opened:', signature);

      return {
        signature,
        dispute: disputePda
      };
    } catch (err) {
      console.error('Error opening token dispute:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to open token dispute';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [program, wallet]);

  return {
    depositTokenEscrow,
    releaseTokenEscrow,
    fetchTokenEscrow,
    openTokenDispute,
    loading,
    error
  };
}
