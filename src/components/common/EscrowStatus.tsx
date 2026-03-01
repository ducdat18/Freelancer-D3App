import { Box, Typography, LinearProgress } from '@mui/material'
import {
  Lock,
  LockOpen,
  CheckCircle,
  Warning,
  HourglassEmpty,
} from '@mui/icons-material'

export type EscrowState = 'awaiting_bids' | 'pending' | 'locked' | 'released' | 'disputed' | 'refunded'

interface EscrowStatusProps {
  status: EscrowState
  amount?: string
  showAmount?: boolean
  size?: 'small' | 'medium' | 'large'
}

const statusConfig = {
  awaiting_bids: {
    label: 'Awaiting Bids',
    color: 'default' as const,
    icon: HourglassEmpty,
    bgcolor: 'rgba(128,132,238,0.08)',
    textColor: '#8084ee',
  },
  pending: {
    label: 'Pending Deposit',
    color: 'warning' as const,
    icon: HourglassEmpty,
    bgcolor: 'rgba(224,77,1,0.08)',
    textColor: '#e04d01',
  },
  locked: {
    label: 'Funds Locked',
    color: 'info' as const,
    icon: Lock,
    bgcolor: 'rgba(0,255,195,0.05)',
    textColor: '#00ffc3',
  },
  released: {
    label: 'Funds Released',
    color: 'success' as const,
    icon: CheckCircle,
    bgcolor: 'rgba(0,255,195,0.08)',
    textColor: '#00ffc3',
  },
  disputed: {
    label: 'In Dispute',
    color: 'error' as const,
    icon: Warning,
    bgcolor: 'rgba(255,0,255,0.08)',
    textColor: '#ff00ff',
  },
  refunded: {
    label: 'Refunded',
    color: 'default' as const,
    icon: LockOpen,
    bgcolor: 'rgba(11,25,42,0.5)',
    textColor: '#a5a8f3',
  },
}

export default function EscrowStatus({
  status,
  amount,
  showAmount = true,
  size = 'medium',
}: EscrowStatusProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  const sizeMap = {
    small: { icon: 16, padding: '4px 8px', fontSize: '0.75rem' },
    medium: { icon: 20, padding: '6px 12px', fontSize: '0.875rem' },
    large: { icon: 24, padding: '8px 16px', fontSize: '1rem' },
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          bgcolor: config.bgcolor,
          color: config.textColor,
          borderRadius: 2,
          padding: sizeMap[size].padding,
          width: 'fit-content',
        }}
      >
        <Icon sx={{ fontSize: sizeMap[size].icon }} />
        <Typography
          variant="body2"
          fontWeight={600}
          sx={{ fontSize: sizeMap[size].fontSize }}
        >
          {config.label}
        </Typography>
      </Box>

      {showAmount && amount && (
        <Typography variant="body2" color="text.secondary">
          Escrow Amount: <strong>{amount}</strong>
        </Typography>
      )}

      {status === 'locked' && (
        <Box sx={{ width: '100%', mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Awaiting job completion and approval
          </Typography>
          <LinearProgress
            variant="indeterminate"
            sx={{
              height: 4,
              borderRadius: 2,
              bgcolor: 'rgba(11,25,42,0.5)',
              '& .MuiLinearProgress-bar': {
                bgcolor: config.textColor,
              },
            }}
          />
        </Box>
      )}
    </Box>
  )
}
