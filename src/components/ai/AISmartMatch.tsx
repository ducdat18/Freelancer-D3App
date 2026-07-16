import { useMemo, useState } from 'react';
import {
  Box, Typography, Button, FormControl, InputLabel, Select, MenuItem,
  CircularProgress, Chip, Stack, Alert, LinearProgress, Tooltip, alpha, useTheme,
} from '@mui/material';
import { AutoAwesome, Bolt, Star, Work, ArrowForward } from '@mui/icons-material';
import { useAIMatching, type MatchCandidate } from '../../hooks/useAIMatching';

const AI_ACCENT = '#8084ee';

export interface SmartMatchJob {
  id: string;
  title: string;
  description: string;
  budgetSol: number;
}

export interface SmartMatchCandidate extends MatchCandidate {
  address: string;
  completedJobs: number;
  averageRating: number;
}

interface AISmartMatchProps {
  /** The connected client's own open jobs. */
  openJobs: SmartMatchJob[];
  /** Real on-chain freelancers currently shown in the list. */
  candidates: SmartMatchCandidate[];
  /** Invite a freelancer to a specific job. */
  onInvite: (jobId: string, freelancerAddress: string) => void;
}

function shortAddr(a: string) {
  return `${a.slice(0, 6)}...${a.slice(-4)}`;
}

function scoreColor(score: number) {
  if (score >= 0.75) return '#22c55e';
  if (score >= 0.5) return '#f59e0b';
  return '#ef4444';
}

/**
 * AI Smart Match — lets a client pick one of their open jobs and have the AI
 * rank the *real* on-chain freelancers in the network against it. Uses the
 * shared /api/ai/matching endpoint with real candidate data (no mock pool).
 */
