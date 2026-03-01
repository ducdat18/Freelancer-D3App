import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Divider,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Link as MuiLink,
} from '@mui/material';
import LoadingSpinner from '../LoadingSpinner';
import {
  Person,
  CheckCircle,
  Cancel,
  Close,
  Visibility,
  Chat,
  Lock,
  Warning,
  EmojiEvents,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useOptimizedJobBids, getBidStatusText, getBidStatusColor, type BidWithDetails } from '../../hooks/useOptimizedBids';
import { SolanaIconSimple } from '../SolanaIcon';
import { useWallet } from '@solana/wallet-adapter-react';
import type { PublicKey } from '../../types/solana';
import Link from 'next/link';
import CVViewer from '../CVViewer';
import { getCleanProposal } from '../../utils/cvUtils';
import { rankBids, SCORE_COLORS, getScoreLevel } from '../../utils/bidScore';
import ChatDialog from '../chat/ChatDialog';
import { useCompositeTransactions } from '../../hooks/useCompositeTransactions';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { NotificationType } from '../../types';

interface BidsListProps {
  jobPda: PublicKey;
  clientAddress: string; // Job owner's address
  jobBudgetSol?: number;
  jobTitle?: string;
  onBidAccepted?: () => void;
}

export default function BidsList({ jobPda, clientAddress, jobBudgetSol = 0, jobTitle, onBidAccepted }: BidsListProps) {
  const { publicKey } = useWallet();
  const { addNotification } = useNotificationContext();
  // ✅ PERFORMANCE: Use optimized hook with React Query caching
  const { bids, loading, error, refetch } = useOptimizedJobBids(jobPda);

  // ✅ NEW: Use composite transaction hook (Fixes Issue C)
  const { 
    acceptBidWithDeposit, 
    checkSufficientBalance, 
    estimateTransactionFee 
  } = useCompositeTransactions();

  const [selectedBid, setSelectedBid] = useState<BidWithDetails | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [balanceCheck, setBalanceCheck] = useState<{
    sufficient: boolean;
    balance: number;
    required: number;
  } | null>(null);
  const [estimatedFee, setEstimatedFee] = useState<number>(0.01);
  const [cvViewerOpen, setCvViewerOpen] = useState(false);
  const [selectedCVHash, setSelectedCVHash] = useState<string>('');
  const [selectedFreelancer, setSelectedFreelancer] = useState<string>('');
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [chatRecipient, setChatRecipient] = useState<string>('');

  // ✅ FIXED: Move useEffect BEFORE early return to comply with Rules of Hooks
  useEffect(() => {
    if (selectedBid) {
      const checkBalance = async () => {
        const result = await checkSufficientBalance(selectedBid.budgetInSol);
        setBalanceCheck(result);
      };
      const getFee = async () => {
        const fee = await estimateTransactionFee();
        setEstimatedFee(fee);
      };
      checkBalance();
      getFee();
    }
  }, [selectedBid, checkSufficientBalance, estimateTransactionFee]);

  const isClient = publicKey?.toBase58() === clientAddress;

  // If not the client, don't show bids list at all
  if (!isClient) {
    return null;
  }

  /**
   * ✅ UPDATED: Accept bid WITH automatic deposit (Fixes Issue C)
   * This now combines:
   * 1. Select bid (assign freelancer)
   * 2. Deposit escrow (lock payment)
   * Both happen atomically in a single transaction
   */
  const handleAcceptBid = async () => {
    if (!selectedBid) return;

    // Check balance before proceeding
    if (balanceCheck && !balanceCheck.sufficient) {
      setAcceptError(
        `Insufficient balance. You have ${balanceCheck.balance.toFixed(4)} SOL but need ${balanceCheck.required.toFixed(4)} SOL (${selectedBid.budgetInSol} SOL + ~${estimatedFee.toFixed(4)} SOL fees)`
      );
      return;
    }

    setAccepting(true);
    setAcceptError(null);

    try {
      // Use composite transaction (Fixes Issue C + Issue A)
      const result = await acceptBidWithDeposit(
        jobPda,
        selectedBid.publicKey,
        selectedBid.account.freelancer,
        selectedBid.budgetInSol
      );

      addNotification(
        NotificationType.PROPOSAL_ACCEPTED,
        'Bid Accepted',
        `You hired ${formatAddress(selectedBid.account.freelancer)} for "${jobTitle || 'the job'}". ${selectedBid.budgetInSol} SOL locked in escrow.`,
        `/jobs/${jobPda.toBase58()}`
      );

      setSelectedBid(null);
      await refetch();
      onBidAccepted?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to accept bid and deposit escrow';
      setAcceptError(message);
      console.error('Error accepting bid with deposit:', err);
    } finally {
      setAccepting(false);
    }
  };

  const handleViewCV = (cvUri: string, freelancerAddress: string) => {
    // CV URI format: "ipfs://QmHash" or just "QmHash"
    const cvHash = cvUri.replace('ipfs://', '');
    if (cvHash) {
      setSelectedCVHash(cvHash);
      setSelectedFreelancer(freelancerAddress);
      setCvViewerOpen(true);
    }
  };

  const handleOpenChat = (freelancerAddress: string) => {
    setChatRecipient(freelancerAddress);
    setChatDialogOpen(true);
  };

  const formatAddress = (address: PublicKey) => {
    const addr = address.toBase58();
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  if (loading) {
    return (
      <LoadingSpinner
        message="Syncing bids..."
        logs={[
          { text: 'gPA filter: memcmp(offset=8, job_pda bytes)...', type: 'info' },
          { text: 'Fetching BidData accounts from RPC...', type: 'info' },
          { text: 'Anchor decode: checking discriminator 0x4a9d...', type: 'info' },
          { text: 'Ranking: bid_score = price×0.4 + rating×0.6', type: 'ok' },
        ]}
        sx={{ mt: 2 }}
      />
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (bids.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No bids yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Be the first to submit a bid for this job!
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const rankedBids = rankBids(bids, jobBudgetSol)

  return (
    <>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <EmojiEvents sx={{ color: '#FFD700', fontSize: 22 }} />
            <Typography variant="h6" fontWeight={600}>
              {bids.length} Contractor{bids.length !== 1 ? 's' : ''} Competing
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Ranked by price competitiveness · timeline commitment
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {rankedBids.map(({ bid, score, rank }) => {
              const createdAt = new Date(bid.account.createdAt.toNumber() * 1000);
              const statusText = getBidStatusText(bid.account.status);
              const statusColor = getBidStatusColor(bid.account.status);
              const rankColor =
                rank === 1 ? '#FFD700' :
                rank === 2 ? '#C0C0C0' :
                rank === 3 ? '#CD7F32' :
                'rgba(255,255,255,0.15)';
              const scoreLevel = getScoreLevel(score);
              const scoreColor = SCORE_COLORS[scoreLevel];

              return (
                <Card
                  key={bid.publicKey.toBase58()}
                  variant="outlined"
                  sx={{
                    position: 'relative',
                    borderColor: rank <= 3 ? rankColor : undefined,
                    borderWidth: rank === 1 ? 2 : 1,
                    '&:hover': { boxShadow: 2 },
                  }}
                >
                  <CardContent>
                    {/* Rank badge + score */}
                    <Box sx={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 0.5,
                    }}>
                      <Box sx={{
                        width: 36, height: 36, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: '0.75rem',
                        background: rank <= 3 ? rankColor : 'rgba(255,255,255,0.08)',
                        color: rank <= 3 ? '#000' : 'rgba(255,255,255,0.4)',
                        border: `2px solid ${rankColor}`,
                        fontFamily: '"Orbitron", monospace',
                      }}>
                        #{rank}
                      </Box>
                      <Box sx={{
                        px: 0.75, py: 0.2, borderRadius: 0.75,
                        bgcolor: scoreColor + '22',
                        border: `1px solid ${scoreColor}55`,
                        fontSize: '0.6rem', fontWeight: 700,
                        color: scoreColor, fontFamily: 'monospace',
                        letterSpacing: '0.04em',
                      }}>
                        {score}/100
                      </Box>
                    </Box>

                    {/* Header: Freelancer info and status */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2, pr: 7 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{
                          width: 48, height: 48,
                          bgcolor: rank <= 3 ? rankColor : undefined,
                          color: rank <= 3 ? '#000' : undefined,
                        }}>
                          {bid.account.freelancer.toBase58().slice(0, 2).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Link href={`/profile/${bid.account.freelancer.toBase58()}`} passHref legacyBehavior>
                            <MuiLink sx={{ cursor: 'pointer', fontWeight: 600, fontSize: '1rem' }}>
                              {formatAddress(bid.account.freelancer)}
                            </MuiLink>
                          </Link>
                          <Typography variant="caption" display="block" color="text.secondary">
                            {formatDistanceToNow(createdAt, { addSuffix: true })}
                          </Typography>
                        </Box>
                      </Box>

                      <Chip label={statusText} color={statusColor} size="small" />
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Bid details: price + timeline side by side */}
                    <Box sx={{ display: 'flex', gap: 3, mb: 2, flexWrap: 'wrap' }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Bid Amount
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <SolanaIconSimple sx={{ fontSize: 16 }} />
                          <Typography variant="body1" fontWeight={600}>
                            {bid.budgetInSol.toFixed(4)}
                          </Typography>
                          {jobBudgetSol > 0 && (
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                              ({Math.round((bid.budgetInSol / jobBudgetSol) * 100)}% of budget)
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Timeline
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {bid.account.timelineDays} day{bid.account.timelineDays !== 1 ? 's' : ''}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Competitiveness score bar */}
                    {jobBudgetSol > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            Competitiveness Score
                          </Typography>
                          <Typography variant="caption" sx={{ color: scoreColor, fontWeight: 700 }}>
                            {score}/100
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={score}
                          sx={{
                            height: 4, borderRadius: 2,
                            bgcolor: 'rgba(255,255,255,0.08)',
                            '& .MuiLinearProgress-bar': { bgcolor: scoreColor, borderRadius: 2 },
                          }}
                        />
                      </Box>
                    )}

                    {/* Proposal */}
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                        Proposal
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          whiteSpace: 'pre-line',
                          maxHeight: 150,
                          overflow: 'auto',
                          p: 1.5,
                          bgcolor: 'background.default',
                          borderRadius: 1,
                        }}
                      >
                        {getCleanProposal(bid.account.proposal)}
                      </Typography>
                    </Box>

                    {/* Actions for client */}
                    {isClient && statusText === 'Pending' && (
                      <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          startIcon={<CheckCircle />}
                          onClick={() => setSelectedBid(bid)}
                          sx={{ flex: '1 1 auto' }}
                        >
                          Accept Bid
                        </Button>
                        {bid.account.cvUri && bid.account.cvUri.trim() !== '' && (
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<Visibility />}
                            onClick={() => handleViewCV(bid.account.cvUri, formatAddress(bid.account.freelancer))}
                            sx={{ flex: '0 1 auto', minWidth: '100px' }}
                          >
                            View CV
                          </Button>
                        )}
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Chat />}
                          onClick={() => handleOpenChat(bid.account.freelancer.toBase58())}
                          sx={{ flex: '0 1 auto', minWidth: '100px' }}
                        >
                          Message
                        </Button>
                      </Box>
                    )}

                    {/* Show accepted indicator with message button */}
                    {statusText === 'Accepted' && (
                      <Box sx={{ mt: 2 }}>
                        <Alert severity="success" sx={{ mb: 1 }}>
                          This bid has been accepted!
                        </Alert>
                        {isClient && (
                          <Button
                            variant="outlined"
                            size="small"
                            fullWidth
                            startIcon={<Chat />}
                            onClick={() => handleOpenChat(bid.account.freelancer.toBase58())}
                          >
                            Message Freelancer
                          </Button>
                        )}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </CardContent>
      </Card>

      {/* Accept Bid Confirmation Dialog */}
      <Dialog
        open={!!selectedBid}
        onClose={() => !accepting && setSelectedBid(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={600}>
              Accept Bid
            </Typography>
            <IconButton
              onClick={() => setSelectedBid(null)}
              disabled={accepting}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedBid && (
            <Box>
              {/* ✅ NEW: Enhanced info about composite transaction */}
              <Alert severity="info" icon={<Lock />} sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  🔒 Secure 2-in-1 Transaction
                </Typography>
                <Typography variant="body2">
                  This will automatically:
                </Typography>
                <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                  <li>Accept the bid and assign the freelancer</li>
                  <li>Deposit {selectedBid.budgetInSol.toFixed(4)} SOL into escrow</li>
                  <li>Lock funds until work is completed</li>
                </Box>
              </Alert>

              {/* Bid Details */}
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Bid Details
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Freelancer:</strong> {formatAddress(selectedBid.account.freelancer)}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Budget:</strong> {selectedBid.budgetInSol.toFixed(4)} SOL
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Timeline:</strong> {selectedBid.account.timelineDays} days
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  <strong>Transaction Fee:</strong> ~{estimatedFee.toFixed(4)} SOL
                </Typography>
                <Typography variant="body2" fontWeight={600} sx={{ mt: 1 }}>
                  <strong>Total Required:</strong> {(selectedBid.budgetInSol + estimatedFee).toFixed(4)} SOL
                </Typography>
              </Box>

              {/* ✅ NEW: Balance Check */}
              {balanceCheck && (
                <Alert 
                  severity={balanceCheck.sufficient ? "success" : "error"} 
                  sx={{ mb: 2 }}
                >
                  <Typography variant="body2">
                    <strong>Your Balance:</strong> {balanceCheck.balance.toFixed(4)} SOL
                  </Typography>
                  {!balanceCheck.sufficient && (
                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                      ⚠️ Insufficient funds. You need {balanceCheck.required.toFixed(4)} SOL but only have {balanceCheck.balance.toFixed(4)} SOL.
                    </Typography>
                  )}
                </Alert>
              )}

              {/* Error Display */}
              {acceptError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {acceptError}
                </Alert>
              )}

              {/* ✅ NEW: Security info */}
              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  ✅ Funds are protected: Payment will only be released when you approve the completed work.
                </Typography>
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setSelectedBid(null)}
            disabled={accepting}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleAcceptBid}
            disabled={accepting || !!(balanceCheck && !balanceCheck.sufficient)}
            startIcon={accepting ? <CircularProgress size={20} /> : <Lock />}
          >
            {accepting ? 'Processing Transaction...' : 'Accept & Deposit Escrow'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* CV Viewer Dialog */}
      <CVViewer
        open={cvViewerOpen}
        onClose={() => setCvViewerOpen(false)}
        cvHash={selectedCVHash}
        freelancerName={selectedFreelancer}
      />

      {/* Chat Dialog */}
      {chatRecipient && (
        <ChatDialog
          open={chatDialogOpen}
          onClose={() => setChatDialogOpen(false)}
          recipientAddress={chatRecipient}
        />
      )}
    </>
  );
}
