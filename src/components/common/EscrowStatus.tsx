import { Box, Typography, LinearProgress, useTheme } from '@mui/material'
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

export default function EscrowStatus({
  status,
  amount,
  showAmount = true,
  size = 'medium',
}: EscrowStatusProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const statusConfig = {
    awaiting_bids: {
      label: 'Awaiting Bids',
      icon: HourglassEmpty,
      bgcolor: isDark ? 'rgba(128,132,238,0.08)' : 'rgba(99,102,241,0.08)',
      textColor: theme.palette.info.main,
    },
    pending: {
      label: 'Pending Deposit',
      icon: HourglassEmpty,
      bgcolor: isDark ? 'rgba(224,77,1,0.08)' : 'rgba(224,77,1,0.05)',
      textColor: theme.palette.warning.main,
    },
    locked: {
      label: 'Funds Locked',
      icon: Lock,
      bgcolor: isDark ? 'rgba(0,255,195,0.05)' : 'rgba(0,166,128,0.05)',
      textColor: theme.palette.primary.main,
    },
    released: {
      label: 'Funds Released',
      icon: CheckCircle,
      bgcolor: isDark ? 'rgba(0,255,195,0.08)' : 'rgba(0,166,128,0.08)',
      textColor: theme.palette.success.main,
    },
    disputed: {
      label: 'In Dispute',
      icon: Warning,
      bgcolor: isDark ? 'rgba(255,0,255,0.08)' : 'rgba(255,0,255,0.05)',
      textColor: theme.palette.error.main,
    },
    refunded: {
      label: 'Refunded',
      icon: LockOpen,
      bgcolor: isDark ? 'rgba(11,25,42,0.5)' : 'rgba(0,0,0,0.05)',
      textColor: theme.palette.text.secondary,
    },
  }

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
          border: 1,
          borderColor: isDark ? 'transparent' : `${config.textColor}30`,
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
              bgcolor: isDark ? 'rgba(11,25,42,0.5)' : 'rgba(0,0,0,0.05)',
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
