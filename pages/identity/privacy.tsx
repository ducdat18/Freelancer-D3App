import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Chip,
  Divider,
  Alert,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Shield,
  VerifiedUser,
  Delete,
  Add,
  Lock,
  Info,
} from '@mui/icons-material';
import { useWallet } from '@solana/wallet-adapter-react';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import EmptyState from '../../src/components/EmptyState';
import { useZKCredentials } from '../../src/hooks/useZKCredentials';

const credentialTypes = [
  { value: 'reputation_range', label: 'Reputation Range', description: 'Prove your reputation score falls within a range without revealing the exact value.' },
  { value: 'job_count_range', label: 'Job Count Range', description: 'Prove your completed job count is within a range without revealing the exact number.' },
  { value: 'earnings_range', label: 'Earnings Range', description: 'Prove your total earnings fall within a range without disclosing the precise amount.' },
];

function getCredentialStatus(credential: any): { label: string; color: 'success' | 'warning' | 'error' } {
  if (credential.revoked) return { label: 'Revoked', color: 'error' };
  if (credential.verified) return { label: 'Verified', color: 'success' };
  return { label: 'Pending', color: 'warning' };
}

export default function PrivacyPage() {
  const { publicKey } = useWallet();
  const {
    credentials,
    loading,
    error,
    fetchUserCredentials,
    submitZKCredential,
    revokeZKCredential,
  } = useZKCredentials();

  const [selectedType, setSelectedType] = useState<string>('reputation_range');
  const [submitting, setSubmitting] = useState(false);
  const [revoking, setRevoking] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primaryMain = theme.palette.primary.main;

  useEffect(() => {
    if (publicKey) {
      fetchUserCredentials();
    }
  }, [publicKey, fetchUserCredentials]);

  const handleCreateCredential = async () => {
    if (!publicKey) {
      setLocalError('Please connect your wallet.');
      return;
    }

    try {
      setSubmitting(true);
      setLocalError(null);

      // Generate mock ZK proof data (in production, this would use actual ZK circuits)
      const commitment = new Uint8Array(32);
      const proofHash = new Uint8Array(32);
      const publicInputsHash = new Uint8Array(32);
      crypto.getRandomValues(commitment);
      crypto.getRandomValues(proofHash);
      crypto.getRandomValues(publicInputsHash);

      // Valid for 90 days
      const validUntil = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60;

      await submitZKCredential(
        selectedType,
        commitment,
        proofHash,
        publicInputsHash,
        validUntil
      );

      setSuccessMessage(`ZK credential "${selectedType}" created successfully.`);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to create ZK credential.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (credentialIndex: number) => {
    try {
      setRevoking(credentialIndex);
      setLocalError(null);
      await revokeZKCredential(credentialIndex);
      setSuccessMessage('Credential revoked successfully.');
    } catch (err: any) {
      setLocalError(err.message || 'Failed to revoke credential.');
    } finally {
      setRevoking(null);
    }
  };

  if (!publicKey) {
    return (
      <>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <EmptyState
            title="Wallet Not Connected"
            description="Connect your Solana wallet to manage ZK privacy credentials."
          />
        </Container>
      </>
    );
  }

  return (
    <>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
            <Shield sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h4" fontWeight={800} sx={{ fontFamily: '"Orbitron", sans-serif' }}>
              Privacy & Selective Disclosure
            </Typography>
          </Box>
          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, maxWidth: 700 }}>
            Manage your zero-knowledge credentials to selectively disclose information without revealing exact values.
          </Typography>
        </Box>

        {/* Messages */}
        {(error || localError) && (
          <Alert severity="error" sx={{ mb: 3, fontWeight: 500 }} onClose={() => setLocalError(null)}>
            {error || localError}
          </Alert>
        )}
        {successMessage && (
          <Alert severity="success" sx={{ mb: 3, fontWeight: 600 }} onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* ZK Proof Explanation */}
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 3, mb: 1, border: 1, borderColor: 'divider', backgroundImage: 'none', borderRadius: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Info color="info" />
                <Typography variant="h6" fontWeight={700}>
                  How Zero-Knowledge Proofs Work
                </Typography>
              </Box>
              <Divider sx={{ mb: 2.5 }} />
              <Typography variant="body2" color="text.secondary" paragraph sx={{ lineHeight: 1.7, fontWeight: 500 }}>
                Zero-Knowledge (ZK) proofs allow you to prove statements about your data without revealing the underlying information.
                For example, you can prove your reputation score is above a threshold without disclosing the exact number.
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph sx={{ lineHeight: 1.7, fontWeight: 500 }}>
                Each credential is verified on-chain using cryptographic commitments. Your private data never leaves your device —
                only the proof is submitted and stored on the Solana blockchain.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, fontWeight: 500 }}>
                Credentials can be selectively disclosed to clients or employers. You control which credentials are shared and can
                revoke them at any time.
              </Typography>
            </Paper>
          </Grid>

          {/* Existing Credentials */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper sx={{ p: 3, border: 1, borderColor: 'divider', backgroundImage: 'none', borderRadius: 3, height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <VerifiedUser sx={{ color: primaryMain }} />
                <Typography variant="h6" fontWeight={700}>
                  Your ZK Credentials
                </Typography>
              </Box>
              <Divider sx={{ mb: 2.5 }} />

              {loading && !credentials.length ? (
                <LoadingSpinner message="Loading credentials..." />
              ) : credentials.length === 0 ? (
                <EmptyState
                  title="No Credentials"
                  description="You have not created any ZK credentials yet. Create one below to get started."
                />
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 1 }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 1 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 1 }}>Created</TableCell>
                        <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 1 }}>Valid Until</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 1 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {credentials.map((cred, index) => {
                        const status = getCredentialStatus(cred);
                        return (
                          <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                            <TableCell>
                              <Typography variant="body2" fontWeight={700}>
                                {cred.credentialType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={status.label.toUpperCase()} 
                                color={status.color} 
                                size="small" 
                                sx={{ fontWeight: 800, fontSize: '0.6rem', height: 20 }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                {new Date(cred.submittedAt * 1000).toLocaleDateString()}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                {cred.validUntil
                                  ? new Date(cred.validUntil * 1000).toLocaleDateString()
                                  : 'No expiry'}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              {!cred.revoked && (
                                <Tooltip title="Revoke credential" arrow>
                                  <IconButton
                                    color="error"
                                    size="small"
                                    disabled={revoking === cred.credentialIndex}
                                    onClick={() => handleRevoke(cred.credentialIndex)}
                                    sx={{ bgcolor: isDark ? 'rgba(244,67,54,0.05)' : 'rgba(244,67,54,0.03)', '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1) } }}
                                  >
                                    {revoking === cred.credentialIndex ? (
                                      <CircularProgress size={18} color="inherit" />
                                    ) : (
                                      <Delete fontSize="small" />
                                    )}
                                  </IconButton>
                                </Tooltip>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Grid>

          {/* Create New Credential */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper sx={{ p: 3, border: 1, borderColor: 'divider', backgroundImage: 'none', borderRadius: 3, height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Lock sx={{ color: primaryMain }} />
                <Typography variant="h6" fontWeight={700}>
                  Create ZK Credential
                </Typography>
              </Box>
              <Divider sx={{ mb: 2.5 }} />

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Credential Type</InputLabel>
                <Select
                  value={selectedType}
                  label="Credential Type"
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  {credentialTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value} sx={{ fontWeight: 500 }}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Selected type description */}
              {selectedType && (
                <Box sx={{ mb: 4, p: 2, borderRadius: 1.5, bgcolor: isDark ? 'rgba(33,150,243,0.08)' : 'rgba(33,150,243,0.05)', border: 1, borderColor: alpha(theme.palette.info.main, 0.2) }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, lineHeight: 1.6 }}>
                    {credentialTypes.find(t => t.value === selectedType)?.description}
                  </Typography>
                </Box>
              )}

              <Button
                fullWidth
                variant="contained"
                color="primary"
                startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <Add />}
                disabled={submitting || !publicKey}
                onClick={handleCreateCredential}
                sx={{ py: 1.5, fontWeight: 800, fontFamily: '"Orbitron", sans-serif', letterSpacing: 1 }}
              >
                {submitting ? 'Creating...' : 'Create Credential'}
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}
