import { useState, useRef, useEffect } from 'react'
import { Box, Button } from '@mui/material'
import { PlayArrow } from '@mui/icons-material'
import { useWallet } from '@solana/wallet-adapter-react'
import { useJobs } from '../hooks/useJobs'

// ─── sample job data ──────────────────────────────────────────────────────────

const SAMPLE_JOBS = [
  {
    title: 'Build NFT Minting Page (Metaplex)',
    description: 'Single-page NFT minting UI with wallet connection and Metaplex Core integration. Mint button, collection display, and on-chain metadata.',
    budget: 0.0025,
    metadataUri: 'ipfs://QmNFTMint001',
  },
  {
    title: 'Design Twitter Banner — Web3 Launch',
    description: 'Professional Twitter/X banner for DeFi protocol launch. Logo, tagline, and crypto-native visual aesthetic. Deliver 1500×500 PNG.',
    budget: 0.001,
    metadataUri: 'ipfs://QmBanner002',
  },
  {
    title: 'Write Solana DeFi Explainer (1000 words)',
    description: 'Educational blog post covering Solana DeFi ecosystem for beginners — AMMs, lending, yield. SEO-optimized, accurate terminology.',
    budget: 0.0015,
    metadataUri: 'ipfs://QmBlogPost003',
  },
  {
    title: 'Fix Anchor Program Token Transfer Bug',
    description: 'Debug and fix token transfer validation in existing Anchor program. Must have Rust + SPL Token experience. Error logs provided.',
    budget: 0.003,
    metadataUri: 'ipfs://QmBugFix004',
  },
  {
    title: 'Telegram Price Alert Bot (Jupiter API)',
    description: 'Node.js Telegram bot sending price alerts for Solana tokens. Jupiter API + Telegraf. Deploy-ready Docker container included.',
    budget: 0.002,
    metadataUri: 'ipfs://QmTelegramBot005',
  },
  {
    title: 'Optimize Next.js Bundle Size (<2s Load)',
    description: 'Performance audit on Next.js dApp — code splitting, lazy loading, image optimization, bundle analysis. Target Lighthouse score ≥90.',
    budget: 0.0022,
    metadataUri: 'ipfs://QmPerf006',
  },
  {
    title: 'Translate Landing Page to Vietnamese',
    description: 'Native Vietnamese speaker needed. ~500 words DeFi platform landing page. Accurate crypto/Web3 terminology required.',
    budget: 0.0012,
    metadataUri: 'ipfs://QmTranslation007',
  },
  {
    title: 'Create 3 Custom Discord Emojis (GIF)',
    description: 'Animated emojis for DAO Discord. Theme: blockchain, governance, community. Deliver PNG + GIF, ≤128×128px, <256KB each.',
    budget: 0.001,
    metadataUri: 'ipfs://QmEmojis008',
  },
  {
    title: 'Animated Logo GIF for Website Header',
    description: 'Convert static SVG logo to smooth 3s loop animation — rotation or glow effect. Deliver optimized GIF + WebP. Max 200KB.',
    budget: 0.0018,
    metadataUri: 'ipfs://QmLogoGif009',
  },
  {
    title: 'Web3 Community Manager — 1 Week Trial',
    description: 'Manage Twitter + Discord for 1 week. Daily posts, community engagement, content calendar. Prior Web3 community experience required.',
    budget: 0.0028,
    metadataUri: 'ipfs://QmCommunity010',
  },
]

// ─── types ────────────────────────────────────────────────────────────────────

type JobState = 'idle' | 'pending' | 'running' | 'ok' | 'fail'
type LogType  = 'info' | 'ok' | 'warn' | 'err' | 'exec'

interface LogLine {
  ts:   string
  type: LogType
  text: string
}

const TYPE_COLOR: Record<LogType, string> = {
  info: '#8084ee',
  ok:   '#00ffc3',
  warn: '#e04d01',
  err:  '#ff5555',
  exec: 'rgba(224,230,237,0.85)',
}

