import { useState, useEffect } from 'react';
import { Container, Box, Typography, Tabs, Tab, Button, Chip, useTheme } from '@mui/material';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import JobForm from '../components/JobForm';
import type { MilestoneInput } from '../components/JobForm';
import BrowseFreelancersTab from '../components/client/BrowseFreelancersTab';
import { useJobs } from '../hooks/useJobs';
import { useMilestones } from '../hooks/useMilestones';
import { useIPFS } from '../hooks/useIPFS';
import { useJobDraft } from '../hooks/useJobDraft';
import type { JobDraft } from '../hooks/useJobDraft';
import type { JobMetadata } from '../types';
import { WalletOutlined } from '@mui/icons-material';

export default function CreateJob() {
  const router = useRouter();
  const { publicKey, connected } = useWallet();
  const { createJob, depositJobEscrow, loading, error } = useJobs();
  const { initJobMilestones, createMilestone: createMilestoneOnChain } = useMilestones();
  const { upload, isUploading } = useIPFS();
  const { listDrafts, deleteDraft } = useJobDraft();
  const [tabValue, setTabValue] = useState(0);
  const [activeDraftId, setActiveDraftId] = useState<string | undefined>(undefined);
  const [drafts, setDrafts] = useState<JobDraft[]>([]);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primaryMain = theme.palette.primary.main;
  const secondaryMain = theme.palette.secondary.main;

  // Load draft from ?draft= query param
  useEffect(() => {
    const { draft } = router.query;
    if (typeof draft === 'string') setActiveDraftId(draft);
  }, [router.query]);

  // Refresh drafts list whenever tab switches to the form tab
  useEffect(() => {
    if (tabValue === 0) setDrafts(listDrafts());
  }, [tabValue, listDrafts]);

  const handleSubmit = async (data: {
    title: string;
    description: string;
    budget: string;
    deadline: Date;
    metadata: JobMetadata;
    tokenMint?: string | null;
    depositNow?: boolean;
    useMilestones?: boolean;
    milestones?: MilestoneInput[];
  }) => {
    if (!connected || !publicKey) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      const deadlineTimestamp = Math.floor(data.deadline.getTime() / 1000);

      // Build complete metadata including deadline, tokenMint, and budget
      const fullMetadata: JobMetadata = {
        ...data.metadata,
        deadline: deadlineTimestamp,
        tokenMint: data.tokenMint ?? undefined,
        budgetSol: data.budget,
      };

      const ipfsHash = await upload(fullMetadata);
      if (!ipfsHash) {
        throw new Error('Failed to upload metadata to IPFS');
      }

      // Create job on-chain — tokenMint is now forwarded correctly
      const result = await createJob(
        data.title,
        data.description,
        data.budget,
        deadlineTimestamp,
        ipfsHash,
        data.tokenMint
      );

      // Optionally deposit escrow immediately after job creation
      if (data.depositNow) {
        try {
          await depositJobEscrow(result.jobPda, data.budget);
        } catch (depositErr) {
          console.error('Error depositing escrow:', depositErr);
          alert('Job created but escrow deposit failed. You can deposit later from the job page.');
        }
      }

      // If milestones enabled, use result.jobPda (correct PDA from createJob)
      if (data.useMilestones && data.milestones && data.milestones.length > 0) {
        try {
          await initJobMilestones(result.jobPda, data.milestones.length);

          for (let i = 0; i < data.milestones.length; i++) {
            const ms = data.milestones[i];
            await createMilestoneOnChain(
              result.jobPda,
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
          borderBottom: 1,
          borderColor: 'divider',
          background: isDark 
            ? 'linear-gradient(180deg, rgba(0,255,195,0.03) 0%, transparent 100%)'
            : `linear-gradient(180deg, ${primaryMain}08 0%, transparent 100%)`,
          px: { xs: 2, md: 4 },
          py: { xs: 3, md: 4 },
        }}
      >
        <Container maxWidth="md">
          <Box
            sx={{
              display: 'inline-flex', alignItems: 'center', gap: 1,
              px: 1.5, py: 0.4, mb: 1.5,
              bgcolor: isDark ? 'rgba(0,255,195,0.06)' : `${primaryMain}15`, 
              border: 1, borderColor: isDark ? 'rgba(0,255,195,0.15)' : `${primaryMain}30`,
              borderRadius: 1,
            }}
          >
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: primaryMain, boxShadow: isDark ? `0 0 6px ${primaryMain}` : 'none' }} />
            <Typography sx={{ fontFamily: '"Orbitron", monospace', fontSize: '0.58rem', letterSpacing: '0.12em', color: primaryMain }}>
              {'// POST A JOB'}
            </Typography>
          </Box>
          <Typography
            variant="h4"
            fontWeight={800}
            sx={{
              fontFamily: '"Orbitron", sans-serif',
              background: isDark 
                ? `linear-gradient(135deg, #fff 40%, ${primaryMain} 100%)`
                : `linear-gradient(135deg, ${theme.palette.text.primary} 40%, ${primaryMain} 100%)`,
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
                bgcolor: isDark ? 'rgba(255,152,0,0.05)' : 'rgba(255,152,0,0.08)',
                border: 1,
                borderColor: isDark ? 'rgba(255,152,0,0.2)' : 'warning.light',
                borderRadius: 2,
                display: 'flex', alignItems: 'center', gap: 2,
              }}
            >
              <WalletOutlined sx={{ color: theme.palette.warning.main, fontSize: 20, flexShrink: 0 }} />
              <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                Connect your wallet to post a job or browse freelancers
              </Typography>
            </Box>
          )}

          {/* Tabs */}
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden', mb: 3, bgcolor: 'background.paper' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
              <Tabs
                value={tabValue}
                onChange={(_, v) => setTabValue(v)}
                TabIndicatorProps={{ style: { backgroundColor: tabValue === 0 ? primaryMain : secondaryMain, height: 2 } }}
                sx={{
                  minHeight: 44,
                  '& .MuiTab-root': {
                    minHeight: 44,
                    textTransform: 'none',
                    fontSize: '0.82rem',
                    fontWeight: 500,
                    color: 'text.secondary',
                  },
                  '& .Mui-selected': { color: tabValue === 0 ? `${primaryMain} !important` : `${secondaryMain} !important`, fontWeight: '600 !important' },
                }}
              >
                <Tab label="Post a Job" />
                <Tab label="Browse Freelancers" />
              </Tabs>
            </Box>

            <Box sx={{ p: 3 }}>
              {tabValue === 0 && (
                <>
                  {/* Drafts picker */}
                  {drafts.length > 0 && (
                    <Box sx={{ mb: 2.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600, letterSpacing: 1 }}>
                        SAVED DRAFTS
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {drafts.map(d => (
                          <Chip
                            key={d.id}
                            label={d.title || 'Untitled draft'}
                            size="small"
                            variant={activeDraftId === d.id ? 'filled' : 'outlined'}
                            color={activeDraftId === d.id ? 'primary' : 'default'}
                            onClick={() => {
                              setActiveDraftId(d.id);
                              router.replace({ query: { ...router.query, draft: d.id } }, undefined, { shallow: true });
                            }}
                            onDelete={() => {
                              deleteDraft(d.id);
                              setDrafts(listDrafts());
                              if (activeDraftId === d.id) setActiveDraftId(undefined);
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Job Form */}
                  <JobForm
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                    error={error}
                    draftId={activeDraftId}
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
