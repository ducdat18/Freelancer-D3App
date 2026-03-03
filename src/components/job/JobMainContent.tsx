import { Box, Card, CardContent } from '@mui/material';
import { PublicKey } from '@solana/web3.js';
import JobActionPanel from './JobActionPanel';
import BidsList from './BidsList';
import MilestoneTimeline from './MilestoneTimeline';

interface JobMainContentProps {
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
  hasMilestones: boolean;
  budgetInSol: number;
  getStatusText: (status: any) => string;
  onWorkSubmit: (deliverables: { hash: string; description: string }[]) => Promise<void>;
  onApproveWork: () => void;
  onRejectWork: () => void;
  onCancelJob: () => Promise<void>;
  onRaiseDispute: () => void;
  onBidOpen: () => void;
  onChatOpen: () => void;
  onBidAccepted: () => void;
}

export default function JobMainContent({
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
  hasMilestones,
  budgetInSol,
  getStatusText,
  onWorkSubmit,
  onApproveWork,
  onRejectWork,
  onCancelJob,
  onRaiseDispute,
  onBidOpen,
  onChatOpen,
  onBidAccepted,
}: JobMainContentProps) {
  return (
    <>
      <JobActionPanel
        job={job}
        metadata={metadata}
        publicKey={publicKey}
        connected={connected}
        jobPda={jobPda}
        workSubmission={workSubmission}
        submittingWork={submittingWork}
        actionLoading={actionLoading}
        dispute={dispute}
        createdAt={createdAt}
        getStatusText={getStatusText}
        onWorkSubmit={onWorkSubmit}
        onApproveWork={onApproveWork}
        onRejectWork={onRejectWork}
        onCancelJob={onCancelJob}
        onRaiseDispute={onRaiseDispute}
        onBidOpen={onBidOpen}
        onChatOpen={onChatOpen}
      />

      {/* Bids List - Show to client only (filtered inside component) */}
      {job && jobPda && (
        <Box sx={{ mt: 3 }}>
          <BidsList
            jobPda={jobPda}
            clientAddress={job.client.toBase58()}
            jobBudgetSol={budgetInSol}
            jobTitle={metadata?.title || job?.title}
            jobDescription={`${job.title}\n\n${job.description}${metadata?.skills?.length ? '\n\nRequired skills: ' + metadata.skills.join(', ') : ''}`}
            onBidAccepted={onBidAccepted}
          />
        </Box>
      )}

      {/* Milestone Timeline - Show if job has milestones */}
      {hasMilestones && jobPda && (
        <Box sx={{ mt: 3 }}>
          <Card>
            <CardContent>
              <MilestoneTimeline
                jobPda={jobPda}
                isClient={!!publicKey && job.client.toBase58() === publicKey.toBase58()}
                isFreelancer={!!publicKey && job.selectedFreelancer && !job.selectedFreelancer.equals(PublicKey.default) && job.selectedFreelancer.toBase58() === publicKey.toBase58()}
                freelancerPubkey={job.selectedFreelancer && !job.selectedFreelancer.equals(PublicKey.default) ? job.selectedFreelancer : undefined}
              />
            </CardContent>
          </Card>
        </Box>
      )}
    </>
  );
}
