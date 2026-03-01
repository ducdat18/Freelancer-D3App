import { Card, CardContent, Box, Typography, Button, Chip, Avatar } from '@mui/material'
import { Person, Visibility, Description } from '@mui/icons-material'
import { formatDistanceToNow } from 'date-fns'
import RatingStars from '../common/RatingStars'
import IPFSImage from '../common/IPFSImage'

interface BidCardProps {
  bidId: string
  freelancer: {
    address: string
    name?: string
    avatar?: string
    rating: number
    totalReviews: number
    completedJobs: number
  }
  amount: string
  timeline: string
  proposal: string
  portfolioHash?: string
  cvHash?: string
  submittedAt: Date
  isSelected?: boolean
  onSelect?: () => void
  onViewProfile?: () => void
  onViewCV?: () => void
}

export default function BidCard({
  bidId: _bidId,
  freelancer,
  amount,
  timeline: _timeline,
  proposal,
  portfolioHash,
  cvHash,
  submittedAt,
  isSelected = false,
  onSelect,
  onViewProfile,
  onViewCV,
}: BidCardProps) {
  return (
    <Card
      sx={{
        mb: 2,
        border: '2px solid',
        borderColor: isSelected ? 'primary.main' : 'divider',
        position: 'relative',
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: 3,
        },
      }}
    >
      {isSelected && (
        <Chip
          label="Selected"
          color="primary"
          size="small"
          sx={{ position: 'absolute', top: 12, right: 12 }}
        />
      )}

      <CardContent>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Avatar
            src={freelancer.avatar}
            sx={{ width: 60, height: 60, cursor: 'pointer' }}
            onClick={onViewProfile}
          >
            <Person />
          </Avatar>

          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h6"
              sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
              onClick={onViewProfile}
            >
              {freelancer.name || 'Anonymous Freelancer'}
            </Typography>
            <Typography variant="caption" color="text.secondary" fontFamily="monospace">
              {freelancer.address.slice(0, 6)}...{freelancer.address.slice(-4)}
            </Typography>
            <Box sx={{ mt: 1 }}>
              <RatingStars
                rating={freelancer.rating}
                totalReviews={freelancer.totalReviews}
                size="small"
              />
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
              {freelancer.completedJobs} jobs completed
            </Typography>
          </Box>

          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h5" color="primary.main" fontWeight={700}>
              {amount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Bid Amount
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
            Proposal:
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
            {proposal}
          </Typography>
        </Box>

        {portfolioHash && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Portfolio Sample:
            </Typography>
            <IPFSImage
              hash={portfolioHash}
              height={200}
              borderRadius={1}
              showOpenButton
            />
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Submitted {formatDistanceToNow(submittedAt, { addSuffix: true })}
          </Typography>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {cvHash && onViewCV && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<Description />}
                onClick={onViewCV}
              >
                View CV
              </Button>
            )}
            {onViewProfile && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<Visibility />}
                onClick={onViewProfile}
              >
                View Profile
              </Button>
            )}
            {onSelect && !isSelected && (
              <Button
                size="small"
                variant="contained"
                onClick={onSelect}
              >
                Select Freelancer
              </Button>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}
