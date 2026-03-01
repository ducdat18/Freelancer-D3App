import { Box, Alert, Button } from '@mui/material'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'

interface ErrorMessageProps {
  message: string
  onRetry?: () => void
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        gap: 2,
      }}
    >
      <Alert
        severity="error"
        icon={<ErrorOutlineIcon />}
        sx={{ width: '100%', maxWidth: 500 }}
      >
        {message}
      </Alert>
      {onRetry && (
        <Button variant="outlined" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </Box>
  )
}
