import { useState, useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { useWallet } from '@solana/wallet-adapter-react';

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface TerminalLogProps {
  entries?: LogEntry[];
  maxEntries?: number;
  title?: string;
}

const TYPE_COLORS: Record<string, string> = {
  info: '#8084ee',
  success: '#00ffc3',
  warning: '#e04d01',
  error: '#ff00ff',
};

const TYPE_PREFIXES: Record<string, string> = {
  info: 'INFO',
  success: 'OK',
  warning: 'WARN',
  error: 'ERR',
};

const BOOT_ENTRIES: LogEntry[] = [
  { timestamp: '', message: 'Initializing Lancer Lab protocol...', type: 'info' },
  { timestamp: '', message: 'Connected to Solana', type: 'success' },
  { timestamp: '', message: 'Smart contract loaded: freelance_marketplace', type: 'info' },
  { timestamp: '', message: 'Escrow module initialized', type: 'success' },
];

export default function TerminalLog({
  entries,
  maxEntries = 12,
  title = 'SYSTEM LOG',
}: TerminalLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { connected, publicKey } = useWallet();
  const [displayedEntries, setDisplayedEntries] = useState<LogEntry[]>([]);
  const [typingIndex, setTypingIndex] = useState(0);

  const shortAddr = publicKey
    ? `${publicKey.toBase58().slice(0, 5)}...${publicKey.toBase58().slice(-4)}`
    : null;

  const walletEntry: LogEntry = connected && shortAddr
    ? { timestamp: '', message: `Wallet connected: ${shortAddr}`, type: 'success' }
    : { timestamp: '', message: 'Waiting for wallet connection...', type: 'warning' };

  const logEntries = entries || [...BOOT_ENTRIES, walletEntry];

  // Re-run boot sequence when wallet connects/disconnects (only for default entries)
  useEffect(() => {
    if (!entries) {
      setDisplayedEntries([]);
      setTypingIndex(0);
    }
  }, [connected]);

  // Generate timestamps
  useEffect(() => {
    if (typingIndex < logEntries.length) {
      const timer = setTimeout(() => {
        const entry = {
          ...logEntries[typingIndex],
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        };
        setDisplayedEntries(prev => [...prev.slice(-(maxEntries - 1)), entry]);
        setTypingIndex(prev => prev + 1);
      }, 600 + Math.random() * 800);
      return () => clearTimeout(timer);
    }
  }, [typingIndex, logEntries, maxEntries]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayedEntries]);

  return (
    <Box
      sx={{
        background: 'rgba(7, 5, 17, 0.9)',
        border: '1px solid rgba(0, 255, 195, 0.15)',
        borderRadius: 2,
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Terminal header */}
      <Box
        sx={{
          px: 2,
          py: 1,
          borderBottom: '1px solid rgba(0, 255, 195, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', gap: 0.75 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ff00ff' }} />
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#e04d01' }} />
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#00ffc3' }} />
        </Box>
        <Typography
          sx={{
            fontFamily: '"Orbitron", monospace',
            fontSize: '0.65rem',
            letterSpacing: '0.1em',
            color: 'rgba(0, 255, 195, 0.5)',
            ml: 1,
          }}
        >
          {title}
        </Typography>
      </Box>

      {/* Terminal body */}
      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          p: 1.5,
          overflow: 'auto',
          fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
          fontSize: '0.75rem',
          lineHeight: 1.6,
        }}
      >
        {displayedEntries.map((entry, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 1, mb: 0.25 }}>
            <Box component="span" sx={{ color: 'rgba(224, 230, 237, 0.3)', minWidth: '70px' }}>
              [{entry.timestamp}]
            </Box>
            <Box
              component="span"
              sx={{
                color: TYPE_COLORS[entry.type],
                minWidth: '36px',
                fontWeight: 600,
              }}
            >
              {TYPE_PREFIXES[entry.type]}
            </Box>
            <Box component="span" sx={{ color: '#e0e6ed' }}>
              {entry.message}
            </Box>
          </Box>
        ))}
        {/* Blinking cursor */}
        <Box
          component="span"
          sx={{
            color: '#00ffc3',
            animation: 'blink 1s step-end infinite',
            '@keyframes blink': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0 },
            },
          }}
        >
          _
        </Box>
      </Box>
    </Box>
  );
}
