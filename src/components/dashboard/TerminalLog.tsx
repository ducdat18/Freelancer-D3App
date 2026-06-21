import { useState, useEffect, useRef } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  const typeColors: Record<string, string> = {
    info: theme.palette.info.main,
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
  };

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
        background: isDark ? 'rgba(7, 5, 17, 0.9)' : '#ffffff',
        border: `1px solid ${isDark ? 'rgba(0, 255, 195, 0.15)' : 'rgba(0,0,0,0.08)'}`,
        boxShadow: isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.03)',
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
          borderBottom: `1px solid ${isDark ? 'rgba(0, 255, 195, 0.1)' : 'rgba(0,0,0,0.08)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          bgcolor: isDark ? 'transparent' : '#f8fafc',
        }}
      >
        <Box sx={{ display: 'flex', gap: 0.75 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: theme.palette.error.main }} />
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: theme.palette.warning.main }} />
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: theme.palette.success.main }} />
        </Box>
        <Typography
          sx={{
            fontFamily: '"Orbitron", monospace',
            fontSize: '0.65rem',
            letterSpacing: '0.1em',
            color: isDark ? 'rgba(0, 255, 195, 0.5)' : theme.palette.text.secondary,
            ml: 1,
            fontWeight: 600,
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
            <Box component="span" sx={{ color: isDark ? 'rgba(224, 230, 237, 0.3)' : 'rgba(15, 23, 42, 0.4)', minWidth: '70px' }}>
              [{entry.timestamp}]
            </Box>
            <Box
              component="span"
              sx={{
                color: typeColors[entry.type],
                minWidth: '36px',
                fontWeight: 600,
              }}
            >
              {TYPE_PREFIXES[entry.type]}
            </Box>
            <Box component="span" sx={{ color: isDark ? '#e0e6ed' : '#334155' }}>
              {entry.message}
            </Box>
          </Box>
        ))}
        {/* Blinking cursor */}
        <Box
          component="span"
          sx={{
            color: theme.palette.primary.main,
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
