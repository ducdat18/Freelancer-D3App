import { Container, Typography, Box, Alert, Button, CircularProgress } from '@mui/material';
import { useWallet } from '@solana/wallet-adapter-react';
import { useJobsQuery, type JobWithKey } from '../../hooks/queries/useJobsQuery';
import { useReputationQuery } from '../../hooks/queries/useReputationQuery';
import { useReputation } from '../../hooks/useReputation';
import JobCard from '../../components/JobCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { CheckCircle } from '@mui/icons-material';

export default function FreelancerDashboard() {
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  
  // ✅ Use React Query - Automatic caching!
  const { data: jobs = [], isLoading: jobsLoading } = useJobsQuery('inProgress') as { data: JobWithKey[], isLoading: boolean };
  const { data: reputationData, isLoading: reputationLoading } = useReputationQuery(publicKey || null);
  
  const { initializeReputation } = useReputation();
  const [initializingReputation, setInitializingReputation] = useState(false);
  
  // Reputation status
  const reputationInitialized = reputationData !== null;
  const loading = jobsLoading || reputationLoading;

  const handleInitializeReputation = async () => {
    if (!publicKey) return;
    
    setInitializingReputation(true);
    try {
      await initializeReputation();
      alert('✅ Reputation account initialized successfully! You can now receive reviews from clients.');
      
      // ✅ React Query will automatically refetch reputation
      // No manual state management needed!
    } catch (err) {
      console.error('Error initializing reputation:', err);
      alert('Failed to initialize reputation: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setInitializingReputation(false);
    }
  };

  if (!connected) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <EmptyState
            title="Connect your wallet"
            description="Please connect your wallet to view your dashboard"
          />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Freelancer Dashboard
        </Typography>

        {/* Reputation Initialization Banner */}
        {!reputationLoading && !reputationInitialized && (
          <Alert 
            severity="warning" 
            sx={{ mb: 3 }}
            action={
              <Button 
                color="inherit" 
                size="small"
                onClick={handleInitializeReputation}
                disabled={initializingReputation}
                startIcon={initializingReputation ? <CircularProgress size={16} /> : null}
              >
                {initializingReputation ? 'Initializing...' : 'Initialize Now'}
              </Button>
            }
          >
            <strong>Initialize Your Reputation Account</strong>
            <br />
            You need to initialize your reputation account to receive reviews from clients. This is a one-time setup and costs a small transaction fee.
          </Alert>
        )}

        {/* Reputation Status */}
        {!reputationLoading && reputationInitialized && reputationData && (
          <Alert 
            severity="success" 
            icon={<CheckCircle />}
            sx={{ mb: 3 }}
          >
            <strong>Reputation Initialized</strong> - You have {(reputationData as any)?.totalReviews || 0} reviews with an average rating of {(reputationData as any)?.averageRating?.toFixed(1) || '0.0'}/5.0
          </Alert>
        )}

        {jobsLoading ? (
          <LoadingSpinner />
        ) : jobs.length === 0 ? (
          <EmptyState
            title="No active work yet"
            description="Browse available jobs and start bidding"
            actionLabel="Browse Jobs"
            onAction={() => router.push('/jobs')}
          />
        ) : (
          <Box sx={{ display: 'grid', gap: 2 }}>
            {jobs.map((job) => (
              <JobCard key={job.publicKey.toString()} job={job} />
            ))}
          </Box>
        )}
      </Box>
    </Container>
  );
}
