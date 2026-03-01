import { useState } from 'react'
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material'
import { ViewList, ViewModule, SortByAlpha, AttachMoney, Grade } from '@mui/icons-material'
import BidCard from './BidCard'
import EmptyState from '../EmptyState'
import LoadingSpinner from '../LoadingSpinner'

interface Bid {
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
  submittedAt: Date
  isSelected?: boolean
}

interface BidsListProps {
  bids: Bid[]
  loading?: boolean
  onSelectBid?: (bidId: string) => void
  onViewProfile?: (address: string) => void
}

type SortOption = 'recent' | 'amount-low' | 'amount-high' | 'rating'

export default function BidsList({
  bids,
  loading = false,
  onSelectBid,
  onViewProfile,
}: BidsListProps) {
  const [sortBy, setSortBy] = useState<SortOption>('recent')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  const sortedBids = [...bids].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return b.submittedAt.getTime() - a.submittedAt.getTime()
      case 'amount-low':
        return parseFloat(a.amount) - parseFloat(b.amount)
      case 'amount-high':
        return parseFloat(b.amount) - parseFloat(a.amount)
      case 'rating':
        return b.freelancer.rating - a.freelancer.rating
      default:
        return 0
    }
  })

  if (loading) {
    return <LoadingSpinner message="Loading bids..." />
  }

  if (bids.length === 0) {
    return (
      <EmptyState
        title="No bids yet"
        message="No freelancers have submitted bids for this job. Check back later!"
      />
    )
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Typography variant="h6">
          {bids.length} {bids.length === 1 ? 'Bid' : 'Bids'} Received
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              label="Sort By"
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <MenuItem value="recent">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SortByAlpha fontSize="small" />
                  Most Recent
                </Box>
              </MenuItem>
              <MenuItem value="amount-low">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AttachMoney fontSize="small" />
                  Lowest Price
                </Box>
              </MenuItem>
              <MenuItem value="amount-high">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AttachMoney fontSize="small" />
                  Highest Price
                </Box>
              </MenuItem>
              <MenuItem value="rating">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Grade fontSize="small" />
                  Highest Rating
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newMode) => {
              if (newMode !== null) setViewMode(newMode)
            }}
            size="small"
          >
            <ToggleButton value="list">
              <ViewList />
            </ToggleButton>
            <ToggleButton value="grid">
              <ViewModule />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      <Box
        sx={{
          display: viewMode === 'grid' ? 'grid' : 'block',
          gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
          gap: 2,
        }}
      >
        {sortedBids.map((bid) => (
          <BidCard
            key={bid.bidId}
            {...bid}
            onSelect={() => onSelectBid?.(bid.bidId)}
            onViewProfile={() => onViewProfile?.(bid.freelancer.address)}
          />
        ))}
      </Box>
    </Box>
  )
}
