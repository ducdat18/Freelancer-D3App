import { useState } from 'react'
import { Card, CardContent, Box, Typography, Chip, Button, Divider, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, ImageList, ImageListItem, Alert, useTheme, alpha } from '@mui/material'
import { Gavel, Person, AccountBalance, Warning, Close, Visibility, Image as ImageIcon } from '@mui/icons-material'
import { formatDistanceToNow } from 'date-fns'
import { getIPFSUrl } from '@/services/ipfs'

export type DisputeStatus = 'open' | 'voting' | 'resolved'

interface DisputeCardProps {
  disputeId: string
  jobId: string
  jobTitle: string
  client: string
  freelancer: string
  amount: string
  status: DisputeStatus
  openedAt: Date
  reason?: string
  votesFor?: number
  votesAgainst?: number
  onViewDetails?: () => void
  userVote?: 'client' | 'freelancer'
  deliverableUri?: string
  workSubmittedAt?: Date
  evidenceUris?: string[]
}

export default function DisputeCard({
  disputeId,
  jobId,
  jobTitle,
  client,
  freelancer,
  amount,
  status,
  openedAt,
  reason,
  votesFor = 0,
  votesAgainst = 0,
  onViewDetails,
  userVote,
  deliverableUri,
  workSubmittedAt,
  evidenceUris = [],
}: DisputeCardProps) {
  const [deliverableModalOpen, setDeliverableModalOpen] = useState(false)
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const primaryMain = theme.palette.primary.main
  const secondaryMain = theme.palette.secondary.main
  const errorMain = theme.palette.error.main
  const warningMain = theme.palette.warning.main

  const statusConfig = {
    open: { label: 'Open', color: 'warning' as const },
    voting: { label: 'Voting in Progress', color: 'info' as const },
    resolved: { label: 'Resolved', color: 'success' as const },
  }

  const winner = status === 'resolved' 
    ? (votesFor > votesAgainst ? 'Client' : 'Freelancer')
    : null

  const totalVotes = votesFor + votesAgainst
  const votePercentage = totalVotes > 0 ? (votesFor / totalVotes) * 100 : 50

  return (
    <Card 
      sx={{ 
        border: 1, 
        borderColor: 'divider',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: isDark ? `${primaryMain}40` : `${primaryMain}60`,
          boxShadow: isDark ? `0 0 20px ${primaryMain}10` : '0 4px 12px rgba(0,0,0,0.05)',
        }
      }}
    >
      <CardContent sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ fontSize: '1rem' }}>
              {jobTitle}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              DISPUTE ID: #{disputeId.slice(0, 8)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip
              label={statusConfig[status].label}
              color={statusConfig[status].color}
              size="small"
              sx={{ fontWeight: 700, fontSize: '0.65rem' }}
            />
          </Box>
        </Box>

        {reason && (
          <Box 
            sx={{ 
              mb: 2, 
              p: 2, 
              background: isDark 
                ? `linear-gradient(135deg, ${errorMain}15 0%, ${errorMain}05 100%)`
                : `linear-gradient(135deg, ${errorMain}08 0%, ${errorMain}03 100%)`,
              borderLeft: `4px solid ${errorMain}`,
              borderRadius: 1,
              border: 1,
              borderColor: `${errorMain}30`,
            }}
          >
            <Typography 
              variant="subtitle2" 
              fontWeight={700}
              sx={{ 
                color: errorMain,
                mb: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                fontSize: '0.85rem'
              }}
            >
              <Warning fontSize="small" />
              DISPUTE REASON
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'text.primary',
                fontStyle: 'italic',
                lineHeight: 1.6,
                fontSize: '0.82rem'
              }}
            >
              "{reason}"
            </Typography>
          </Box>
        )}

        {deliverableUri && (
          <Box 
            sx={{ 
              mb: 2, 
              p: 2, 
              background: isDark
                ? `linear-gradient(135deg, ${primaryMain}10 0%, ${primaryMain}05 100%)`
                : `linear-gradient(135deg, ${primaryMain}05 0%, ${primaryMain}02 100%)`,
              border: 1,
              borderColor: `${primaryMain}20`,
              borderRadius: 1,
            }}
          >
            <Typography
              variant="subtitle2"
              fontWeight={700}
              sx={{
                color: primaryMain,
                mb: 1,
                fontSize: '0.85rem'
              }}
            >
              📦 SUBMITTED WORK
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Visibility />}
                onClick={() => setDeliverableModalOpen(true)}
                sx={{
                  borderColor: primaryMain,
                  color: primaryMain,
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  '&:hover': {
                    bgcolor: `${primaryMain}10`,
                    borderColor: primaryMain,
                  }
                }}
              >
                View Deliverable
              </Button>
            </Box>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 3, mb: 2, mt: 3 }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Person sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ letterSpacing: 0.5 }}>
                CLIENT
              </Typography>
            </Box>
            <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem" fontWeight={600}>
              {client.slice(0, 4)}...{client.slice(-4)}
            </Typography>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Person sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ letterSpacing: 0.5 }}>
                FREELANCER
              </Typography>
            </Box>
            <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem" fontWeight={600}>
              {freelancer.slice(0, 4)}...{freelancer.slice(-4)}
            </Typography>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <AccountBalance sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ letterSpacing: 0.5 }}>
                AMOUNT
              </Typography>
            </Box>
            <Typography variant="body2" fontWeight={700} color="primary.main">
              {amount}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              Opened {formatDistanceToNow(openedAt, { addSuffix: true })}
            </Typography>
          </Box>

          {/* RESOLUTION RESULT */}
          {status === 'resolved' && winner && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                background: winner === 'Client'
                  ? (isDark ? `linear-gradient(135deg, ${primaryMain}20 0%, ${primaryMain}05 100%)` : `linear-gradient(135deg, ${primaryMain}10 0%, ${primaryMain}05 100%)`)
                  : (isDark ? `linear-gradient(135deg, ${errorMain}20 0%, ${errorMain}05 100%)` : `linear-gradient(135deg, ${errorMain}10 0%, ${errorMain}05 100%)`),
                borderRadius: 1.5,
                border: 1,
                borderColor: winner === 'Client' ? `${primaryMain}40` : `${errorMain}40`,
              }}
            >
              <Typography
                variant="subtitle2"
                fontWeight={800}
                sx={{
                  color: winner === 'Client' ? primaryMain : errorMain,
                  mb: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  fontSize: '0.9rem',
                  textTransform: 'uppercase',
                  letterSpacing: 1
                }}
              >
                🏆 Resolved: {winner} Wins
              </Typography>

              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  textAlign: 'center',
                  display: 'block',
                  mb: 1.5,
                  fontWeight: 600
                }}
              >
                Result: {votesFor} vs {votesAgainst} votes
              </Typography>

              <Divider sx={{ my: 1.5, borderColor: 'divider' }} />

              <Box sx={{ pl: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.primary', mb: 0.5, display: 'block', fontWeight: 600 }}>
                  ✅ Escrow released to <strong>{winner}</strong>
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.primary', display: 'block', fontWeight: 600 }}>
                  ✅ Dispute closed on blockchain
                </Typography>
              </Box>
            </Box>
          )}

          {/* Call to Action */}
          {onViewDetails && (
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={onViewDetails}
              sx={{
                mt: 2,
                py: 1.25,
                fontWeight: 700,
                fontSize: '0.85rem',
                boxShadow: isDark ? `0 4px 12px ${primaryMain}30` : 'none',
              }}
            >
              {status === 'resolved' ? 'View Resolution' : 'View Details & Vote'}
            </Button>
          )}
        </Box>
      </CardContent>

      {/* Deliverable Preview Modal */}
      <Dialog
        open={deliverableModalOpen}
        onClose={() => setDeliverableModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={700}>📦 Submitted Deliverable</Typography>
            <IconButton onClick={() => setDeliverableModalOpen(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers={!isDark}>
          {deliverableUri && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                IPFS Hash: {deliverableUri}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box
                sx={{
                  width: '100%',
                  minHeight: '300px',
                  bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'grey.100',
                  borderRadius: 1,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                <img
                  src={`https://ipfs.io/ipfs/${deliverableUri}`}
                  alt="Deliverable"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '500px',
                    objectFit: 'contain',
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div style="padding: 40px; text-align: center;">
                          <p style="font-size: 16px; margin-bottom: 10px; font-weight: 600;">📄 Preview not available</p>
                          <p style="font-size: 14px; color: #666;">This file type cannot be previewed in the browser.</p>
                        </div>
                      `;
                    }
                  }}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="outlined"
            href={`https://ipfs.io/ipfs/${deliverableUri}`}
            target="_blank"
            rel="noopener noreferrer"
            size="small"
          >
            Open in New Tab
          </Button>
          <Button variant="contained" onClick={() => setDeliverableModalOpen(false)} size="small">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}
