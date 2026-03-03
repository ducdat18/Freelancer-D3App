import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import { Close, Psychology } from '@mui/icons-material';
import type { BidWithDetails } from '../../../hooks/useOptimizedBids';
import { getCleanProposal } from '../../../utils/cvUtils';

interface ProposalDialogProps {
  bid: BidWithDetails | null;
  open: boolean;
  onClose: () => void;
  onRunRiskCheck: (bid: BidWithDetails) => void;
  formatAddress: (addr: any) => string;
}

export default function ProposalDialog({
  bid,
  open,
  onClose,
  onRunRiskCheck,
  formatAddress,
}: ProposalDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={600}>Full Proposal</Typography>
          <IconButton onClick={onClose}><Close /></IconButton>
        </Box>
        {bid && (
          <Typography variant="caption" color="text.secondary">
            From {formatAddress(bid.account.freelancer)} · {bid.budgetInSol.toFixed(4)} SOL · {bid.account.timelineDays} days
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        {bid && (
          <Box
            sx={{
              whiteSpace: 'pre-line',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              lineHeight: 1.7,
              p: 2,
              bgcolor: 'background.default',
              borderRadius: 1,
              border: '1px solid rgba(0,255,195,0.08)',
            }}
          >
            {getCleanProposal(bid.account.proposal)}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        {bid && (
          <Button
            startIcon={<Psychology sx={{ fontSize: 16 }} />}
            onClick={() => {
              const currentBid = bid;
              onClose();
              onRunRiskCheck(currentBid);
            }}
            sx={{ color: '#8084ee', mr: 'auto' }}
          >
            Run Risk Check
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
