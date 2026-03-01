import { useState } from 'react'
import { Card, CardContent, Box, Typography, Chip, Button, Divider, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, ImageList, ImageListItem, Alert } from '@mui/material'
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
        border: '1px solid', 
        borderColor: 'divider',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardContent sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              {jobTitle}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Dispute ID: #{disputeId} • Job ID: #{jobId}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip
              label={statusConfig[status].label}
              color={statusConfig[status].color}
              size="small"
              icon={<Warning />}
            />
            {status !== 'resolved' && (
              <Chip
                label={`${votesFor + votesAgainst}/2 votes`}
                size="small"
                sx={{
                  bgcolor: 'rgba(0,255,195,0.08)',
                  color: '#00ffc3',
                  fontWeight: 600,
                  border: '1px solid rgba(0,255,195,0.3)',
                }}
              />
            )}
          </Box>
        </Box>

        {reason && (
          <Box 
            sx={{ 
              mb: 2, 
              p: 2.5, 
              background: 'linear-gradient(135deg, rgba(255, 0, 255, 0.1) 0%, rgba(255, 0, 255, 0.15) 100%)',
              borderLeft: '4px solid #ff00ff',
              borderRadius: 2,
              border: '1px solid rgba(255, 0, 255, 0.3)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Typography 
              variant="subtitle2" 
              fontWeight={700}
              sx={{ 
                color: '#ff00ff',
                mb: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                fontSize: '0.95rem'
              }}
            >
              <Warning fontSize="small" />
              Dispute Reason
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.85)',
                fontStyle: 'italic',
                lineHeight: 1.6
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
              p: 2.5, 
              background: 'linear-gradient(135deg, rgba(0,255,195,0.1) 0%, rgba(0,255,195,0.15) 100%)',
              border: '1px solid rgba(0,255,195,0.3)',
              borderRadius: 2,
              backdropFilter: 'blur(10px)',
            }}
          >
            <Typography
              variant="subtitle2"
              fontWeight={700}
              sx={{
                color: '#00ffc3',
                mb: 1.5,
                fontSize: '0.95rem'
              }}
            >
              📦 Submitted Work (Review Required)
            </Typography>
            {workSubmittedAt && (
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.6)',
                  display: 'block',
                  mb: 1.5
                }}
              >
                Submitted: {workSubmittedAt.toLocaleString()}
              </Typography>
            )}
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                size="medium"
                variant="contained"
                startIcon={<Visibility />}
                onClick={() => setDeliverableModalOpen(true)}
                sx={{
                  background: 'linear-gradient(135deg, #00ffc3 0%, #00dba6 100%)',
                  color: '#0b192a',
                  fontWeight: 600,
                  borderRadius: 2,
                  textTransform: 'none',
                  boxShadow: '0 4px 12px rgba(0,255,195,0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #00dba6 0%, #00b88a 100%)',
                    boxShadow: '0 6px 16px rgba(0,255,195,0.4)',
                  }
                }}
              >
                View Deliverable
              </Button>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1,
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                IPFS: {deliverableUri.slice(0, 8)}...{deliverableUri.slice(-6)}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Evidence Gallery */}
        {evidenceUris.length > 0 && (
          <Box
            sx={{
              mb: 2,
              p: 2.5,
              background: 'linear-gradient(135deg, rgba(224,77,1,0.1) 0%, rgba(224,77,1,0.15) 100%)',
              borderRadius: 2,
              border: '1px solid rgba(224,77,1,0.3)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ImageIcon sx={{ color: '#e04d01' }} />
              <Typography
                variant="subtitle2"
                fontWeight={700}
                sx={{
                  color: '#e04d01',
                  fontSize: '0.95rem',
                }}
              >
                📎 Evidence ({evidenceUris.length})
              </Typography>
            </Box>
            <ImageList 
              sx={{ 
                width: '100%', 
                height: 'auto',
                maxHeight: 280,
                gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr)) !important',
              }} 
              gap={8}
            >
              {evidenceUris.map((uri, index) => {
                const ipfsUrl = getIPFSUrl(uri)
                return (
                  <ImageListItem 
                    key={index}
                    sx={{
                      cursor: 'pointer',
                      borderRadius: 1,
                      overflow: 'hidden',
                      border: '1px solid rgba(224,77,1,0.3)',
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: 'scale(1.05)',
                        boxShadow: '0 4px 12px rgba(224,77,1,0.4)',
                      }
                    }}
                    onClick={() => window.open(ipfsUrl, '_blank')}
                  >
                    <img
                      src={ipfsUrl}
                      alt={`Evidence ${index + 1}`}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '110px',
                        objectFit: 'cover',
                      }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent && parent.querySelector('div') === null) {
                          const fallback = document.createElement('div')
                          fallback.style.cssText = 'width:100%;height:110px;display:flex;align-items:center;justify-content:center;background:rgba(224,77,1,0.1);color:#e04d01;font-size:40px;'
                          fallback.innerHTML = '📄'
                          parent.appendChild(fallback)
                        }
                      }}
                    />
                  </ImageListItem>
                )
              })}
            </ImageList>
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.6)',
                display: 'block',
                mt: 1
              }}
            >
              Click on any evidence to view full size
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                Client
              </Typography>
            </Box>
            <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
              {client.slice(0, 6)}...{client.slice(-4)}
            </Typography>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                Freelancer
              </Typography>
            </Box>
            <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
              {freelancer.slice(0, 6)}...{freelancer.slice(-4)}
            </Typography>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <AccountBalance sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                Amount
              </Typography>
            </Box>
            <Typography variant="body2" fontWeight={600}>
              {amount}
            </Typography>
          </Box>
        </Box>

        {/* Vote counter hidden to prevent voting bias */}
        {false && (status === 'voting' || status === 'open') && totalVotes > 0 && (
          <>
            <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.08)' }} />
            <Box 
              sx={{ 
                mb: 2,
                p: 2.5,
                background: 'linear-gradient(135deg, rgba(0,255,195,0.08) 0%, rgba(0,255,195,0.12) 100%)',
                borderRadius: 2,
                border: '1px solid rgba(0,255,195,0.2)',
              }}
            >
              <Typography 
                variant="subtitle2" 
                fontWeight={700} 
                gutterBottom 
                sx={{ 
                  color: '#00ffc3',
                  fontSize: '1rem',
                  mb: 2
                }}
              >
                📊 Current Votes: {totalVotes} / 2 needed
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography 
                  variant="body2" 
                  fontWeight={600} 
                  sx={{ color: '#00ffc3' }}
                >
                  Client: {votesFor} ({votePercentage.toFixed(1)}%)
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  sx={{ color: '#ff00ff' }}
                >
                  Freelancer: {votesAgainst} ({(100 - votePercentage).toFixed(1)}%)
                </Typography>
              </Box>
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: 16,
                  bgcolor: 'rgba(255,0,255,0.15)',
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${votePercentage}%`,
                    background: 'linear-gradient(90deg, #00ffc3 0%, #00dba6 100%)',
                    transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 0 10px rgba(0,255,195,0.5)',
                  }}
                />
              </Box>
            </Box>
          </>
        )}

        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Opened {formatDistanceToNow(openedAt, { addSuffix: true })}
            </Typography>
            {onViewDetails && (
              <Button size="small" variant="outlined" onClick={onViewDetails}>
                View Job Details
              </Button>
            )}
          </Box>

          {/* RESOLUTION RESULT */}
          {status === 'resolved' && winner && (
            <Box
              sx={{
                mt: 2,
                p: 3,
                background: winner === 'Client'
                  ? 'linear-gradient(135deg, rgba(0,255,195,0.15) 0%, rgba(0,255,195,0.2) 100%)'
                  : 'linear-gradient(135deg, rgba(255,0,255,0.15) 0%, rgba(255,0,255,0.2) 100%)',
                borderRadius: 2,
                border: '2px solid',
                borderColor: winner === 'Client' ? 'rgba(0,255,195,0.5)' : 'rgba(255,0,255,0.5)',
                boxShadow: winner === 'Client'
                  ? '0 4px 24px rgba(0,255,195,0.3)'
                  : '0 4px 24px rgba(255,0,255,0.3)',
              }}
            >
              <Typography
                variant="h6"
                fontWeight={700}
                sx={{
                  color: winner === 'Client' ? '#00ffc3' : '#ff00ff',
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  fontSize: '1.2rem'
                }}
              >
                🏆 Dispute Resolved - Winner: {winner}
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    textAlign: 'center',
                    mb: 2,
                    fontSize: '0.95rem'
                  }}
                >
                  Final Vote Result: {votesFor} votes for Client vs {votesAgainst} votes for Freelancer
                </Typography>
              </Box>

              <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

              <Box
                sx={{
                  p: 2.5,
                  background: 'rgba(0,255,195,0.08)',
                  borderRadius: 2,
                  border: '1px solid rgba(0,255,195,0.3)',
                }}
              >
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  sx={{
                    color: '#00ffc3',
                    mb: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  💰 Payment Distribution
                </Typography>
                <Box sx={{ pl: 2 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                    ✅ Escrow funds released to <strong>{winner}</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                    ✅ Arbitrator fees (2% each) available for claim
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    ✅ Dispute closed on blockchain
                  </Typography>
                </Box>
              </Box>

              {userVote && (
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    background: 'rgba(0,255,195,0.08)',
                    borderRadius: 2,
                    border: '1px solid rgba(0,255,195,0.2)',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.6)',
                      display: 'block',
                      textAlign: 'center',
                      fontStyle: 'italic'
                    }}
                  >
                    Your vote: {userVote === 'client' ? 'Client' : 'Freelancer'}
                    {userVote === winner.toLowerCase() ? ' ✅ (Winning side)' : ' (Other side)'}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* MANUAL RESOLVE - For old disputes that need manual resolution */}
          {status !== 'resolved' && (votesFor + votesAgainst) >= 2 && onViewDetails && (
            <Box sx={{ mt: 2 }}>
              <Alert 
                severity="warning"
                icon={<Warning />}
                sx={{
                  background: 'linear-gradient(135deg, rgba(224,77,1,0.1) 0%, rgba(224,77,1,0.15) 100%)',
                  border: '1px solid rgba(224,77,1,0.3)',
                  mb: 2,
                }}
              >
                <Typography variant="body2" fontWeight={600} color="#e04d01">
                  ⚠️ 2 votes reached! This dispute needs manual resolution.
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  This is an old dispute created before auto-resolve was enabled.
                </Typography>
              </Alert>
              
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={onViewDetails}
                sx={{
                  background: 'linear-gradient(135deg, #e04d01 0%, #ff7033 100%)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  py: 1.5,
                  fontSize: '1rem',
                  textTransform: 'none',
                  boxShadow: '0 4px 16px rgba(224,77,1,0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #ff7033 0%, #e04d01 100%)',
                    boxShadow: '0 6px 24px rgba(224,77,1,0.5)',
                    transform: 'translateY(-2px)',
                  }
                }}
              >
                🏆 Resolve Dispute Manually ({votesFor > votesAgainst ? 'Client Wins' : 'Freelancer Wins'})
              </Button>
            </Box>
          )}

          {/* USER VOTE INDICATOR */}
          {userVote && status !== 'resolved' && (
            <Alert severity="success" sx={{ mt: 2 }}>
              ✅ You voted for: <strong>{userVote === 'client' ? 'Client' : 'Freelancer'}</strong>
            </Alert>
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
                py: 1.5,
                background: 'linear-gradient(135deg, #00ffc3 0%, #00dba6 100%)',
                color: '#0b192a',
                '&:hover': {
                  background: 'linear-gradient(135deg, #00dba6 0%, #00b88a 100%)',
                },
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
            <Typography variant="h6">📦 Submitted Deliverable</Typography>
            <IconButton onClick={() => setDeliverableModalOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {deliverableUri && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                IPFS Hash: {deliverableUri}
              </Typography>
              {workSubmittedAt && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Submitted: {workSubmittedAt.toLocaleString()}
                </Typography>
              )}
              <Divider sx={{ my: 2 }} />
              <Box
                sx={{
                  width: '100%',
                  minHeight: '400px',
                  bgcolor: 'rgba(11,25,42,0.5)',
                  borderRadius: 1,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={`https://ipfs.io/ipfs/${deliverableUri}`}
                  alt="Deliverable"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '600px',
                    objectFit: 'contain',
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div style="padding: 40px; text-align: center;">
                          <p style="font-size: 16px; margin-bottom: 10px;">📄 Preview not available</p>
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
          >
            Open in New Tab
          </Button>
          <Button variant="contained" onClick={() => setDeliverableModalOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}
