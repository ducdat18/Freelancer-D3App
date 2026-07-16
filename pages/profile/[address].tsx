import { Container, Typography, Box, Grid, Tab, Tabs, Card, CardContent, Avatar, Chip, Divider, Alert, Button, Tooltip, alpha, useTheme } from '@mui/material';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { useJobs } from '../../src/hooks/useJobs';
import { useReputation } from '../../src/hooks/useReputation';
import JobCard from '../../src/components/JobCard';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import EmptyState from '../../src/components/EmptyState';
import SBTGallery from '../../src/components/profile/SBTGallery';
import { SolanaIconSimple } from '../../src/components/SolanaIcon';
import { PictureAsPdf, Description, PersonAdd, Star, Gavel, VerifiedUser } from '@mui/icons-material';
import { detectUserRole, getRoleDisplayText, getRoleColor, getExperienceLevel } from '../../src/utils/userRole';
import VerifiedBadge from '../../src/components/VerifiedBadge';
import { useSolanaProgram } from '../../src/hooks/useSolanaProgram';
import { fetchKycStatusOnChain } from '../../src/hooks/useKyc';
import { deriveJurorStakePDA } from '../../src/utils/pda';

export default function Profile() {
  const router = useRouter();
  const { address } = router.query;
  const { publicKey: viewerKey } = useWallet();
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [profileAddress, setProfileAddress] = useState<PublicKey | null>(null);
  const [reputation, setReputation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savedCVs, setSavedCVs] = useState<any[]>([]);
  const [profileData, setProfileData] = useState<any>(null);
  const [isKycVerified, setIsKycVerified] = useState(false);
  const [isJuror, setIsJuror] = useState(false);

  const { program } = useSolanaProgram();
  const { fetchAllJobs } = useJobs();
  const { fetchReputation } = useReputation();
  const [clientJobs, setClientJobs] = useState<any[]>([]);
  const [freelancerJobs, setFreelancerJobs] = useState<any[]>([]);

  useEffect(() => {
    async function loadProfile() {
      if (!address || typeof address !== 'string') return;

      try {
        setLoading(true);
        const pubkey = new PublicKey(address);
        setProfileAddress(pubkey);

        // Fetch reputation from blockchain
        const rep = await fetchReputation(pubkey);
        setReputation(rep);

        // Fetch all jobs and filter
        const allJobs = await fetchAllJobs();
        const cJobs = allJobs.filter(job => job.account.client.toBase58() === address);
        const fJobs = allJobs.filter(job =>
          job.account.selectedFreelancer &&
          job.account.selectedFreelancer.toBase58() === address
        );

        setClientJobs(cJobs);
        setFreelancerJobs(fJobs);

        // Fetch KYC status from chain (source of truth)
        const kycStatus = await fetchKycStatusOnChain(program, pubkey);
        setIsKycVerified(kycStatus === 'verified');

        // Fetch juror stake status
        try {
          if (program) {
            const [stakePda] = deriveJurorStakePDA(pubkey);
            // @ts-ignore
            const stakeData = await program.account.jurorStake.fetch(stakePda);
            setIsJuror(stakeData?.active === true);
          }
        } catch { /* no juror stake = not a juror */ }

        // Load CV data and profile from localStorage
        if (typeof window !== 'undefined') {
          try {
            const cvKey = `cv_storage_${address}`;
            const cvStored = localStorage.getItem(cvKey);
            if (cvStored) {
              setSavedCVs(JSON.parse(cvStored));
            }

            const profileKey = `freelancer_profile_${address}`;
            const profileStored = localStorage.getItem(profileKey);
            if (profileStored) {
              setProfileData(JSON.parse(profileStored));
            }
          } catch (e) {
            console.error('Failed to load CV/profile data:', e);
          }
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [address, program]);

  if (loading) {
    return (
      <>
        <Container maxWidth="lg" sx={{ py: 6 }}>
          <LoadingSpinner
            message="Loading profile..."
            logs={[
              { text: 'gPA: ReputationData[user]...', type: 'info' },
              { text: 'gPA: JobData[client | freelancer]...', type: 'info' },
              { text: 'Resolving on-chain identity...', type: 'ok' },
            ]}
          />
        </Container>
      </>
    );
  }

  if (!profileAddress) {
    return (
      <>
        <Container maxWidth="lg">
          <Alert severity="error" sx={{ mt: 4 }}>
            Invalid address
          </Alert>
        </Container>
      </>
    );
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  const hasClientJobs = clientJobs.length > 0;
  const hasFreelancerJobs = freelancerJobs.length > 0;
  const averageRating = reputation ? reputation.averageRating / 10 : 0; // Assuming rating is out of 50 (5.0 * 10)
  const addressStr = address?.toString() || '';

  // Filter jobs by status
  const getJobStatusKey = (status: any) => {
    return typeof status === 'object' ? Object.keys(status)[0] : status;
  };

  // Combine all jobs (as client AND as freelancer)
  const allUserJobs = [...clientJobs, ...freelancerJobs];

  // Filter by status
  const openJobs = allUserJobs.filter(job => getJobStatusKey(job.account.status) === 'open');
  const inProgressJobs = allUserJobs.filter(job => getJobStatusKey(job.account.status) === 'inProgress');
  const completedJobs = allUserJobs.filter(job => getJobStatusKey(job.account.status) === 'completed');

  // Separate counts for clarity
  const clientOpenJobs = clientJobs.filter(job => getJobStatusKey(job.account.status) === 'open');
  const freelancerOpenJobs = freelancerJobs.filter(job => getJobStatusKey(job.account.status) === 'open');
  const clientInProgressJobs = clientJobs.filter(job => getJobStatusKey(job.account.status) === 'inProgress');
  const freelancerInProgressJobs = freelancerJobs.filter(job => getJobStatusKey(job.account.status) === 'inProgress');
  const clientCompletedJobs = clientJobs.filter(job => getJobStatusKey(job.account.status) === 'completed');
  const freelancerCompletedJobs = freelancerJobs.filter(job => getJobStatusKey(job.account.status) === 'completed');

  // Detect user role
  const allJobs = [...clientJobs, ...freelancerJobs];
  const userRole = detectUserRole(
    profileAddress,
    allJobs.map(j => ({ account: j.account, publicKey: j.publicKey })),
    [], // We don't have bids here, but reputation is enough
    reputation
  );
  const experienceLevel = reputation ? getExperienceLevel(reputation.completedJobs) : null;

  const isDark = theme.palette.mode === 'dark';
  const accentColor = theme.palette.primary.main;
  const initials = addressStr.slice(0, 2).toUpperCase();
  // isKycVerified is loaded from chain in loadProfile effect

  return (
    <>
      {/* Profile Hero Header */}
      <Box
        sx={{
          borderBottom: `1px solid ${alpha(accentColor, 0.08)}`,
          background: `linear-gradient(180deg, ${alpha(accentColor, 0.04)} 0%, transparent 100%)`,
          px: { xs: 2, md: 4 },
          py: { xs: 4, md: 5 },
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Big Avatar */}
            <Avatar
              sx={{
                width: 80, height: 80,
                background: `linear-gradient(135deg, ${accentColor} 0%, ${theme.palette.secondary.main} 100%)`,
                color: theme.palette.primary.contrastText, fontFamily: '"Orbitron", monospace',
                fontWeight: 700, fontSize: '1.4rem',
                boxShadow: `0 0 24px ${alpha(accentColor, 0.3)}`,
                flexShrink: 0,
              }}
            >
              {initials}
            </Avatar>

            {/* Identity */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1, alignItems: 'center' }}>
                <Chip
                  label={getRoleDisplayText(userRole)}
                  size="small"
                  color={getRoleColor(userRole)}
                />
                {experienceLevel && userRole.isFreelancer && (
                  <Chip label={experienceLevel.label} size="small" color={experienceLevel.color} />
                )}
                {isKycVerified && <VerifiedBadge size="md" />}
                {isJuror && (
                  <Chip
                    icon={<Gavel sx={{ fontSize: '13px !important' }} />}
                    label="Arbitrator"
                    size="small"
                    sx={{
                      bgcolor: 'rgba(124,58,237,0.1)',
                      color: '#7c3aed',
                      border: '1px solid rgba(124,58,237,0.3)',
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      '& .MuiChip-icon': { color: '#7c3aed' },
                    }}
                  />
                )}
              </Box>
              <Typography
                variant="h5"
                fontWeight={700}
                sx={{ fontFamily: 'monospace', mb: 0.5 }}
              >
                {formatAddress(addressStr)}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontFamily: 'monospace', wordBreak: 'break-all', display: 'block' }}
              >
                {addressStr}
              </Typography>
            </Box>

            {/* Stats row */}
            {reputation && (
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {[
                  { value: reputation.completedJobs.toString(), label: 'jobs done' },
                  { value: averageRating > 0 ? averageRating.toFixed(1) : '—', label: 'avg rating' },
                  { value: reputation.totalReviews.toString(), label: 'reviews' },
                ].map((stat) => (
                  <Box
                    key={stat.label}
                    sx={{
                      textAlign: 'center', px: 2.5, py: 1,
                      border: `1px solid ${alpha(accentColor, 0.15)}`,
                      borderRadius: 2, bgcolor: alpha(accentColor, 0.04),
                    }}
                  >
                    <Typography
                      variant="h5"
                      fontWeight={700}
                      sx={{ fontFamily: '"Orbitron", sans-serif', color: accentColor, lineHeight: 1 }}
                    >
                      {stat.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Grid container spacing={3}>
            {/* Sidebar */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ border: `1px solid ${alpha(accentColor, 0.08)}` }}>
                <CardContent sx={{ p: 2.5 }}>
                  {reputation && (
                    <>
                      <Typography
                        variant="overline"
                        sx={{ color: accentColor, letterSpacing: 3, fontSize: '0.6rem', display: 'block', mb: 2 }}
                      >
                        REPUTATION
                      </Typography>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            sx={{ fontSize: 16, color: averageRating >= i ? '#ffc107' : alpha(theme.palette.text.secondary, isDark ? 0.2 : 0.3) }}
                          />
                        ))}
                        <Typography variant="body2" fontWeight={700} sx={{ ml: 0.5 }}>
                          {averageRating > 0 ? averageRating.toFixed(1) : 'No rating'}
                        </Typography>
                      </Box>

                      {[
                        { label: 'Reviews', value: reputation.totalReviews },
                        { label: 'Jobs Completed', value: reputation.completedJobs, color: '#4caf50' },
                      ].map(({ label, value, color }) => (
                        <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                          <Typography variant="body2" color="text.secondary">{label}</Typography>
                          <Typography variant="body2" fontWeight={700} sx={{ color: color ?? 'text.primary' }}>
                            {value}
                          </Typography>
                        </Box>
                      ))}
                    </>
                  )}

                  {!reputation && (
                    <Box sx={{ py: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                        No on-chain reputation yet. Complete jobs to build your record.
                      </Typography>
                    </Box>
                  )}

                  {/* Hire Directly button */}
                  {viewerKey && viewerKey.toBase58() !== addressStr && userRole.isFreelancer && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<PersonAdd />}
                        onClick={() => router.push(`/jobs/direct-hire?freelancer=${addressStr}`)}
                      >
                        Hire Directly
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Profile Information */}
              {profileData && (
                <Card sx={{ mt: 2.5, border: `1px solid ${alpha(accentColor, 0.08)}` }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography
                      variant="overline"
                      sx={{ color: accentColor, letterSpacing: 3, fontSize: '0.6rem', display: 'block', mb: 2 }}
                    >
                      PROFESSIONAL INFO
                    </Typography>

                    {profileData.title && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 1 }}>
                          TITLE
                        </Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ mt: 0.25 }}>
                          {profileData.title}
                        </Typography>
                      </Box>
                    )}

                    {profileData.hourlyRate && (
                      <Box sx={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        mb: 2, px: 1.5, py: 1,
                        bgcolor: alpha(accentColor, 0.04), borderRadius: 1.5,
                        border: `1px solid ${alpha(accentColor, 0.1)}`,
                      }}>
                        <Typography variant="caption" color="text.secondary">Hourly Rate</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <SolanaIconSimple sx={{ fontSize: 13, color: accentColor }} />
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{ fontFamily: '"Orbitron", sans-serif', color: accentColor, fontSize: '0.8rem' }}
                          >
                            {profileData.hourlyRate}
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    {profileData.skills && (
                      <Box sx={{ mb: profileData.bio ? 2 : 0 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 1, display: 'block', mb: 0.75 }}>
                          SKILLS
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {profileData.skills.split(',').map((skill: string, idx: number) => (
                            <Chip
                              key={idx}
                              label={skill.trim()}
                              size="small"
                              variant="outlined"
                              sx={{
                                fontSize: '0.65rem', height: 20,
                                borderColor: alpha(accentColor, 0.2), color: alpha(accentColor, 0.8),
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}

                    {profileData.bio && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 1, display: 'block', mb: 0.5 }}>
                          BIO
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65, fontSize: '0.8rem' }}>
                          {profileData.bio}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* CV/Resume Section */}
              {savedCVs.length > 0 && (
                <Card sx={{ mt: 2.5, border: `1px solid ${alpha(accentColor, 0.08)}` }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography
                      variant="overline"
                      sx={{ color: accentColor, letterSpacing: 3, fontSize: '0.6rem', display: 'block', mb: 2 }}
                    >
                      DOCUMENTS
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {savedCVs.map((cv: any) => (
                        <Box
                          key={cv.hash}
                          sx={{
                            display: 'flex', alignItems: 'center', gap: 1.5,
                            px: 1.5, py: 1,
                            bgcolor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.04)',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}`,
                            borderRadius: 1.5,
                          }}
                        >
                          {cv.fileName.endsWith('.pdf') ? (
                            <PictureAsPdf sx={{ fontSize: 18, color: '#f44336', flexShrink: 0 }} />
                          ) : (
                            <Description sx={{ fontSize: 18, color: accentColor, flexShrink: 0 }} />
                          )}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={600} noWrap>
                              {cv.fileName}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(cv.uploadedAt).toLocaleDateString()}
                              </Typography>
                              <Chip
                                label="IPFS"
                                size="small"
                                variant="outlined"
                                sx={{ height: 16, fontSize: '0.6rem', borderColor: alpha(accentColor, 0.2), color: alpha(accentColor, 0.7) }}
                              />
                            </Box>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              )}
            </Grid>

            {/* Jobs Tabs */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Box sx={{ border: `1px solid ${alpha(accentColor, 0.08)}`, borderRadius: 2, overflow: 'hidden' }}>
                {/* Tab bar */}
                <Box sx={{ borderBottom: `1px solid ${alpha(accentColor, 0.08)}`, bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                  <Tabs
                    value={tabValue}
                    onChange={(_, newValue) => setTabValue(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                    TabIndicatorProps={{ style: { backgroundColor: accentColor, height: 2 } }}
                    sx={{
                      minHeight: 44,
                      '& .MuiTab-root': {
                        minHeight: 44,
                        textTransform: 'none',
                        fontSize: '0.82rem',
                        fontWeight: 500,
                        color: 'text.secondary',
                        '&.Mui-selected': { color: accentColor, fontWeight: 600 },
                      },
                    }}
                  >
                    <Tab label={`Open (${openJobs.length})`} />
                    <Tab label={`In Progress (${inProgressJobs.length})`} />
                    <Tab label={`Completed (${completedJobs.length})`} />
                    <Tab label="SBTs" />
                  </Tabs>
                </Box>

                <Box sx={{ p: 3 }}>
                  {tabValue === 0 && (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography
                          variant="overline"
                          sx={{ color: accentColor, letterSpacing: 3, fontSize: '0.6rem' }}
                        >
                          OPEN JOBS
                        </Typography>
                        {openJobs.length > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            C:{clientOpenJobs.length} · F:{freelancerOpenJobs.length}
                          </Typography>
                        )}
                      </Box>
                      {openJobs.length === 0 ? (
                        <EmptyState title="No open jobs" message="No jobs currently open" />
                      ) : (
                        <Box sx={{ display: 'grid', gap: 2 }}>
                          {openJobs.map((job) => (
                            <JobCard key={job.publicKey.toString()} job={job} />
                          ))}
                        </Box>
                      )}
                    </>
                  )}

                  {tabValue === 1 && (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography
                          variant="overline"
                          sx={{ color: '#2196f3', letterSpacing: 3, fontSize: '0.6rem' }}
                        >
                          IN PROGRESS
                        </Typography>
                        {inProgressJobs.length > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            C:{clientInProgressJobs.length} · F:{freelancerInProgressJobs.length}
                          </Typography>
                        )}
                      </Box>
                      {inProgressJobs.length === 0 ? (
                        <EmptyState title="No jobs in progress" message="No active work at the moment" />
                      ) : (
                        <Box sx={{ display: 'grid', gap: 2 }}>
                          {inProgressJobs.map((job) => (
                            <JobCard key={job.publicKey.toString()} job={job} />
                          ))}
                        </Box>
                      )}
                    </>
                  )}

                  {tabValue === 2 && (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography
                          variant="overline"
                          sx={{ color: '#4caf50', letterSpacing: 3, fontSize: '0.6rem' }}
                        >
                          COMPLETED
                        </Typography>
                        {completedJobs.length > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            C:{clientCompletedJobs.length} · F:{freelancerCompletedJobs.length}
                          </Typography>
                        )}
                      </Box>
                      {completedJobs.length === 0 ? (
                        <EmptyState title="No completed jobs" message="Complete your first job to build your reputation" />
                      ) : (
                        <Box sx={{ display: 'grid', gap: 2 }}>
                          {completedJobs.map((job) => (
                            <JobCard key={job.publicKey.toString()} job={job} />
                          ))}
                        </Box>
                      )}
                    </>
                  )}

                  {tabValue === 3 && profileAddress && (
                    <>
                      <Box sx={{ mb: 2 }}>
                        <Typography
                          variant="overline"
                          sx={{ color: '#9945ff', letterSpacing: 3, fontSize: '0.6rem', display: 'block', mb: 0.5 }}
                        >
                          SOULBOUND TOKENS
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Non-transferable on-chain proof of completed work.
                        </Typography>
                      </Box>
                      <SBTGallery userPubkey={profileAddress} />
                    </>
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </>
  );
}
