import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Box,
  Typography,
  Alert,
  Card,
  CardContent,
  Avatar,
  Chip,
  Divider,
} from '@mui/material';
import { Person, Star } from '@mui/icons-material';
import { useWallet } from '@solana/wallet-adapter-react';
import Layout from '../../src/components/Layout';
import JobForm from '../../src/components/JobForm';
import { useJobs } from '../../src/hooks/useJobs';
import { useIPFS } from '../../src/hooks/useIPFS';
import { useSolanaProgram } from '../../src/hooks/useSolanaProgram';
import { deriveReputationPDA } from '../../src/utils/pda';
import { PublicKey } from '@solana/web3.js';
import type { JobMetadata } from '../../src/types';

export default function DirectHire() {
  const router = useRouter();
  const { freelancer } = router.query; // Get freelancer address from URL
  const { publicKey, connected } = useWallet();
  const { createJob, loading, error } = useJobs();
  const { upload, isUploading } = useIPFS();
  const { program } = useSolanaProgram();

  const [freelancerReputation, setFreelancerReputation] = useState<any>(null);
  const [loadingReputation, setLoadingReputation] = useState(false);

  useEffect(() => {
    if (freelancer && typeof freelancer === 'string' && program) {
      loadFreelancerReputation(freelancer);
    }
  }, [freelancer, program]);

  const loadFreelancerReputation = async (address: string) => {
    try {
      setLoadingReputation(true);
      const pubkey = new PublicKey(address);
      const [reputationPda] = deriveReputationPDA(pubkey);

      // @ts-ignore
      const reputation = await program.account.reputation.fetch(reputationPda);
      setFreelancerReputation(reputation);
    } catch (err) {
      console.error('Error loading freelancer reputation:', err);
    } finally {
      setLoadingReputation(false);
    }
  };

  const handleSubmit = async (data: {
    title: string;
    description: string;
    budget: string;
    deadline: Date;
    metadata: JobMetadata;
  }) => {
    if (!connected || !publicKey) {
      alert('Please connect your wallet first');
      return;
    }

    if (!freelancer || typeof freelancer !== 'string') {
      alert('Freelancer address is required for direct hire');
      return;
    }

    try {
      // Add note to metadata that this is a private job
      const privateMetadata = {
        ...data.metadata,
        isPrivate: true,
        invitedFreelancer: freelancer,
        notes: `Private job for ${formatAddress(freelancer)}. ${data.metadata.notes || ''}`,
      };

      // Upload metadata to IPFS
      const ipfsHash = await upload(privateMetadata);
      if (!ipfsHash) {
        throw new Error('Failed to upload metadata to IPFS');
      }

      // Create job on blockchain
      const deadlineTimestamp = Math.floor(data.deadline.getTime() / 1000);
      const result = await createJob(
        data.title,
        data.description,
        data.budget,
        deadlineTimestamp,
        ipfsHash
      );

      // Show success and redirect to job with invite parameter
      alert('Private job created successfully! Redirecting to send invite...');
      router.push(`/jobs/${result.jobPda.toString()}?invite=${freelancer}`);
    } catch (err) {
      console.error('Error creating direct hire job:', err);
      alert('Failed to create job: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const isLoading = loading || isUploading;

  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom fontWeight={700}>
            Create Direct Hire Job
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create a private job and invite a specific freelancer to work on it
          </Typography>
        </Box>

        {!connected && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Please connect your wallet to create a direct hire job
          </Alert>
        )}

        {!freelancer && connected && (
          <Alert severity="info" sx={{ mb: 3 }}>
            No freelancer selected. Please go to "Find Talent" and select a freelancer to create a direct hire job.
          </Alert>
        )}

        {/* Freelancer Info Card */}
        {freelancer && typeof freelancer === 'string' && (
          <Card sx={{ mb: 3, bgcolor: 'background.default' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Hiring
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.main' }}>
                  <Person />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" fontWeight={600}>
                    {formatAddress(freelancer)}
                  </Typography>
                  {freelancerReputation && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Star sx={{ fontSize: 16, color: 'warning.main' }} />
                      <Typography variant="body2" fontWeight={600}>
                        {freelancerReputation.averageRating?.toFixed(1) || '0.0'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        · {freelancerReputation.completedJobs || 0} jobs completed
                      </Typography>
                    </Box>
                  )}
                  {loadingReputation && (
                    <Typography variant="caption" color="text.secondary">
                      Loading reputation...
                    </Typography>
                  )}
                </Box>
                <Chip label="Private Job" color="secondary" size="small" />
              </Box>
            </CardContent>
          </Card>
        )}

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight={600} gutterBottom>
            What is Direct Hire?
          </Typography>
          <Typography variant="body2">
            • Create a private job offer for a specific freelancer<br/>
            • The freelancer will be invited to bid on your job<br/>
            • Other freelancers can still see and bid on the job<br/>
            • You can accept any bid, including the invited freelancer's
          </Typography>
        </Alert>

        <Divider sx={{ mb: 3 }} />

        {connected && freelancer && (
          <JobForm
            onSubmit={handleSubmit}
            isLoading={isLoading}
            error={error}
          />
        )}
      </Container>
    </Layout>
  );
}
