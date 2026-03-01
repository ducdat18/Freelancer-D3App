import { useCallback } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Button,
  Paper,
  Divider,
  Alert,
  InputAdornment,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';

export interface MilestoneInput {
  title: string;
  description: string;
  amount: number;
}

interface MilestoneBuilderProps {
  budget: number;
  milestones: MilestoneInput[];
  onChange: (milestones: MilestoneInput[]) => void;
}

export default function MilestoneBuilder({
  budget,
  milestones,
  onChange,
}: MilestoneBuilderProps) {
  const total = milestones.reduce((sum, m) => sum + (m.amount || 0), 0);
  const remaining = budget - total;
  const overBudget = total > budget;

  const handleAdd = useCallback(() => {
    onChange([
      ...milestones,
      { title: '', description: '', amount: 0 },
    ]);
  }, [milestones, onChange]);

  const handleRemove = useCallback(
    (index: number) => {
      onChange(milestones.filter((_, i) => i !== index));
    },
    [milestones, onChange]
  );

  const handleChange = useCallback(
    (index: number, field: keyof MilestoneInput, value: string | number) => {
      const updated = milestones.map((m, i) => {
        if (i !== index) return m;
        return { ...m, [field]: value };
      });
      onChange(updated);
    },
    [milestones, onChange]
  );

  return (
    <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" fontWeight={600}>
          Milestones
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Budget: {budget} SOL
        </Typography>
      </Box>

      {milestones.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No milestones defined yet. Add milestones to break your project into phases.
          </Typography>
        </Box>
      )}

      {milestones.map((milestone, index) => (
        <Box key={index}>
          {index > 0 && <Divider sx={{ my: 3 }} />}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </Box>
                <Typography variant="subtitle2" fontWeight={600}>
                  Milestone {index + 1}
                </Typography>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
                <TextField
                  fullWidth
                  label="Title"
                  value={milestone.title}
                  onChange={(e) => handleChange(index, 'title', e.target.value)}
                  placeholder="e.g., Design Mockups"
                  size="small"
                  required
                />
                <TextField
                  fullWidth
                  label="Amount"
                  type="number"
                  value={milestone.amount || ''}
                  onChange={(e) => handleChange(index, 'amount', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  size="small"
                  required
                  InputProps={{
                    endAdornment: <InputAdornment position="end">SOL</InputAdornment>,
                  }}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Box>

              <TextField
                fullWidth
                label="Description"
                value={milestone.description}
                onChange={(e) => handleChange(index, 'description', e.target.value)}
                placeholder="Describe the expected deliverables for this milestone..."
                size="small"
                multiline
                rows={2}
              />
            </Box>

            <IconButton
              onClick={() => handleRemove(index)}
              color="error"
              sx={{ mt: 4 }}
              disabled={milestones.length <= 1}
            >
              <Delete />
            </IconButton>
          </Box>
        </Box>
      ))}

      <Box sx={{ mt: 3 }}>
        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={handleAdd}
          fullWidth
          sx={{ borderStyle: 'dashed', py: 1.2 }}
        >
          Add Milestone
        </Button>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Summary */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Total Allocated
        </Typography>
        <Typography variant="body1" fontWeight={600} color={overBudget ? 'error.main' : 'text.primary'}>
          {total.toFixed(4)} SOL
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Budget
        </Typography>
        <Typography variant="body1" fontWeight={600}>
          {budget.toFixed(4)} SOL
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Remaining
        </Typography>
        <Typography
          variant="body1"
          fontWeight={600}
          color={overBudget ? 'error.main' : remaining === 0 ? 'success.main' : 'warning.main'}
        >
          {remaining.toFixed(4)} SOL
        </Typography>
      </Box>

      {overBudget && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Total milestone amounts exceed the job budget by {Math.abs(remaining).toFixed(4)} SOL.
        </Alert>
      )}

      {!overBudget && remaining > 0 && milestones.length > 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {remaining.toFixed(4)} SOL of the budget is not allocated to any milestone.
        </Alert>
      )}

      {!overBudget && remaining === 0 && milestones.length > 0 && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Budget fully allocated across {milestones.length} milestone{milestones.length !== 1 ? 's' : ''}.
        </Alert>
      )}
    </Paper>
  );
}
