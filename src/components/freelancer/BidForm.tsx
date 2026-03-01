import { useState, useCallback, useMemo } from 'react'
import {
  Card, CardContent, TextField, Button, Box, Typography,
  Alert, CircularProgress, ToggleButtonGroup, ToggleButton,
  Select, MenuItem, FormControl, InputLabel, Divider,
  Checkbox, FormControlLabel, LinearProgress, Tooltip,
  Chip,
} from '@mui/material'
import {
  Send, Description, Edit, Upload,
  Warning, CheckCircle, Shield, CalendarMonth, AttachMoney,
} from '@mui/icons-material'
import { useCVStorage } from '../../hooks/useCVStorage'
import CVUpload from './CVUpload'
import {
  calcBidScore, validateBid, getScoreLevel, SCORE_COLORS,
  MIN_BID_RATIO, MAX_BID_RATIO, LOW_WARN_RATIO, HIGH_WARN_RATIO,
} from '../../utils/bidScore'

interface BidFormProps {
  jobId: string
  jobBudget?: string      // reference budget from job posting (SOL)
  bidCount?: number       // how many others have bid
  onSubmit: (bid: {
    amount: string
    timeline: string
    proposal: string
    cvHash?: string
  }) => Promise<void>
  loading?: boolean
}

// ─── bid score ring ────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const level = getScoreLevel(score)
  const color = SCORE_COLORS[level]
  const label = level === 'strong' ? 'STRONG' : level === 'average' ? 'AVERAGE' : 'WEAK'

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress
          variant="determinate"
          value={100}
          size={72}
          thickness={4}
          sx={{ color: 'rgba(255,255,255,0.06)', position: 'absolute' }}
        />
        <CircularProgress
          variant="determinate"
          value={score}
          size={72}
          thickness={4}
          sx={{ color }}
        />
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Typography sx={{ fontFamily: '"Orbitron",sans-serif', fontWeight: 700, fontSize: '1.1rem', color, lineHeight: 1 }}>
            {score}
          </Typography>
          <Typography sx={{ fontSize: '0.5rem', color: 'text.disabled', letterSpacing: '0.05em' }}>
            /100
          </Typography>
        </Box>
      </Box>
      <Chip
        label={label}
        size="small"
        sx={{
          height: 16, fontSize: '0.55rem', fontFamily: '"Orbitron",sans-serif',
          letterSpacing: '0.1em', bgcolor: `${color}18`, color, border: `1px solid ${color}44`,
        }}
      />
    </Box>
  )
}

// ─── price gauge ──────────────────────────────────────────────────────────

