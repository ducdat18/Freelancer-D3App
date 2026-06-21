import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import RepeatIcon from '@mui/icons-material/Repeat';
import { useState } from 'react';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface RepostJobDialogProps {
  open: boolean;
  jobTitle: string;
  originalBudgetSol: number;
  loading?: boolean;
  onClose: () => void;
  onRepost: (newDeadline: Date, newBudgetSol?: string) => void;
}

export default function RepostJobDialog({
  open,
  jobTitle,
  originalBudgetSol,
  loading,
  onClose,
  onRepost,
}: RepostJobDialogProps) {
  const [newDeadline, setNewDeadline] = useState<Date | null>(null);
  const [newBudget, setNewBudget] = useState('');
  const [deadlineError, setDeadlineError] = useState('');

  const handleRepost = () => {
    if (!newDeadline || newDeadline <= new Date()) {
      setDeadlineError('Please pick a future deadline');
      return;
    }
    setDeadlineError('');
    onRepost(newDeadline, newBudget || undefined);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RepeatIcon color="warning" />
          Repost Job
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Create a new identical job posting for <strong>&quot;{jobTitle}&quot;</strong> with a fresh deadline.
            The original job remains cancelled on-chain.
          </Typography>

          <DateTimePicker
            label="New Deadline *"
            value={newDeadline}
            onChange={(v) => { setNewDeadline(v); setDeadlineError(''); }}
            disablePast
            slotProps={{
              textField: {
                fullWidth: true,
                error: !!deadlineError,
                helperText: deadlineError,
                sx: { mb: 2 },
              },
            }}
          />

          <TextField
            fullWidth
            label="New Budget (optional)"
            type="number"
            value={newBudget}
            onChange={(e) => setNewBudget(e.target.value)}
            placeholder={String(originalBudgetSol)}
            helperText={`Leave blank to keep original (${originalBudgetSol} SOL)`}
            InputProps={{
              endAdornment: <InputAdornment position="end">SOL</InputAdornment>,
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleRepost}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <RepeatIcon />}
          >
            Repost
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
