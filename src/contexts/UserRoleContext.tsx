import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAllJobsQuery } from '../hooks/queries/useJobsQuery';
import { useReputationQuery } from '../hooks/queries/useReputationQuery';
import { detectUserRole, type UserRole } from '../utils/userRole';

interface UserRoleContextValue {
  role: UserRole;
  loading: boolean;
  reputation: any;
}

const defaultRole: UserRole = {
  isFreelancer: false,
  isClient: false,
  primary: 'new',
  hasReputation: false,
  jobsPosted: 0,
  bidsSubmitted: 0,
  jobsCompleted: 0,
};

const UserRoleContext = createContext<UserRoleContextValue>({
  role: defaultRole,
  loading: true,
  reputation: null,
});

export function UserRoleProvider({ children }: { children: ReactNode }) {
  const { publicKey, connected } = useWallet();
  const { data: allJobs, isLoading: loadingJobs } = useAllJobsQuery();
  const { data: reputation, isLoading: loadingRep } = useReputationQuery(publicKey || null);

  const role = useMemo(() => {
    if (!connected || !publicKey) return defaultRole;
    return detectUserRole(publicKey, allJobs || [], [], reputation);
  }, [connected, publicKey, allJobs, reputation]);

  const loading = loadingJobs || loadingRep;

  return (
    <UserRoleContext.Provider value={{ role, loading, reputation }}>
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRoleContext() {
  return useContext(UserRoleContext);
}
