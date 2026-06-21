import { useState, useRef } from 'react'
import {
  Box, Typography, Button, TextField, CircularProgress,
  Chip, Alert, LinearProgress, Collapse, Divider, Tooltip,
  IconButton, useTheme, alpha,
} from '@mui/material'
import {
  Psychology, ExpandMore, ExpandLess, CheckCircle, Warning,
  Error as ErrorIcon, Shield, FileUpload, Close,
} from '@mui/icons-material'
import type { RiskAssessmentResult, RiskFinding } from '../../../pages/api/ai/risk-assessment'

interface Props {
  jobDescription: string
  jobTitle?: string
}

// ─── score ring ────────────────────────────────────────────────────────────

function ScoreGauge({ value, label, color }: { value: number; label: string; color: string }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box sx={{ position: 'relative', display: 'inline-flex', mb: 0.5 }}>
        <CircularProgress variant="determinate" value={100} size={60} thickness={5}
          sx={{ color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', position: 'absolute' }} />
        <CircularProgress variant="determinate" value={value} size={60} thickness={5}
          sx={{ color }} />
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography sx={{ fontFamily: '"Orbitron",sans-serif', fontWeight: 700, fontSize: '0.85rem', color, lineHeight: 1 }}>
            {value}
          </Typography>
        </Box>
      </Box>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem', letterSpacing: '0.05em', fontWeight: 600 }}>
        {label}
      </Typography>
    </Box>
  )
}

// ─── finding item ───────────────────────────────────────────────────────────

function FindingItem({ finding }: { finding: RiskFinding }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const iconMap = {
    positive: <CheckCircle sx={{ fontSize: 14, color: theme.palette.success.main, flexShrink: 0 }} />,
    warning:  <Warning     sx={{ fontSize: 14, color: theme.palette.warning.main, flexShrink: 0 }} />,
    danger:   <ErrorIcon   sx={{ fontSize: 14, color: theme.palette.error.main, flexShrink: 0 }} />,
  }
  const colorMap = {
    positive: isDark ? 'rgba(76,175,80,0.08)' : 'rgba(76,175,80,0.05)',
    warning:  isDark ? 'rgba(255,152,0,0.08)' : 'rgba(255,152,0,0.05)',
    danger:   isDark ? 'rgba(244,67,54,0.08)' : 'rgba(244,67,54,0.05)',
  }
  const borderMap = {
    positive: isDark ? 'rgba(76,175,80,0.2)' : 'rgba(76,175,80,0.15)',
    warning:  isDark ? 'rgba(255,152,0,0.2)' : 'rgba(255,152,0,0.15)',
    danger:   isDark ? 'rgba(244,67,54,0.2)' : 'rgba(244,67,54,0.15)',
  }

  return (
    <Box sx={{
      display: 'flex', alignItems: 'flex-start', gap: 1, p: 1.25,
      borderRadius: 1,
      bgcolor: colorMap[finding.type],
      border: `1px solid ${borderMap[finding.type]}`,
    }}>
      {iconMap[finding.type]}
      <Typography variant="caption" sx={{ lineHeight: 1.5, color: 'text.secondary', fontWeight: 500 }}>
        {finding.text}
      </Typography>
    </Box>
  )
}

// ─── risk badge ──────────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: 'LOW' | 'MEDIUM' | 'HIGH' }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const config = {
    LOW:    { color: theme.palette.success.main, bg: isDark ? 'rgba(76,175,80,0.12)' : 'rgba(76,175,80,0.08)',   border: 'rgba(76,175,80,0.3)',   label: 'LOW RISK' },
    MEDIUM: { color: theme.palette.warning.main, bg: isDark ? 'rgba(255,152,0,0.12)' : 'rgba(255,152,0,0.08)',   border: 'rgba(255,152,0,0.3)',   label: 'MEDIUM RISK' },
    HIGH:   { color: theme.palette.error.main,   bg: isDark ? 'rgba(244,67,54,0.12)' : 'rgba(244,67,54,0.08)',   border: 'rgba(244,67,54,0.3)',   label: 'HIGH RISK' },
  }[level]

  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.5,
      border: `1px solid ${config.border}`, borderRadius: 1,
      bgcolor: config.bg,
    }}>
      <Shield sx={{ fontSize: 14, color: config.color }} />
      <Typography sx={{
        fontFamily: '"Orbitron",sans-serif', fontSize: '0.65rem',
        fontWeight: 700, letterSpacing: '0.1em', color: config.color,
      }}>
        {config.label}
      </Typography>
    </Box>
  )
}

