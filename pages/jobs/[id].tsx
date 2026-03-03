import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Chip,
  Alert,
  Button,
  Grid,
} from '@mui/material';
import Layout from '../../src/components/Layout';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import { useJobs } from '../../src/hooks/useJobs';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { formatSol } from '../../src/types/solana';
import { SolanaIconSimple } from '../../src/components/SolanaIcon';
import { fetchFromIPFS, uploadToIPFS } from '../../src/services/ipfs';
import { deriveEscrowPDA, deriveWorkSubmissionPDA } from '../../src/utils/pda';
import ChatDialog from '../../src/components/chat/ChatDialog';
import ApprovalModal from '../../src/components/client/ApprovalModal';
import { useReputation } from '../../src/hooks/useReputation';
import { EscrowState } from '../../src/components/common/EscrowStatus';
import { useEscrow } from '../../src/hooks/useEscrow';
import { useSolanaProgram } from '../../src/hooks/useSolanaProgram';
import { useDispute } from '../../src/hooks/useDispute';
import { useMilestones } from '../../src/hooks/useMilestones';
import { useNotificationContext } from '../../src/contexts/NotificationContext';
import { NotificationType } from '../../src/types';
import JobSidebar from '../../src/components/job/JobSidebar';
import JobMainContent from '../../src/components/job/JobMainContent';
import BidFormDialog from '../../src/components/job/dialogs/BidFormDialog';
import RejectWorkDialog from '../../src/components/job/dialogs/RejectWorkDialog';
import RaiseDisputeDialog from '../../src/components/job/dialogs/RaiseDisputeDialog';
import RepostDialog from '../../src/components/job/dialogs/RepostDialog';

