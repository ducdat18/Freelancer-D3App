import { useState, useRef } from 'react'
import {
  Box, Typography, Button, TextField, CircularProgress,
  Chip, Alert, LinearProgress, Collapse, Divider, Tooltip,
  IconButton,
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
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box sx={{ position: 'relative', display: 'inline-flex', mb: 0.5 }}>
        <CircularProgress variant="determinate" value={100} size={60} thickness={5}
          sx={{ color: 'rgba(255,255,255,0.06)', position: 'absolute' }} />
        <CircularProgress variant="determinate" value={value} size={60} thickness={5}
          sx={{ color }} />
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography sx={{ fontFamily: '"Orbitron",sans-serif', fontWeight: 700, fontSize: '0.85rem', color, lineHeight: 1 }}>
            {value}
          </Typography>
        </Box>
      </Box>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>
        {label}
      </Typography>
    </Box>
  )
}

// ─── finding item ───────────────────────────────────────────────────────────

function FindingItem({ finding }: { finding: RiskFinding }) {
  const iconMap = {
    positive: <CheckCircle sx={{ fontSize: 14, color: '#4caf50', flexShrink: 0 }} />,
    warning:  <Warning     sx={{ fontSize: 14, color: '#ff9800', flexShrink: 0 }} />,
    danger:   <ErrorIcon   sx={{ fontSize: 14, color: '#f44336', flexShrink: 0 }} />,
  }
  const colorMap = {
    positive: 'rgba(76,175,80,0.08)',
    warning:  'rgba(255,152,0,0.08)',
    danger:   'rgba(244,67,54,0.08)',
  }
  const borderMap = {
    positive: 'rgba(76,175,80,0.2)',
    warning:  'rgba(255,152,0,0.2)',
    danger:   'rgba(244,67,54,0.2)',
  }

  return (
    <Box sx={{
      display: 'flex', alignItems: 'flex-start', gap: 1, p: 1,
      borderRadius: 1,
      bgcolor: colorMap[finding.type],
      border: `1px solid ${borderMap[finding.type]}`,
    }}>
      {iconMap[finding.type]}
      <Typography variant="caption" sx={{ lineHeight: 1.5, color: 'text.secondary' }}>
        {finding.text}
      </Typography>
    </Box>
  )
}

