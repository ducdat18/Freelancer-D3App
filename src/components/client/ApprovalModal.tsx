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
  Divider,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material'
import { CheckCircle, Download } from '@mui/icons-material'
import RatingStars from '../common/RatingStars'
import IPFSImage from '../common/IPFSImage'
import EscrowStatus from '../common/EscrowStatus'

interface ApprovalModalProps {
  open: boolean
  onClose: () => void
  job: {
    id: string
    title: string
    amount: string
    freelancer: {
      address: string
      name?: string
    }
    deliverables?: {
      hash: string
      description: string
      submittedAt: Date
    }[]
  }
  onApprove: (rating: number, review: string) => Promise<void>
  loading?: boolean
}

export default function ApprovalModal({
  open,
  onClose,
  job,
  onApprove,
  loading = false,
}: ApprovalModalProps) {
  const [rating, setRating] = useState(5)
  const [review, setReview] = useState('')
  const [error, setError] = useState('')

  const handleApprove = async () => {
    if (rating === 0) {
      setError('Please provide a rating')
      return
    }

    if (review.trim().length < 10) {
      setError('Review must be at least 10 characters')
      return
    }

    try {
      await onApprove(rating, review)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve job')
    }
  }

  const handleClose = () => {
    if (!loading) {
      setRating(5)
      setReview('')
      setError('')
      onClose()
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { maxHeight: '90vh' },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircle color="success" />
          <Typography variant="h6">Approve Work & Release Payment</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          By approving this job, the escrow funds will be automatically released to the freelancer.
          This action cannot be undone.
        </Alert>

        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Job Details
          </Typography>
          <Typography variant="h6" gutterBottom>
            {job.title}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Freelancer: <strong>{job.freelancer.name || job.freelancer.address}</strong>
            </Typography>
            <Typography variant="h6" color="primary.main">
              {job.amount}
            </Typography>
          </Box>
          <EscrowStatus status="locked" amount={job.amount} />
        </Paper>

        {job.deliverables && job.deliverables.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Submitted Deliverables ({job.deliverables.length})
            </Typography>
            {job.deliverables.map((deliverable, index) => (
              <Paper key={index} variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                  <Typography variant="body2">{deliverable.description}</Typography>
                  <Button
                    size="small"
                    startIcon={<Download />}
                    href={`https://ipfs.io/ipfs/${deliverable.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download
                  </Button>
                </Box>
                <IPFSImage hash={deliverable.hash} height={200} borderRadius={1} showOpenButton />
              </Paper>
            ))}
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" gutterBottom fontWeight={600}>
          Rate & Review Freelancer
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Rating *
          </Typography>
          <RatingStars
            rating={rating}
            readonly={false}
            showNumber={false}
            size="large"
            onChange={setRating}
          />
        </Box>

        <TextField
          fullWidth
          label="Review *"
          multiline
          rows={4}
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="Share your experience working with this freelancer..."
          helperText={`${review.length} characters (minimum 10 required)`}
          error={review.length > 0 && review.length < 10}
          disabled={loading}
        />

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleApprove}
          disabled={loading || rating === 0 || review.trim().length < 10}
          startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
        >
          {loading ? 'Approving...' : 'Approve & Release Payment'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
