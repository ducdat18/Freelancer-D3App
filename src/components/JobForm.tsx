import { useState, useEffect, useRef, useCallback } from 'react';
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
  Tooltip,
  Snackbar,
  Collapse,
  useTheme,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SaveIcon from '@mui/icons-material/Save';
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
import { useJobDraft } from '../hooks/useJobDraft';

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

interface AIPricingSuggestion {
  minPrice: number;
  maxPrice: number;
  recommendedPrice: number;
  marketAverage: number;
  confidence: number;
}

interface JobFormProps {
  onSubmit: (data: {
    title: string;
    description: string;
    budget: string;
    deadline: Date;
    metadata: JobMetadata;
    tokenMint?: string | null;
    depositNow?: boolean;
    useMilestones?: boolean;
    milestones?: MilestoneInput[];
  }) => void;
  isLoading?: boolean;
  error?: string | null;
  /** Pre-fill form from an existing draft ID */
  draftId?: string;
}

export default function JobForm({ onSubmit, isLoading, error, draftId }: JobFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [category, setCategory] = useState('');
  const [skills, setSkills] = useState('');
  const [paymentToken, setPaymentToken] = useState('SOL');
  const [depositNow, setDepositNow] = useState(false);
  const [useMilestones, setUseMilestones] = useState(false);
  const [milestones, setMilestones] = useState<MilestoneInput[]>([
    { title: '', description: '', amount: 0 },
  ]);

  // AI pricing state
  const [aiPricing, setAiPricing] = useState<AIPricingSuggestion | null>(null);
  const [aiPricingLoading, setAiPricingLoading] = useState(false);
  const [aiPricingError, setAiPricingError] = useState<string | null>(null);

  // Draft state
  const [draftSnackbar, setDraftSnackbar] = useState(false);
  const [activeDraftId, setActiveDraftId] = useState<string | undefined>(draftId);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { saveDraft, loadDraft } = useJobDraft();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primaryMain = theme.palette.primary.main;
  const secondaryMain = theme.palette.secondary.main;

  // Load draft on mount if draftId provided
  useEffect(() => {
    if (!draftId) return;
    const draft = loadDraft(draftId);
    if (!draft) return;
    setTitle(draft.title ?? '');
    setDescription(draft.description ?? '');
    setBudget(draft.budget ?? '');
    setDeadline(draft.deadline ? new Date(draft.deadline) : null);
    setCategory(draft.metadata?.category ?? '');
    setSkills((draft.metadata?.skills ?? []).join(', '));
    setUseMilestones(draft.useMilestones ?? false);
    setMilestones(draft.milestones?.length ? draft.milestones : [{ title: '', description: '', amount: 0 }]);
    setActiveDraftId(draftId);
  }, [draftId]);

  // Auto-save draft 30s after last change
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      const id = saveDraft({
        id: activeDraftId,
        title,
        description,
        budget,
        deadline: deadline ?? null,
        metadata: { category, skills: skills.split(',').map(s => s.trim()).filter(Boolean) },
        useMilestones,
        milestones,
      });
      setActiveDraftId(id);
      setDraftSnackbar(true);
    }, 30_000);
  }, [activeDraftId, title, description, budget, deadline, category, skills, useMilestones, milestones, saveDraft]);

  useEffect(() => { scheduleAutoSave(); }, [title, description, budget, deadline, category, skills, useMilestones, milestones]);

  const handleSaveDraft = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    const id = saveDraft({
      id: activeDraftId,
      title,
      description,
      budget,
      deadline: deadline ?? null,
      metadata: { category, skills: skills.split(',').map(s => s.trim()).filter(Boolean) },
      useMilestones,
      milestones,
    });
    setActiveDraftId(id);
    setDraftSnackbar(true);
  };

  // AI pricing suggestion
  const handleGetAIPricing = async () => {
    if (!description) {
      setAiPricingError('Add a description first');
      return;
    }
    setAiPricingLoading(true);
    setAiPricingError(null);
    try {
      const res = await fetch('/api/ai/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription: description,
          skills: skills.split(',').map(s => s.trim()).filter(Boolean),
          complexity: 'medium',
          timelineDays: 14,
        }),
      });
      if (!res.ok) throw new Error('AI pricing request failed');
      const data: AIPricingSuggestion = await res.json();
      setAiPricing(data);
    } catch (e) {
      setAiPricingError(e instanceof Error ? e.message : 'Failed to get AI pricing');
    } finally {
      setAiPricingLoading(false);
    }
  };

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
      depositNow,
      useMilestones,
      milestones: useMilestones ? milestones.filter(m => m.title && m.amount > 0) : undefined,
    });
  };

  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: 'background.paper',
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
              sx={{ color: primaryMain, letterSpacing: 3, fontSize: '0.6rem', fontWeight: 700 }}
            >
              BASIC INFO
            </Typography>
            <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
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
              sx={{ color: primaryMain, letterSpacing: 3, fontSize: '0.6rem', fontWeight: 700 }}
            >
              PROJECT DETAILS
            </Typography>
            <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
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
          <Box>
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
            {/* AI pricing suggestion */}
            <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={aiPricingLoading ? <CircularProgress size={12} /> : <AutoAwesomeIcon sx={{ fontSize: 14 }} />}
                onClick={handleGetAIPricing}
                disabled={aiPricingLoading || isLoading || !description}
                sx={{ fontSize: '0.72rem', textTransform: 'none', py: 0.25, px: 1 }}
              >
                AI Price Suggest
              </Button>
              {aiPricingError && (
                <Typography variant="caption" color="error">{aiPricingError}</Typography>
              )}
            </Box>
            <Collapse in={!!aiPricing}>
              {aiPricing && (
                <Box
                  sx={{
                    mt: 1, px: 1.5, py: 1,
                    border: 1,
                    borderColor: isDark ? 'rgba(0,255,195,0.2)' : 'primary.light',
                    borderRadius: 1.5,
                    bgcolor: isDark ? 'rgba(0,255,195,0.04)' : 'primary.50',
                    display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
                  }}
                >
                  <AutoAwesomeIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                  <Typography variant="caption" color="primary.main" fontWeight={600}>
                    Recommended: {aiPricing.recommendedPrice} SOL
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Range: {aiPricing.minPrice}–{aiPricing.maxPrice} SOL · Confidence: {Math.round(aiPricing.confidence * 100)}%
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => setBudget(String(aiPricing.recommendedPrice))}
                    sx={{ fontSize: '0.7rem', textTransform: 'none', py: 0, px: 0.5, minWidth: 0 }}
                  >
                    Use
                  </Button>
                </Box>
              )}
            </Collapse>
          </Box>

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
              sx={{ color: secondaryMain, letterSpacing: 3, fontSize: '0.6rem', fontWeight: 700 }}
            >
              MILESTONES
            </Typography>
            <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
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

        {/* Escrow Deposit Section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
            <Typography
              variant="overline"
              sx={{ color: primaryMain, letterSpacing: 3, fontSize: '0.6rem', fontWeight: 700 }}
            >
              ESCROW
            </Typography>
            <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={depositNow}
                onChange={(e) => setDepositNow(e.target.checked)}
                disabled={isLoading}
              />
            }
            label={
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  Deposit budget now
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Lock funds on-chain immediately after posting. Freelancers can see the escrow is funded.
                </Typography>
              </Box>
            }
            sx={{ alignItems: 'flex-start', ml: 0 }}
          />
        </Box>

        {/* Submit Section */}
        <Box
          sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            pt: 3, borderTop: 1, borderColor: 'divider',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
            Job posted on-chain · {depositNow ? 'funds locked in escrow on submit' : 'deposit escrow later from the job page'} · released on approval
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Tooltip title="Save as draft (auto-saves every 30s)">
              <Button
                variant="outlined"
                size="large"
                startIcon={<SaveIcon />}
                onClick={handleSaveDraft}
                disabled={isLoading}
                sx={{ px: 3, py: 1.5 }}
              >
                Save Draft
              </Button>
            </Tooltip>
            <Button
              type="submit"
              variant="contained"
              size="large"
              sx={{ px: 6, py: 1.5, fontSize: '0.95rem', minWidth: 220 }}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={22} /> : depositNow ? 'Create Job & Deposit' : 'Post Job'}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Draft saved snackbar */}
      <Snackbar
        open={draftSnackbar}
        autoHideDuration={3000}
        onClose={() => setDraftSnackbar(false)}
        message="Draft saved"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