export default function AISmartMatch({ openJobs, candidates, onInvite }: AISmartMatchProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { matches, loading, error, findMatches } = useAIMatching();
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [hasRun, setHasRun] = useState(false);

  const selectedJob = useMemo(
    () => openJobs.find((j) => j.id === selectedJobId),
    [openJobs, selectedJobId],
  );

  const candidateByAddr = useMemo(() => {
    const m = new Map<string, SmartMatchCandidate>();
    candidates.forEach((c) => m.set(c.address, c));
    return m;
  }, [candidates]);

  const handleRank = async () => {
    if (!selectedJob || candidates.length === 0) return;
    setHasRun(true);
    await findMatches(
      `${selectedJob.title}\n\n${selectedJob.description}`,
      [], // skills inferred from the description server-side
      selectedJob.budgetSol > 0 ? selectedJob.budgetSol : 1,
      Math.min(candidates.length, 10),
      candidates.map((c) => ({
        address: c.address,
        completedJobs: c.completedJobs,
        averageRating: c.averageRating,
      })),
    );
  };

  if (openJobs.length === 0) return null;

  return (
    <Box
      sx={{
        mb: 4,
        borderRadius: 2,
        border: 1,
        borderColor: alpha(AI_ACCENT, isDark ? 0.35 : 0.3),
        bgcolor: isDark ? alpha(AI_ACCENT, 0.05) : alpha(AI_ACCENT, 0.04),
        overflow: 'hidden',
      }}
    >
      <Box sx={{ p: { xs: 2, md: 2.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <AutoAwesome sx={{ color: AI_ACCENT, fontSize: 20 }} />
          <Typography variant="subtitle1" fontWeight={700}>
            AI Smart Match
          </Typography>
          <Chip
            label="REAL ON-CHAIN DATA"
            size="small"
            sx={{
              height: 18,
              fontSize: '0.6rem',
              fontWeight: 700,
              letterSpacing: 0.5,
              color: AI_ACCENT,
              bgcolor: alpha(AI_ACCENT, 0.12),
            }}
          />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Rank the {candidates.length} freelancer{candidates.length !== 1 ? 's' : ''} in the network
          against one of your open jobs. The AI weighs skill fit, completed jobs and reputation.
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 240, flex: 1 }}>
            <InputLabel>Select one of your open jobs</InputLabel>
            <Select
              value={selectedJobId}
              label="Select one of your open jobs"
              onChange={(e) => setSelectedJobId(e.target.value)}
            >
              {openJobs.map((j) => (
                <MenuItem key={j.id} value={j.id}>
                  {j.title || `Job ${j.id.slice(0, 6)}`} — {j.budgetSol} SOL
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Bolt />}
            onClick={handleRank}
            disabled={loading || !selectedJobId || candidates.length === 0}
            sx={{
              bgcolor: AI_ACCENT,
              '&:hover': { bgcolor: '#6b6fd6' },
              whiteSpace: 'nowrap',
            }}
          >
            {loading ? 'Ranking...' : 'Rank with AI'}
          </Button>
        </Stack>

        {loading && <LinearProgress sx={{ mt: 2, '& .MuiLinearProgress-bar': { bgcolor: AI_ACCENT } }} />}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {hasRun && !loading && !error && matches.length === 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            No ranking returned. Try again in a moment.
          </Alert>
        )}

        {matches.length > 0 && (
          <Stack spacing={1} sx={{ mt: 2.5 }}>
            {matches.map((m, i) => {
              const cand = candidateByAddr.get(m.freelancerAddress);
              const pct = Math.round(m.compatibilityScore * 100);
              return (
                <Box
                  key={m.freelancerAddress}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1.5,
                    borderRadius: 1.5,
                    border: 1,
                    borderColor: 'divider',
                    bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'background.paper',
                  }}
                >
                  <Typography
                    variant="caption"
                    fontWeight={800}
                    sx={{ color: 'text.disabled', minWidth: 22 }}
                  >
                    #{i + 1}
                  </Typography>

                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      color: scoreColor(m.compatibilityScore),
                      border: `2px solid ${scoreColor(m.compatibilityScore)}`,
                      bgcolor: alpha(scoreColor(m.compatibilityScore), 0.12),
                    }}
                  >
                    {pct}%
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>
                      {shortAddr(m.freelancerAddress)}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mt: 0.25 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                        <Star sx={{ fontSize: 13, color: '#f59e0b' }} />
                        <Typography variant="caption" color="text.secondary">
                          {(cand?.averageRating ?? m.averageRating).toFixed(1)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                        <Work sx={{ fontSize: 13, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">
                          {cand?.completedJobs ?? m.completedJobs} jobs
                        </Typography>
                      </Box>
                      {m.matchedSkills.slice(0, 3).map((s) => (
                        <Chip
                          key={s}
                          label={s}
                          size="small"
                          sx={{ height: 18, fontSize: '0.6rem', bgcolor: alpha(AI_ACCENT, 0.1), color: AI_ACCENT }}
                        />
                      ))}
                    </Box>
                    {m.reason && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                        {m.reason}
                      </Typography>
                    )}
                  </Box>

                  <Tooltip title="Invite to this job">
                    <span>
                      <Button
                        size="small"
                        variant="outlined"
                        endIcon={<ArrowForward sx={{ fontSize: 16 }} />}
                        onClick={() => selectedJobId && onInvite(selectedJobId, m.freelancerAddress)}
                        sx={{
                          borderColor: alpha(AI_ACCENT, 0.5),
                          color: AI_ACCENT,
                          whiteSpace: 'nowrap',
                          '&:hover': { borderColor: AI_ACCENT, bgcolor: alpha(AI_ACCENT, 0.08) },
                        }}
                      >
                        Invite
                      </Button>
                    </span>
                  </Tooltip>
                </Box>
              );
            })}
            <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5 }}>
              Ranked by AI from on-chain reputation. Always review a freelancer&apos;s profile before inviting.
            </Typography>
          </Stack>
        )}
      </Box>
    </Box>
  );
}