const TYPE_LABEL: Record<LogType, string> = {
  info: 'INFO',
  ok:   'OK  ',
  warn: 'WARN',
  err:  'ERR ',
  exec: 'EXEC',
}

function nowTs() {
  return new Date().toLocaleTimeString('en-US', { hour12: false })
}

// ─── component ────────────────────────────────────────────────────────────────

export default function SampleJobsCreator() {
  const { connected, publicKey } = useWallet()
  const { createJob }            = useJobs()

  const [running, setRunning] = useState(false)
  const [states,  setStates]  = useState<JobState[]>(SAMPLE_JOBS.map(() => 'idle'))
  const [logs,    setLogs]    = useState<LogLine[]>([])
  const [done,    setDone]    = useState(false)
  const scrollRef             = useRef<HTMLDivElement>(null)

  const push = (type: LogType, text: string) =>
    setLogs(prev => [...prev, { ts: nowTs(), type, text }])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [logs])

  const run = async () => {
    if (!connected || !publicKey) {
      push('warn', 'wallet_not_connected — aborted')
      return
    }

    setRunning(true)
    setDone(false)
    setLogs([])

    const fresh = SAMPLE_JOBS.map((): JobState => 'pending')
    setStates([...fresh])

    const addr = publicKey.toBase58()
    push('info', `signer: ${addr.slice(0, 8)}...${addr.slice(-4)}`)
    push('info', `program: FStwCj8z...yyP7i`)
    push('info', `batch_size: ${SAMPLE_JOBS.length}  interval: 1500ms`)

    let ok = 0

    for (let i = 0; i < SAMPLE_JOBS.length; i++) {
      const job = SAMPLE_JOBS[i]

      fresh[i] = 'running'
      setStates([...fresh])

      push('exec', `create_job[${String(i + 1).padStart(2, '0')}]: "${job.title.length > 42 ? job.title.slice(0, 42) + '…' : job.title}"`)
      push('info', `budget: ${job.budget} SOL  deadline: +30d`)

      try {
        const deadline = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
        const result = await createJob(
          job.title,
          job.description,
          job.budget.toString(),
          deadline,
          job.metadataUri,
        )
        fresh[i] = 'ok'
        setStates([...fresh])
        ok++
        push('ok', `confirmed: ${result.signature.slice(0, 14)}...`)
      } catch (err: any) {
        fresh[i] = 'fail'
        setStates([...fresh])
        const msg = (err?.message || 'unknown_error').slice(0, 72)
        push('err', `tx_failed: ${msg}`)
      }

      if (i < SAMPLE_JOBS.length - 1) {
        await new Promise(r => setTimeout(r, 1500))
      }
    }

    push('info', `batch complete — ${ok}/${SAMPLE_JOBS.length} succeeded`)
    if (ok < SAMPLE_JOBS.length) {
      push('warn', `${SAMPLE_JOBS.length - ok} job(s) failed — check IDL / wallet balance`)
    }

    setRunning(false)
    setDone(true)
  }

  // ─── state icon ─────────────────────────────────────────────────────────────

  const stateColor = (s: JobState) => {
    if (s === 'ok')      return '#00ffc3'
    if (s === 'fail')    return '#ff5555'
    if (s === 'running') return '#8084ee'
    if (s === 'pending') return 'rgba(255,255,255,0.28)'
    return 'rgba(255,255,255,0.12)'
  }

  const stateGlyph = (s: JobState) => {
    if (s === 'ok')      return '✓'
    if (s === 'fail')    return '✗'
    if (s === 'running') return '⟳'
    return '·'
  }

  // ─── render ──────────────────────────────────────────────────────────────────

  const completedCount = states.filter(s => s === 'ok' || s === 'fail').length

  return (
    <Box sx={{ fontFamily: '"JetBrains Mono","Fira Code","Courier New",monospace' }}>

      {/* Job queue list */}
      <Box
        sx={{
          mb: 1.5,
          p: '10px 14px',
          bgcolor: 'rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 1,
        }}
      >
        {SAMPLE_JOBS.map((job, i) => (
          <Box
            key={i}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              py: '2px',
              fontSize: '0.71rem',
              lineHeight: 1.65,
            }}
          >
            {/* index */}
            <Box component="span" sx={{ color: 'rgba(255,255,255,0.18)', minWidth: 20, flexShrink: 0 }}>
              {String(i + 1).padStart(2, '0')}
            </Box>

            {/* title */}
            <Box
              component="span"
              sx={{
                flexGrow: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: stateColor(states[i]),
                transition: 'color 0.2s',
              }}
            >
              {job.title}
            </Box>

            {/* budget */}
            <Box component="span" sx={{ color: 'rgba(255,255,255,0.22)', fontSize: '0.64rem', flexShrink: 0 }}>
              {job.budget}&nbsp;SOL
            </Box>

            {/* glyph */}
            <Box
              component="span"
              sx={{
                minWidth: 14,
                textAlign: 'right',
                flexShrink: 0,
                color: stateColor(states[i]),
                fontSize: states[i] === 'running' ? '0.85rem' : '0.75rem',
              }}
            >
              {stateGlyph(states[i])}
            </Box>
          </Box>
        ))}
      </Box>

      {/* Log stream */}
      {logs.length > 0 && (
        <Box
          ref={scrollRef}
          sx={{
            mb: 1.5,
            p: '10px 14px',
            maxHeight: 190,
            overflowY: 'auto',
            bgcolor: 'rgba(0,0,0,0.35)',
            border: '1px solid rgba(0,255,195,0.08)',
            borderRadius: 1,
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {logs.map((entry, i) => (
            <Box
              key={i}
              sx={{ display: 'flex', gap: 1, mb: '1px', fontSize: '0.68rem', lineHeight: 1.75 }}
            >
              <Box component="span" sx={{ color: 'rgba(255,255,255,0.18)', minWidth: 70, flexShrink: 0 }}>
                [{entry.ts}]
              </Box>
              <Box
                component="span"
                sx={{ color: TYPE_COLOR[entry.type], minWidth: 36, flexShrink: 0, fontWeight: 700 }}
              >
                {TYPE_LABEL[entry.type]}
              </Box>
              <Box
                component="span"
                sx={{
                  color: entry.type === 'exec' ? 'rgba(224,230,237,0.85)' : '#e0e6ed',
                  wordBreak: 'break-all',
                }}
              >
                {entry.text}
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* Run button */}
      <Button
        fullWidth
        variant="outlined"
        startIcon={<PlayArrow sx={{ fontSize: '14px !important' }} />}
        onClick={run}
        disabled={running || !connected}
        sx={{
          fontFamily: '"JetBrains Mono","Fira Code","Courier New",monospace',
          fontSize: '0.77rem',
          letterSpacing: '0.04em',
          py: 0.85,
          borderColor: running
            ? 'rgba(128,132,238,0.4)'
            : 'rgba(0,255,195,0.3)',
          color: running
            ? '#8084ee'
            : connected
            ? '#00ffc3'
            : 'rgba(255,255,255,0.22)',
          '&:hover': {
            borderColor: '#00ffc3',
            bgcolor: 'rgba(0,255,195,0.04)',
          },
          '&.Mui-disabled': {
            color: running ? '#8084ee' : 'rgba(255,255,255,0.18)',
            borderColor: running ? 'rgba(128,132,238,0.3)' : 'rgba(255,255,255,0.08)',
          },
        }}
      >
        {running
          ? `> executing batch... [${completedCount}/${SAMPLE_JOBS.length}]`
          : done
          ? '> run again'
          : '> run create_sample_jobs'}
      </Button>

      {/* Not connected hint */}
      {!connected && (
        <Box
          sx={{
            mt: 0.75,
            fontSize: '0.67rem',
            color: '#e04d01',
            textAlign: 'center',
            letterSpacing: '0.02em',
          }}
        >
          [WARN] wallet not connected — connect wallet to proceed
        </Box>
      )}
    </Box>
  )
}
