import type { ReactNode } from 'react'
import { Box, Typography, Button } from '@mui/material'
import InboxIcon from '@mui/icons-material/Inbox'

interface EmptyStateProps {
  title: string
  description?: string
  message?: string // Alias for description
  actionLabel?: string
  onAction?: () => void
  action?: ReactNode // Custom action element
}

export default function EmptyState({ title, description, message, actionLabel, onAction, action }: EmptyStateProps) {
  const displayDescription = description || message
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px',
        textAlign: 'center',
        gap: 2,
      }}
    >
      <InboxIcon sx={{ fontSize: 80, color: 'text.secondary', opacity: 0.5 }} />
      <Typography variant="h6" color="text.secondary">
        {title}
      </Typography>
      {displayDescription && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
          {displayDescription}
        </Typography>
      )}
      {action || (actionLabel && onAction && (
        <Button variant="contained" onClick={onAction} sx={{ mt: 2 }}>
          {actionLabel}
        </Button>
      ))}
    </Box>
  )
}
