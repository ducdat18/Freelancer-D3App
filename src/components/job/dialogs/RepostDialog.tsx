import {
  Typography,
  Button,
  Alert,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';

interface RepostDialogProps {
  open: boolean;
  onDecision: (shouldRepost: boolean) => void;
}

export default function RepostDialog({
  open,
  onDecision,
}: RepostDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={() => onDecision(false)}
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
          onClick={() => onDecision(false)}
          fullWidth
        >
          Go to My Jobs
        </Button>
        <Button
          variant="contained"
          onClick={() => onDecision(true)}
          fullWidth
        >
          Repost Job
        </Button>
      </DialogActions>
    </Dialog>
  );
}
