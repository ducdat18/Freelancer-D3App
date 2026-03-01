import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { useSolanaProgram } from './useSolanaProgram';
import { useReputation, type ReputationData } from './useReputation';
import { Achievement, AchievementType, ACHIEVEMENTS, checkAllEligibility } from '../config/achievements';

export interface AchievementRecord {
  publicKey: PublicKey;
  account: {
    user: PublicKey;
    achievementType: number;
    nftMint: PublicKey;
    mintedAt: number;
    bump: number;
  };
}

export function useAchievements(walletAddress?: string) {
  const { program } = useSolanaProgram();
  const { publicKey: connectedWallet } = useWallet();
  const wallet = walletAddress ? new PublicKey(walletAddress) : connectedWallet;

  const { fetchReputation } = useReputation();
  const [reputation, setReputation] = useState<ReputationData | null>(null);
  const [reputationLoading, setReputationLoading] = useState(false);

  const [achievements, setAchievements] = useState<AchievementRecord[]>([]);
  const [eligibleAchievements, setEligibleAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch reputation data
  useEffect(() => {
    if (wallet) {
      setReputationLoading(true);
      fetchReputation(wallet)
        .then(data => setReputation(data))
        .catch(err => console.error('Error fetching reputation:', err))
        .finally(() => setReputationLoading(false));
    }
  }, [wallet, fetchReputation]);

  // Fetch minted achievement NFTs from blockchain
  const fetchAchievements = useCallback(async () => {
    if (!program || !wallet) {
      setAchievements([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Note: AchievementRecord might not be in the IDL yet
      // This is a placeholder until the program is redeployed with achievement accounts
      // @ts-ignore - Achievement account type not in current IDL
      const achievementAccounts = await program.account.achievementRecord?.all([
        {
          memcmp: {
            offset: 8, // Skip discriminator
            bytes: wallet.toBase58(),
          },
        },
      ]);

      setAchievements(achievementAccounts || []);
    } catch (err) {
      console.error('Error fetching achievements:', err);
      // Fail silently if achievement accounts aren't available yet
      setAchievements([]);
    } finally {
      setLoading(false);
    }
  }, [program, wallet]);

  // Check which achievements are eligible to mint
  const checkEligibility = useCallback(() => {
    if (!reputation || reputationLoading) {
      setEligibleAchievements([]);
      return;
    }

    // Get all achievements user is eligible for
    const eligible = checkAllEligibility({
      completedJobs: reputation.completedJobs,
      totalReviews: reputation.totalReviews,
      averageRating: reputation.averageRating / 10, // Assuming stored as 0-50 scale
      totalEarned: Number(reputation.totalEarned)
    });

    // Filter out already minted achievements
    const mintedTypes = achievements.map(ach => ach.account.achievementType);
    const unminted = eligible.filter(ach => !mintedTypes.includes(ach.type));

    setEligibleAchievements(unminted);
  }, [reputation, reputationLoading, achievements]);

  // Derive achievement PDA
  const deriveAchievementPDA = useCallback(async (achievementType: AchievementType) => {
    if (!program || !wallet) throw new Error('Program or wallet not initialized');

    const [achievementPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('achievement'),
        wallet.toBuffer(),
        Buffer.from([achievementType])
      ],
      program.programId
    );

    return achievementPda;
  }, [program, wallet]);

  // Mint achievement NFT
  const mintAchievement = useCallback(async (
    achievementType: AchievementType,
    nftMint: PublicKey // NFT mint created via Metaplex
  ) => {
    if (!program || !wallet) {
      throw new Error('Wallet not connected or program not initialized');
    }

    setLoading(true);
    setError(null);

    try {
      const achievementPda = await deriveAchievementPDA(achievementType);

      // Get reputation PDA
      const [reputationPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('reputation'), wallet.toBuffer()],
        program.programId
      );

      const signature = await program.methods
        .mintAchievementNft(achievementType, nftMint)
        .accounts({
          achievementRecord: achievementPda,
          reputation: reputationPda,
          user: wallet,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('Achievement minted:', signature);

      // Refresh achievements
      await fetchAchievements();

      return {
        signature,
        achievementRecord: achievementPda
      };
    } catch (err) {
      console.error('Error minting achievement:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to mint achievement';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [program, wallet, deriveAchievementPDA, fetchAchievements]);

  // Check if achievement is already minted
  const isAchievementMinted = useCallback((achievementType: AchievementType): boolean => {
    return achievements.some(ach => ach.account.achievementType === achievementType);
  }, [achievements]);

  // Get earned achievement types
  const getEarnedTypes = useCallback((): AchievementType[] => {
    return achievements.map(ach => ach.account.achievementType);
  }, [achievements]);

  // Load achievements on mount
  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  // Check eligibility when reputation or achievements change
  useEffect(() => {
    checkEligibility();
  }, [checkEligibility]);

  return {
    achievements,
    eligibleAchievements,
    earnedTypes: getEarnedTypes(),
    loading: loading || reputationLoading,
    error,
    mintAchievement,
    isAchievementMinted,
    refetch: fetchAchievements
  };
}
