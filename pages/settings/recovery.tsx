import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Divider,
  Alert,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Security,
  PersonAdd,
  Delete,
  Group,
  Timer,
  Cancel,
  Save,
  Refresh,
} from '@mui/icons-material';
import { useWallet } from '@solana/wallet-adapter-react';
import Layout from '../../src/components/Layout';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import EmptyState from '../../src/components/EmptyState';
import { useSocialRecovery } from '../../src/hooks/useSocialRecovery';

const MAX_GUARDIANS = 5;

const timelockOptions = [
  { value: 3600, label: '1 Hour' },
  { value: 86400, label: '1 Day' },
  { value: 259200, label: '3 Days' },
  { value: 604800, label: '1 Week' },
];

export default function RecoverySettings() {
  const { publicKey } = useWallet();
  const {
    recoveryConfig,
    recoveryRequest,
    loading,
    error,
    fetchRecoveryConfig,
    fetchRecoveryRequest,
    setupRecovery,
    updateGuardians,
    cancelRecovery,
  } = useSocialRecovery();

  // Setup form state
  const [guardianInputs, setGuardianInputs] = useState<string[]>(['']);
  const [threshold, setThreshold] = useState<number>(1);
  const [timelockPeriod, setTimelockPeriod] = useState<number>(86400);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Load existing config
  useEffect(() => {
    if (publicKey) {
      fetchRecoveryConfig();
      fetchRecoveryRequest();
    }
  }, [publicKey, fetchRecoveryConfig, fetchRecoveryRequest]);

  // Populate form with existing config
  useEffect(() => {
    if (recoveryConfig) {
      setGuardianInputs(
        recoveryConfig.guardians.length > 0
          ? recoveryConfig.guardians
          : ['']
      );
      setThreshold(recoveryConfig.threshold);
      setTimelockPeriod(recoveryConfig.timelockPeriod);
    }
  }, [recoveryConfig]);

  const addGuardianInput = () => {
    if (guardianInputs.length < MAX_GUARDIANS) {
      setGuardianInputs([...guardianInputs, '']);
    }
  };

  const removeGuardianInput = (index: number) => {
    const updated = guardianInputs.filter((_, i) => i !== index);
    setGuardianInputs(updated.length > 0 ? updated : ['']);
  };

  const updateGuardianInput = (index: number, value: string) => {
    const updated = [...guardianInputs];
    updated[index] = value;
    setGuardianInputs(updated);
  };

  const handleSave = async () => {
    const validGuardians = guardianInputs.filter((g) => g.trim().length > 0);

    if (validGuardians.length === 0) {
      setLocalError('Please add at least one guardian address.');
      return;
    }

    if (threshold > validGuardians.length) {
      setLocalError('Threshold cannot exceed the number of guardians.');
      return;
    }

    if (threshold < 1) {
      setLocalError('Threshold must be at least 1.');
      return;
    }

    try {
      setSaving(true);
      setLocalError(null);

      if (recoveryConfig && recoveryConfig.active) {
        // Update existing config
        await updateGuardians(validGuardians, threshold);
        setSuccessMessage('Guardians updated successfully.');
      } else {
        // Setup new recovery config
        await setupRecovery(validGuardians, threshold, timelockPeriod);
        setSuccessMessage('Social recovery configured successfully.');
      }
    } catch (err: any) {
      setLocalError(err.message || 'Failed to save recovery settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelRecovery = async () => {
    try {
      setCancelling(true);
      setLocalError(null);
      await cancelRecovery();
      setSuccessMessage('Recovery request cancelled.');
      await fetchRecoveryRequest();
    } catch (err: any) {
      setLocalError(err.message || 'Failed to cancel recovery request.');
    } finally {
      setCancelling(false);
    }
  };

  const formatTimeRemaining = (executableAt: number): string => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = executableAt - now;
    if (remaining <= 0) return 'Ready to execute';
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h remaining`;
    }
    return `${hours}h ${minutes}m remaining`;
  };

  if (!publicKey) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <EmptyState
            title="Wallet Not Connected"
            description="Connect your Solana wallet to manage social recovery settings."
          />
        </Container>
      </Layout>
    );
  }

  if (loading && !recoveryConfig) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8 }}>
          <LoadingSpinner message="Loading recovery settings..." />
        </Container>
      </Layout>
    );
  }

  const hasConfig = recoveryConfig && recoveryConfig.active;

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Security sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h4" fontWeight={700}>
              Social Recovery
            </Typography>
          </Box>
          <Typography variant="body1" color="text.secondary">
            Set up trusted guardians who can help you recover access to your account if you lose your wallet.
          </Typography>
        </Box>

        {/* Messages */}
        {(error || localError) && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setLocalError(null)}>
            {error || localError}
          </Alert>
        )}
        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Left Column - Guardian Setup */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Group color="primary" />
                <Typography variant="h6" fontWeight={700}>
                  {hasConfig ? 'Manage Guardians' : 'Setup Guardians'}
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Add up to {MAX_GUARDIANS} guardian wallet addresses. These trusted contacts can initiate
                account recovery on your behalf.
              </Typography>

              {/* Guardian Inputs */}
              {guardianInputs.map((guardian, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                  <TextField
                    fullWidth
                    label={`Guardian ${index + 1}`}
                    placeholder="Solana wallet address"
                    value={guardian}
                    onChange={(e) => updateGuardianInput(index, e.target.value)}
                    size="small"
                    sx={{
                      '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.85rem' },
                    }}
                  />
                  <IconButton
                    color="error"
                    onClick={() => removeGuardianInput(index)}
                    disabled={guardianInputs.length <= 1}
                  >
                    <Delete />
                  </IconButton>
                </Box>
              ))}

              {guardianInputs.length < MAX_GUARDIANS && (
                <Button
                  startIcon={<PersonAdd />}
                  onClick={addGuardianInput}
                  size="small"
                  sx={{ mb: 3 }}
                >
                  Add Guardian
                </Button>
              )}

              <Divider sx={{ my: 2 }} />

              {/* Threshold */}
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Approval Threshold</InputLabel>
                <Select
                  value={threshold}
                  label="Approval Threshold"
                  onChange={(e) => setThreshold(e.target.value as number)}
                  size="small"
                >
                  {Array.from({ length: Math.max(guardianInputs.filter(g => g.trim()).length, 1) }, (_, i) => i + 1).map((n) => (
                    <MenuItem key={n} value={n}>
                      {n} of {guardianInputs.filter(g => g.trim()).length || 1} guardians
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Timelock */}
              {!hasConfig && (
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Timelock Period</InputLabel>
                  <Select
                    value={timelockPeriod}
                    label="Timelock Period"
                    onChange={(e) => setTimelockPeriod(e.target.value as number)}
                    size="small"
                  >
                    {timelockOptions.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              <Button
                fullWidth
                variant="contained"
                color="primary"
                startIcon={saving ? <CircularProgress size={18} /> : <Save />}
                disabled={saving}
                onClick={handleSave}
              >
                {saving
                  ? 'Saving...'
                  : hasConfig
                    ? 'Update Guardians'
                    : 'Setup Recovery'}
              </Button>
            </Paper>
          </Grid>

          {/* Right Column - Current Config & Recovery Requests */}
          <Grid size={{ xs: 12, md: 5 }}>
            {/* Current Config */}
            {hasConfig && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Current Configuration
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Guardians
                </Typography>
                <List dense disablePadding>
                  {recoveryConfig.guardians.map((guardian, index) => (
                    <ListItem key={index} disableGutters sx={{ py: 0.5 }}>
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.8rem' }}>
                            {guardian.slice(0, 8)}...{guardian.slice(-8)}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Threshold</Typography>
                  <Chip
                    label={`${recoveryConfig.threshold} of ${recoveryConfig.guardians.length}`}
                    size="small"
                    color="primary"
                  />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Timelock</Typography>
                  <Chip
                    label={timelockOptions.find(o => o.value === recoveryConfig.timelockPeriod)?.label || `${recoveryConfig.timelockPeriod}s`}
                    size="small"
                    variant="outlined"
                  />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Last Updated</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(recoveryConfig.updatedAt * 1000).toLocaleDateString()}
                  </Typography>
                </Box>
              </Paper>
            )}

            {/* Recovery Requests */}
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Timer color="warning" />
                <Typography variant="h6" fontWeight={700}>
                  Recovery Requests
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />

              {!recoveryRequest || recoveryRequest.executed || recoveryRequest.cancelled ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                  No active recovery requests.
                </Typography>
              ) : (
                <Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Status
                    </Typography>
                    <Chip
                      label="Active"
                      color="warning"
                      size="small"
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      New Owner
                    </Typography>
                    <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.8rem' }}>
                      {recoveryRequest.newOwner.slice(0, 8)}...{recoveryRequest.newOwner.slice(-8)}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Initiated By
                    </Typography>
                    <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.8rem' }}>
                      {recoveryRequest.initiatedBy.slice(0, 8)}...{recoveryRequest.initiatedBy.slice(-8)}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Approvals
                    </Typography>
                    <Chip
                      label={`${recoveryRequest.approvals.length} / ${recoveryConfig?.threshold || '?'}`}
                      color={
                        recoveryConfig && recoveryRequest.approvals.length >= recoveryConfig.threshold
                          ? 'success'
                          : 'warning'
                      }
                      size="small"
                    />
                  </Box>

                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Timelock Countdown
                    </Typography>
                    <Chip
                      icon={<Timer />}
                      label={formatTimeRemaining(recoveryRequest.executableAt)}
                      color="info"
                      size="small"
                    />
                  </Box>

                  {/* Cancel button (for owner) */}
                  {publicKey && recoveryRequest.owner === publicKey.toBase58() && (
                    <Button
                      fullWidth
                      variant="outlined"
                      color="error"
                      startIcon={cancelling ? <CircularProgress size={18} /> : <Cancel />}
                      disabled={cancelling}
                      onClick={handleCancelRecovery}
                    >
                      {cancelling ? 'Cancelling...' : 'Cancel Recovery'}
                    </Button>
                  )}
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Layout>
  );
}