function PriceGauge({ bidSol, budgetSol }: { bidSol: number; budgetSol: number }) {
  if (!budgetSol || !bidSol) return null
  const pct = Math.min(200, Math.round((bidSol / budgetSol) * 100))
  const color =
    pct < LOW_WARN_RATIO * 100  ? SCORE_COLORS.weak :
    pct > HIGH_WARN_RATIO * 100 ? SCORE_COLORS.average :
    SCORE_COLORS.strong

  return (
    <Box sx={{ mt: 0.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
        <Typography variant="caption" color="text.disabled">vs budget</Typography>
        <Typography variant="caption" sx={{ color, fontWeight: 700 }}>{pct}%</Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={Math.min(100, pct / 2)}   // map 0-200% → 0-100% bar
        sx={{
          height: 4, borderRadius: 2,
          bgcolor: 'rgba(255,255,255,0.06)',
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 2 },
        }}
      />
      {/* budget marker */}
      <Box sx={{ position: 'relative', height: 6 }}>
        <Tooltip title="Job budget" placement="top">
          <Box sx={{
            position: 'absolute', left: '50%', top: 0,
            width: 2, height: 6, bgcolor: 'rgba(255,255,255,0.25)', borderRadius: 1,
          }} />
        </Tooltip>
      </Box>
    </Box>
  )
}

// ─── main component ────────────────────────────────────────────────────────

export default function BidForm({
  jobId: _jobId,
  jobBudget,
  bidCount = 0,
  onSubmit,
  loading = false,
}: BidFormProps) {
  const budgetSol = parseFloat(jobBudget || '0') || 0

  // — fields
  const [bidPrice, setBidPrice]     = useState('')
  const [timeline, setTimeline]     = useState('')
  const [proposal, setProposal]     = useState('')
  const [acknowledged, setAck]      = useState(false)
  const [submitError, setSubmitError] = useState('')

  // — CV
  const [cvMode, setCvMode]                 = useState<'manual' | 'upload' | 'saved'>('manual')
  const [selectedSavedCV, setSelectedSavedCV] = useState('')
  const [uploadedCVHash, setUploadedCVHash]   = useState<string[]>([])
  const { savedCVs } = useCVStorage()
  const handleCVUploadComplete = useCallback((hashes: string[]) => setUploadedCVHash(hashes), [])

  // — derived
  const bidSol      = parseFloat(bidPrice) || 0
  const timelineDays= parseInt(timeline)   || 0
  const score       = useMemo(() => calcBidScore(bidSol, budgetSol, timelineDays), [bidSol, budgetSol, timelineDays])
  const validation  = useMemo(() => validateBid(bidSol, budgetSol, timelineDays), [bidSol, budgetSol, timelineDays])

  const cvReady =
    cvMode === 'manual'   ? proposal.trim().length >= 100 :
    cvMode === 'saved'    ? !!selectedSavedCV :
    uploadedCVHash.length > 0

  const canSubmit =
    !loading &&
    bidPrice !== '' && bidSol > 0 &&
    timeline !== '' && timelineDays >= 1 &&
    !validation.blocked &&
    cvReady &&
    acknowledged

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')

    if (validation.blocked) {
      setSubmitError(validation.blockReason || 'Invalid bid')
      return
    }
    if (!acknowledged) {
      setSubmitError('You must acknowledge the commitment before submitting.')
      return
    }

    let finalCVHash = ''
    if (cvMode === 'saved' && selectedSavedCV) finalCVHash = selectedSavedCV
    else if (cvMode === 'upload' && uploadedCVHash.length > 0) finalCVHash = uploadedCVHash[0]

    try {
      await onSubmit({
        amount:   bidPrice,
        timeline: String(timelineDays),
        proposal,
        cvHash: finalCVHash || undefined,
      })
      // reset
      setBidPrice(''); setTimeline(''); setProposal('')
      setSelectedSavedCV(''); setUploadedCVHash([]); setAck(false)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit bid')
    }
  }

  return (
    <Card sx={{ border: '1px solid rgba(0,255,195,0.12)', background: 'rgba(7,5,17,0.6)' }}>
      <CardContent sx={{ p: 3 }}>

        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
          <Box>
            <Typography sx={{ fontFamily: '"Orbitron",sans-serif', fontSize: '0.7rem', letterSpacing: '0.15em', color: 'primary.main', mb: 0.5 }}>
              SUBMIT TENDER
            </Typography>
            <Typography variant="h6" fontWeight={700}>Place Your Bid</Typography>
            {bidCount > 0 && (
              <Typography variant="caption" color="text.secondary">
                {bidCount} freelancer{bidCount > 1 ? 's' : ''} already competing
              </Typography>
            )}
          </Box>
          {/* Live score */}
          {bidSol > 0 && timelineDays > 0 && !validation.blocked && (
            <ScoreRing score={score} />
          )}
        </Box>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

          {/* ── Price + Timeline ── */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>

            {/* Price */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
                <AttachMoney sx={{ fontSize: 14, color: 'primary.main' }} />
                <Typography variant="caption" fontWeight={600} sx={{ letterSpacing: '0.06em' }}>
                  YOUR PRICE (SOL)
                </Typography>
              </Box>
              <TextField
                fullWidth
                type="number"
                value={bidPrice}
                onChange={e => setBidPrice(e.target.value)}
                placeholder="0.00"
                size="small"
                disabled={loading}
                inputProps={{ min: 0, step: 'any' }}
                error={!!bidPrice && validation.blocked && bidSol !== 0}
                sx={{ '& input': { fontFamily: '"Orbitron",sans-serif', fontWeight: 700, fontSize: '1.1rem' } }}
              />
              {budgetSol > 0 && (
                <Typography variant="caption" color="text.disabled" sx={{ mt: 0.25, display: 'block' }}>
                  Budget: {budgetSol} SOL &nbsp;|&nbsp; min {(budgetSol * MIN_BID_RATIO).toFixed(3)} — max {(budgetSol * MAX_BID_RATIO).toFixed(3)}
                </Typography>
              )}
              {bidSol > 0 && budgetSol > 0 && <PriceGauge bidSol={bidSol} budgetSol={budgetSol} />}
            </Box>

            {/* Timeline */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
                <CalendarMonth sx={{ fontSize: 14, color: 'primary.main' }} />
                <Typography variant="caption" fontWeight={600} sx={{ letterSpacing: '0.06em' }}>
                  DEADLINE (DAYS)
                </Typography>
              </Box>
              <TextField
                fullWidth
                type="number"
                value={timeline}
                onChange={e => setTimeline(e.target.value)}
                placeholder="e.g. 14"
                size="small"
                disabled={loading}
                inputProps={{ min: 1, max: 365, step: 1 }}
                sx={{ '& input': { fontFamily: '"Orbitron",sans-serif', fontWeight: 700, fontSize: '1.1rem' } }}
              />
              <Typography variant="caption" color="text.disabled" sx={{ mt: 0.25, display: 'block' }}>
                Shorter delivery = higher score. Min 1, max 365.
              </Typography>
            </Box>
          </Box>

          {/* Anti-manipulation feedback */}
          {bidSol > 0 && timelineDays > 0 && (
            <>
              {validation.blocked && (
                <Alert severity="error" icon={<Warning />} sx={{ py: 0.5 }}>
                  {validation.blockReason}
                </Alert>
              )}
              {!validation.blocked && validation.warnings.map((w, i) => (
                <Alert key={i} severity="warning" icon={<Warning />} sx={{ py: 0.5 }}>
                  {w}
                </Alert>
              ))}
            </>
          )}

          <Divider sx={{ borderColor: 'rgba(0,255,195,0.08)' }} />

          {/* ── Proposal / CV ── */}
          <Box>
            <Typography variant="caption" fontWeight={600} sx={{ letterSpacing: '0.06em', display: 'block', mb: 1 }}>
              HOW WOULD YOU LIKE TO INTRODUCE YOURSELF?
            </Typography>
            <ToggleButtonGroup
              value={cvMode} exclusive
              onChange={(_, v) => v && setCvMode(v)}
              fullWidth size="small" disabled={loading}
              sx={{ mb: 2 }}
            >
              <ToggleButton value="manual"><Edit sx={{ mr: 0.5, fontSize: 16 }} />Write</ToggleButton>
              <ToggleButton value="saved" disabled={savedCVs.length === 0}>
                <Description sx={{ mr: 0.5, fontSize: 16 }} />Saved CV ({savedCVs.length})
              </ToggleButton>
              <ToggleButton value="upload"><Upload sx={{ mr: 0.5, fontSize: 16 }} />Upload</ToggleButton>
            </ToggleButtonGroup>

            {cvMode === 'manual' && (
              <TextField
                label="Proposal"
                value={proposal} onChange={e => setProposal(e.target.value)}
                multiline rows={6} fullWidth required disabled={loading}
                placeholder="Describe your experience, approach, and why you're the best fit. Be specific about your plan and deliverables..."
                helperText={`${proposal.length} / 100 minimum characters`}
                error={proposal.length > 0 && proposal.length < 100}
              />
            )}

            {cvMode === 'saved' && savedCVs.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Select CV</InputLabel>
                  <Select value={selectedSavedCV} onChange={e => setSelectedSavedCV(e.target.value)} label="Select CV" disabled={loading}>
                    {savedCVs.map(cv => (
                      <MenuItem key={cv.hash} value={cv.hash}>
                        {cv.fileName} — {new Date(cv.uploadedAt).toLocaleDateString()}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Additional Notes (optional)"
                  value={proposal} onChange={e => setProposal(e.target.value)}
                  multiline rows={3} fullWidth disabled={loading}
                  helperText="Minimum 100 characters if provided"
                />
              </Box>
            )}

            {cvMode === 'upload' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <CVUpload onUploadComplete={handleCVUploadComplete} disabled={loading} multiple={false} maxFiles={1} />
                <TextField
                  label="Additional Notes (optional)"
                  value={proposal} onChange={e => setProposal(e.target.value)}
                  multiline rows={3} fullWidth disabled={loading}
                  helperText="Minimum 100 characters if provided"
                />
              </Box>
            )}
          </Box>

          <Divider sx={{ borderColor: 'rgba(0,255,195,0.08)' }} />

          {/* ── Commitment ── */}
          <Box
            sx={{
              p: 1.5, borderRadius: 1,
              border: `1px solid ${acknowledged ? 'rgba(0,255,195,0.25)' : 'rgba(255,255,255,0.08)'}`,
              bgcolor: acknowledged ? 'rgba(0,255,195,0.04)' : 'transparent',
              transition: 'all 0.2s',
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={acknowledged}
                  onChange={e => setAck(e.target.checked)}
                  disabled={loading}
                  sx={{ color: 'primary.main', '&.Mui-checked': { color: 'primary.main' } }}
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  I commit to delivering the work at{' '}
                  <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>
                    {bidSol > 0 ? `${bidSol} SOL` : '—'}
                  </Box>{' '}
                  within{' '}
                  <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>
                    {timelineDays > 0 ? `${timelineDays} day${timelineDays > 1 ? 's' : ''}` : '—'}
                  </Box>{' '}
                  of the contract start. I understand that failure to deliver may result in dispute and reputation penalty.
                </Typography>
              }
            />
          </Box>

          {/* security note */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 0.5 }}>
            <Shield sx={{ fontSize: 14, color: 'rgba(0,255,195,0.4)' }} />
            <Typography variant="caption" color="text.disabled">
              Payment is held in escrow and released only upon client approval.
            </Typography>
          </Box>

          {submitError && <Alert severity="error">{submitError}</Alert>}

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={!canSubmit}
            startIcon={loading ? <CircularProgress size={18} /> : <Send />}
            sx={{
              fontFamily: '"Orbitron",sans-serif',
              letterSpacing: '0.08em',
              fontSize: '0.78rem',
              py: 1.5,
            }}
          >
            {loading ? 'Submitting...' : 'Submit Tender'}
          </Button>

          {!canSubmit && !loading && (
            <Typography variant="caption" color="text.disabled" textAlign="center">
              {!bidPrice || bidSol <= 0 ? 'Enter your price · ' : ''}
              {!timeline || timelineDays < 1 ? 'Set a deadline · ' : ''}
              {!cvReady ? (cvMode === 'manual' ? `${Math.max(0, 100 - proposal.length)} more chars needed · ` : 'CV required · ') : ''}
              {!acknowledged ? 'Acknowledge commitment' : ''}
            </Typography>
          )}

        </Box>
      </CardContent>
    </Card>
  )
}
