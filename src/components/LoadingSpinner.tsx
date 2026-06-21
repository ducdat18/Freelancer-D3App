import { useState, useEffect, useRef } from 'react'
import { Box, Typography, useTheme, alpha } from '@mui/material'

interface LogLine {
  text: string
  type: 'info' | 'ok' | 'warn' | 'query'
}

interface LoadingSpinnerProps {
  message?: string
  size?: number          // kept for backwards compat, unused
  logs?: LogLine[]       // optional custom log sequence
  sx?: object            // override root Box styles
}

const TYPE_LABEL: Record<LogLine['type'], string> = {
  info:  'INFO ',
  ok:    'OK   ',
  warn:  'WARN ',
  query: '···  ',
}

const DEFAULT_LOGS: LogLine[] = [
  { text: 'Connecting → rpc.ankr.com/solana_devnet',                    type: 'info'  },
  { text: 'RPC handshake OK — latency 38ms',                            type: 'ok'    },
  { text: 'Loading IDL: freelance_marketplace v0.1.0',                  type: 'info'  },
  { text: 'Program verified: FStwCj8z...yyP7i',                         type: 'ok'    },
  { text: 'getProgramAccounts(programId, filters=[])...',               type: 'info'  },
  { text: 'Anchor discriminator check — decoding structs...',           type: 'info'  },
  { text: 'Applying sort + filter pipeline...',                         type: 'info'  },
]

export default function LoadingSpinner({ message, logs, sx }: LoadingSpinnerProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  
  const entries = logs ?? DEFAULT_LOGS
  const finalQuery: LogLine = {
    text: message ?? 'Processing data...',
    type: 'query',
  }

  const [shown, setShown] = useState<number[]>([])
  const [done, setDone] = useState(false)
  const [ts, setTs] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Set timestamp client-side only (avoids SSR/hydration mismatch)
  useEffect(() => {
    setTs(new Date().toLocaleTimeString('en-US', { hour12: false }))
  }, [])

  // Stagger lines then show query prompt
  useEffect(() => {
    setShown([])
    setDone(false)

    entries.forEach((_, i) => {
      setTimeout(() => {
        setShown(prev => [...prev, i])
      }, i * 380 + Math.random() * 120)
    })

    setTimeout(() => setDone(true), entries.length * 400 + 200)
  }, [])

  // Auto-scroll terminal
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [shown, done])

  return (
    <Box
      sx={{
        mx: 'auto',
        mt: 6,
        maxWidth: 560,
        ...sx,
        background: isDark ? 'rgba(7,5,17,0.95)' : '#ffffff',
        border: 1,
        borderColor: isDark ? alpha(theme.palette.primary.main, 0.2) : 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: isDark ? `0 0 40px ${alpha(theme.palette.primary.main, 0.06)}` : '0 4px 24px rgba(0,0,0,0.06)',
      }}
    >
      {/* Title bar */}
      <Box
        sx={{
          px: 2, py: 1.25,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', gap: 0.75 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: theme.palette.error.main }} />
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: theme.palette.warning.main }} />
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: theme.palette.success.main }} />
        </Box>
        <Typography sx={{ ml: 1, fontFamily: '"Orbitron", monospace', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', color: isDark ? alpha(theme.palette.primary.main, 0.5) : 'text.secondary' }}>
          SYSTEM LOG
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Typography sx={{ fontFamily: 'monospace', fontSize: '0.65rem', fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.3)' }}>
          {ts}
        </Typography>
      </Box>

      {/* Log body */}
      <Box
        ref={scrollRef}
        sx={{ 
          p: 2, 
          maxHeight: 280, 
          overflowY: 'auto', 
          bgcolor: isDark ? 'transparent' : '#fff',
          '&::-webkit-scrollbar': { display: 'none' } 
        }}
      >
        {entries.map((entry, i) =>
          shown.includes(i) ? (
            <LogRow key={i} entry={entry} delay={0} isDark={isDark} theme={theme} />
          ) : null
        )}

        {done && <LogRow entry={finalQuery} delay={0} blink isDark={isDark} theme={theme} />}
      </Box>
    </Box>
  )
}

// ─── single log row ────────────────────────────────────────────────────────────

function LogRow({ entry, blink, isDark, theme }: { entry: LogLine; delay: number; blink?: boolean; isDark: boolean; theme: any }) {
  const [cursor, setCursor] = useState(true)
  const [ts, setTs] = useState('')

  useEffect(() => {
    setTs(new Date().toLocaleTimeString('en-US', { hour12: false }))
  }, [])

  useEffect(() => {
    if (!blink) return
    const t = setInterval(() => setCursor(v => !v), 530)
    return () => clearInterval(t)
  }, [blink])

  const labelColor = 
    entry.type === 'info' ? theme.palette.info.main : 
    entry.type === 'ok' ? theme.palette.success.main : 
    entry.type === 'warn' ? theme.palette.warning.main : 
    'inherit';

  return (
    <Box sx={{ display: 'flex', gap: 1.5, mb: 0.5, fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: '0.75rem', lineHeight: 1.7 }}>
      <Box component="span" sx={{ color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.3)', minWidth: 72, flexShrink: 0, fontWeight: 500 }}>
        [{ts}]
      </Box>
      <Box component="span" sx={{ color: labelColor, minWidth: 44, flexShrink: 0, fontWeight: 800 }}>
        {TYPE_LABEL[entry.type]}
      </Box>
      <Box component="span" sx={{ color: entry.type === 'query' ? (isDark ? 'rgba(224,230,237,0.5)' : 'rgba(0,0,0,0.6)') : (isDark ? '#e0e6ed' : '#1e293b'), wordBreak: 'break-word', fontWeight: entry.type === 'ok' ? 600 : 400 }}>
        {entry.text}
        {blink && (
          <Box component="span" sx={{ color: theme.palette.primary.main, opacity: cursor ? 1 : 0, ml: 0.5, fontWeight: 900 }}>█</Box>
        )}
      </Box>
    </Box>
  )
}
