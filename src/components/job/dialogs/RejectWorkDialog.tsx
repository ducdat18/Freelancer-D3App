import {
  Typography,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';

interface RejectWorkDialogProps {
  open: boolean;
  rejectReason: string;
  actionLoading: boolean;
  onReasonChange: (reason: string) => void;
  onReject: () => void;
  onClose: () => void;
}

export default function RejectWorkDialog({
  open,
  rejectReason,
  actionLoading,
  onReasonChange,
  onReject,
  onClose,
}: RejectWorkDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
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
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="Explain why the work does not meet requirements..."
          sx={{ mt: 2 }}
          inputProps={{ maxLength: 500 }}
          helperText={`${rejectReason.length}/500 characters`}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          variant="outlined"
          onClick={onClose}
          disabled={actionLoading}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onReject}
          disabled={actionLoading || !rejectReason.trim()}
        >
          {actionLoading ? 'Rejecting...' : 'Reject Work'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
