import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import { SolanaIconSimple } from './SolanaIcon';

interface BidDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { budget: string; proposal: string; timeline: number }) => Promise<void>;
  jobTitle: string;
  jobBudget: number;
}

export default function BidDialog({
  open,
  onClose,
  onSubmit,
  jobTitle,
  jobBudget,
}: BidDialogProps) {
  const [budget, setBudget] = useState('');
  const [proposal, setProposal] = useState('');
  const [timeline, setTimeline] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    // Validation
    if (!budget || parseFloat(budget) <= 0) {
      setError('Please enter a valid budget');
      return;
    }

    if (!proposal || proposal.length < 50) {
      setError('Please write a proposal with at least 50 characters');
      return;
    }

    if (!timeline || parseInt(timeline) <= 0) {
      setError('Please enter a valid timeline in days');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await onSubmit({
        budget,
        proposal,
        timeline: parseInt(timeline),
      });

      // Clear form and close
      setBudget('');
      setProposal('');
      setTimeline('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit bid');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setBudget('');
      setProposal('');
      setTimeline('');
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h5" fontWeight={600}>
          Submit Your Bid
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {jobTitle}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2" fontWeight={600} gutterBottom>
              Job Budget: {jobBudget.toFixed(4)} SOL
            </Typography>
            <Typography variant="caption">
              Submit a competitive bid to win this project. Your proposal will be visible to the client.
            </Typography>
          </Alert>

          <TextField
            fullWidth
            label="Your Bid Amount"
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="0.5"
            required
            disabled={submitting}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <SolanaIconSimple sx={{ fontSize: 16 }} />
                    <Typography variant="body2">SOL</Typography>
                  </Box>
                </InputAdornment>
              ),
            }}
            helperText="Enter your proposed budget in SOL"
            sx={{ mb: 3 }}
          />

          <TextField
            fullWidth
            label="Timeline (Days)"
            type="number"
            value={timeline}
            onChange={(e) => setTimeline(e.target.value)}
            placeholder="7"
            required
            disabled={submitting}
            helperText="How many days will you need to complete this project?"
            sx={{ mb: 3 }}
          />

          <TextField
            fullWidth
            label="Your Proposal"
            multiline
            rows={6}
            value={proposal}
            onChange={(e) => setProposal(e.target.value)}
            placeholder="Explain why you're the best fit for this project. Include your relevant experience, approach, and any questions you have..."
            required
            disabled={submitting}
            helperText={`${proposal.length}/50 characters minimum`}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={20} /> : null}
        >
          {submitting ? 'Submitting...' : 'Submit Bid'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
