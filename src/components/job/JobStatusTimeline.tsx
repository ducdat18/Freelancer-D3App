import { Box, Typography, Stepper, Step, StepLabel, StepContent } from '@mui/material';
import {
  CheckCircle,
  Schedule,
  Assignment,
  RateReview,
  Cancel,
  Gavel,
} from '@mui/icons-material';

export type JobStatusType = 'Open' | 'In Progress' | 'Completed' | 'Cancelled' | 'Disputed';

interface JobStatusTimelineProps {
  status: JobStatusType;
  hasWorkSubmission?: boolean;
  bidCount?: number;
  selectedFreelancer?: boolean;
}

export default function JobStatusTimeline({
  status,
  hasWorkSubmission = false,
  bidCount = 0,
  selectedFreelancer = false,
}: JobStatusTimelineProps) {
  const getActiveStep = () => {
    if (status === 'Cancelled') return -1;
    if (status === 'Disputed') return -1;
    if (status === 'Completed') return 4;
    if (status === 'In Progress') {
      if (hasWorkSubmission) return 3;
      if (selectedFreelancer) return 2;
      return 1;
    }
    if (status === 'Open') return 0;
    return 0;
  };

  const activeStep = getActiveStep();

  // Different flow for cancelled/disputed
  if (status === 'Cancelled') {
    return (
      <Box sx={{ p: 3, bgcolor: 'warning.light', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Cancel color="warning" />
          <Typography variant="h6" fontWeight={600}>
            Job Cancelled
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          This job was cancelled and any escrow funds were refunded.
        </Typography>
      </Box>
    );
  }

  if (status === 'Disputed') {
    return (
      <Box
        sx={{
          p: 3,
          bgcolor: 'rgba(255,0,255,0.08)',
          border: '2px solid #ff00ff',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Gavel sx={{ color: '#ff55ff' }} />
          <Typography variant="h6" fontWeight={600} color="#ff55ff">
            Under Dispute Resolution
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
          This job is currently in dispute. Arbitrators are voting to resolve the issue.
        </Typography>
      </Box>
    );
  }

  const steps = [
    {
      label: 'Job Posted',
      description: bidCount > 0 ? `${bidCount} bid${bidCount === 1 ? '' : 's'} received` : 'Waiting for bids...',
      icon: Schedule,
    },
    {
      label: 'Freelancer Selected',
      description: selectedFreelancer
        ? 'Freelancer assigned to job'
        : 'Client reviewing bids',
      icon: Assignment,
    },
    {
      label: 'Work In Progress',
      description: hasWorkSubmission
        ? 'Work submitted by freelancer'
        : 'Freelancer working on deliverables',
      icon: Assignment,
    },
    {
      label: 'Client Review',
      description: hasWorkSubmission
        ? 'Awaiting client approval'
        : 'Pending work submission',
      icon: RateReview,
    },
    {
      label: 'Completed',
      description: 'Payment released & review submitted',
      icon: CheckCircle,
    },
  ];

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} gutterBottom sx={{ mb: 2 }}>
        Job Progress
      </Typography>
      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === activeStep;
          const isCompleted = index < activeStep;

          return (
            <Step key={step.label} completed={isCompleted}>
              <StepLabel
                StepIconComponent={() => (
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: isCompleted
                        ? 'success.main'
                        : isActive
                        ? 'primary.main'
                        : 'grey.300',
                      color: 'white',
                    }}
                  >
                    <Icon sx={{ fontSize: 18 }} />
                  </Box>
                )}
              >
                <Typography
                  variant="body1"
                  fontWeight={isActive ? 600 : 400}
                  color={isActive ? 'primary' : 'text.primary'}
                >
                  {step.label}
                </Typography>
              </StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  {step.description}
                </Typography>
              </StepContent>
            </Step>
          );
        })}
      </Stepper>

      {status === 'Completed' && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            bgcolor: 'success.light',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <CheckCircle color="success" />
          <Typography variant="body2" fontWeight={600} color="success.dark">
            Job completed successfully!
          </Typography>
        </Box>
      )}
    </Box>
  );
}
