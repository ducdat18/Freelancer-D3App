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

interface RaiseDisputeDialogProps {
  open: boolean;
  disputeReason: string;
  actionLoading: boolean;
  onReasonChange: (reason: string) => void;
  onRaise: () => void;
  onClose: () => void;
}

export default function RaiseDisputeDialog({
  open,
  disputeReason,
  actionLoading,
  onReasonChange,
  onRaise,
  onClose,
}: RaiseDisputeDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
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
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="Provide details about why you completed the work correctly..."
          sx={{ mt: 2 }}
          inputProps={{ maxLength: 500 }}
          helperText={`${disputeReason.length}/500 characters`}
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
          color="warning"
          onClick={onRaise}
          disabled={actionLoading || !disputeReason.trim()}
        >
          {actionLoading ? 'Raising Dispute...' : 'Raise Dispute'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
