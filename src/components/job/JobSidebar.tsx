import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Divider,
  Link as MuiLink,
} from '@mui/material';
import Link from 'next/link';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { formatSol } from '../../types/solana';
import { SolanaIconSimple } from '../SolanaIcon';
import EscrowStatus, { EscrowState } from '../common/EscrowStatus';
import JobStatusTimeline, { JobStatusType } from './JobStatusTimeline';
import MilestoneEscrowStatus from '../common/MilestoneEscrowStatus';
import RiskAssessmentPanel from '../ai/RiskAssessmentPanel';

const formatAddress = (address: any) => {
  const addr = address.toBase58();
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
};

interface JobSidebarProps {
  job: any;
  jobPda: PublicKey | null;
  metadata: any;
  hasEscrow: boolean;
  workSubmission: any;
  hasMilestones: boolean;
  budgetInSol: number;
  escrowInSol: number;
  createdAt: Date;
  updatedAt: Date;
  getStatusText: (status: any) => string;
  getEscrowStatus: () => EscrowState;
}

export default function JobSidebar({
  job,
  jobPda,
  metadata,
  workSubmission,
  hasMilestones,
  budgetInSol,
  escrowInSol,
  createdAt,
  updatedAt,
  getStatusText,
  getEscrowStatus,
}: JobSidebarProps) {
  return (
    <>
      {/* Client Info */}
      <Card sx={{ mb: 2, border: '1px solid rgba(0,255,195,0.08)' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography
            variant="overline"
            sx={{ color: '#00ffc3', letterSpacing: 3, fontSize: '0.6rem', display: 'block', mb: 2 }}
          >
            CLIENT
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              sx={{
                width: 44, height: 44,
                background: 'linear-gradient(135deg, #00ffc3 0%, #9945ff 100%)',
                color: '#000', fontFamily: '"Orbitron", monospace', fontWeight: 700, fontSize: '0.85rem',
              }}
            >
              {job.client.toBase58().slice(0, 2).toUpperCase()}
            </Avatar>
            <Box>
              <Link href={`/profile/${job.client.toBase58()}`} passHref legacyBehavior>
                <MuiLink sx={{ cursor: 'pointer', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  {formatAddress(job.client)}
                </MuiLink>
              </Link>
              <Typography variant="caption" display="block" color="text.secondary">View Profile</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Job Details */}
      <Card sx={{ mb: 2, border: '1px solid rgba(0,255,195,0.08)' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography
            variant="overline"
            sx={{ color: '#00ffc3', letterSpacing: 3, fontSize: '0.6rem', display: 'block', mb: 2 }}
          >
            JOB DETAILS
          </Typography>

          {[
            {
              label: 'Budget',
              value: (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <SolanaIconSimple sx={{ fontSize: 13, color: '#00ffc3' }} />
                  <Typography variant="body2" fontWeight={700} sx={{ fontFamily: '"Orbitron", monospace', color: '#00ffc3', fontSize: '0.82rem' }}>
                    {formatSol(budgetInSol)}
                  </Typography>
                </Box>
              ),
            },
            {
              label: 'Escrow',
              value: (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <SolanaIconSimple sx={{ fontSize: 13 }} />
                  <Typography variant="body2" fontWeight={600}>{formatSol(escrowInSol)}</Typography>
                </Box>
              ),
            },
            { label: 'Bids', value: <Typography variant="body2" fontWeight={700}>{job.bidCount}</Typography> },
            { label: 'Posted', value: <Typography variant="body2" color="text.secondary">{createdAt.toLocaleDateString()}</Typography> },
            { label: 'Updated', value: <Typography variant="body2" color="text.secondary">{updatedAt.toLocaleDateString()}</Typography> },
          ].map(({ label, value }) => (
            <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
              {value}
            </Box>
          ))}

          <Divider sx={{ my: 2, borderColor: 'rgba(0,255,195,0.08)' }} />

          {/* Escrow Status Indicator */}
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Payment Status
          </Typography>
          <EscrowStatus
            status={getEscrowStatus()}
            amount={`${formatSol(budgetInSol)} SOL`}
            size="medium"
          />
        </CardContent>
      </Card>

      {/* Selected Freelancer */}
      {job.selectedFreelancer &&
        !job.selectedFreelancer.equals(PublicKey.default) && (
          <Card sx={{ mb: 2, border: '1px solid rgba(128,132,238,0.15)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography
                variant="overline"
                sx={{ color: '#8084ee', letterSpacing: 3, fontSize: '0.6rem', display: 'block', mb: 2 }}
              >
                ASSIGNED FREELANCER
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar
                  sx={{
                    width: 44, height: 44,
                    background: 'linear-gradient(135deg, #8084ee 0%, #00ffc3 100%)',
                    color: '#000', fontFamily: '"Orbitron", monospace', fontWeight: 700, fontSize: '0.85rem',
                  }}
                >
                  {job.selectedFreelancer.toBase58().slice(0, 2).toUpperCase()}
                </Avatar>
                <Box>
                  <Link href={`/profile/${job.selectedFreelancer.toBase58()}`} passHref legacyBehavior>
                    <MuiLink sx={{ cursor: 'pointer', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {formatAddress(job.selectedFreelancer)}
                    </MuiLink>
                  </Link>
                  <Typography variant="caption" display="block" color="text.secondary">View Profile</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

      {/* Job Status Timeline */}
      <Card sx={{ mt: 2, border: '1px solid rgba(0,255,195,0.08)' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography
            variant="overline"
            sx={{ color: '#00ffc3', letterSpacing: 3, fontSize: '0.6rem', display: 'block', mb: 2 }}
          >
            PROGRESS
          </Typography>
          <JobStatusTimeline
            status={getStatusText(job.status) as JobStatusType}
            hasWorkSubmission={!!workSubmission}
            bidCount={job.bidCount}
            selectedFreelancer={
              job.selectedFreelancer &&
              !job.selectedFreelancer.equals(PublicKey.default)
            }
          />
        </CardContent>
      </Card>

      {/* Milestone Escrow Status */}
      {hasMilestones && jobPda && (
        <Card sx={{ mt: 2, border: '1px solid rgba(0,255,195,0.08)' }}>
          <CardContent sx={{ p: 2.5 }}>
            <MilestoneEscrowStatus jobPda={jobPda} />
          </CardContent>
        </Card>
      )}

      {/* AI Risk Assessment */}
      {getStatusText(job.status) === 'Open' && (
        <Box sx={{ mt: 2 }}>
          <RiskAssessmentPanel
            jobDescription={`${job.title}\n\n${job.description}${metadata?.skills?.length ? '\n\nRequired skills: ' + metadata.skills.join(', ') : ''}`}
            jobTitle={job.title}
          />
        </Box>
      )}

      {/* IPFS Metadata */}
      {job.metadataUri && (
        <Card sx={{ mt: 2, border: '1px solid rgba(0,255,195,0.06)' }}>
          <CardContent sx={{ p: 2 }}>
            <Typography
              variant="overline"
              sx={{ color: 'text.secondary', letterSpacing: 2, fontSize: '0.58rem', display: 'block', mb: 1 }}
            >
              IPFS METADATA
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}
            >
              {job.metadataUri}
            </Typography>
          </CardContent>
        </Card>
      )}
    </>
  );
}
