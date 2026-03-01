import { useState } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Link,
} from '@mui/material';
import {
  AccountBalanceWallet,
  CheckCircle,
  Send,
  Gavel,
  OpenInNew,
} from '@mui/icons-material';
import type { PublicKey } from '../../types/solana';
import { lamportsToSol } from '../../types/solana';
import { useMilestones } from '../../hooks/useMilestones';
import type { MilestoneData } from '../../hooks/useMilestones';

type MilestoneStatusKey =
  | 'pending'
  | 'funded'
  | 'inProgress'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'disputed'
  | 'cancelled';

const STATUS_CONFIG: Record<
  MilestoneStatusKey,
  { label: string; color: 'default' | 'primary' | 'warning' | 'success' | 'error' | 'info'; bgcolor: string; textColor: string }
> = {
  pending: { label: 'Pending', color: 'default', bgcolor: 'rgba(11,25,42,0.5)', textColor: '#a5a8f3' },
  funded: { label: 'Funded', color: 'info', bgcolor: 'rgba(0,255,195,0.05)', textColor: '#00ffc3' },
  inProgress: { label: 'In Progress', color: 'warning', bgcolor: 'rgba(224,77,1,0.08)', textColor: '#e04d01' },
  submitted: { label: 'Submitted', color: 'warning', bgcolor: 'rgba(224,77,1,0.08)', textColor: '#ff7033' },
  approved: { label: 'Approved', color: 'success', bgcolor: 'rgba(0,255,195,0.08)', textColor: '#00ffc3' },
  rejected: { label: 'Rejected', color: 'error', bgcolor: 'rgba(255,0,255,0.08)', textColor: '#ff00ff' },
  disputed: { label: 'Disputed', color: 'error', bgcolor: 'rgba(255,0,255,0.08)', textColor: '#ff00ff' },
  cancelled: { label: 'Cancelled', color: 'default', bgcolor: 'rgba(11,25,42,0.5)', textColor: '#a5a8f3' },
};

function getStatusKey(status: Record<string, unknown>): MilestoneStatusKey {
  const keys = Object.keys(status);
  if (keys.length === 0) return 'pending';
  const key = keys[0].toLowerCase();
  // Normalize Anchor enum variant keys
  if (key === 'inprogress' || key === 'in_progress') return 'inProgress';
  if (key in STATUS_CONFIG) return key as MilestoneStatusKey;
  return 'pending';
}

interface MilestoneCardProps {
  milestone: MilestoneData;
  milestoneIndex: number;
  jobPda: PublicKey;
  isClient: boolean;
  isFreelancer: boolean;
  freelancerPubkey?: PublicKey;
  onRefresh: () => void;
}

