/**
 * RateClientDialog — shown to the freelancer after a job is completed.
 * Lets the freelancer rate and review the client.
 */
import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material'
import { Star } from '@mui/icons-material'
import RatingStars from '../../common/RatingStars'

interface RateClientDialogProps {
  open: boolean
  onClose: () => void
  clientAddress: string
  jobTitle: string
  onSubmit: (rating: number, review: string) => Promise<void>
  loading?: boolean
}

export default function RateClientDialog({
  open,
  onClose,
  clientAddress,
  jobTitle,
  onSubmit,
  loading = false,
}: RateClientDialogProps) {
  const [rating, setRating] = useState(5)
  const [review, setReview] = useState('')
  const [error, setError] = useState('')

  const shortAddr = `${clientAddress.slice(0, 6)}...${clientAddress.slice(-4)}`

  const handleSubmit = async () => {
    if (rating === 0) { setError('Please select a rating'); return }
    if (review.trim().length < 10) { setError('Review must be at least 10 characters'); return }
    try {
      setError('')
      await onSubmit(rating, review.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review')
    }
  }

  const handleClose = () => {
    if (loading) return
    setRating(5)
    setReview('')
    setError('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Star sx={{ color: '#ffc107' }} />
          <Typography variant="h6" fontWeight={700}>Rate this Client</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity="success" sx={{ mb: 3 }}>
          Job <strong>&quot;{jobTitle}&quot;</strong> is complete! Share your experience working with client{' '}
          <strong>{shortAddr}</strong>.
        </Alert>

        <Typography variant="caption" fontWeight={700} color="text.secondary" letterSpacing={1}>
          YOUR RATING
        </Typography>
        <Box sx={{ mt: 1, mb: 3 }}>
          <RatingStars
            rating={rating}
            readonly={false}
            showNumber={false}
            size="large"
            onChange={setRating}
          />
        </Box>

        <Typography variant="caption" fontWeight={700} color="text.secondary" letterSpacing={1}>
          YOUR REVIEW
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={4}
          value={review}
          onChange={e => setReview(e.target.value)}
          placeholder="Describe your experience — communication, clarity of requirements, payment promptness..."
          helperText={`${review.length} characters (min 10)`}
          error={review.length > 0 && review.length < 10}
          disabled={loading}
          sx={{ mt: 1 }}
          inputProps={{ maxLength: 600 }}
        />

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>

      <DialogActions sx={{ p: 2.5 }}>
        <Button onClick={handleClose} disabled={loading}>
          Skip for now
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || rating === 0 || review.trim().length < 10}
          startIcon={loading ? <CircularProgress size={16} /> : <Star />}
        >
          {loading ? 'Submitting...' : 'Submit Review'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
