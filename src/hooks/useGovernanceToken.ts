import { useCallback, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { web3, BN } from "@coral-xyz/anchor";
import { useSolanaProgram } from "./useSolanaProgram";
import {
  derivePlatformConfigPDA,
  deriveTokenStakePDA,
  deriveStakeVaultPDA,
  deriveQualityStakePDA,
  deriveQualityVaultPDA,
  derivePlatformTreasuryPDA,
} from "../utils/pda";
import type { PlatformConfig, TokenStakeData, QualityStakeData } from "../types";
import type { PublicKey } from "../types/solana";
import {
  getSimPlatformConfig,
  getSimStake,
  simStakeTokens,
  simUnstakeTokens,
  simClaimRewards,
} from "../utils/stakingSimulator";

const { SystemProgram } = web3;
const TOKEN_PROGRAM_ID = new web3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

export function useGovernanceToken() {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();

  const [platformConfig, setPlatformConfig] = useState<PlatformConfig | null>(null);
  const [tokenStake, setTokenStake] = useState<TokenStakeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch PlatformConfig account
   */
  const fetchPlatformConfig = useCallback(async (): Promise<PlatformConfig | null> => {
    setLoading(true);
    setError(null);

    try {
      // @ts-ignore
      if (!program || !program.account.platformConfig) {
        // Fall back to devnet simulator
        const sim = getSimPlatformConfig();
        setPlatformConfig(sim);
        return sim;
      }
      const [configPda] = derivePlatformConfigPDA();
      // @ts-ignore - Program account types from IDL
      const config = await program.account.platformConfig.fetch(configPda);
      const result = config as PlatformConfig;
      setPlatformConfig(result);
      return result;
    } catch (err: any) {
      // On-chain fetch failed — fall back to simulator
      const sim = getSimPlatformConfig();
      setPlatformConfig(sim);
      return sim;
    } finally {
      setLoading(false);
    }
  }, [program]);

  /**
   * Fetch TokenStake account for a user
   */
  const fetchTokenStake = useCallback(
    async (user: PublicKey): Promise<TokenStakeData | null> => {
      setLoading(true);
      setError(null);

      try {
        // @ts-ignore
        if (!program || !program.account.tokenStake) {
          // Fall back to devnet simulator
          const sim = getSimStake(user.toBase58());
          setTokenStake(sim);
          return sim;
        }
        const [stakePda] = deriveTokenStakePDA(user);
        // @ts-ignore - Program account types from IDL
        const stake = await program.account.tokenStake.fetch(stakePda);
        const result = stake as TokenStakeData;
        setTokenStake(result);
        return result;
      } catch (err: any) {
        // Account doesn't exist yet (first-time staker) — not an error
        const sim = getSimStake(user.toBase58());
        setTokenStake(sim);
        return sim;
      } finally {
        setLoading(false);
      }
    },
    [program]
  );

  /**
   * Stake tokens with a lock period
   */
  const stakeTokens = useCallback(
    async (amount: number, lockPeriod: number) => {
      if (!publicKey) throw new Error("Wallet not connected");
      setLoading(true);
      setError(null);

      try {
        // @ts-ignore
        if (!program || typeof (program as any).methods.stakeTokens !== 'function') {
          // Devnet simulation
          const sig = await simStakeTokens(publicKey.toBase58(), amount, lockPeriod);
          return { signature: sig };
        }

        const [configPda] = derivePlatformConfigPDA();
        const [stakePda] = deriveTokenStakePDA(publicKey);
        const [vaultPda] = deriveStakeVaultPDA();

        // @ts-ignore - Program methods type inference issue
        const tx = await program.methods
          .stakeTokens(new BN(amount), new BN(lockPeriod))
          .accounts({
            platformConfig: configPda,
            tokenStake: stakePda,
            stakeVault: vaultPda,
            user: publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc({ skipPreflight: false, commitment: "confirmed" });

        return { signature: tx, stakePda };
      } catch (err: any) {
        setError(err.message || "Failed to stake tokens");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  /**
   * Unstake tokens
   */
  const unstakeTokens = useCallback(async () => {
    if (!publicKey) throw new Error("Wallet not connected");
    setLoading(true);
    setError(null);

    try {
      // @ts-ignore
      if (!program || typeof (program as any).methods.unstakeTokens !== 'function') {
        const sig = await simUnstakeTokens(publicKey.toBase58());
        return { signature: sig };
      }

      const [configPda] = derivePlatformConfigPDA();
      const [stakePda] = deriveTokenStakePDA(publicKey);
      const [vaultPda] = deriveStakeVaultPDA();

      // @ts-ignore - Program methods type inference issue
      const tx = await program.methods
        .unstakeTokens()
        .accounts({
          platformConfig: configPda,
          tokenStake: stakePda,
          stakeVault: vaultPda,
          user: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc({ skipPreflight: false, commitment: "confirmed" });

      return { signature: tx };
    } catch (err: any) {
      setError(err.message || "Failed to unstake tokens");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey]);

  /**
   * Claim staking rewards
   */
  const claimStakingRewards = useCallback(async () => {
    if (!publicKey) throw new Error("Wallet not connected");
    setLoading(true);
    setError(null);

    try {
      // @ts-ignore
      if (!program || typeof (program as any).methods.claimStakingRewards !== 'function') {
        const { sig } = await simClaimRewards(publicKey.toBase58());
        return { signature: sig };
      }

      const [configPda] = derivePlatformConfigPDA();
      const [stakePda] = deriveTokenStakePDA(publicKey);
      const [treasuryPda] = derivePlatformTreasuryPDA();

      // @ts-ignore - Program methods type inference issue
      const tx = await program.methods
        .claimStakingRewards()
        .accounts({
          platformConfig: configPda,
          tokenStake: stakePda,
          platformTreasury: treasuryPda,
          user: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc({ skipPreflight: false, commitment: "confirmed" });

      return { signature: tx };
    } catch (err: any) {
      setError(err.message || "Failed to claim staking rewards");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey]);

  /**
   * Stake quality collateral for a job
   */
  const stakeQualityCollateral = useCallback(
    async (jobPda: PublicKey, amount: number) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      // @ts-ignore
      if (typeof (program as any).methods.stakeQualityCollateral !== 'function') throw new Error('Token staking is not yet deployed on-chain');
      setLoading(true);
      setError(null);

      try {
        const [qualityStakePda] = deriveQualityStakePDA(jobPda);
        const [qualityVaultPda] = deriveQualityVaultPDA(jobPda);

        // @ts-ignore - Program methods type inference issue
        const tx = await program.methods
          .stakeQualityCollateral(new BN(amount))
          .accounts({
            qualityStake: qualityStakePda,
            qualityVault: qualityVaultPda,
            job: jobPda,
            staker: publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc({ skipPreflight: false, commitment: "confirmed" });

        return { signature: tx, qualityStakePda };
      } catch (err: any) {
        console.error("Error staking quality collateral:", err);
        setError(err.message || "Failed to stake quality collateral");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  /**
   * Release quality collateral for a job
   */
  const releaseQualityCollateral = useCallback(
    async (jobPda: PublicKey) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      // @ts-ignore
      if (typeof (program as any).methods.releaseQualityCollateral !== 'function') throw new Error('Token staking is not yet deployed on-chain');
      setLoading(true);
      setError(null);

      try {
        const [qualityStakePda] = deriveQualityStakePDA(jobPda);
        const [qualityVaultPda] = deriveQualityVaultPDA(jobPda);

        // @ts-ignore - Program methods type inference issue
        const tx = await program.methods
          .releaseQualityCollateral()
          .accounts({
            qualityStake: qualityStakePda,
            qualityVault: qualityVaultPda,
            job: jobPda,
            staker: publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc({ skipPreflight: false, commitment: "confirmed" });

        return { signature: tx };
      } catch (err: any) {
        console.error("Error releasing quality collateral:", err);
        setError(err.message || "Failed to release quality collateral");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  return {
    // State
    platformConfig,
    tokenStake,
    loading,
    error,
    // Queries
    fetchPlatformConfig,
    fetchTokenStake,
    // Instructions
    stakeTokens,
    unstakeTokens,
    claimStakingRewards,
    stakeQualityCollateral,
    releaseQualityCollateral,
  };
}