export default function MilestoneCard({
  milestone,
  milestoneIndex,
  jobPda,
  isClient,
  isFreelancer,
  freelancerPubkey,
  onRefresh,
}: MilestoneCardProps) {
  const {
    fundMilestone,
    submitMilestoneWork,
    approveMilestone,
    rejectMilestone,
    disputeMilestone,
  } = useMilestones();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deliverableUri, setDeliverableUri] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  const statusKey = getStatusKey(milestone.status);
  const config = STATUS_CONFIG[statusKey];
  const amountSol = lamportsToSol(milestone.amount);

  const handleFund = async () => {
    try {
      setLoading(true);
      setError('');
      await fundMilestone(jobPda, milestoneIndex, amountSol);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to fund milestone');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitWork = async () => {
    if (!deliverableUri.trim()) {
      setError('Deliverable URI is required');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await submitMilestoneWork(jobPda, milestoneIndex, deliverableUri.trim());
      setDeliverableUri('');
      setSubmitDialogOpen(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to submit work');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!freelancerPubkey) {
      setError('Freelancer public key is required');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await approveMilestone(jobPda, milestoneIndex, freelancerPubkey);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to approve milestone');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setError('Rejection reason is required');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await rejectMilestone(jobPda, milestoneIndex, rejectReason.trim());
      setRejectReason('');
      setRejectDialogOpen(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to reject milestone');
    } finally {
      setLoading(false);
    }
  };

  const handleDispute = async () => {
    if (!disputeReason.trim()) {
      setError('Dispute reason is required');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await disputeMilestone(jobPda, milestoneIndex, disputeReason.trim());
      setDisputeReason('');
      setDisputeDialogOpen(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to open dispute');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.2s',
        '&:hover': { boxShadow: 3 },
      }}
    >
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: config.bgcolor,
                color: config.textColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.85rem',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {milestoneIndex + 1}
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={600}>
                {milestone.title}
              </Typography>
              {milestone.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {milestone.description}
                </Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
            <Typography variant="h6" fontWeight={700} color="primary.main">
              {amountSol.toFixed(4)} SOL
            </Typography>
            <Chip
              label={config.label}
              size="small"
              sx={{
                mt: 0.5,
                bgcolor: config.bgcolor,
                color: config.textColor,
                fontWeight: 600,
              }}
            />
          </Box>
        </Box>

        {/* Deliverable link */}
        {milestone.deliverableUri && (
          <Box
            sx={{
              p: 2,
              mb: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Deliverable:
            </Typography>
            <Link
              href={milestone.deliverableUri}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.8rem' }}
            >
              {milestone.deliverableUri.length > 50
                ? `${milestone.deliverableUri.slice(0, 25)}...${milestone.deliverableUri.slice(-15)}`
                : milestone.deliverableUri}
              <OpenInNew sx={{ fontSize: 14 }} />
            </Link>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {/* Client: Fund milestone when pending */}
          {isClient && statusKey === 'pending' && (
            <Button
              variant="contained"
              size="small"
              startIcon={loading ? <CircularProgress size={16} /> : <AccountBalanceWallet />}
              onClick={handleFund}
              disabled={loading}
            >
              {loading ? 'Funding...' : `Fund ${amountSol.toFixed(4)} SOL`}
            </Button>
          )}

          {/* Client: Approve submitted work */}
          {isClient && statusKey === 'submitted' && (
            <>
              <Button
                variant="contained"
                color="success"
                size="small"
                startIcon={loading ? <CircularProgress size={16} /> : <CheckCircle />}
                onClick={handleApprove}
                disabled={loading}
              >
                {loading ? 'Approving...' : 'Approve'}
              </Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => setRejectDialogOpen(true)}
                disabled={loading}
              >
                Reject
              </Button>
            </>
          )}

          {/* Freelancer: Submit work when funded or in-progress */}
          {isFreelancer && (statusKey === 'funded' || statusKey === 'inProgress') && (
            <Button
              variant="contained"
              size="small"
              startIcon={<Send />}
              onClick={() => setSubmitDialogOpen(true)}
              disabled={loading}
            >
              Submit Work
            </Button>
          )}

          {/* Freelancer: Dispute when rejected or disputed */}
          {isFreelancer && (statusKey === 'rejected' || statusKey === 'disputed') && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<Gavel />}
              onClick={() => setDisputeDialogOpen(true)}
              disabled={loading}
            >
              Open Dispute
            </Button>
          )}
        </Box>
      </CardContent>

      {/* Submit Work Dialog */}
      <Dialog
        open={submitDialogOpen}
        onClose={() => setSubmitDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight={600}>
            Submit Work for Milestone {milestoneIndex + 1}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 1 }}>
            Provide the deliverable URI (IPFS hash, URL, etc.) for this milestone.
          </Typography>
          <TextField
            fullWidth
            label="Deliverable URI"
            value={deliverableUri}
            onChange={(e) => setDeliverableUri(e.target.value)}
            placeholder="e.g., ipfs://Qm... or https://..."
            disabled={loading}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSubmitDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitWork}
            disabled={loading || !deliverableUri.trim()}
            startIcon={loading ? <CircularProgress size={16} /> : <Send />}
          >
            {loading ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight={600}>
            Reject Milestone {milestoneIndex + 1}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 1 }}>
            Provide a reason for rejecting this milestone submission.
          </Typography>
          <TextField
            fullWidth
            label="Rejection Reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Describe what needs to be changed..."
            multiline
            rows={3}
            disabled={loading}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRejectDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleReject}
            disabled={loading || !rejectReason.trim()}
            startIcon={loading ? <CircularProgress size={16} /> : undefined}
          >
            {loading ? 'Rejecting...' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dispute Dialog */}
      <Dialog
        open={disputeDialogOpen}
        onClose={() => setDisputeDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight={600}>
            Dispute Milestone {milestoneIndex + 1}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 1 }}>
            Provide a reason for disputing this milestone.
          </Typography>
          <TextField
            fullWidth
            label="Dispute Reason"
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            placeholder="Describe the dispute reason..."
            multiline
            rows={3}
            disabled={loading}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDisputeDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDispute}
            disabled={loading || !disputeReason.trim()}
            startIcon={loading ? <CircularProgress size={16} /> : <Gavel />}
          >
            {loading ? 'Submitting...' : 'Open Dispute'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
