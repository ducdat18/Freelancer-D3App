import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Grid,
  Divider,
  Paper,
  Avatar,
  Link as MuiLink,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TextField,
} from '@mui/material';
import {
  Person,
  CalendarToday,
  AccountBalanceWallet,
  Work,
  Schedule,
  Description,
  Close,
  Chat,
  CheckCircleOutline,
  CancelOutlined,
} from '@mui/icons-material';
import Layout from '../../src/components/Layout';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import { useJobs } from '../../src/hooks/useJobs';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { formatSol } from '../../src/types/solana';
import { SolanaIconSimple } from '../../src/components/SolanaIcon';
import { fetchFromIPFS, uploadToIPFS } from '../../src/services/ipfs';
import { deriveEscrowPDA, deriveWorkSubmissionPDA } from '../../src/utils/pda';
import Link from 'next/link';
import BidForm from '../../src/components/freelancer/BidForm';
import ChatDialog from '../../src/components/chat/ChatDialog';
import BidsList from '../../src/components/job/BidsList';
import DeliverableSubmit from '../../src/components/freelancer/DeliverableSubmit';
import ApprovalModal from '../../src/components/client/ApprovalModal';
import { useReputation } from '../../src/hooks/useReputation';
import EscrowStatus, { EscrowState } from '../../src/components/common/EscrowStatus';
import JobStatusTimeline, { JobStatusType } from '../../src/components/job/JobStatusTimeline';
import { useEscrow } from '../../src/hooks/useEscrow';
import { useSolanaProgram } from '../../src/hooks/useSolanaProgram';
import { useDispute } from '../../src/hooks/useDispute';
import MilestoneTimeline from '../../src/components/job/MilestoneTimeline';
import MilestoneEscrowStatus from '../../src/components/common/MilestoneEscrowStatus';
import { useMilestones } from '../../src/hooks/useMilestones';
import { useNotificationContext } from '../../src/contexts/NotificationContext';
import { NotificationType } from '../../src/types';
import RiskAssessmentPanel from '../../src/components/ai/RiskAssessmentPanel';

// Helper functions - defined outside component to avoid TDZ errors
const formatAddress = (address: any) => {
  const addr = address.toBase58();
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
};

const getStatusColor = (status: any) => {
  const statusKey =
    typeof status === 'object' ? Object.keys(status)[0] : status;
  if (statusKey === 'open') return 'success';
  if (statusKey === 'inProgress') return 'info';
  if (statusKey === 'waitingForReview') return 'warning';
  if (statusKey === 'rejected') return 'error';
  if (statusKey === 'completed') return 'default';
  if (statusKey === 'disputed') return 'error';
  if (statusKey === 'cancelled') return 'warning';
  return 'default';
};

const getStatusText = (status: any) => {
  const statusKey =
    typeof status === 'object' ? Object.keys(status)[0] : status;
  if (statusKey === 'open') return 'Open';
  if (statusKey === 'inProgress') return 'In Progress';
  if (statusKey === 'waitingForReview') return 'Waiting For Review';
  if (statusKey === 'rejected') return 'Rejected';
  if (statusKey === 'completed') return 'Completed';
  if (statusKey === 'disputed') return 'Disputed';
  if (statusKey === 'cancelled') return 'Cancelled';
  return 'Unknown';
};

