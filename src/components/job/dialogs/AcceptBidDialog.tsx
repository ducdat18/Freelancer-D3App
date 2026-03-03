import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import { Close, Lock } from '@mui/icons-material';
import type { BidWithDetails } from '../../../hooks/useOptimizedBids';

interface AcceptBidDialogProps {
  bid: BidWithDetails | null;
  open: boolean;
  accepting: boolean;
  balanceCheck: { sufficient: boolean; balance: number; required: number } | null;
  estimatedFee: number;
  acceptError: string | null;
  jobTitle?: string;
  onAccept: () => void;
  onClose: () => void;
}

export default function AcceptBidDialog({
  bid,
  open,
  accepting,
  balanceCheck,
  estimatedFee,
  acceptError,
  onAccept,
  onClose,
}: AcceptBidDialogProps) {
  const formatAddress = (address: any) => {
    const addr = address.toBase58();
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  return (
    <Dialog
      open={open}
      onClose={() => !accepting && onClose()}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={600}>
            Accept Bid
          </Typography>
          <IconButton
            onClick={onClose}
            disabled={accepting}
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {bid && (
          <Box>
            {/* ✅ NEW: Enhanced info about composite transaction */}
            <Alert severity="info" icon={<Lock />} sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                🔒 Secure 2-in-1 Transaction
              </Typography>
              <Typography variant="body2">
                This will automatically:
              </Typography>
              <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                <li>Accept the bid and assign the freelancer</li>
                <li>Deposit {bid.budgetInSol.toFixed(4)} SOL into escrow</li>
                <li>Lock funds until work is completed</li>
              </Box>
            </Alert>

            {/* Bid Details */}
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Bid Details
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Freelancer:</strong> {formatAddress(bid.account.freelancer)}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Budget:</strong> {bid.budgetInSol.toFixed(4)} SOL
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Timeline:</strong> {bid.account.timelineDays} days
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2" color="text.secondary">
                <strong>Transaction Fee:</strong> ~{estimatedFee.toFixed(4)} SOL
              </Typography>
              <Typography variant="body2" fontWeight={600} sx={{ mt: 1 }}>
                <strong>Total Required:</strong> {(bid.budgetInSol + estimatedFee).toFixed(4)} SOL
              </Typography>
            </Box>

            {/* ✅ NEW: Balance Check */}
            {balanceCheck && (
              <Alert
                severity={balanceCheck.sufficient ? "success" : "error"}
                sx={{ mb: 2 }}
              >
                <Typography variant="body2">
                  <strong>Your Balance:</strong> {balanceCheck.balance.toFixed(4)} SOL
                </Typography>
                {!balanceCheck.sufficient && (
                  <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                    ⚠️ Insufficient funds. You need {balanceCheck.required.toFixed(4)} SOL but only have {balanceCheck.balance.toFixed(4)} SOL.
                  </Typography>
                )}
              </Alert>
            )}

            {/* Error Display */}
            {acceptError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {acceptError}
              </Alert>
            )}

            {/* ✅ NEW: Security info */}
            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="caption">
                ✅ Funds are protected: Payment will only be released when you approve the completed work.
              </Typography>
            </Alert>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={onClose}
          disabled={accepting}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={onAccept}
          disabled={accepting || !!(balanceCheck && !balanceCheck.sufficient)}
          startIcon={accepting ? <CircularProgress size={20} /> : <Lock />}
        >
          {accepting ? 'Processing Transaction...' : 'Accept & Deposit Escrow'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
