import { Star, StarBorder } from '@mui/icons-material'
import { Box, Rating as MuiRating, Typography } from '@mui/material'

interface RatingStarsProps {
  rating: number
  totalReviews?: number
  size?: 'small' | 'medium' | 'large'
  readonly?: boolean
  showNumber?: boolean
  onChange?: (value: number) => void
}

export default function RatingStars({
  rating,
  totalReviews,
  size = 'medium',
  readonly = true,
  showNumber = true,
  onChange,
}: RatingStarsProps) {
  const sizeMap = {
    small: 16,
    medium: 24,
    large: 32,
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <MuiRating
        value={rating}
        readOnly={readonly}
        precision={0.5}
        size={size}
        icon={<Star fontSize="inherit" />}
        emptyIcon={<StarBorder fontSize="inherit" />}
        onChange={(_, newValue) => {
          if (onChange && newValue !== null) {
            onChange(newValue)
          }
        }}
        sx={{
          fontSize: sizeMap[size],
          '& .MuiRating-iconFilled': {
            color: '#ffc107',
          },
          '& .MuiRating-iconHover': {
            color: '#ffb300',
          },
        }}
      />
      {showNumber && (
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
          <Typography variant="body2" fontWeight={600}>
            {rating.toFixed(1)}
          </Typography>
          {totalReviews !== undefined && (
            <Typography variant="caption" color="text.secondary">
              ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
            </Typography>
          )}
        </Box>
      )}
    </Box>
  )
}
