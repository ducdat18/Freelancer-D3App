import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  Button,
  Divider,
  Paper,
  Chip,
} from '@mui/material';
import {
  Description,
  Chat,
  CheckCircleOutline,
  CancelOutlined,
} from '@mui/icons-material';
import { PublicKey } from '@solana/web3.js';
import DeliverableSubmit from '../freelancer/DeliverableSubmit';

interface JobActionPanelProps {
  job: any;
  metadata: any;
  publicKey: PublicKey | null;
  connected: boolean;
  jobPda: PublicKey | null;
  workSubmission: any;
  submittingWork: boolean;
  actionLoading: boolean;
  dispute: any;
  createdAt: Date;
  getStatusText: (status: any) => string;
  onWorkSubmit: (deliverables: { hash: string; description: string }[]) => Promise<void>;
  onApproveWork: () => void;
  onRejectWork: () => void;
  onCancelJob: () => Promise<void>;
  onRaiseDispute: () => void;
  onBidOpen: () => void;
  onChatOpen: () => void;
}

export default function JobActionPanel({
  job,
  metadata,
  publicKey,
  connected,
  jobPda,
  workSubmission,
  submittingWork,
  actionLoading,
  dispute,
  createdAt,
  getStatusText,
  onWorkSubmit,
  onApproveWork,
  onRejectWork,
  onCancelJob,
  onRaiseDispute,
  onBidOpen,
  onChatOpen,
}: JobActionPanelProps) {
  const statusText = getStatusText(job.status);
  const isClient = !!publicKey && job.client.toBase58() === publicKey.toBase58();
  const isAssignedFreelancer =
    !!publicKey &&
    job.selectedFreelancer &&
    !job.selectedFreelancer.equals(PublicKey.default) &&
    job.selectedFreelancer.toBase58() === publicKey.toBase58();

  return (
    <Card sx={{ mb: 3, border: '1px solid rgba(0,255,195,0.08)' }}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Description sx={{ fontSize: 18, color: '#00ffc3' }} />
            <Typography variant="h6" fontWeight={700}>Description</Typography>
          </Box>
          <Typography
            variant="body1"
            paragraph
            sx={{ whiteSpace: 'pre-line' }}
          >
            {job.description || 'No description provided'}
          </Typography>
        </Box>

        {metadata && (
          <>
            <Divider sx={{ my: 3, borderColor: 'rgba(0,255,195,0.08)' }} />
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Additional Details
              </Typography>
              {metadata.category && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Category
                  </Typography>
                  <Typography variant="body1">
                    {metadata.category}
                  </Typography>
                </Box>
              )}
              {metadata.skills && metadata.skills.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Required Skills
                  </Typography>
                  <Box
                    sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}
                  >
                    {metadata.skills.map(
                      (skill: string, index: number) => (
                        <Chip
                          key={index}
                          label={skill}
                          size="small"
                          variant="outlined"
                        />
                      )
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          </>
        )}

        {/* Work Submission Display for Client */}
        {connected &&
          publicKey &&
          isClient &&
          workSubmission &&
          statusText === 'In Progress' && (
            <Box sx={{ mt: 4 }}>
              <Divider sx={{ mb: 3, borderColor: 'rgba(0,255,195,0.08)' }} />
              <Paper
                sx={{
                  p: 3,
                  border: '1px solid rgba(76,175,80,0.25)',
                  borderRadius: 2,
                  bgcolor: 'rgba(76,175,80,0.05)',
                }}
              >
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Work Submitted
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Freelancer submitted deliverables on{' '}
                  {new Date(
                    workSubmission.submittedAt?.toNumber() * 1000
                  ).toLocaleDateString()}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Deliverable URI:
                  </Typography>
                  <Typography
                    variant="body2"
                    fontFamily="monospace"
                    sx={{
                      wordBreak: 'break-all',
                      bgcolor: 'background.paper',
                      p: 1,
                      borderRadius: 1,
                      mt: 0.5,
                    }}
                  >
                    {workSubmission.deliverableUri}
                  </Typography>
                </Box>
              </Paper>
            </Box>
          )}

        {connected && publicKey && (
          <Box
            sx={{
              mt: 4,
              display: 'flex',
              gap: 2,
              flexDirection: 'column',
            }}
          >
            {/* Actions for client */}
            {isClient && (
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  flexDirection: 'column',
                }}
              >

                {/* NEW WORKFLOW: Work submitted - waiting for client review */}
                {statusText === 'Waiting For Review' && (
                  <>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      ✅ Freelancer has submitted work! Please review the deliverables below and either approve or reject.
                      <strong> IMPORTANT: You cannot cancel after work submission.</strong>
                    </Alert>

                    {/* DELIVERABLE PREVIEW */}
                    {workSubmission && workSubmission.deliverableUri && (
                      <Card variant="outlined" sx={{ mb: 2, bgcolor: 'background.default' }}>
                        <CardContent>
                          <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                            📦 Submitted Deliverable
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                              Submitted: {new Date(workSubmission.submittedAt?.toNumber() * 1000).toLocaleString()}
                            </Typography>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<CheckCircleOutline />}
                              href={`https://ipfs.io/ipfs/${workSubmission.deliverableUri}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View/Download File
                            </Button>
                          </Box>
                          <Box
                            sx={{
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1,
                              overflow: 'hidden',
                              bgcolor: 'background.paper',
                            }}
                          >
                            <img
                              src={`https://ipfs.io/ipfs/${workSubmission.deliverableUri}`}
                              alt="Deliverable preview"
                              style={{
                                width: '100%',
                                maxHeight: '400px',
                                objectFit: 'contain',
                              }}
                              onError={(e) => {
                                // If image fails to load, show IPFS link instead
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `
                                    <div style="padding: 20px; text-align: center;">
                                      <p>📄 File preview not available</p>
                                      <p style="font-size: 12px; color: #666; word-break: break-all;">
                                        IPFS Hash: ${workSubmission.deliverableUri}
                                      </p>
                                      <a href="https://ipfs.io/ipfs/${workSubmission.deliverableUri}" target="_blank" rel="noopener noreferrer" style="color: #1976d2;">
                                        Click here to view/download
                                      </a>
                                    </div>
                                  `;
                                }
                              }}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    )}

                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Button
                        variant="contained"
                        size="large"
                        fullWidth
                        color="success"
                        startIcon={<CheckCircleOutline />}
                        onClick={onApproveWork}
                        disabled={actionLoading}
                      >
                        Approve & Release Payment
                      </Button>
                      <Button
                        variant="outlined"
                        size="large"
                        fullWidth
                        color="error"
                        startIcon={<CancelOutlined />}
                        onClick={onRejectWork}
                        disabled={actionLoading}
                      >
                        Reject Work
                      </Button>
                    </Box>
                  </>
                )}

                {/* Job rejected by client - show status */}
                {statusText === 'Rejected' && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    ⚠️ You rejected this work. The freelancer can raise a dispute if they disagree. Funds remain locked in escrow until dispute is resolved.
                  </Alert>
                )}

                {/* Show Cancel button only if job is Open or In Progress (before submission) */}
                {(statusText === 'Open' ||
                  (statusText === 'In Progress' && !workSubmission)) && (
                  <Button
                    variant="outlined"
                    size="large"
                    fullWidth
                    color="error"
                    startIcon={<CancelOutlined />}
                    onClick={onCancelJob}
                    disabled={actionLoading}
                  >
                    Cancel Job
                  </Button>
                )}
              </Box>
            )}

            {/* Actions for assigned freelancer */}
            {isAssignedFreelancer && (
              <Box sx={{ mt: 2 }}>
                {/* In Progress: Submit work */}
                {statusText === 'In Progress' && !workSubmission && (
                  <DeliverableSubmit
                    jobId={jobPda?.toBase58() || ''}
                    jobTitle={job.title}
                    onSubmit={onWorkSubmit}
                    loading={submittingWork}
                  />
                )}

                {/* Waiting for Review: Work submitted, awaiting client response */}
                {statusText === 'Waiting For Review' && (
                  <>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      ✅ You have submitted your work! Waiting for client to review and approve.
                    </Alert>

                    {/* SHOW WHAT FREELANCER SUBMITTED */}
                    {workSubmission && workSubmission.deliverableUri && (
                      <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
                        <CardContent>
                          <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                            📦 Your Submitted Deliverable
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                              Submitted: {new Date(workSubmission.submittedAt?.toNumber() * 1000).toLocaleString()}
                            </Typography>
                            <Button
                              size="small"
                              variant="outlined"
                              href={`https://ipfs.io/ipfs/${workSubmission.deliverableUri}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View/Download
                            </Button>
                          </Box>
                          <Box
                            sx={{
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1,
                              overflow: 'hidden',
                              bgcolor: 'background.paper',
                            }}
                          >
                            <img
                              src={`https://ipfs.io/ipfs/${workSubmission.deliverableUri}`}
                              alt="Your submitted deliverable"
                              style={{
                                width: '100%',
                                maxHeight: '300px',
                                objectFit: 'contain',
                              }}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `
                                    <div style="padding: 20px; text-align: center;">
                                      <p>📄 File submitted</p>
                                      <p style="font-size: 12px; color: #666; word-break: break-all;">
                                        IPFS Hash: ${workSubmission.deliverableUri}
                                      </p>
                                      <a href="https://ipfs.io/ipfs/${workSubmission.deliverableUri}" target="_blank" rel="noopener noreferrer" style="color: #1976d2;">
                                        Click here to view/download
                                      </a>
                                    </div>
                                  `;
                                }
                              }}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}

                {/* REJECTED: Client rejected work - show dispute button */}
                {statusText === 'Rejected' && (
                  <>
                    <Alert severity="error" sx={{ mb: 2 }}>
                      ❌ Client rejected your work. If you believe this is unfair, you can raise a dispute for community voting.
                    </Alert>
                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      color="warning"
                      onClick={onRaiseDispute}
                      disabled={actionLoading}
                    >
                      Raise Dispute
                    </Button>
                  </>
                )}

                {/* Disputed: Show dispute status */}
                {statusText === 'Disputed' && (
                  <>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      ⚖️ Dispute in progress. The community is voting to resolve this issue.
                      {dispute && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" display="block">
                            Votes for Client: {dispute.votesForClient} | Votes for Freelancer: {dispute.votesForFreelancer}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Need 5 total votes to resolve
                          </Typography>
                        </Box>
                      )}
                    </Alert>
                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      href="/disputes"
                      sx={{ mb: 2 }}
                    >
                      View All Disputes & Vote
                    </Button>
                  </>
                )}
              </Box>
            )}

            {/* Show bid button if not the job owner and job is open */}
            {!isClient &&
              statusText === 'Open' && (
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={onBidOpen}
                >
                  Submit Bid
                </Button>
              )}

            {/* Chat button - only show if there are bids (for client) or always show for freelancer */}
            {(!isClient ||
              (isClient && job.bidCount > 0)) && (
              <Button
                variant="outlined"
                size="large"
                fullWidth
                startIcon={<Chat />}
                onClick={onChatOpen}
              >
                {isClient
                  ? 'Message Freelancers'
                  : 'Message Client'}
              </Button>
            )}
          </Box>
        )}

        {!connected && (
          <Alert severity="info" sx={{ mt: 4 }}>
            Connect your wallet to submit a bid
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