export default function JobDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [job, setJob] = useState<any>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bidDialogOpen, setBidDialogOpen] = useState(false);
  const [jobPda, setJobPda] = useState<PublicKey | null>(null);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [repostDialogOpen, setRepostDialogOpen] = useState(false);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [hasEscrow, setHasEscrow] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [workSubmission, setWorkSubmission] = useState<any>(null);
  const [submittingWork, setSubmittingWork] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [dispute, setDispute] = useState<any>(null);

  const { fetchJob, submitBid, completeJob, cancelJob } = useJobs();
  const { addNotification } = useNotificationContext();
  const { connected, publicKey } = useWallet();
  const { depositEscrow, fetchEscrow, submitWork } = useEscrow();
  const { submitReview, hasReputation } = useReputation();
  const { program } = useSolanaProgram();
  const { approveWork, rejectWork, raiseDispute, fetchDispute } = useDispute();
  const { fetchMilestoneConfig } = useMilestones();
  const [hasMilestones, setHasMilestones] = useState(false);

  useEffect(() => {
    async function loadJob() {
      if (!id || typeof id !== 'string') return;

      try {
        setLoading(true);
        setError(null);
        const pda = new PublicKey(id);
        setJobPda(pda);
        const jobData = await fetchJob(pda);
        setJob(jobData);

        // Check if escrow exists
        if (jobData) {
          const escrowData = await fetchEscrow(pda);
          setHasEscrow(!!escrowData);
        }

        // Fetch work submission if exists
        if (jobData && program) {
          try {
            const [workSubmissionPda] = deriveWorkSubmissionPDA(pda);
            // @ts-ignore - Program account types from IDL
            const workData = await program.account.workSubmission.fetch(workSubmissionPda);
            setWorkSubmission(workData);
          } catch (err) {
            // Work submission doesn't exist yet - this is normal
            console.log('No work submission yet');
          }
        }

        // Fetch dispute if exists
        if (jobData && getStatusText(jobData.status) === 'Disputed') {
          try {
            const disputeData = await fetchDispute(pda);
            setDispute(disputeData);
          } catch (err) {
            console.log('No dispute data');
          }
        }

        // Check if job has milestones
        try {
          const milestoneConfig = await fetchMilestoneConfig(pda);
          setHasMilestones(!!milestoneConfig);
        } catch {
          setHasMilestones(false);
        }

        // Try to fetch metadata from IPFS (returns null for invalid CIDs)
        if (jobData?.metadataUri) {
          const meta = await fetchFromIPFS(jobData.metadataUri);
          if (meta) {
            setMetadata(meta);
          } else {
            console.log('[Job] No valid metadata available for this job');
          }
        }
      } catch (err) {
        console.error('Error fetching job:', err);
        setError('Failed to load job details');
      } finally {
        setLoading(false);
      }
    }
    loadJob();
  }, [id, fetchEscrow, fetchJob, fetchDispute, program]);

  // Detect job status / bid-count changes and fire cross-user notifications
  useEffect(() => {
    if (!job || !jobPda || !publicKey) return;

    const pdaStr = jobPda.toBase58();
    const jobTitle = metadata?.title || job?.title || 'the job';
    const jobLink = `/jobs/${pdaStr}`;
    const statusKey = typeof job.status === 'object' ? Object.keys(job.status)[0] : job.status;
    const freelancerKey = job.selectedFreelancer?.toBase58?.();
    const clientKey = job.client?.toBase58?.();
    const myKey = publicKey.toBase58();

    const lastStatusKey = `job_last_status_${pdaStr}`;
    const lastBidCountKey = `job_last_bidcount_${pdaStr}`;
    const lastSeenStatus = localStorage.getItem(lastStatusKey);
    const lastSeenBidCount = parseInt(localStorage.getItem(lastBidCountKey) || '0');
    const currentBidCount = job.bidCount ?? 0;

    // Status-change notifications (skip if first visit, i.e. no stored status yet)
    if (lastSeenStatus && lastSeenStatus !== statusKey) {
      if (statusKey === 'inProgress' && freelancerKey === myKey) {
        addNotification(NotificationType.PROPOSAL_ACCEPTED, 'Bid Accepted!', `Your bid on "${jobTitle}" was accepted. Time to get started!`, jobLink);
      }
      if (statusKey === 'waitingForReview' && clientKey === myKey) {
        addNotification(NotificationType.JOB_STARTED, 'Work Submitted', `Freelancer submitted deliverables on "${jobTitle}". Please review.`, jobLink);
      }
      if (statusKey === 'completed' && freelancerKey === myKey) {
        addNotification(NotificationType.PAYMENT_RECEIVED, 'Payment Released!', `Your work on "${jobTitle}" was approved and payment released!`, jobLink);
      }
      if (statusKey === 'rejected' && freelancerKey === myKey) {
        addNotification(NotificationType.DISPUTE_RAISED, 'Work Rejected', `Your work on "${jobTitle}" was rejected. You may raise a dispute.`, jobLink);
      }
      if (statusKey === 'disputed' && clientKey === myKey) {
        addNotification(NotificationType.DISPUTE_RAISED, 'Dispute Opened', `A dispute has been raised on "${jobTitle}".`, '/disputes');
      }
    }

    // Bid-count notifications for the client (skip if first visit)
    if (lastSeenStatus && clientKey === myKey && currentBidCount > lastSeenBidCount) {
      const newBids = currentBidCount - lastSeenBidCount;
      addNotification(
        NotificationType.PROPOSAL_RECEIVED,
        'New Bid Received',
        `${newBids} new ${newBids === 1 ? 'bid' : 'bids'} on "${jobTitle}"`,
        jobLink
      );
    }

    // Persist current state for next visit
    localStorage.setItem(lastStatusKey, statusKey);
    localStorage.setItem(lastBidCountKey, currentBidCount.toString());
  }, [job, jobPda, publicKey, metadata, addNotification]);

  const handleBidSubmit = async (data: {
    amount: string;
    timeline: string;
    proposal: string;
    cvHash?: string;
  }) => {
    if (!jobPda) return;

    try {
      // Pass CV URI as separate parameter instead of embedding in proposal
      const cvUri = data.cvHash ? `ipfs://${data.cvHash}` : undefined;

      await submitBid(
        jobPda,
        parseFloat(data.amount),
        data.proposal,
        parseInt(data.timeline),
        cvUri
      );
      const jobTitle = metadata?.title || job?.title || 'the job';
      addNotification(
        NotificationType.PROPOSAL_RECEIVED,
        'Bid Submitted',
        `Your bid on "${jobTitle}" has been submitted. The client will review it shortly.`,
        `/jobs/${jobPda.toBase58()}`
      );
      setBidDialogOpen(false);
      // Reload job to update bid count and bids list
      await reloadJobData();
    } catch (err) {
      console.error('Error submitting bid:', err);
      throw err;
    }
  };

  const reloadJobData = async () => {
    if (!jobPda) return;
    const jobData = await fetchJob(jobPda);
    setJob(jobData);

    // Also reload work submission
    if (program) {
      try {
        const [workSubmissionPda] = deriveWorkSubmissionPDA(jobPda);
        // @ts-ignore - Program account types from IDL
        const workData = await program.account.workSubmission.fetch(workSubmissionPda);
        setWorkSubmission(workData);
      } catch (err) {
        setWorkSubmission(null);
      }
    }
  };

  // Freelancer submits deliverables
  const handleWorkSubmit = async (deliverables: { hash: string; description: string }[]) => {
    if (!jobPda || !publicKey) return;

    setSubmittingWork(true);
    try {
      const deliverableData = {
        files: deliverables,
        submittedAt: Date.now(),
        freelancer: publicKey.toBase58(),
      };

      const deliverableUri = await uploadToIPFS(deliverableData);
      await submitWork(jobPda, deliverableUri);

      // Poll until RPC reflects the new status (max 5 × 2s = 10s)
      for (let attempt = 0; attempt < 5; attempt++) {
        await new Promise(r => setTimeout(r, 2000));
        const updated = await fetchJob(jobPda);
        if (!updated) continue;
        setJob(updated);

        // Refresh work submission alongside
        if (program) {
          try {
            const [wsPda] = deriveWorkSubmissionPDA(jobPda);
            // @ts-ignore
            const workData = await program.account.workSubmission.fetch(wsPda);
            setWorkSubmission(workData);
          } catch { setWorkSubmission(null); }
        }

        const statusKey = typeof updated.status === 'object'
          ? Object.keys(updated.status)[0]
          : updated.status;
        if (statusKey === 'waitingForReview') {
          const jobTitle = metadata?.title || updated?.title || 'the job';
          addNotification(
            NotificationType.JOB_STARTED,
            'Work Submitted',
            `Your deliverables for "${jobTitle}" are now awaiting client review.`,
            `/jobs/${jobPda.toBase58()}`
          );
          break;
        }
      }
    } catch (err) {
      throw new Error('Failed to submit work: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSubmittingWork(false);
    }
  };

  // Client approves work with rating (NEW WORKFLOW)
  const handleApproveWork = async (rating: number, review: string) => {
    if (!jobPda || !publicKey || !job) return;

    const budgetInSol = job.budget / LAMPORTS_PER_SOL;
    const freelancer = job.selectedFreelancer;

    if (!freelancer || freelancer.equals(PublicKey.default)) {
      throw new Error('No freelancer assigned to this job');
    }

    setActionLoading(true);
    try {
      // Step 1: Deposit escrow if not already deposited
      if (!hasEscrow) {
        console.log('📦 Step 1/3: Depositing escrow...');
        await depositEscrow(jobPda, budgetInSol);
        console.log('✅ Escrow deposited successfully');
        setHasEscrow(true);
      }

      // Step 2: Approve work (releases payment)
      console.log('📦 Step 2/3: Approving work and releasing payment...');
      await approveWork(jobPda, freelancer);

      // Step 3: Submit review (only if freelancer has reputation)
      const freelancerHasReputation = await hasReputation(freelancer);
      if (freelancerHasReputation) {
        console.log('📦 Step 3/3: Submitting review...');
        try {
          await submitReview(jobPda, freelancer, rating, review);
        } catch (reviewErr) {
          console.error('Error submitting review:', reviewErr);
        }
      } else {
        console.log('⚠️ Skipping review: Freelancer reputation not initialized');
      }

      const jobTitle = metadata?.title || job?.title || 'the job';
      addNotification(
        NotificationType.PAYMENT_RECEIVED,
        'Work Approved',
        `Payment has been released for "${jobTitle}". Job complete!`,
        `/jobs/${jobPda.toBase58()}`
      );

      setApprovalModalOpen(false);
      await reloadJobData();
    } catch (err) {
      console.error('Error approving work:', err);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  // Client rejects work (NEW WORKFLOW)
  const handleRejectWork = async () => {
    if (!jobPda || !publicKey || !job) return;
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setActionLoading(true);
    try {
      console.log('📦 Rejecting work...');
      await rejectWork(jobPda, rejectReason);

      const jobTitle = metadata?.title || job?.title || 'the job';
      addNotification(
        NotificationType.DISPUTE_RAISED,
        'Work Rejected',
        `You rejected the submitted work on "${jobTitle}". The freelancer may raise a dispute.`,
        `/jobs/${jobPda.toBase58()}`
      );
      setRejectDialogOpen(false);
      setRejectReason('');
      await reloadJobData();
    } catch (err) {
      console.error('Error rejecting work:', err);
      alert('Failed to reject work: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  // Freelancer raises dispute after rejection (NEW WORKFLOW)
  const handleRaiseDispute = async () => {
    if (!jobPda || !publicKey || !job) return;
    if (!disputeReason.trim()) {
      alert('Please provide a reason for the dispute');
      return;
    }

    setActionLoading(true);
    try {
      console.log('📦 Raising dispute...');
      await raiseDispute(jobPda, disputeReason);

      const jobTitle = metadata?.title || job?.title || 'the job';
      addNotification(
        NotificationType.DISPUTE_RAISED,
        'Dispute Raised',
        `Your dispute on "${jobTitle}" has been submitted. The community will vote to resolve it.`,
        '/disputes'
      );
      setDisputeDialogOpen(false);
      setDisputeReason('');
      await reloadJobData();
    } catch (err) {
      console.error('Error raising dispute:', err);
      alert('Failed to raise dispute: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteJob = async () => {
    if (!jobPda || !publicKey || !job) return;

    const freelancer = job.selectedFreelancer;

    if (!freelancer || freelancer.equals(PublicKey.default)) {
      alert('No freelancer assigned to this job');
      return;
    }

    // Check if work has been submitted
    if (!workSubmission) {
      alert('⚠️ No work has been submitted yet. Please wait for the freelancer to submit deliverables.');
      return;
    }

    // Open approval modal for client to review work and rate
    setApprovalModalOpen(true);
  };

  const handleCancelJob = async () => {
    if (!jobPda || !publicKey || !job) return;

    if (
      !confirm(
        'Are you sure you want to cancel this job? If you deposited escrow, it will be refunded.'
      )
    ) {
      return;
    }

    setActionLoading(true);
    try {
      // Check if there's escrow
      const escrowPda =
        job.escrowAmount > 0 ? deriveEscrowPDA(jobPda)[0] : undefined;

      await cancelJob(jobPda, escrowPda);

      const jobTitle = metadata?.title || job?.title || 'the job';
      addNotification(
        NotificationType.JOB_CREATED,
        'Job Cancelled',
        `"${jobTitle}" has been cancelled${job.escrowAmount > 0 ? ' and escrow refunded' : ''}.`,
        '/jobs'
      );

      // Show repost dialog after successful cancellation
      setRepostDialogOpen(true);
    } catch (err) {
      console.error('Error cancelling job:', err);
      alert(
        'Failed to cancel job: ' +
          (err instanceof Error ? err.message : 'Unknown error')
      );
      setActionLoading(false);
    }
  };

  const handleRepostDecision = (shouldRepost: boolean) => {
    setRepostDialogOpen(false);
    setActionLoading(false);

    if (shouldRepost) {
      router.push('/jobs/create');
    } else {
      router.push('/client/my-jobs');
    }
  };

  if (loading) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 6 }}>
          <LoadingSpinner
            message="Loading job details..."
            logs={[
              { text: 'gPA: JobData[pubkey]...', type: 'info' },
              { text: 'Fetching escrow account...', type: 'info' },
              { text: 'Resolving IPFS metadata...', type: 'ok' },
            ]}
          />
        </Container>
      </Layout>
    );
  }

  if (error || !job) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="error">{error || 'Job not found'}</Alert>
          <Button onClick={() => router.push('/jobs')} sx={{ mt: 2 }}>
            Back to Jobs
          </Button>
        </Container>
      </Layout>
    );
  }

  const budgetInSol = job.budget / LAMPORTS_PER_SOL;
  const escrowInSol = job.escrowAmount / LAMPORTS_PER_SOL;
  const createdAt = new Date(job.createdAt * 1000);
  const updatedAt = new Date(job.updatedAt * 1000);

  // Determine escrow status
  const getEscrowStatus = (): EscrowState => {
    const statusText = getStatusText(job.status);

    if (statusText === 'Disputed') return 'disputed';
    if (statusText === 'Completed') return 'released';
    if (statusText === 'Cancelled') return hasEscrow ? 'refunded' : 'awaiting_bids';
    if (statusText === 'In Progress' && hasEscrow) return 'locked';
    if (statusText === 'In Progress' && !hasEscrow) return 'pending';
    // Open jobs are waiting for bids — no escrow expected yet
    if (statusText === 'Open') return 'awaiting_bids';
    return 'awaiting_bids';
  };

  const statusPillMap: Record<string, { color: string; bg: string; border: string }> = {
    open:             { color: '#4caf50', bg: 'rgba(76,175,80,0.1)',    border: 'rgba(76,175,80,0.25)' },
    inProgress:       { color: '#2196f3', bg: 'rgba(33,150,243,0.1)',   border: 'rgba(33,150,243,0.25)' },
    waitingForReview: { color: '#ff9800', bg: 'rgba(255,152,0,0.1)',    border: 'rgba(255,152,0,0.25)' },
    rejected:         { color: '#f44336', bg: 'rgba(244,67,54,0.1)',    border: 'rgba(244,67,54,0.25)' },
    completed:        { color: '#9e9e9e', bg: 'rgba(158,158,158,0.1)',  border: 'rgba(158,158,158,0.2)' },
    disputed:         { color: '#f44336', bg: 'rgba(244,67,54,0.1)',    border: 'rgba(244,67,54,0.25)' },
    cancelled:        { color: '#ff9800', bg: 'rgba(255,152,0,0.1)',    border: 'rgba(255,152,0,0.25)' },
  };
  const jobStatusKey = typeof job.status === 'object' ? Object.keys(job.status)[0] : String(job.status);
  const jobStatusSt = statusPillMap[jobStatusKey] ?? statusPillMap.open;

  return (
    <Layout>
      {/* Page Header */}
      <Box
        sx={{
          borderBottom: '1px solid rgba(0,255,195,0.08)',
          background: 'linear-gradient(180deg, rgba(0,255,195,0.03) 0%, transparent 100%)',
          px: { xs: 2, md: 4 },
          py: { xs: 3, md: 4 },
        }}
      >
        <Container maxWidth="lg">
          <Button
            onClick={() => router.back()}
            sx={{ mb: 2, color: 'text.secondary', fontSize: '0.8rem', px: 0, minWidth: 0 }}
          >
            ← Back to Jobs
          </Button>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 3 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h4" fontWeight={700} sx={{ mb: 1.5, lineHeight: 1.2 }}>
                {job.title}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Box
                  sx={{
                    px: 1.5, py: 0.4, borderRadius: 1,
                    bgcolor: jobStatusSt.bg,
                    border: `1px solid ${jobStatusSt.border}`,
                    color: jobStatusSt.color,
                    fontSize: '0.75rem', fontWeight: 600,
                  }}
                >
                  {getStatusText(job.status)}
                </Box>
                <Chip
                  label={`${job.bidCount} ${job.bidCount === 1 ? 'bid' : 'bids'}`}
                  size="small"
                  variant="outlined"
                />
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                  {createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                textAlign: 'center', px: 3, py: 1.5,
                border: '1px solid rgba(0,255,195,0.2)',
                borderRadius: 2, bgcolor: 'rgba(0,255,195,0.04)', flexShrink: 0,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, justifyContent: 'center' }}>
                <SolanaIconSimple sx={{ fontSize: 18, color: '#00ffc3' }} />
                <Typography
                  variant="h4" fontWeight={700}
                  sx={{ fontFamily: '"Orbitron", sans-serif', color: '#00ffc3', lineHeight: 1 }}
                >
                  {formatSol(budgetInSol)}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">SOL budget</Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          {/* Main Content */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Card sx={{ mb: 3, border: '1px solid rgba(0,255,195,0.08)' }}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Box sx={{ mb: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Description sx={{ fontSize: 18, color: '#00ffc3' }} />
                    <Typography variant="h6" fontWeight={700}>Description</Typography>
                  </Box>
                  <Typography
                    variant="body1"
                    paragraph
                    sx={{ whiteSpace: 'pre-line' }}
                  >
                    {job.description || 'No description provided'}
                  </Typography>
                </Box>

                {metadata && (
                  <>
                    <Divider sx={{ my: 3, borderColor: 'rgba(0,255,195,0.08)' }} />
                    <Box sx={{ mb: 4 }}>
                      <Typography variant="h6" fontWeight={700} gutterBottom>
                        Additional Details
                      </Typography>
                      {metadata.category && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            Category
                          </Typography>
                          <Typography variant="body1">
                            {metadata.category}
                          </Typography>
                        </Box>
                      )}
                      {metadata.skills && metadata.skills.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            gutterBottom
                          >
                            Required Skills
                          </Typography>
                          <Box
                            sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}
                          >
                            {metadata.skills.map(
                              (skill: string, index: number) => (
                                <Chip
                                  key={index}
                                  label={skill}
                                  size="small"
                                  variant="outlined"
                                />
                              )
                            )}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </>
                )}

                {/* Work Submission Display for Client */}
                {connected &&
                  publicKey &&
                  job.client.toBase58() === publicKey.toBase58() &&
                  workSubmission &&
                  getStatusText(job.status) === 'In Progress' && (
                    <Box sx={{ mt: 4 }}>
                      <Divider sx={{ mb: 3, borderColor: 'rgba(0,255,195,0.08)' }} />
                      <Paper
                        sx={{
                          p: 3,
                          border: '1px solid rgba(76,175,80,0.25)',
                          borderRadius: 2,
                          bgcolor: 'rgba(76,175,80,0.05)',
                        }}
                      >
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                          Work Submitted
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Freelancer submitted deliverables on{' '}
                          {new Date(
                            workSubmission.submittedAt?.toNumber() * 1000
                          ).toLocaleDateString()}
                        </Typography>
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="caption" color="text.secondary">
                            Deliverable URI:
                          </Typography>
                          <Typography
                            variant="body2"
                            fontFamily="monospace"
                            sx={{
                              wordBreak: 'break-all',
                              bgcolor: 'background.paper',
                              p: 1,
                              borderRadius: 1,
                              mt: 0.5,
                            }}
                          >
                            {workSubmission.deliverableUri}
                          </Typography>
                        </Box>
                      </Paper>
                    </Box>
                  )}

                {connected && publicKey && (
                  <Box
                    sx={{
                      mt: 4,
                      display: 'flex',
                      gap: 2,
                      flexDirection: 'column',
                    }}
                  >
                    {/* Actions for client */}
                    {job.client.toBase58() === publicKey.toBase58() && (
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 2,
                          flexDirection: 'column',
                        }}
                      >

                        {/* NEW WORKFLOW: Work submitted - waiting for client review */}
                        {getStatusText(job.status) === 'Waiting For Review' && (
                          <>
                            <Alert severity="info" sx={{ mb: 2 }}>
                              ✅ Freelancer has submitted work! Please review the deliverables below and either approve or reject.
                              <strong> IMPORTANT: You cannot cancel after work submission.</strong>
                            </Alert>

                            {/* DELIVERABLE PREVIEW */}
                            {workSubmission && workSubmission.deliverableUri && (
                              <Card variant="outlined" sx={{ mb: 2, bgcolor: 'background.default' }}>
                                <CardContent>
                                  <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                                    📦 Submitted Deliverable
                                  </Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                    <Typography variant="body2" color="text.secondary">
                                      Submitted: {new Date(workSubmission.submittedAt?.toNumber() * 1000).toLocaleString()}
                                    </Typography>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      startIcon={<CheckCircleOutline />}
                                      href={`https://ipfs.io/ipfs/${workSubmission.deliverableUri}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      View/Download File
                                    </Button>
                                  </Box>
                                  <Box
                                    sx={{
                                      border: '1px solid',
                                      borderColor: 'divider',
                                      borderRadius: 1,
                                      overflow: 'hidden',
                                      bgcolor: 'background.paper',
                                    }}
                                  >
                                    <img
                                      src={`https://ipfs.io/ipfs/${workSubmission.deliverableUri}`}
                                      alt="Deliverable preview"
                                      style={{
                                        width: '100%',
                                        maxHeight: '400px',
                                        objectFit: 'contain',
                                      }}
                                      onError={(e) => {
                                        // If image fails to load, show IPFS link instead
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const parent = target.parentElement;
                                        if (parent) {
                                          parent.innerHTML = `
                                            <div style="padding: 20px; text-align: center;">
                                              <p>📄 File preview not available</p>
                                              <p style="font-size: 12px; color: #666; word-break: break-all;">
                                                IPFS Hash: ${workSubmission.deliverableUri}
                                              </p>
                                              <a href="https://ipfs.io/ipfs/${workSubmission.deliverableUri}" target="_blank" rel="noopener noreferrer" style="color: #1976d2;">
                                                Click here to view/download
                                              </a>
                                            </div>
                                          `;
                                        }
                                      }}
                                    />
                                  </Box>
                                </CardContent>
                              </Card>
                            )}

                            <Box sx={{ display: 'flex', gap: 2 }}>
                              <Button
                                variant="contained"
                                size="large"
                                fullWidth
                                color="success"
                                startIcon={<CheckCircleOutline />}
                                onClick={() => setApprovalModalOpen(true)}
                                disabled={actionLoading}
                              >
                                Approve & Release Payment
                              </Button>
                              <Button
                                variant="outlined"
                                size="large"
                                fullWidth
                                color="error"
                                startIcon={<CancelOutlined />}
                                onClick={() => setRejectDialogOpen(true)}
                                disabled={actionLoading}
                              >
                                Reject Work
                              </Button>
                            </Box>
                          </>
                        )}

                        {/* Job rejected by client - show status */}
                        {getStatusText(job.status) === 'Rejected' && (
                          <Alert severity="warning" sx={{ mb: 2 }}>
                            ⚠️ You rejected this work. The freelancer can raise a dispute if they disagree. Funds remain locked in escrow until dispute is resolved.
                          </Alert>
                        )}

                        {/* Show Cancel button only if job is Open or In Progress (before submission) */}
                        {(getStatusText(job.status) === 'Open' || 
                          (getStatusText(job.status) === 'In Progress' && !workSubmission)) && (
                          <Button
                            variant="outlined"
                            size="large"
                            fullWidth
                            color="error"
                            startIcon={<CancelOutlined />}
                            onClick={handleCancelJob}
                            disabled={actionLoading}
                          >
                            Cancel Job
                          </Button>
                        )}
                      </Box>
                    )}

                    {/* Actions for assigned freelancer */}
                    {job.selectedFreelancer &&
                      !job.selectedFreelancer.equals(PublicKey.default) &&
                      job.selectedFreelancer.toBase58() === publicKey.toBase58() && (
                        <Box sx={{ mt: 2 }}>
                          {/* In Progress: Submit work */}
                          {getStatusText(job.status) === 'In Progress' && !workSubmission && (
                            <DeliverableSubmit
                              jobId={jobPda?.toBase58() || ''}
                              jobTitle={job.title}
                              onSubmit={handleWorkSubmit}
                              loading={submittingWork}
                            />
                          )}

                          {/* Waiting for Review: Work submitted, awaiting client response */}
                          {getStatusText(job.status) === 'Waiting For Review' && (
                            <>
                              <Alert severity="info" sx={{ mb: 2 }}>
                                ✅ You have submitted your work! Waiting for client to review and approve.
                              </Alert>

                              {/* SHOW WHAT FREELANCER SUBMITTED */}
                              {workSubmission && workSubmission.deliverableUri && (
                                <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
                                  <CardContent>
                                    <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                                      📦 Your Submitted Deliverable
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                      <Typography variant="body2" color="text.secondary">
                                        Submitted: {new Date(workSubmission.submittedAt?.toNumber() * 1000).toLocaleString()}
                                      </Typography>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        href={`https://ipfs.io/ipfs/${workSubmission.deliverableUri}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        View/Download
                                      </Button>
                                    </Box>
                                    <Box
                                      sx={{
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                        overflow: 'hidden',
                                        bgcolor: 'background.paper',
                                      }}
                                    >
                                      <img
                                        src={`https://ipfs.io/ipfs/${workSubmission.deliverableUri}`}
                                        alt="Your submitted deliverable"
                                        style={{
                                          width: '100%',
                                          maxHeight: '300px',
                                          objectFit: 'contain',
                                        }}
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                          const parent = target.parentElement;
                                          if (parent) {
                                            parent.innerHTML = `
                                              <div style="padding: 20px; text-align: center;">
                                                <p>📄 File submitted</p>
                                                <p style="font-size: 12px; color: #666; word-break: break-all;">
                                                  IPFS Hash: ${workSubmission.deliverableUri}
                                                </p>
                                                <a href="https://ipfs.io/ipfs/${workSubmission.deliverableUri}" target="_blank" rel="noopener noreferrer" style="color: #1976d2;">
                                                  Click here to view/download
                                                </a>
                                              </div>
                                            `;
                                          }
                                        }}
                                      />
                                    </Box>
                                  </CardContent>
                                </Card>
                              )}
                            </>
                          )}

                          {/* REJECTED: Client rejected work - show dispute button */}
                          {getStatusText(job.status) === 'Rejected' && (
                            <>
                              <Alert severity="error" sx={{ mb: 2 }}>
                                ❌ Client rejected your work. If you believe this is unfair, you can raise a dispute for community voting.
                              </Alert>
                              <Button
                                variant="contained"
                                size="large"
                                fullWidth
                                color="warning"
                                onClick={() => setDisputeDialogOpen(true)}
                                disabled={actionLoading}
                              >
                                Raise Dispute
                              </Button>
                            </>
                          )}

                          {/* Disputed: Show dispute status */}
                          {getStatusText(job.status) === 'Disputed' && (
                            <>
                              <Alert severity="warning" sx={{ mb: 2 }}>
                                ⚖️ Dispute in progress. The community is voting to resolve this issue.
                                {dispute && (
                                  <Box sx={{ mt: 1 }}>
                                    <Typography variant="caption" display="block">
                                      Votes for Client: {dispute.votesForClient} | Votes for Freelancer: {dispute.votesForFreelancer}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                      Need 5 total votes to resolve
                                    </Typography>
                                  </Box>
                                )}
                              </Alert>
                              <Button
                                variant="contained"
                                size="large"
                                fullWidth
                                href="/disputes"
                                sx={{ mb: 2 }}
                              >
                                View All Disputes & Vote
                              </Button>
                            </>
                          )}
                        </Box>
                      )}

                    {/* Show bid button if not the job owner and job is open */}
                    {job.client.toBase58() !== publicKey.toBase58() &&
                      getStatusText(job.status) === 'Open' && (
                        <Button
                          variant="contained"
                          size="large"
                          fullWidth
                          onClick={() => setBidDialogOpen(true)}
                        >
                          Submit Bid
                        </Button>
                      )}

                    {/* Chat button - only show if there are bids (for client) or always show for freelancer */}
                    {(job.client.toBase58() !== publicKey.toBase58() ||
                      (job.client.toBase58() === publicKey.toBase58() &&
                        job.bidCount > 0)) && (
                      <Button
                        variant="outlined"
                        size="large"
                        fullWidth
                        startIcon={<Chat />}
                        onClick={() => setChatDialogOpen(true)}
                      >
                        {job.client.toBase58() === publicKey.toBase58()
                          ? 'Message Freelancers'
                          : 'Message Client'}
                      </Button>
                    )}
                  </Box>
                )}

                {!connected && (
                  <Alert severity="info" sx={{ mt: 4 }}>
                    Connect your wallet to submit a bid
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Bids List - Show to both client and freelancers */}
            {job && jobPda && (
              <Box sx={{ mt: 3 }}>
                <BidsList
                  jobPda={jobPda}
                  clientAddress={job.client.toBase58()}
                  jobBudgetSol={budgetInSol}
                  jobTitle={metadata?.title || job?.title}
                  jobDescription={`${job.title}\n\n${job.description}${metadata?.skills?.length ? '\n\nRequired skills: ' + metadata.skills.join(', ') : ''}`}
                  onBidAccepted={reloadJobData}
                />
              </Box>
            )}

            {/* Milestone Timeline - Show if job has milestones */}
            {hasMilestones && jobPda && (
              <Box sx={{ mt: 3 }}>
                <Card>
                  <CardContent>
                    <MilestoneTimeline
                      jobPda={jobPda}
                      isClient={!!publicKey && job.client.toBase58() === publicKey.toBase58()}
                      isFreelancer={!!publicKey && job.selectedFreelancer && !job.selectedFreelancer.equals(PublicKey.default) && job.selectedFreelancer.toBase58() === publicKey.toBase58()}
                      freelancerPubkey={job.selectedFreelancer && !job.selectedFreelancer.equals(PublicKey.default) ? job.selectedFreelancer : undefined}
                    />
                  </CardContent>
                </Card>
              </Box>
            )}
          </Grid>

          {/* Sidebar */}
          <Grid size={{ xs: 12, md: 4 }}>
            {/* Client Info */}
            <Card sx={{ mb: 2, border: '1px solid rgba(0,255,195,0.08)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography
                  variant="overline"
                  sx={{ color: '#00ffc3', letterSpacing: 3, fontSize: '0.6rem', display: 'block', mb: 2 }}
                >
                  CLIENT
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar
                    sx={{
                      width: 44, height: 44,
                      background: 'linear-gradient(135deg, #00ffc3 0%, #9945ff 100%)',
                      color: '#000', fontFamily: '"Orbitron", monospace', fontWeight: 700, fontSize: '0.85rem',
                    }}
                  >
                    {job.client.toBase58().slice(0, 2).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Link href={`/profile/${job.client.toBase58()}`} passHref legacyBehavior>
                      <MuiLink sx={{ cursor: 'pointer', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {formatAddress(job.client)}
                      </MuiLink>
                    </Link>
                    <Typography variant="caption" display="block" color="text.secondary">View Profile</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Job Details */}
            <Card sx={{ mb: 2, border: '1px solid rgba(0,255,195,0.08)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography
                  variant="overline"
                  sx={{ color: '#00ffc3', letterSpacing: 3, fontSize: '0.6rem', display: 'block', mb: 2 }}
                >
                  JOB DETAILS
                </Typography>

                {[
                  {
                    label: 'Budget',
                    value: (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <SolanaIconSimple sx={{ fontSize: 13, color: '#00ffc3' }} />
                        <Typography variant="body2" fontWeight={700} sx={{ fontFamily: '"Orbitron", monospace', color: '#00ffc3', fontSize: '0.82rem' }}>
                          {formatSol(budgetInSol)}
                        </Typography>
                      </Box>
                    ),
                  },
                  {
                    label: 'Escrow',
                    value: (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <SolanaIconSimple sx={{ fontSize: 13 }} />
                        <Typography variant="body2" fontWeight={600}>{formatSol(escrowInSol)}</Typography>
                      </Box>
                    ),
                  },
                  { label: 'Bids', value: <Typography variant="body2" fontWeight={700}>{job.bidCount}</Typography> },
                  { label: 'Posted', value: <Typography variant="body2" color="text.secondary">{createdAt.toLocaleDateString()}</Typography> },
                  { label: 'Updated', value: <Typography variant="body2" color="text.secondary">{updatedAt.toLocaleDateString()}</Typography> },
                ].map(({ label, value }) => (
                  <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                    {value}
                  </Box>
                ))}

                <Divider sx={{ my: 2, borderColor: 'rgba(0,255,195,0.08)' }} />

                {/* Escrow Status Indicator */}
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Payment Status
                </Typography>
                <EscrowStatus
                  status={getEscrowStatus()}
                  amount={`${formatSol(budgetInSol)} SOL`}
                  size="medium"
                />
              </CardContent>
            </Card>

            {/* Selected Freelancer */}
            {job.selectedFreelancer &&
              !job.selectedFreelancer.equals(PublicKey.default) && (
                <Card sx={{ mb: 2, border: '1px solid rgba(128,132,238,0.15)' }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography
                      variant="overline"
                      sx={{ color: '#8084ee', letterSpacing: 3, fontSize: '0.6rem', display: 'block', mb: 2 }}
                    >
                      ASSIGNED FREELANCER
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar
                        sx={{
                          width: 44, height: 44,
                          background: 'linear-gradient(135deg, #8084ee 0%, #00ffc3 100%)',
                          color: '#000', fontFamily: '"Orbitron", monospace', fontWeight: 700, fontSize: '0.85rem',
                        }}
                      >
                        {job.selectedFreelancer.toBase58().slice(0, 2).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Link href={`/profile/${job.selectedFreelancer.toBase58()}`} passHref legacyBehavior>
                          <MuiLink sx={{ cursor: 'pointer', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                            {formatAddress(job.selectedFreelancer)}
                          </MuiLink>
                        </Link>
                        <Typography variant="caption" display="block" color="text.secondary">View Profile</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              )}

            {/* Job Status Timeline */}
            <Card sx={{ mt: 2, border: '1px solid rgba(0,255,195,0.08)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography
                  variant="overline"
                  sx={{ color: '#00ffc3', letterSpacing: 3, fontSize: '0.6rem', display: 'block', mb: 2 }}
                >
                  PROGRESS
                </Typography>
                <JobStatusTimeline
                  status={getStatusText(job.status) as JobStatusType}
                  hasWorkSubmission={!!workSubmission}
                  bidCount={job.bidCount}
                  selectedFreelancer={
                    job.selectedFreelancer &&
                    !job.selectedFreelancer.equals(PublicKey.default)
                  }
                />
              </CardContent>
            </Card>

            {/* Milestone Escrow Status */}
            {hasMilestones && jobPda && (
              <Card sx={{ mt: 2, border: '1px solid rgba(0,255,195,0.08)' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <MilestoneEscrowStatus jobPda={jobPda} />
                </CardContent>
              </Card>
            )}

            {/* AI Risk Assessment */}
            {getStatusText(job.status) === 'Open' && (
              <Box sx={{ mt: 2 }}>
                <RiskAssessmentPanel
                  jobDescription={`${job.title}\n\n${job.description}${metadata?.skills?.length ? '\n\nRequired skills: ' + metadata.skills.join(', ') : ''}`}
                  jobTitle={job.title}
                />
              </Box>
            )}

            {/* IPFS Metadata */}
            {job.metadataUri && (
              <Card sx={{ mt: 2, border: '1px solid rgba(0,255,195,0.06)' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography
                    variant="overline"
                    sx={{ color: 'text.secondary', letterSpacing: 2, fontSize: '0.58rem', display: 'block', mb: 1 }}
                  >
                    IPFS METADATA
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}
                  >
                    {job.metadataUri}
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>

        {/* Bid Form Dialog */}
        {job && jobPda && (
          <Dialog
            open={bidDialogOpen}
            onClose={() => setBidDialogOpen(false)}
            maxWidth="md"
            fullWidth
            PaperProps={{
              sx: {
                borderRadius: 2,
                maxHeight: '90vh',
              },
            }}
          >
            <DialogTitle>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Box>
                  <Typography variant="h5" fontWeight={600}>
                    Submit Your Bid
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {job.title}
                  </Typography>
                </Box>
                <IconButton
                  onClick={() => setBidDialogOpen(false)}
                  sx={{ color: 'text.secondary' }}
                >
                  <Close />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <BidForm
                jobId={jobPda.toBase58()}
                jobBudget={budgetInSol.toString()}
                bidCount={job.bidCount}
                onSubmit={handleBidSubmit}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Chat Dialog */}
        {job && publicKey && (
          <ChatDialog
            open={chatDialogOpen}
            onClose={() => setChatDialogOpen(false)}
            recipientAddress={
              job.client.toBase58() === publicKey.toBase58()
                ? job.selectedFreelancer?.toBase58() || ''
                : job.client.toBase58()
            }
            recipientName={
              job.client.toBase58() === publicKey.toBase58()
                ? 'Freelancer'
                : 'Client'
            }
          />
        )}

        {/* Approval Modal for Client */}
        {job && workSubmission && (
          <ApprovalModal
            open={approvalModalOpen}
            onClose={() => setApprovalModalOpen(false)}
            job={{
              id: jobPda?.toBase58() || '',
              title: job.title,
              amount: budgetInSol.toFixed(4),
              freelancer: {
                address: job.selectedFreelancer?.toBase58() || '',
                name: undefined,
              },
              deliverables: workSubmission.deliverableUri
                ? [
                    {
                      hash: workSubmission.deliverableUri,
                      description: 'Submitted work',
                      submittedAt: new Date(workSubmission.submittedAt?.toNumber() * 1000),
                    },
                  ]
                : [],
            }}
            onApprove={handleApproveWork}
            loading={actionLoading}
          />
        )}

        {/* Reject Work Dialog */}
        <Dialog
          open={rejectDialogOpen}
          onClose={() => setRejectDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Typography variant="h5" fontWeight={600}>
              Reject Submitted Work
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 3 }}>
              ⚠️ <strong>Important:</strong> Funds will remain in escrow. The freelancer can raise a dispute if they disagree with your rejection.
            </Alert>
            <Typography variant="body2" gutterBottom>
              Please provide a clear reason for rejecting this work:
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why the work does not meet requirements..."
              sx={{ mt: 2 }}
              inputProps={{ maxLength: 500 }}
              helperText={`${rejectReason.length}/500 characters`}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectReason('');
              }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleRejectWork}
              disabled={actionLoading || !rejectReason.trim()}
            >
              {actionLoading ? 'Rejecting...' : 'Reject Work'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Raise Dispute Dialog */}
        <Dialog
          open={disputeDialogOpen}
          onClose={() => setDisputeDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Typography variant="h5" fontWeight={600}>
              Raise Dispute
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 3 }}>
              🗳️ Your dispute will be reviewed by the community through DAO voting. Provide clear evidence of why the rejection was unfair.
            </Alert>
            <Typography variant="body2" gutterBottom>
              Explain why you believe the client's rejection is unfair:
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Provide details about why you completed the work correctly..."
              sx={{ mt: 2 }}
              inputProps={{ maxLength: 500 }}
              helperText={`${disputeReason.length}/500 characters`}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => {
                setDisputeDialogOpen(false);
                setDisputeReason('');
              }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="warning"
              onClick={handleRaiseDispute}
              disabled={actionLoading || !disputeReason.trim()}
            >
              {actionLoading ? 'Raising Dispute...' : 'Raise Dispute'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Repost Dialog */}
        <Dialog
          open={repostDialogOpen}
          onClose={() => handleRepostDecision(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Typography variant="h5" fontWeight={600}>
              Job Cancelled Successfully
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ py: 2 }}>
              <Alert severity="success" sx={{ mb: 3 }}>
                Your job has been cancelled and any escrow funds have been
                refunded to your wallet.
              </Alert>
              <Typography variant="body1" gutterBottom>
                Would you like to repost this job or return to your jobs
                dashboard?
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => handleRepostDecision(false)}
              fullWidth
            >
              Go to My Jobs
            </Button>
            <Button
              variant="contained"
              onClick={() => handleRepostDecision(true)}
              fullWidth
            >
              Repost Job
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
}


// Force dynamic rendering to avoid SSR issues with Solana wallet
export async function getServerSideProps() {
  return {
    props: {},
  };
}
