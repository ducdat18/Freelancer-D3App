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
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  AccountBalanceWallet,
  CheckCircle,
  Send,
  Gavel,
  OpenInNew,
  AddCircleOutline,
  DeleteOutline,
  AttachFile,
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

function getStatusKey(status: Record<string, unknown>): MilestoneStatusKey {
  const keys = Object.keys(status);
  if (keys.length === 0) return 'pending';
  const key = keys[0].toLowerCase();
  // Normalize Anchor enum variant keys
  if (key === 'inprogress' || key === 'in_progress') return 'inProgress';
  return key as MilestoneStatusKey;
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const STATUS_CONFIG: Record<
    MilestoneStatusKey,
    { label: string; bgcolor: string; textColor: string }
  > = {
    pending: { label: 'Pending', bgcolor: isDark ? 'rgba(158,158,158,0.1)' : 'rgba(0,0,0,0.05)', textColor: theme.palette.text.disabled },
    funded: { label: 'Funded', bgcolor: isDark ? 'rgba(0,255,195,0.08)' : 'rgba(5,150,105,0.08)', textColor: theme.palette.primary.main },
    inProgress: { label: 'In Progress', bgcolor: isDark ? 'rgba(224,77,1,0.08)' : 'rgba(224,77,1,0.05)', textColor: theme.palette.warning.main },
    submitted: { label: 'Submitted', bgcolor: isDark ? 'rgba(128,132,238,0.08)' : 'rgba(99,102,241,0.08)', textColor: theme.palette.info.main },
    approved: { label: 'Approved', bgcolor: isDark ? 'rgba(0,255,195,0.12)' : 'rgba(5,150,105,0.12)', textColor: theme.palette.success.main },
    rejected: { label: 'Rejected', bgcolor: isDark ? 'rgba(255,0,255,0.08)' : 'rgba(255,0,255,0.05)', textColor: theme.palette.error.main },
    disputed: { label: 'Disputed', bgcolor: isDark ? 'rgba(255,0,255,0.08)' : 'rgba(255,0,255,0.05)', textColor: theme.palette.error.main },
    cancelled: { label: 'Cancelled', bgcolor: isDark ? 'rgba(158,158,158,0.1)' : 'rgba(0,0,0,0.05)', textColor: theme.palette.text.disabled },
  };

  const {
    fundMilestone,
    submitMilestoneWork,
    approveMilestone,
    rejectMilestone,
    disputeMilestone,
  } = useMilestones();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Submit work — multi-deliverable
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [deliverableLinks, setDeliverableLinks] = useState<string[]>(['']);
  const [deliverableNotes, setDeliverableNotes] = useState('');
  // Reject / Dispute
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');

  // ── deliverable link helpers ───────────────────────────────────────────────
  const addLink = () => setDeliverableLinks(prev => [...prev, '']);
  const removeLink = (i: number) => setDeliverableLinks(prev => prev.filter((_, idx) => idx !== i));
  const updateLink = (i: number, val: string) =>
    setDeliverableLinks(prev => prev.map((v, idx) => (idx === i ? val : v)));

  // Serialize multiple links + notes into a single URI string that is stored on-chain.
  // Format: primary_link||link2||link3||NOTES:notes_text
  const buildDeliverableUri = (): string => {
    const validLinks = deliverableLinks.map(l => l.trim()).filter(Boolean);
    const parts = [...validLinks];
    if (deliverableNotes.trim()) parts.push(`NOTES:${deliverableNotes.trim()}`);
    return parts.join('||');
  };

  // Parse the stored deliverable URI back into links + notes for display
  const parseDeliverableUri = (uri: string): { links: string[]; notes: string } => {
    const parts = uri.split('||');
    const notesPart = parts.find(p => p.startsWith('NOTES:'));
    const links = parts.filter(p => !p.startsWith('NOTES:'));
    return { links, notes: notesPart ? notesPart.slice(6) : '' };
  };

  const parsed = milestone.deliverableUri ? parseDeliverableUri(milestone.deliverableUri) : null;

  const statusKey = getStatusKey(milestone.status);
  const config = STATUS_CONFIG[statusKey] || STATUS_CONFIG.pending;
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
    const uri = buildDeliverableUri();
    if (!uri) {
      setError('At least one deliverable link is required');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await submitMilestoneWork(jobPda, milestoneIndex, uri);
      setDeliverableLinks(['']);
      setDeliverableNotes('');
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
      variant="outlined"
      sx={{
        border: 1,
        borderColor: 'divider',
        transition: 'all 0.2s',
        '&:hover': { boxShadow: isDark ? `0 0 20px ${theme.palette.primary.main}10` : '0 4px 12px rgba(0,0,0,0.05)' },
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
                border: 1,
                borderColor: isDark ? 'transparent' : `${config.textColor}40`,
              }}
            >
              {milestoneIndex + 1}
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
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
                fontWeight: 700,
                fontSize: '0.65rem',
                height: 20,
                border: isDark ? 0 : 1,
                borderColor: `${config.textColor}40`,
              }}
            />
          </Box>
        </Box>

        {/* Deliverables panel — shown when work has been submitted */}
        {parsed && (parsed.links.length > 0 || parsed.notes) && (
          <Box
            sx={{
              p: 1.5,
              mb: 2,
              bgcolor: isDark ? 'rgba(0,255,195,0.04)' : 'rgba(5,150,105,0.04)',
              border: 1,
              borderColor: isDark ? 'rgba(0,255,195,0.2)' : 'rgba(5,150,105,0.2)',
              borderRadius: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
              <AttachFile sx={{ fontSize: 14, color: 'primary.main' }} />
              <Typography variant="caption" fontWeight={700} color="primary.main" letterSpacing={1}>
                DELIVERABLES
              </Typography>
            </Box>
            {parsed.links.map((link, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 16 }}>{i + 1}.</Typography>
                <Link
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 600 }}
                >
                  {link.length > 50 ? `${link.slice(0, 28)}...${link.slice(-16)}` : link}
                  <OpenInNew sx={{ fontSize: 12 }} />
                </Link>
              </Box>
            ))}
            {parsed.notes && (
              <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>NOTE: </Typography>
                <Typography variant="caption" color="text.secondary">{parsed.notes}</Typography>
              </Box>
            )}
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
      <Dialog open={submitDialogOpen} onClose={() => setSubmitDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AttachFile color="primary" />
            <Typography variant="h6" fontWeight={700}>
              Submit Deliverables — Milestone {milestoneIndex + 1}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 0.5 }}>
            Attach links to your work (GitHub repo, Figma, IPFS, Google Drive, etc.). The client will review these before approving.
          </Typography>

          {/* Deliverable links */}
          <Typography variant="caption" fontWeight={700} color="text.secondary" letterSpacing={1}>
            LINKS / URLS
          </Typography>
          {deliverableLinks.map((link, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <TextField
                fullWidth
                size="small"
                label={`Deliverable ${i + 1}`}
                value={link}
                onChange={e => updateLink(i, e.target.value)}
                placeholder="https://github.com/... or ipfs://Qm..."
                disabled={loading}
              />
              {deliverableLinks.length > 1 && (
                <Tooltip title="Remove">
                  <IconButton size="small" onClick={() => removeLink(i)} disabled={loading}>
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          ))}
          <Button
            size="small"
            startIcon={<AddCircleOutline />}
            onClick={addLink}
            disabled={loading || deliverableLinks.length >= 10}
            sx={{ mt: 1, mb: 2 }}
          >
            Add another link
          </Button>

          {/* Notes to client */}
          <Typography variant="caption" fontWeight={700} color="text.secondary" letterSpacing={1}>
            NOTES TO CLIENT (OPTIONAL)
          </Typography>
          <TextField
            fullWidth
            size="small"
            multiline
            rows={3}
            value={deliverableNotes}
            onChange={e => setDeliverableNotes(e.target.value)}
            placeholder="Describe what you've done, any caveats, instructions to review..."
            disabled={loading}
            sx={{ mt: 1 }}
            inputProps={{ maxLength: 500 }}
          />
          <Typography variant="caption" color="text.disabled" sx={{ float: 'right' }}>
            {deliverableNotes.length}/500
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setSubmitDialogOpen(false)} disabled={loading}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmitWork}
            disabled={loading || deliverableLinks.every(l => !l.trim())}
            startIcon={loading ? <CircularProgress size={16} /> : <Send />}
          >
            {loading ? 'Submitting...' : 'Submit Work'}
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
