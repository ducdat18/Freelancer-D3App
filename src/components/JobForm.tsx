import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  InputAdornment,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import MilestoneBuilder from './job/MilestoneBuilder';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  validateJobTitle,
  validateJobDescription,
  validateBudget,
  validateDeadline,
} from '../utils/validation';
import type { JobMetadata } from '../types';

// Common SPL token mints (Devnet)
const TOKEN_OPTIONS = [
  { value: 'SOL', label: 'SOL (Solana)', mint: null, symbol: 'SOL' },
  { value: 'USDC', label: 'USDC (USD Coin)', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC' },
  { value: 'USDT', label: 'USDT (Tether)', mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', symbol: 'USDT' },
];

export interface MilestoneInput {
  title: string;
  description: string;
  amount: number;
}

interface JobFormProps {
  onSubmit: (data: {
    title: string;
    description: string;
    budget: string;
    deadline: Date;
    metadata: JobMetadata;
    tokenMint?: string | null;
    useMilestones?: boolean;
    milestones?: MilestoneInput[];
  }) => void;
  isLoading?: boolean;
  error?: string | null;
}

export default function JobForm({ onSubmit, isLoading, error }: JobFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [category, setCategory] = useState('');
  const [skills, setSkills] = useState('');
  const [paymentToken, setPaymentToken] = useState('SOL');
  const [useMilestones, setUseMilestones] = useState(false);
  const [milestones, setMilestones] = useState<MilestoneInput[]>([
    { title: '', description: '', amount: 0 },
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    const titleError = validateJobTitle(title);
    if (titleError) newErrors.title = titleError;

    const descError = validateJobDescription(description);
    if (descError) newErrors.description = descError;

    const budgetError = validateBudget(budget);
    if (budgetError) newErrors.budget = budgetError;

    if (deadline) {
      const deadlineError = validateDeadline(deadline);
      if (deadlineError) newErrors.deadline = deadlineError;
    } else {
      newErrors.deadline = 'Deadline is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const metadata: JobMetadata = {
      title,
      description,
      category,
      skills: skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    const selectedToken = TOKEN_OPTIONS.find((t) => t.value === paymentToken);

    onSubmit({
      title,
      description,
      budget,
      deadline: deadline!,
      metadata,
      tokenMint: selectedToken?.mint || null,
      useMilestones,
      milestones: useMilestones ? milestones.filter(m => m.title && m.amount > 0) : undefined,
    });
  };

  return (
    <Box
      sx={{
        border: '1px solid rgba(0,255,195,0.08)',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {error && (
        <Box sx={{ px: 3, pt: 3 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}

      <Box component="form" onSubmit={handleSubmit} sx={{ p: { xs: 2.5, md: 3 } }}>
        {/* Basic Information Section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
            <Typography
              variant="overline"
              sx={{ color: '#00ffc3', letterSpacing: 3, fontSize: '0.6rem' }}
            >
              BASIC INFO
            </Typography>
            <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(0,255,195,0.08)' }} />
          </Box>

          <TextField
            fullWidth
            label="Job Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={!!errors.title}
            helperText={errors.title}
            placeholder="e.g., Build a DeFi Dashboard"
            required
            disabled={isLoading}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            error={!!errors.description}
            helperText={errors.description}
            placeholder="Describe your project requirements in detail..."
            required
            multiline
            rows={5}
            disabled={isLoading}
          />
        </Box>

        {/* Project Details Section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
            <Typography
              variant="overline"
              sx={{ color: '#00ffc3', letterSpacing: 3, fontSize: '0.6rem' }}
            >
              PROJECT DETAILS
            </Typography>
            <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(0,255,195,0.08)' }} />
          </Box>

          {/* Payment Token Selection */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Payment Token</InputLabel>
            <Select
              value={paymentToken}
              onChange={(e) => setPaymentToken(e.target.value)}
              label="Payment Token"
              disabled={isLoading}
            >
              {TOKEN_OPTIONS.map((token) => (
                <MenuItem key={token.value} value={token.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography>{token.label}</Typography>
                    {token.value === 'SOL' && (
                      <Chip label="Native" size="small" color="primary" variant="outlined" />
                    )}
                    {token.value !== 'SOL' && (
                      <Chip label="Stablecoin" size="small" color="success" variant="outlined" />
                    )}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
            <TextField
              fullWidth
              label="Budget"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              error={!!errors.budget}
              helperText={errors.budget || `Amount in ${TOKEN_OPTIONS.find(t => t.value === paymentToken)?.symbol || 'tokens'}`}
              required
              type="number"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {TOKEN_OPTIONS.find((t) => t.value === paymentToken)?.symbol || 'SOL'}
                  </InputAdornment>
                ),
              }}
              disabled={isLoading}
            />

            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DateTimePicker
                label="Deadline"
                value={deadline}
                onChange={(newValue) => setDeadline(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    error: !!errors.deadline,
                    helperText: errors.deadline,
                    disabled: isLoading,
                  },
                }}
              />
            </LocalizationProvider>
          </Box>

          <TextField
            fullWidth
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g., Development, Design, Writing, Marketing"
            disabled={isLoading}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Required Skills"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="e.g., React, TypeScript, Web3, Solidity"
            helperText="Separate skills with commas"
            disabled={isLoading}
          />
        </Box>

        {/* Milestone Section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
            <Typography
              variant="overline"
              sx={{ color: '#9945ff', letterSpacing: 3, fontSize: '0.6rem' }}
            >
              MILESTONES
            </Typography>
            <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(153,69,255,0.1)' }} />
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={useMilestones}
                onChange={(e) => setUseMilestones(e.target.checked)}
                disabled={isLoading}
              />
            }
            label={
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  Milestone-Based Payment
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Split the project into phases with individual escrow per milestone.
                </Typography>
              </Box>
            }
            sx={{ mb: 2, alignItems: 'flex-start', ml: 0 }}
          />

          {useMilestones && (
            <MilestoneBuilder
              budget={parseFloat(budget) || 0}
              milestones={milestones}
              onChange={setMilestones}
            />
          )}
        </Box>

        {/* Submit Section */}
        <Box
          sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            pt: 3, borderTop: '1px solid rgba(0,255,195,0.08)',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
            Job posted on-chain · funds deposited into escrow · released on approval
          </Typography>
          <Button
            type="submit"
            variant="contained"
            size="large"
            sx={{ px: 6, py: 1.5, fontSize: '0.95rem', minWidth: 220 }}
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={22} /> : 'Create Job & Deposit'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
