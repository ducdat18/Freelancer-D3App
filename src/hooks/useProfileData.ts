import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useIPFS } from './useIPFS';

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  imageUri: string; // IPFS hash
  link?: string;
  tags?: string[];
  createdAt: number;
}

export interface ProfileMetadata {
  skills: string[];
  bio: string;
  portfolio: PortfolioItem[];
  avatarUri?: string;
  displayName?: string;
  hourlyRate?: number;
  availability?: 'available' | 'busy' | 'not-available';
  location?: string;
  timezone?: string;
  languages?: string[];
  education?: string;
  experience?: string;
  website?: string;
  github?: string;
  twitter?: string;
  linkedin?: string;
}

const DEFAULT_PROFILE: ProfileMetadata = {
  skills: [],
  bio: '',
  portfolio: [],
  availability: 'available'
};

export function useProfileData(walletAddress?: string) {
  const { publicKey } = useWallet();
  const { upload, fetch: fetchIPFS } = useIPFS();
  const [profile, setProfile] = useState<ProfileMetadata>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileUri, setProfileUri] = useState<string | null>(null);

  // Use provided wallet address or connected wallet
  const address = walletAddress || publicKey?.toBase58();

  // Load profile from localStorage or IPFS
  const loadProfile = useCallback(async () => {
    if (!address) {
      setProfile(DEFAULT_PROFILE);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First, try to load from localStorage for quick access
      const localKey = `freelancer_profile_${address}`;
      const localData = localStorage.getItem(localKey);

      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          setProfile({ ...DEFAULT_PROFILE, ...parsed });

          // If there's an IPFS URI, also fetch from IPFS to get latest
          if (parsed.ipfsUri) {
            setProfileUri(parsed.ipfsUri);
            const ipfsData = await fetchIPFS<ProfileMetadata>(parsed.ipfsUri);
            if (ipfsData) {
              setProfile({ ...DEFAULT_PROFILE, ...ipfsData });
              // Update localStorage with IPFS data
              localStorage.setItem(localKey, JSON.stringify({ ...ipfsData, ipfsUri: parsed.ipfsUri }));
            }
          }
        } catch (e) {
          console.error('Error parsing local profile:', e);
          setProfile(DEFAULT_PROFILE);
        }
      } else {
        setProfile(DEFAULT_PROFILE);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
      setProfile(DEFAULT_PROFILE);
    } finally {
      setLoading(false);
    }
  }, [address, fetchIPFS]);

  // Save profile to both localStorage and IPFS
  const saveProfile = useCallback(async (profileData: Partial<ProfileMetadata>): Promise<string | null> => {
    if (!address) {
      setError('No wallet connected');
      return null;
    }

    setSaving(true);
    setError(null);

    try {
      const updatedProfile = { ...profile, ...profileData };

      // Save to localStorage immediately for quick access
      const localKey = `freelancer_profile_${address}`;
      const localData = { ...updatedProfile, ipfsUri: profileUri };
      localStorage.setItem(localKey, JSON.stringify(localData));
      setProfile(updatedProfile);

      // Upload to IPFS for permanent storage
      const ipfsHash = await upload(updatedProfile);
      setProfileUri(ipfsHash);

      // Update localStorage with IPFS URI
      localStorage.setItem(localKey, JSON.stringify({ ...updatedProfile, ipfsUri: ipfsHash }));

      return ipfsHash;
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to save profile');
      return null;
    } finally {
      setSaving(false);
    }
  }, [address, profile, profileUri, upload]);

  // Update specific fields
  const updateSkills = useCallback(async (skills: string[]) => {
    return saveProfile({ skills });
  }, [saveProfile]);

  const updateBio = useCallback(async (bio: string) => {
    return saveProfile({ bio });
  }, [saveProfile]);

  const updatePortfolio = useCallback(async (portfolio: PortfolioItem[]) => {
    return saveProfile({ portfolio });
  }, [saveProfile]);

  const updateAvatar = useCallback(async (avatarUri: string) => {
    return saveProfile({ avatarUri });
  }, [saveProfile]);

  const updateDisplayName = useCallback(async (displayName: string) => {
    return saveProfile({ displayName });
  }, [saveProfile]);

  const updateHourlyRate = useCallback(async (hourlyRate: number) => {
    return saveProfile({ hourlyRate });
  }, [saveProfile]);

  const updateAvailability = useCallback(async (availability: 'available' | 'busy' | 'not-available') => {
    return saveProfile({ availability });
  }, [saveProfile]);

  const updateSocialLinks = useCallback(async (links: {
    website?: string;
    github?: string;
    twitter?: string;
    linkedin?: string;
  }) => {
    return saveProfile(links);
  }, [saveProfile]);

  // Add portfolio item
  const addPortfolioItem = useCallback(async (item: Omit<PortfolioItem, 'id' | 'createdAt'>) => {
    const newItem: PortfolioItem = {
      ...item,
      id: Date.now().toString(),
      createdAt: Date.now()
    };
    const updatedPortfolio = [...profile.portfolio, newItem];
    return saveProfile({ portfolio: updatedPortfolio });
  }, [profile.portfolio, saveProfile]);

  // Remove portfolio item
  const removePortfolioItem = useCallback(async (id: string) => {
    const updatedPortfolio = profile.portfolio.filter(item => item.id !== id);
    return saveProfile({ portfolio: updatedPortfolio });
  }, [profile.portfolio, saveProfile]);

  // Clear profile (for testing)
  const clearProfile = useCallback(() => {
    if (!address) return;
    const localKey = `freelancer_profile_${address}`;
    localStorage.removeItem(localKey);
    setProfile(DEFAULT_PROFILE);
    setProfileUri(null);
  }, [address]);

  // Load profile on mount or when address changes
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return {
    profile,
    profileUri,
    loading,
    saving,
    error,
    saveProfile,
    updateSkills,
    updateBio,
    updatePortfolio,
    updateAvatar,
    updateDisplayName,
    updateHourlyRate,
    updateAvailability,
    updateSocialLinks,
    addPortfolioItem,
    removePortfolioItem,
    clearProfile,
    refetch: loadProfile
  };
}