// ─── main component ──────────────────────────────────────────────────────────

export default function RiskAssessmentPanel({ jobDescription, jobTitle }: Props) {
  const [expanded, setExpanded]     = useState(false)
  const [cvText, setCvText]         = useState('')
  const [fileName, setFileName]     = useState('')
  const [loading, setLoading]       = useState(false)
  const [result, setResult]         = useState<RiskAssessmentResult | null>(null)
  const [error, setError]           = useState('')
  const fileInputRef                = useRef<HTMLInputElement>(null)
  
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const secondaryMain = theme.palette.secondary.main;

  const handleFileRead = (file: File) => {
    if (file.type === 'text/plain') {
      const reader = new FileReader()
      reader.onload = (e) => {
        setCvText((e.target?.result as string) || '')
        setFileName(file.name)
      }
      reader.readAsText(file)
    } else {
      setError(`"${file.name}" — PDF/DOC extraction is not supported. Please paste text directly.`)
    }
  }

  const handleAnalyze = async () => {
    if (!cvText.trim() || cvText.trim().length < 20) {
      setError('Please enter your CV text (at least 20 characters).')
      return
    }
    setError('')
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/ai/risk-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription, cvText, jobTitle }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Analysis failed. Please try again.')
      } else {
        setResult(data)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const riskColor = result
    ? result.riskLevel === 'LOW' ? theme.palette.success.main : result.riskLevel === 'MEDIUM' ? theme.palette.warning.main : theme.palette.error.main
    : theme.palette.primary.main

  const matchColor  = result ? (result.matchScore  >= 70 ? theme.palette.success.main : result.matchScore  >= 40 ? theme.palette.warning.main : theme.palette.error.main) : theme.palette.primary.main
  const authColor   = result ? (result.authenticityScore >= 70 ? theme.palette.success.main : result.authenticityScore >= 40 ? theme.palette.warning.main : theme.palette.error.main) : theme.palette.primary.main

  return (
    <Box
      sx={{
        border: 1,
        borderColor: isDark ? alpha(secondaryMain, 0.2) : 'divider',
        borderRadius: 2,
        background: isDark ? 'rgba(7,5,17,0.5)' : 'background.paper',
        overflow: 'hidden',
        backgroundImage: 'none',
      }}
    >
      {/* Header — always visible */}
      <Box
        onClick={() => setExpanded(p => !p)}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.75,
          cursor: 'pointer',
          '&:hover': { bgcolor: alpha(secondaryMain, 0.05) },
          borderBottom: expanded ? 1 : 'none',
          borderColor: alpha(secondaryMain, 0.12),
          transition: 'background 0.15s',
        }}
      >
        <Psychology sx={{ fontSize: 18, color: secondaryMain }} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{
            fontFamily: '"Orbitron",sans-serif', fontSize: '0.65rem',
            letterSpacing: '0.15em', color: secondaryMain, lineHeight: 1, fontWeight: 700,
          }}>
            AI RISK ASSESSMENT
          </Typography>
          {result && !loading && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontWeight: 600 }}>
              Match {result.matchScore}% · Auth {result.authenticityScore}%
            </Typography>
          )}
        </Box>
        {result && <RiskBadge level={result.riskLevel} />}
        {expanded ? <ExpandLess sx={{ fontSize: 18, color: 'text.disabled' }} /> : <ExpandMore sx={{ fontSize: 18, color: 'text.disabled' }} />}
      </Box>

      {/* Body — collapsible */}
      <Collapse in={expanded}>
        <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>

          {/* Intro */}
          {!result && (
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6, fontWeight: 500 }}>
              Paste your CV/résumé below. Our AI will evaluate your profile match, 
              check credibility, and compute an overall hiring risk score.
            </Typography>
          )}

          {/* CV Input */}
          {!result && (
            <>
              {/* File upload (txt only) */}
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt"
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileRead(f) }}
                />
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<FileUpload sx={{ fontSize: 15 }} />}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{ fontSize: '0.72rem', fontWeight: 700 }}
                >
                  Upload .txt CV
                </Button>
                {fileName && (
                  <Chip
                    label={fileName}
                    size="small"
                    onDelete={() => { setCvText(''); setFileName('') }}
                    sx={{ fontSize: '0.65rem', fontWeight: 600 }}
                  />
                )}
                <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 500 }}>
                  or paste below
                </Typography>
              </Box>

              <TextField
                multiline
                rows={7}
                fullWidth
                placeholder="Paste your CV text here... Skills, experience, education, projects."
                value={cvText}
                onChange={e => setCvText(e.target.value)}
                size="small"
                sx={{
                  '& .MuiInputBase-root': { fontSize: '0.8rem', fontFamily: 'monospace', lineHeight: 1.6 },
                }}
              />

              {error && (
                <Alert severity="error" onClose={() => setError('')} sx={{ py: 0.5, fontSize: '0.78rem' }}>
                  {error}
                </Alert>
              )}

              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <Psychology sx={{ fontSize: 16 }} />}
                onClick={handleAnalyze}
                disabled={loading || !cvText.trim()}
                sx={{
                  alignSelf: 'flex-start',
                  fontWeight: 700,
                }}
              >
                {loading ? 'Analyzing...' : 'Analyze Risk'}
              </Button>
            </>
          )}

          {/* Loading state */}
          {loading && (
            <Box sx={{ py: 2 }}>
              <LinearProgress sx={{ mb: 1.5 }} />
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                AI is analyzing your profile and the job requirements...
              </Typography>
            </Box>
          )}

          {/* Results */}
          {result && !loading && (
            <>
              {/* Score gauges row */}
              <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', py: 1, flexWrap: 'wrap' }}>
                <ScoreGauge value={result.matchScore}       label="JOB MATCH"   color={matchColor} />
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <RiskBadge level={result.riskLevel} />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, fontSize: '0.6rem', fontWeight: 700 }}>
                    SCORE: {result.riskScore}/100
                  </Typography>
                </Box>
                <ScoreGauge value={result.authenticityScore} label="CREDIBILITY" color={authColor} />
              </Box>

              <Divider />

              {/* Summary */}
              <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: isDark ? alpha(secondaryMain, 0.06) : 'grey.50', border: 1, borderColor: 'divider' }}>
                <Typography variant="caption" sx={{ color: 'text.primary', lineHeight: 1.6, fontWeight: 500, display: 'block' }}>
                  {result.summary}
                </Typography>
              </Box>

              {/* Findings */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {result.findings.map((f, i) => <FindingItem key={i} finding={f} />)}
              </Box>

              {/* Recommendation */}
              <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: alpha(riskColor, 0.05), border: 1, borderColor: alpha(riskColor, 0.3) }}>
                <Typography variant="caption" fontWeight={800} sx={{ color: riskColor, display: 'block', mb: 0.5, fontFamily: '"Orbitron",sans-serif', fontSize: '0.6rem', letterSpacing: 1 }}>
                  RECOMMENDATION
                </Typography>
                <Typography variant="caption" color="text.primary" sx={{ lineHeight: 1.5, fontWeight: 600, display: 'block' }}>
                  {result.recommendation}
                </Typography>
              </Box>

              {/* Re-analyze */}
              <Button
                size="small"
                variant="outlined"
                onClick={() => setResult(null)}
                sx={{ alignSelf: 'flex-start', fontSize: '0.72rem', fontWeight: 700 }}
              >
                Re-analyze
              </Button>
            </>
          )}
        </Box>
      </Collapse>
    </Box>
  )
}
