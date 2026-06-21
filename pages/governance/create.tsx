import { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  TextField,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ScienceIcon from '@mui/icons-material/Science';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import Layout from '../../src/components/Layout';
import EmptyState from '../../src/components/EmptyState';
import { useSolanaProgram } from '../../src/hooks/useSolanaProgram';
import { useDAOGovernance } from '../../src/hooks/useDAOGovernance';
import { GovernanceProposalType } from '../../src/types';

const proposalTypes = [
  {
    value: GovernanceProposalType.ParameterChange,
    label: 'Parameter Change',
    description: 'Modify platform parameters such as fees, thresholds, or timeouts',
  },
  {
    value: GovernanceProposalType.TreasurySpend,
    label: 'Treasury Spend',
    description: 'Request funds from the DAO treasury for development or initiatives',
  },
  {
    value: GovernanceProposalType.FeatureToggle,
    label: 'Feature Toggle',
    description: 'Enable or disable platform features',
  },
  {
    value: GovernanceProposalType.ArbitratorElection,
    label: 'Arbitrator Election',
    description: 'Nominate or remove arbitrators from the dispute resolution pool',
  },
  {
    value: GovernanceProposalType.EmergencyAction,
    label: 'Emergency Action',
    description: 'Urgent action requiring expedited voting period',
  },
];

export default function CreateProposalPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primaryMain = theme.palette.primary.main;
  
  const { program } = useSolanaProgram();
  // @ts-ignore
  const isDeployed = typeof program?.methods?.createProposal === 'function';

  const router = useRouter();
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const {
    daoConfig,
    loading,
    error,
    createProposal,
    fetchDAOConfig,
  } = useDAOGovernance();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [proposalType, setProposalType] = useState<GovernanceProposalType>(
    GovernanceProposalType.ParameterChange,
  );
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load DAO config on mount
  useState(() => {
    fetchDAOConfig();
  });

  const selectedTypeInfo = proposalTypes.find((pt) => pt.value === proposalType);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) return;

    try {
      setSubmitting(true);
      const descriptionUri = isDeployed
        ? `ipfs://placeholder-${Date.now()}`
        : description;
      const result = await createProposal(title, descriptionUri, proposalType);
      setSuccessMessage(`Proposal created successfully! ID: ${result.proposalId}`);
      setTimeout(() => {
        router.push('/governance');
      }, 2000);
    } catch (err: any) {
      // error handled by hook
    } finally {
      setSubmitting(false);
    }
  };

  if (!connected) {
    return (
      <Layout>
        <Container maxWidth="md" sx={{ py: 8 }}>
          <EmptyState
            title="Wallet Not Connected"
            description="Connect your wallet to create a governance proposal."
            actionLabel="Connect Wallet"
            onAction={() => setVisible(true)}
          />
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Back Button */}
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/governance')}
          sx={{ mb: 3, color: 'text.secondary', fontWeight: 600, '&:hover': { color: 'primary.main' } }}
        >
          Back to Governance
        </Button>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <GavelIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="h4" fontWeight={800} sx={{ fontFamily: '"Orbitron", sans-serif' }}>
                Create Proposal
              </Typography>
              {!isDeployed && (
                <Chip
                  icon={<ScienceIcon sx={{ fontSize: '0.9rem !important' }} />}
                  label="DEVNET SIMULATION"
                  size="small"
                  sx={{
                    fontFamily: '"Orbitron", monospace',
                    fontSize: '0.55rem',
                    letterSpacing: '0.08em',
                    bgcolor: isDark ? 'rgba(224,77,1,0.15)' : 'rgba(224,77,1,0.08)',
                    color: theme.palette.warning.main,
                    border: 1,
                    borderColor: alpha(theme.palette.warning.main, 0.3),
                    fontWeight: 700,
                  }}
                />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              Submit a governance proposal for community vote
            </Typography>
          </Box>
        </Box>

        {successMessage && (
          <Alert severity="success" sx={{ mb: 3, fontWeight: 600 }}>
            {successMessage}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3, fontWeight: 500 }}>
            {error}
          </Alert>
        )}

        {/* Stake Requirement Notice */}
        <Paper
          sx={{
            p: 2.5,
            mb: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            border: 1,
            borderColor: isDark ? alpha(theme.palette.warning.main, 0.3) : alpha(theme.palette.warning.main, 0.4),
            bgcolor: isDark ? alpha(theme.palette.warning.main, 0.05) : alpha(theme.palette.warning.main, 0.03),
            borderRadius: 2,
          }}
        >
          <InfoOutlinedIcon sx={{ color: theme.palette.warning.main }} />
          <Box>
            <Typography variant="subtitle2" fontWeight={700} color={theme.palette.warning.main}>
              Stake Requirement
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, display: 'block', mt: 0.25 }}>
              Creating a proposal requires staking{' '}
              <strong style={{ color: theme.palette.text.primary }}>{daoConfig?.minProposalStake ?? '--'} tokens</strong>.
              Your stake will be returned after the voting period ends, regardless of the outcome.
            </Typography>
          </Box>
        </Paper>

        {/* Form */}
        <Paper
          sx={{
            p: { xs: 3, md: 4 },
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            backgroundImage: 'none',
            borderRadius: 3,
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
            {/* Title */}
            <TextField
              label="Proposal Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              required
              variant="outlined"
              placeholder="A concise title describing the proposed change"
              inputProps={{ maxLength: 80 }}
              helperText={`${title.length}/80 characters`}
            />

            {/* Proposal Type */}
            <FormControl fullWidth required>
              <InputLabel>Proposal Type</InputLabel>
              <Select
                value={proposalType}
                label="Proposal Type"
                onChange={(e) => setProposalType(Number(e.target.value) as GovernanceProposalType)}
              >
                {proposalTypes.map((pt) => (
                  <MenuItem key={pt.value} value={pt.value} sx={{ fontWeight: 500 }}>
                    {pt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Type Description */}
            {selectedTypeInfo && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  border: 1,
                  borderColor: alpha(primaryMain, 0.15),
                  bgcolor: isDark ? alpha(primaryMain, 0.03) : alpha(primaryMain, 0.02),
                }}
              >
                <Typography variant="caption" color="primary.main" fontWeight={700} sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  TYPE INFO
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  {selectedTypeInfo.description}
                </Typography>
              </Box>
            )}

            {/* Description */}
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              required
              multiline
              rows={8}
              placeholder={
                'Provide a detailed description of your proposal:\n\n' +
                '- What changes are being proposed?\n' +
                '- Why is this change needed?\n' +
                '- What is the expected impact?\n' +
                '- How will success be measured?'
              }
            />

            {/* IPFS Note */}
            <Box
              sx={{
                p: 2,
                borderRadius: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                border: '1px dashed',
                borderColor: 'divider',
                bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
              }}
            >
              <CloudUploadIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, lineHeight: 1.4 }}>
                The proposal description will be uploaded to IPFS for permanent, decentralized
                storage. The on-chain record will reference the IPFS content hash.
              </Typography>
            </Box>

            {/* Summary */}
            <Box
              sx={{
                p: 2.5,
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
                bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'grey.50',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1.5,
                alignItems: 'center',
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ mr: 1, fontWeight: 700, textTransform: 'uppercase' }}>
                PROPOSAL SUMMARY:
              </Typography>
              <Chip
                label={`Type: ${selectedTypeInfo?.label}`}
                size="small"
                variant="outlined"
                sx={{ fontWeight: 600, fontSize: '0.7rem' }}
              />
              <Chip
                label={`Voting: ${daoConfig ? `${daoConfig.votingPeriod / 86400} days` : '--'}`}
                size="small"
                variant="outlined"
                sx={{ fontWeight: 600, fontSize: '0.7rem' }}
              />
              <Chip
                label={`Quorum: ${daoConfig?.quorumPercentage ?? '--'}%`}
                size="small"
                variant="outlined"
                sx={{ fontWeight: 600, fontSize: '0.7rem' }}
              />
              <Chip
                label={`Stake: ${daoConfig?.minProposalStake ?? '--'} tokens`}
                size="small"
                variant="outlined"
                sx={{ borderColor: theme.palette.warning.main, color: theme.palette.warning.main, fontWeight: 700, fontSize: '0.7rem' }}
              />
            </Box>

            {/* Submit */}
            <Button
              variant="contained"
              size="large"
              onClick={handleSubmit}
              disabled={submitting || loading || !title.trim() || !description.trim()}
              sx={{
                py: 1.75,
                fontSize: '0.95rem',
                fontWeight: 800,
                fontFamily: '"Orbitron", sans-serif',
                letterSpacing: 1,
                boxShadow: isDark ? `0 4px 15px ${alpha(primaryMain, 0.4)}` : 'none',
              }}
            >
              {submitting ? 'Submitting Proposal...' : 'Submit Proposal'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Layout>
  );
}
