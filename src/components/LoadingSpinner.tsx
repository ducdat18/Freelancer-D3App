import { useState, useEffect, useRef } from 'react'
import { Box, Typography } from '@mui/material'

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

const TYPE_COLOR: Record<LogLine['type'], string> = {
  info:  '#8084ee',
  ok:    '#00ffc3',
  warn:  '#e04d01',
  query: 'rgba(224,230,237,0.5)',
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
        background: 'rgba(7,5,17,0.95)',
        border: '1px solid rgba(0,255,195,0.2)',
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: '0 0 40px rgba(0,255,195,0.06)',
      }}
    >
      {/* Title bar */}
      <Box
        sx={{
          px: 2, py: 1,
          borderBottom: '1px solid rgba(0,255,195,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', gap: 0.75 }}>
          {['#ff00ff','#e04d01','#00ffc3'].map(c => (
            <Box key={c} sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c, opacity: 0.8 }} />
          ))}
        </Box>
        <Typography sx={{ ml: 1, fontFamily: '"Orbitron", monospace', fontSize: '0.6rem', letterSpacing: '0.1em', color: 'rgba(0,255,195,0.4)' }}>
          SYSTEM LOG
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Typography sx={{ fontFamily: 'monospace', fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)' }}>
          {ts}
        </Typography>
      </Box>

      {/* Log body */}
      <Box
        ref={scrollRef}
        sx={{ p: 1.5, maxHeight: 260, overflowY: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}
      >
        {entries.map((entry, i) =>
          shown.includes(i) ? (
            <LogRow key={i} entry={entry} delay={0} />
          ) : null
        )}

        {done && <LogRow entry={finalQuery} delay={0} blink />}
      </Box>
    </Box>
  )
}

// ─── single log row ────────────────────────────────────────────────────────────

function LogRow({ entry, blink }: { entry: LogLine; delay: number; blink?: boolean }) {
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

  return (
    <Box sx={{ display: 'flex', gap: 1, mb: 0.3, fontFamily: '"JetBrains Mono","Fira Code","Courier New",monospace', fontSize: '0.72rem', lineHeight: 1.7 }}>
      <Box component="span" sx={{ color: 'rgba(255,255,255,0.2)', minWidth: 72, flexShrink: 0 }}>
        [{ts}]
      </Box>
      <Box component="span" sx={{ color: TYPE_COLOR[entry.type], minWidth: 44, flexShrink: 0, fontWeight: 700 }}>
        {TYPE_LABEL[entry.type]}
      </Box>
      <Box component="span" sx={{ color: entry.type === 'query' ? 'rgba(224,230,237,0.45)' : '#e0e6ed', wordBreak: 'break-word' }}>
        {entry.text}
        {blink && (
          <Box component="span" sx={{ color: '#00ffc3', opacity: cursor ? 1 : 0, ml: 0.25 }}>█</Box>
        )}
      </Box>
    </Box>
  )
}
