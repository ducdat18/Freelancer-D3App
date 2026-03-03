import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { PublicKey } from '@solana/web3.js';
import BidForm from '../../freelancer/BidForm';

interface BidFormDialogProps {
  open: boolean;
  job: any;
  jobPda: PublicKey | null;
  budgetInSol: number;
  onClose: () => void;
  onSubmit: (data: { amount: string; timeline: string; proposal: string; cvHash?: string }) => Promise<void>;
}

export default function BidFormDialog({
  open,
  job,
  jobPda,
  budgetInSol,
  onClose,
  onSubmit,
}: BidFormDialogProps) {
  if (!job || !jobPda) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography variant="h5" fontWeight={600}>
              Submit Your Bid
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {job.title}
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            sx={{ color: 'text.secondary' }}
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <BidForm
          jobId={jobPda.toBase58()}
          jobBudget={budgetInSol.toString()}
          bidCount={job.bidCount}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
