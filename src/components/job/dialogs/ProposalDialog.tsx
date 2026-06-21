import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  useTheme,
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { backgroundImage: 'none' } }}
    >
      <DialogTitle sx={{ py: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={700}>Contractor Proposal</Typography>
          <IconButton onClick={onClose} size="small"><Close /></IconButton>
        </Box>
        {bid && (
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            FROM {formatAddress(bid.account.freelancer)} · {bid.budgetInSol.toFixed(4)} SOL · {bid.account.timelineDays} DAYS
          </Typography>
        )}
      </DialogTitle>
      <DialogContent dividers={!isDark}>
        {bid && (
          <Box
            sx={{
              whiteSpace: 'pre-line',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              lineHeight: 1.75,
              p: 2.5,
              bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'grey.50',
              borderRadius: 1.5,
              border: 1,
              borderColor: 'divider',
              color: 'text.primary'
            }}
          >
            {getCleanProposal(bid.account.proposal)}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
        {bid && (
          <Button
            variant="outlined"
            startIcon={<Psychology sx={{ fontSize: 18 }} />}
            onClick={() => onRunRiskCheck(bid)}
            sx={{ 
              borderColor: isDark ? 'rgba(128,132,238,0.4)' : 'secondary.light', 
              color: 'secondary.main',
              fontWeight: 700,
              '&:hover': {
                borderColor: 'secondary.main',
                bgcolor: isDark ? 'rgba(128,132,238,0.06)' : 'rgba(99,102,241,0.04)'
              }
            }}
          >
            AI RISK CHECK
          </Button>
        )}
        <Button onClick={onClose} variant="contained" sx={{ px: 4, fontWeight: 700 }}>
          CLOSE
        </Button>
      </DialogActions>
    </Dialog>
  );
}