// ─── risk badge ──────────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: 'LOW' | 'MEDIUM' | 'HIGH' }) {
  const config = {
    LOW:    { color: '#4caf50', bg: 'rgba(76,175,80,0.12)',   border: 'rgba(76,175,80,0.3)',   label: 'LOW RISK' },
    MEDIUM: { color: '#ff9800', bg: 'rgba(255,152,0,0.12)',   border: 'rgba(255,152,0,0.3)',   label: 'MEDIUM RISK' },
    HIGH:   { color: '#f44336', bg: 'rgba(244,67,54,0.12)',   border: 'rgba(244,67,54,0.3)',   label: 'HIGH RISK' },
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

  const handleFileRead = (file: File) => {
    if (file.type === 'text/plain') {
      const reader = new FileReader()
      reader.onload = (e) => {
        setCvText((e.target?.result as string) || '')
        setFileName(file.name)
      }
      reader.readAsText(file)
    } else {
      // For PDF/DOC we can't extract text client-side without a library
      // Inform user to paste text instead
      setError(`"${file.name}" — PDF/DOC extraction is not supported in the browser. Please paste your CV text directly in the box below.`)
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
    ? result.riskLevel === 'LOW' ? '#4caf50' : result.riskLevel === 'MEDIUM' ? '#ff9800' : '#f44336'
    : '#00ffc3'

  const matchColor  = result ? (result.matchScore  >= 70 ? '#4caf50' : result.matchScore  >= 40 ? '#ff9800' : '#f44336') : '#00ffc3'
  const authColor   = result ? (result.authenticityScore >= 70 ? '#4caf50' : result.authenticityScore >= 40 ? '#ff9800' : '#f44336') : '#00ffc3'

  return (
    <Box
      sx={{
        border: '1px solid rgba(128,132,238,0.2)',
        borderRadius: 2,
        background: 'rgba(7,5,17,0.5)',
        overflow: 'hidden',
      }}
    >
      {/* Header — always visible */}
      <Box
        onClick={() => setExpanded(p => !p)}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.75,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'rgba(128,132,238,0.05)' },
          borderBottom: expanded ? '1px solid rgba(128,132,238,0.12)' : 'none',
          transition: 'background 0.15s',
        }}
      >
        <Psychology sx={{ fontSize: 18, color: '#8084ee' }} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{
            fontFamily: '"Orbitron",sans-serif', fontSize: '0.65rem',
            letterSpacing: '0.15em', color: '#8084ee', lineHeight: 1,
          }}>
            AI RISK ASSESSMENT
          </Typography>
          {result && !loading && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
              Match {result.matchScore}% · Auth {result.authenticityScore}%
            </Typography>
          )}
        </Box>
        {result && <RiskBadge level={result.riskLevel} />}
        {expanded ? <ExpandLess sx={{ fontSize: 18, color: 'text.disabled' }} /> : <ExpandMore sx={{ fontSize: 18, color: 'text.disabled' }} />}
      </Box>

      {/* Body — collapsible */}
      <Collapse in={expanded}>
        <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>

          {/* Intro */}
          {!result && (
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              Paste your CV/résumé below. Our AI will evaluate how well your profile matches this job and
              check whether your CV appears credible — then compute an overall hiring risk score.
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
                  sx={{ fontSize: '0.72rem', borderColor: 'rgba(128,132,238,0.3)', color: '#8084ee', '&:hover': { borderColor: '#8084ee' } }}
                >
                  Upload .txt CV
                </Button>
                {fileName && (
                  <Chip
                    label={fileName}
                    size="small"
                    onDelete={() => { setCvText(''); setFileName('') }}
                    sx={{ fontSize: '0.65rem' }}
                  />
                )}
                <Typography variant="caption" color="text.disabled">
                  or paste below
                </Typography>
              </Box>

              <TextField
                multiline
                rows={7}
                fullWidth
                placeholder="Paste your CV / resume text here…

Skills, experience, education, past projects — anything relevant."
                value={cvText}
                onChange={e => setCvText(e.target.value)}
                size="small"
                sx={{
                  '& .MuiInputBase-root': { fontSize: '0.8rem', fontFamily: 'monospace', lineHeight: 1.6 },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(128,132,238,0.2)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(128,132,238,0.4)' },
                }}
              />

              {error && (
                <Alert severity="error" onClose={() => setError('')} sx={{ py: 0.5, fontSize: '0.78rem' }}>
                  {error}
                </Alert>
              )}

              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : <Psychology sx={{ fontSize: 16 }} />}
                onClick={handleAnalyze}
                disabled={loading || !cvText.trim()}
                sx={{
                  background: 'linear-gradient(135deg, #5a5fcc 0%, #8084ee 100%)',
                  '&:hover': { background: 'linear-gradient(135deg, #6a6fd8 0%, #9095f5 100%)' },
                  alignSelf: 'flex-start',
                }}
              >
                {loading ? 'Analyzing…' : 'Analyze Risk'}
              </Button>
            </>
          )}

          {/* Loading state */}
          {loading && (
            <Box>
              <LinearProgress sx={{ mb: 1, '& .MuiLinearProgress-bar': { bgcolor: '#8084ee' } }} />
              <Typography variant="caption" color="text.secondary">
                Gemini AI is reading your CV and the job description…
              </Typography>
            </Box>
          )}

          {/* Results */}
          {result && !loading && (
            <>
              {/* Score gauges row */}
              <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', py: 1 }}>
                <ScoreGauge value={result.matchScore}       label="JOB MATCH"   color={matchColor} />
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <RiskBadge level={result.riskLevel} />
                  <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, fontSize: '0.6rem' }}>
                    risk score {result.riskScore}/100
                  </Typography>
                </Box>
                <ScoreGauge value={result.authenticityScore} label="CV CREDIBILITY" color={authColor} />
              </Box>

              <Divider sx={{ borderColor: 'rgba(128,132,238,0.1)' }} />

              {/* Summary */}
              <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'rgba(128,132,238,0.06)', border: '1px solid rgba(128,132,238,0.12)' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                  {result.summary}
                </Typography>
              </Box>

              {/* Findings */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {result.findings.map((f, i) => <FindingItem key={i} finding={f} />)}
              </Box>

              {/* Recommendation */}
              <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: `${riskColor}0d`, border: `1px solid ${riskColor}30` }}>
                <Typography variant="caption" fontWeight={600} sx={{ color: riskColor, display: 'block', mb: 0.25, fontFamily: '"Orbitron",sans-serif', fontSize: '0.6rem', letterSpacing: '0.1em' }}>
                  RECOMMENDATION
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                  {result.recommendation}
                </Typography>
              </Box>

              {/* Re-analyze */}
              <Button
                size="small"
                variant="outlined"
                onClick={() => setResult(null)}
                sx={{ alignSelf: 'flex-start', fontSize: '0.72rem', borderColor: 'rgba(128,132,238,0.3)', color: '#8084ee' }}
              >
                Re-analyze with different CV
              </Button>
            </>
          )}
        </Box>
      </Collapse>
    </Box>
  )
}
