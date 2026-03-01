import { useState } from 'react';
import { Container, Box, Typography, Tabs, Tab, Button } from '@mui/material';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import JobForm from '../components/JobForm';
import type { MilestoneInput } from '../components/JobForm';
import BrowseFreelancersTab from '../components/client/BrowseFreelancersTab';
import { useJobs } from '../hooks/useJobs';
import { useMilestones } from '../hooks/useMilestones';
import { useIPFS } from '../hooks/useIPFS';
import { deriveJobPDA } from '../utils/pda';
import type { JobMetadata } from '../types';
import { WalletOutlined } from '@mui/icons-material';

export default function CreateJob() {
  const router = useRouter();
  const { publicKey, connected } = useWallet();
  const { createJob, loading, error } = useJobs();
  const { initJobMilestones, createMilestone: createMilestoneOnChain } = useMilestones();
  const { upload, isUploading } = useIPFS();
  const [tabValue, setTabValue] = useState(0);

  const handleSubmit = async (data: {
    title: string;
    description: string;
    budget: string;
    deadline: Date;
    metadata: JobMetadata;
    useMilestones?: boolean;
    milestones?: MilestoneInput[];
  }) => {
    if (!connected || !publicKey) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      // Upload metadata to IPFS
      const ipfsHash = await upload(data.metadata);
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

      // If milestones enabled, create milestone config and milestones
      if (data.useMilestones && data.milestones && data.milestones.length > 0) {
        try {
          const jobPda = deriveJobPDA(publicKey, deadlineTimestamp)[0];

          // Initialize milestone config
          await initJobMilestones(jobPda, data.milestones.length);

          // Create each milestone sequentially
          for (let i = 0; i < data.milestones.length; i++) {
            const ms = data.milestones[i];
            await createMilestoneOnChain(
              jobPda,
              i,
              ms.title,
              ms.description,
              ms.amount
            );
          }
        } catch (milestoneErr) {
          console.error('Error creating milestones:', milestoneErr);
          alert('Job created but milestones failed. You can add milestones later.');
        }
      }

      // Show success message and redirect
      alert('Job created successfully! Transaction: ' + result.signature);
      router.push('/jobs');
    } catch (err) {
      console.error('Error creating job:', err);
      alert('Failed to create job: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const isLoading = loading || isUploading;

  return (
    <>
      {/* Page Header */}
      <Box
        sx={{
          borderBottom: '1px solid rgba(0,255,195,0.08)',
          background: 'linear-gradient(180deg, rgba(0,255,195,0.03) 0%, transparent 100%)',
          px: { xs: 2, md: 4 },
          py: { xs: 3, md: 4 },
        }}
      >
        <Container maxWidth="md">
          <Box
            sx={{
              display: 'inline-flex', alignItems: 'center', gap: 1,
              px: 1.5, py: 0.4, mb: 1.5,
              bgcolor: 'rgba(0,255,195,0.06)', border: '1px solid rgba(0,255,195,0.15)',
              borderRadius: 1,
            }}
          >
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#00ffc3', boxShadow: '0 0 6px #00ffc3' }} />
            <Typography sx={{ fontFamily: '"Orbitron", monospace', fontSize: '0.58rem', letterSpacing: '0.12em', color: '#00ffc3' }}>
              // POST A JOB
            </Typography>
          </Box>
          <Typography
            variant="h4"
            fontWeight={800}
            sx={{
              fontFamily: '"Orbitron", sans-serif',
              background: 'linear-gradient(135deg, #fff 40%, #00ffc3 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              lineHeight: 1.2,
            }}
          >
            Create a Job
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            Post on-chain · funds held in trustless escrow until delivery
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="md">
        <Box sx={{ my: 4 }}>
          {/* Wallet not connected warning */}
          {!connected && (
            <Box
              sx={{
                mb: 3, px: 2.5, py: 2,
                bgcolor: 'rgba(255,152,0,0.05)',
                border: '1px solid rgba(255,152,0,0.2)',
                borderRadius: 2,
                display: 'flex', alignItems: 'center', gap: 2,
              }}
            >
              <WalletOutlined sx={{ color: '#ff9800', fontSize: 20, flexShrink: 0 }} />
              <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                Connect your wallet to post a job or browse freelancers
              </Typography>
            </Box>
          )}

          {/* Tabs */}
          <Box sx={{ border: '1px solid rgba(0,255,195,0.08)', borderRadius: 2, overflow: 'hidden', mb: 3 }}>
            <Box sx={{ borderBottom: '1px solid rgba(0,255,195,0.08)', bgcolor: 'rgba(0,0,0,0.2)' }}>
              <Tabs
                value={tabValue}
                onChange={(_, v) => setTabValue(v)}
                TabIndicatorProps={{ style: { backgroundColor: tabValue === 0 ? '#00ffc3' : '#9945ff', height: 2 } }}
                sx={{
                  minHeight: 44,
                  '& .MuiTab-root': {
                    minHeight: 44,
                    textTransform: 'none',
                    fontSize: '0.82rem',
                    fontWeight: 500,
                    color: 'text.secondary',
                  },
                  '& .Mui-selected': { color: tabValue === 0 ? '#00ffc3 !important' : '#9945ff !important', fontWeight: '600 !important' },
                }}
              >
                <Tab label="Post a Job" />
                <Tab label="Browse Freelancers" />
              </Tabs>
            </Box>

            <Box sx={{ p: 3 }}>
              {tabValue === 0 && (
                <>
                  {/* Job Form */}
                  <JobForm
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                    error={error}
                  />
                </>
              )}

              {tabValue === 1 && (
                <BrowseFreelancersTab />
              )}
            </Box>
          </Box>
        </Box>
      </Container>
    </>
  );
}
