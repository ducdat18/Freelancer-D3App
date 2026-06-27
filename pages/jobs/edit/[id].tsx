import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Container, Box, Typography, Alert, CircularProgress, useTheme,
} from '@mui/material';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import JobForm from '../../../src/components/JobForm';
import type { MilestoneInput } from '../../../src/components/JobForm';
import { useJobs } from '../../../src/hooks/useJobs';
import { useIPFS } from '../../../src/hooks/useIPFS';
import { fetchFromIPFS } from '../../../src/services/ipfs';
import type { JobMetadata } from '../../../src/types';

export default function EditJob() {
  const router = useRouter();
  const { id } = router.query;
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primaryMain = theme.palette.primary.main;

  const { connected, publicKey } = useWallet();
  const { fetchJob, updateJobMetadata } = useJobs();
  const { isUploading } = useIPFS();

  const [job, setJob] = useState<any>(null);
  const [metadata, setMetadata] = useState<JobMetadata | null>(null);
  const [jobPda, setJobPda] = useState<PublicKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id || typeof id !== 'string') return;
      try {
        setLoading(true);
        setPageError(null);
        const pda = new PublicKey(id);
        setJobPda(pda);
        const jobData = await fetchJob(pda);
        setJob(jobData);
        if (jobData?.metadataUri) {
          // Check local override first
          const overrideKey = `job_metadata_override_${pda.toBase58()}`;
          const overrideCid = typeof window !== 'undefined'
            ? localStorage.getItem(overrideKey)
            : null;
          const meta = await fetchFromIPFS(overrideCid || jobData.metadataUri);
          if (meta) setMetadata(meta as JobMetadata);
        }
      } catch (err) {
        setPageError('Failed to load job');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, fetchJob]);

  // Gate: only the job owner can edit
  const isOwner = job && publicKey && job.client?.toBase58() === publicKey.toBase58();
  const statusKey = job
    ? (typeof job.status === 'object' ? Object.keys(job.status)[0] : job.status)
    : null;
  const isEditable = statusKey === 'open';

  const handleSubmit = async (data: {
    title: string;
    description: string;
    budget: string;
    deadline: Date;
    metadata: JobMetadata;
    tokenMint?: string | null;
  }) => {
    if (!jobPda) return;
    setSaving(true);
    setFormError(null);
    try {
      const deadlineTimestamp = Math.floor(data.deadline.getTime() / 1000);
      const updatedMeta: JobMetadata = {
        ...data.metadata,
        deadline: deadlineTimestamp,
        tokenMint: data.tokenMint ?? undefined,
        budgetSol: data.budget,
      };
      await updateJobMetadata(jobPda, updatedMeta);
      router.push(`/jobs/${jobPda.toBase58()}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update job');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress />
        </Container>
      </>
    );
  }

  if (pageError || !job) {
    return (
      <>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Alert severity="error">{pageError ?? 'Job not found'}</Alert>
        </Container>
      </>
    );
  }

  if (!connected) {
    return (
      <>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Alert severity="warning">Connect your wallet to edit this job.</Alert>
        </Container>
      </>
    );
  }

  if (!isOwner) {
    return (
      <>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Alert severity="error">Only the job owner can edit this job.</Alert>
        </Container>
      </>
    );
  }

  if (!isEditable) {
    return (
      <>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Alert severity="warning">
            Only open jobs can be edited. Current status: <strong>{statusKey}</strong>.
          </Alert>
        </Container>
      </>
    );
  }

  const initialDeadline = metadata?.deadline ? new Date(metadata.deadline * 1000) : undefined;

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
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: primaryMain }} />
            <Typography sx={{ fontFamily: '"Orbitron", monospace', fontSize: '0.58rem', letterSpacing: '0.12em', color: primaryMain }}>
              // EDIT JOB
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
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1.2,
            }}
          >
            Edit Job
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            Updates are stored in IPFS — the on-chain account is not modified.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          Editing updates the job&apos;s IPFS metadata (title, description, category, skills, deadline).
          Budget and token type are recorded in metadata but the on-chain amount cannot be changed here.
        </Alert>

        <JobForm
          onSubmit={handleSubmit}
          isLoading={saving || isUploading}
          error={formError}
        />
      </Container>
    </>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
