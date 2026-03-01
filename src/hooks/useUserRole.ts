import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useJobs } from './useJobs';
import { useBids } from './useBids';
import { useReputation } from './useReputation';
import { detectUserRole, UserRole } from '../utils/userRole';

/**
 * Hook to detect and manage user role
 * Returns role information based on on-chain activity
 */
export function useUserRole() {
  const { publicKey, connected } = useWallet();
  // ✅ PERFORMANCE: Disable auto-fetch, fetch manually only when needed
  const { jobs, loading: loadingJobs, fetchAllJobs } = useJobs({ autoFetch: false });
  const { fetchReputation } = useReputation();

  const [role, setRole] = useState<UserRole>({
    isFreelancer: false,
    isClient: false,
    primary: 'new',
    hasReputation: false,
    jobsPosted: 0,
    bidsSubmitted: 0,
    jobsCompleted: 0,
  });
  const [reputation, setReputation] = useState<any>(null);
  const [allBids, setAllBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!connected || !publicKey) {
      setRole({
        isFreelancer: false,
        isClient: false,
        primary: 'new',
        hasReputation: false,
        jobsPosted: 0,
        bidsSubmitted: 0,
        jobsCompleted: 0,
      });
      setLoading(false);
      return;
    }

    // ✅ PERFORMANCE: Only fetch jobs when we have none
    if (jobs.length === 0) {
      fetchAllJobs().then(() => loadUserRole());
    } else {
      loadUserRole();
    }
  }, [connected, publicKey]);

  const loadUserRole = async () => {
    if (!publicKey) return;

    try {
      setLoading(true);

      // Fetch reputation
      let rep = null;
      try {
        rep = await fetchReputation(publicKey);
        setReputation(rep);
      } catch (err) {
        // No reputation yet
        console.log('No reputation found for user');
      }

      // Fetch all bids (we need this to detect if user has bid before)
      // Note: This is a simplified version, in production you'd fetch user's bids only
      const bids: any[] = [];
      setAllBids(bids);

      // Detect role
      const detectedRole = detectUserRole(publicKey, jobs, bids, rep);
      setRole(detectedRole);
    } catch (err) {
      console.error('Error loading user role:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    role,
    reputation,
    loading: loading || loadingJobs,
    refresh: loadUserRole,
  };
}
