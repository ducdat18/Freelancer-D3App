import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
} from '@mui/material';
import { EmojiEvents } from '@mui/icons-material';
import LoadingSpinner from '../LoadingSpinner';
import { useOptimizedJobBids, type BidWithDetails } from '../../hooks/useOptimizedBids';
import { useWallet } from '@solana/wallet-adapter-react';
import type { PublicKey } from '../../types/solana';
import CVViewer from '../CVViewer';
import { rankBids } from '../../utils/bidScore';
import ChatDialog from '../chat/ChatDialog';
import { useCompositeTransactions } from '../../hooks/useCompositeTransactions';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { NotificationType } from '../../types';
import BidCard from './BidCard';
import AcceptBidDialog from './dialogs/AcceptBidDialog';
import ProposalDialog from './dialogs/ProposalDialog';
import RiskAssessmentDialog from './dialogs/RiskAssessmentDialog';
import { getCleanProposal } from '../../utils/cvUtils';

interface BidsListProps {
  jobPda: PublicKey;
  clientAddress: string; // Job owner's address
  jobBudgetSol?: number;
  jobTitle?: string;
  jobDescription?: string;
  onBidAccepted?: () => void;
}

export default function BidsList({ jobPda, clientAddress, jobBudgetSol = 0, jobTitle, jobDescription, onBidAccepted }: BidsListProps) {
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
  const [proposalDialogBid, setProposalDialogBid] = useState<BidWithDetails | null>(null);
  const [riskDialogBid, setRiskDialogBid] = useState<BidWithDetails | null>(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskResult, setRiskResult] = useState<any>(null);
  const [riskError, setRiskError] = useState('');
  const [riskCached, setRiskCached] = useState(false);

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
      await acceptBidWithDeposit(
        jobPda,
        selectedBid.publicKey,
        selectedBid.account.freelancer,
        selectedBid.budgetInSol
      );

      addNotification(
        NotificationType.PROPOSAL_ACCEPTED,
        'Bid Accepted',
        `You hired ${formatAddress(selectedBid.account.freelancer)} for "${jobTitle || 'the job'}". ${selectedBid.budgetInSol.toFixed(4)} SOL locked in escrow.`,
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
    if (!cvUri) return;
    // Extract bare CID from any URI format
    const m = cvUri.match(/(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{58,})/i);
    const cvHash = m ? m[1] : cvUri.replace(/^ipfs:\/\//i, '').trim();
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

  const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  const getRiskCacheKey = (bid: BidWithDetails) =>
    `risk_assessment_${bid.publicKey.toBase58()}`;

  const loadFromCache = (bid: BidWithDetails): any | null => {
    try {
      const raw = localStorage.getItem(getRiskCacheKey(bid));
      if (!raw) return null;
      const { result, savedAt } = JSON.parse(raw);
      if (Date.now() - savedAt > CACHE_TTL_MS) {
        localStorage.removeItem(getRiskCacheKey(bid));
        return null;
      }
      return result;
    } catch { return null; }
  };

  const saveToCache = (bid: BidWithDetails, result: any) => {
    try {
      localStorage.setItem(getRiskCacheKey(bid), JSON.stringify({ result, savedAt: Date.now() }));
    } catch { /* storage full or unavailable */ }
  };

  const runRiskAssessment = async (bid: BidWithDetails) => {
    setRiskLoading(true);
    setRiskResult(null);
    setRiskError('');
    setRiskCached(false);
    try {
      const res = await fetch('/api/ai/risk-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription: jobDescription || jobTitle || 'Freelance job',
          cvText: getCleanProposal(bid.account.proposal),
          cvUri: bid.account.cvUri || undefined,
          jobTitle,
          bidBudgetSol: bid.budgetInSol,
          jobBudgetSol: jobBudgetSol || undefined,
          bidTimelineDays: bid.account.timelineDays,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRiskError(data.error || 'Analysis failed. Please try again.');
      } else {
        setRiskResult(data);
        saveToCache(bid, data);
      }
    } catch {
      setRiskError('Network error. Please try again.');
    } finally {
      setRiskLoading(false);
    }
  };

  const handleRiskCheck = (bid: BidWithDetails) => {
    setRiskDialogBid(bid);
    setRiskError('');
    setRiskLoading(false);
    const cached = loadFromCache(bid);
    if (cached) {
      setRiskResult(cached);
      setRiskCached(true);
    } else {
      setRiskResult(null);
      setRiskCached(false);
      runRiskAssessment(bid);
    }
  };

  const closeRiskDialog = () => {
    if (!riskLoading) {
      setRiskDialogBid(null);
      setRiskResult(null);
      setRiskError('');
      setRiskCached(false);
    }
  };

  const formatAddress = (address: any) => {
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
            {rankedBids.map(({ bid, score, rank }) => (
              <BidCard
                key={bid.publicKey.toBase58()}
                bid={bid}
                rank={rank}
                score={score}
                jobBudgetSol={jobBudgetSol}
                isClient={isClient}
                onAccept={setSelectedBid}
                onViewProposal={setProposalDialogBid}
                onViewCV={handleViewCV}
                onRiskCheck={handleRiskCheck}
                onChat={handleOpenChat}
              />
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Accept Bid Confirmation Dialog */}
      <AcceptBidDialog
        bid={selectedBid}
        open={!!selectedBid}
        accepting={accepting}
        balanceCheck={balanceCheck}
        estimatedFee={estimatedFee}
        acceptError={acceptError}
        jobTitle={jobTitle}
        onAccept={handleAcceptBid}
        onClose={() => !accepting && setSelectedBid(null)}
      />

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

      {/* Full Proposal Dialog */}
      <ProposalDialog
        bid={proposalDialogBid}
        open={!!proposalDialogBid}
        onClose={() => setProposalDialogBid(null)}
        onRunRiskCheck={(bid) => {
          setProposalDialogBid(null);
          handleRiskCheck(bid);
        }}
        formatAddress={formatAddress}
      />

      {/* Risk Assessment Dialog */}
      <RiskAssessmentDialog
        open={!!riskDialogBid}
        onClose={closeRiskDialog}
        riskDialogBid={riskDialogBid}
        riskLoading={riskLoading}
        riskResult={riskResult}
        riskError={riskError}
        riskCached={riskCached}
        onRerun={() => riskDialogBid && runRiskAssessment(riskDialogBid)}
        formatAddress={formatAddress}
        jobBudgetSol={jobBudgetSol}
        jobTitle={jobTitle}
      />
    </>
  );
}