// Helper functions - defined outside component to avoid TDZ errors
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
  const [hasEscrow, setHasEscrow] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [workSubmission, setWorkSubmission] = useState<any>(null);
  const [submittingWork, setSubmittingWork] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [dispute, setDispute] = useState<any>(null);
  const [hasMilestones, setHasMilestones] = useState(false);

  const { fetchJob, submitBid, cancelJob } = useJobs();
  const { addNotification } = useNotificationContext();
  const { connected, publicKey } = useWallet();
  const { depositEscrow, fetchEscrow, submitWork } = useEscrow();
  const { submitReview, hasReputation } = useReputation();
  const { program } = useSolanaProgram();
  const { approveWork, rejectWork, raiseDispute, fetchDispute } = useDispute();
  const { fetchMilestoneConfig } = useMilestones();

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

        if (jobData) {
          const escrowData = await fetchEscrow(pda);
          setHasEscrow(!!escrowData);
        }

        if (jobData && program) {
          try {
            const [workSubmissionPda] = deriveWorkSubmissionPDA(pda);
            // @ts-ignore - Program account types from IDL
            const workData = await program.account.workSubmission.fetch(workSubmissionPda);
            setWorkSubmission(workData);
          } catch {
            console.log('No work submission yet');
          }
        }

        if (jobData && getStatusText(jobData.status) === 'Disputed') {
          try {
            const disputeData = await fetchDispute(pda);
            setDispute(disputeData);
          } catch {
            console.log('No dispute data');
          }
        }

        try {
          const milestoneConfig = await fetchMilestoneConfig(pda);
          setHasMilestones(!!milestoneConfig);
        } catch {
          setHasMilestones(false);
        }

        if (jobData?.metadataUri) {
          const meta = await fetchFromIPFS(jobData.metadataUri);
          if (meta) setMetadata(meta);
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

    if (lastSeenStatus && lastSeenStatus !== statusKey) {
      if (statusKey === 'inProgress' && freelancerKey === myKey)
        addNotification(NotificationType.PROPOSAL_ACCEPTED, 'Bid Accepted!', `Your bid on "${jobTitle}" was accepted. Time to get started!`, jobLink);
      if (statusKey === 'waitingForReview' && clientKey === myKey)
        addNotification(NotificationType.JOB_STARTED, 'Work Submitted', `Freelancer submitted deliverables on "${jobTitle}". Please review.`, jobLink);
      if (statusKey === 'completed' && freelancerKey === myKey)
        addNotification(NotificationType.PAYMENT_RECEIVED, 'Payment Released!', `Your work on "${jobTitle}" was approved and payment released!`, jobLink);
      if (statusKey === 'rejected' && freelancerKey === myKey)
        addNotification(NotificationType.DISPUTE_RAISED, 'Work Rejected', `Your work on "${jobTitle}" was rejected. You may raise a dispute.`, jobLink);
      if (statusKey === 'disputed' && clientKey === myKey)
        addNotification(NotificationType.DISPUTE_RAISED, 'Dispute Opened', `A dispute has been raised on "${jobTitle}".`, '/disputes');
    }
    if (lastSeenStatus && clientKey === myKey && currentBidCount > lastSeenBidCount) {
      const newBids = currentBidCount - lastSeenBidCount;
      addNotification(NotificationType.PROPOSAL_RECEIVED, 'New Bid Received', `${newBids} new ${newBids === 1 ? 'bid' : 'bids'} on "${jobTitle}"`, jobLink);
    }
    localStorage.setItem(lastStatusKey, statusKey);
    localStorage.setItem(lastBidCountKey, currentBidCount.toString());
  }, [job, jobPda, publicKey, metadata, addNotification]);

  const reloadJobData = async () => {
    if (!jobPda) return;
    const jobData = await fetchJob(jobPda);
    setJob(jobData);
    if (program) {
      try {
        const [workSubmissionPda] = deriveWorkSubmissionPDA(jobPda);
        // @ts-ignore
        const workData = await program.account.workSubmission.fetch(workSubmissionPda);
        setWorkSubmission(workData);
      } catch {
        setWorkSubmission(null);
      }
    }
  };

  const handleBidSubmit = async (data: { amount: string; timeline: string; proposal: string; cvHash?: string }) => {
    if (!jobPda) return;
    try {
      const cvUri = data.cvHash ? `ipfs://${data.cvHash}` : undefined;
      await submitBid(jobPda, parseFloat(data.amount), data.proposal, parseInt(data.timeline), cvUri);
      const jobTitle = metadata?.title || job?.title || 'the job';
      addNotification(NotificationType.PROPOSAL_RECEIVED, 'Bid Submitted', `Your bid on "${jobTitle}" has been submitted. The client will review it shortly.`, `/jobs/${jobPda.toBase58()}`);
      setBidDialogOpen(false);
      await reloadJobData();
    } catch (err) {
      console.error('Error submitting bid:', err);
      throw err;
    }
  };

  const handleWorkSubmit = async (deliverables: { hash: string; description: string }[]) => {
    if (!jobPda || !publicKey) return;
    setSubmittingWork(true);
    try {
      const deliverableData = { files: deliverables, submittedAt: Date.now(), freelancer: publicKey.toBase58() };
      const deliverableUri = await uploadToIPFS(deliverableData);
      await submitWork(jobPda, deliverableUri);
      for (let attempt = 0; attempt < 5; attempt++) {
        await new Promise(r => setTimeout(r, 2000));
        const updated = await fetchJob(jobPda);
        if (!updated) continue;
        setJob(updated);
        if (program) {
          try {
            const [wsPda] = deriveWorkSubmissionPDA(jobPda);
            // @ts-ignore
            const workData = await program.account.workSubmission.fetch(wsPda);
            setWorkSubmission(workData);
          } catch { setWorkSubmission(null); }
        }
        const statusKey = typeof updated.status === 'object' ? Object.keys(updated.status)[0] : updated.status;
        if (statusKey === 'waitingForReview') {
          const jobTitle = metadata?.title || updated?.title || 'the job';
          addNotification(NotificationType.JOB_STARTED, 'Work Submitted', `Your deliverables for "${jobTitle}" are now awaiting client review.`, `/jobs/${jobPda.toBase58()}`);
          break;
        }
      }
    } catch (err) {
      throw new Error('Failed to submit work: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSubmittingWork(false);
    }
  };

  const handleApproveWork = async (rating: number, review: string) => {
    if (!jobPda || !publicKey || !job) return;
    const budgetInSol = job.budget / LAMPORTS_PER_SOL;
    const freelancer = job.selectedFreelancer;
    if (!freelancer || freelancer.equals(PublicKey.default)) throw new Error('No freelancer assigned to this job');
    setActionLoading(true);
    try {
      if (!hasEscrow) {
        await depositEscrow(jobPda, budgetInSol);
        setHasEscrow(true);
      }
      await approveWork(jobPda, freelancer);
      const freelancerHasReputation = await hasReputation(freelancer);
      if (freelancerHasReputation) {
        try { await submitReview(jobPda, freelancer, rating, review); } catch (e) { console.error('Error submitting review:', e); }
      }
      const jobTitle = metadata?.title || job?.title || 'the job';
      addNotification(NotificationType.PAYMENT_RECEIVED, 'Work Approved', `Payment has been released for "${jobTitle}". Job complete!`, `/jobs/${jobPda.toBase58()}`);
      setApprovalModalOpen(false);
      await reloadJobData();
    } catch (err) {
      console.error('Error approving work:', err);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectWork = async () => {
    if (!jobPda || !publicKey || !job) return;
    if (!rejectReason.trim()) { alert('Please provide a reason for rejection'); return; }
    setActionLoading(true);
    try {
      await rejectWork(jobPda, rejectReason);
      const jobTitle = metadata?.title || job?.title || 'the job';
      addNotification(NotificationType.DISPUTE_RAISED, 'Work Rejected', `You rejected the submitted work on "${jobTitle}". The freelancer may raise a dispute.`, `/jobs/${jobPda.toBase58()}`);
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

  const handleRaiseDispute = async () => {
    if (!jobPda || !publicKey || !job) return;
    if (!disputeReason.trim()) { alert('Please provide a reason for the dispute'); return; }
    setActionLoading(true);
    try {
      await raiseDispute(jobPda, disputeReason);
      const jobTitle = metadata?.title || job?.title || 'the job';
      addNotification(NotificationType.DISPUTE_RAISED, 'Dispute Raised', `Your dispute on "${jobTitle}" has been submitted. The community will vote to resolve it.`, '/disputes');
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

  const handleCancelJob = async () => {
    if (!jobPda || !publicKey || !job) return;
    if (!confirm('Are you sure you want to cancel this job? If you deposited escrow, it will be refunded.')) return;
    setActionLoading(true);
    try {
      const escrowPda = job.escrowAmount > 0 ? deriveEscrowPDA(jobPda)[0] : undefined;
      await cancelJob(jobPda, escrowPda);
      const jobTitle = metadata?.title || job?.title || 'the job';
      addNotification(NotificationType.JOB_CREATED, 'Job Cancelled', `"${jobTitle}" has been cancelled${job.escrowAmount > 0 ? ' and escrow refunded' : ''}.`, '/jobs');
      setRepostDialogOpen(true);
    } catch (err) {
      console.error('Error cancelling job:', err);
      alert('Failed to cancel job: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setActionLoading(false);
    }
  };

  const handleRepostDecision = (shouldRepost: boolean) => {
    setRepostDialogOpen(false);
    setActionLoading(false);
    if (shouldRepost) router.push('/jobs/create');
    else router.push('/client/my-jobs');
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
          <Button onClick={() => router.push('/jobs')} sx={{ mt: 2 }}>Back to Jobs</Button>
        </Container>
      </Layout>
    );
  }

  const budgetInSol = job.budget / LAMPORTS_PER_SOL;
  const escrowInSol = job.escrowAmount / LAMPORTS_PER_SOL;
  const createdAt = new Date(job.createdAt * 1000);
  const updatedAt = new Date(job.updatedAt * 1000);

  const getEscrowStatus = (): EscrowState => {
    const statusText = getStatusText(job.status);
    if (statusText === 'Disputed') return 'disputed';
    if (statusText === 'Completed') return 'released';
    if (statusText === 'Cancelled') return hasEscrow ? 'refunded' : 'awaiting_bids';
    if (statusText === 'In Progress' && hasEscrow) return 'locked';
    if (statusText === 'In Progress' && !hasEscrow) return 'pending';
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
          <Button onClick={() => router.back()} sx={{ mb: 2, color: 'text.secondary', fontSize: '0.8rem', px: 0, minWidth: 0 }}>
            ← Back to Jobs
          </Button>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 3 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h4" fontWeight={700} sx={{ mb: 1.5, lineHeight: 1.2 }}>{job.title}</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Box sx={{ px: 1.5, py: 0.4, borderRadius: 1, bgcolor: jobStatusSt.bg, border: `1px solid ${jobStatusSt.border}`, color: jobStatusSt.color, fontSize: '0.75rem', fontWeight: 600 }}>
                  {getStatusText(job.status)}
                </Box>
                <Chip label={`${job.bidCount} ${job.bidCount === 1 ? 'bid' : 'bids'}`} size="small" variant="outlined" />
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                  {createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ textAlign: 'center', px: 3, py: 1.5, border: '1px solid rgba(0,255,195,0.2)', borderRadius: 2, bgcolor: 'rgba(0,255,195,0.04)', flexShrink: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, justifyContent: 'center' }}>
                <SolanaIconSimple sx={{ fontSize: 18, color: '#00ffc3' }} />
                <Typography variant="h4" fontWeight={700} sx={{ fontFamily: '"Orbitron", sans-serif', color: '#00ffc3', lineHeight: 1 }}>
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
          <Grid size={{ xs: 12, md: 8 }}>
            <JobMainContent
              job={job}
              metadata={metadata}
              publicKey={publicKey}
              connected={connected}
              jobPda={jobPda}
              workSubmission={workSubmission}
              submittingWork={submittingWork}
              actionLoading={actionLoading}
              dispute={dispute}
              createdAt={createdAt}
              hasMilestones={hasMilestones}
              budgetInSol={budgetInSol}
              getStatusText={getStatusText}
              onWorkSubmit={handleWorkSubmit}
              onApproveWork={() => setApprovalModalOpen(true)}
              onRejectWork={() => setRejectDialogOpen(true)}
              onCancelJob={handleCancelJob}
              onRaiseDispute={() => setDisputeDialogOpen(true)}
              onBidOpen={() => setBidDialogOpen(true)}
              onChatOpen={() => setChatDialogOpen(true)}
              onBidAccepted={reloadJobData}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <JobSidebar
              job={job}
              jobPda={jobPda}
              metadata={metadata}
              hasEscrow={hasEscrow}
              workSubmission={workSubmission}
              hasMilestones={hasMilestones}
              budgetInSol={budgetInSol}
              escrowInSol={escrowInSol}
              createdAt={createdAt}
              updatedAt={updatedAt}
              getStatusText={getStatusText}
              getEscrowStatus={getEscrowStatus}
            />
          </Grid>
        </Grid>

        {/* Bid Form Dialog */}
        <BidFormDialog
          open={bidDialogOpen}
          job={job}
          jobPda={jobPda}
          budgetInSol={budgetInSol}
          onClose={() => setBidDialogOpen(false)}
          onSubmit={handleBidSubmit}
        />

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
              job.client.toBase58() === publicKey.toBase58() ? 'Freelancer' : 'Client'
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
              freelancer: { address: job.selectedFreelancer?.toBase58() || '', name: undefined },
              deliverables: workSubmission.deliverableUri
                ? [{ hash: workSubmission.deliverableUri, description: 'Submitted work', submittedAt: new Date(workSubmission.submittedAt?.toNumber() * 1000) }]
                : [],
            }}
            onApprove={handleApproveWork}
            loading={actionLoading}
          />
        )}

        <RejectWorkDialog
          open={rejectDialogOpen}
          rejectReason={rejectReason}
          actionLoading={actionLoading}
          onReasonChange={setRejectReason}
          onReject={handleRejectWork}
          onClose={() => { setRejectDialogOpen(false); setRejectReason(''); }}
        />

        <RaiseDisputeDialog
          open={disputeDialogOpen}
          disputeReason={disputeReason}
          actionLoading={actionLoading}
          onReasonChange={setDisputeReason}
          onRaise={handleRaiseDispute}
          onClose={() => { setDisputeDialogOpen(false); setDisputeReason(''); }}
        />

        <RepostDialog
          open={repostDialogOpen}
          onDecision={handleRepostDecision}
        />
      </Container>
    </Layout>
  );
}

// Force dynamic rendering to avoid SSR issues with Solana wallet
export async function getServerSideProps() {
  return { props: {} };
}
