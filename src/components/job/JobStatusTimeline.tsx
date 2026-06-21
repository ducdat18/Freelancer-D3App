import { Box, Typography, Stepper, Step, StepLabel, StepContent, useTheme } from '@mui/material';
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

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
      <Box sx={{ p: 2, bgcolor: isDark ? 'rgba(255,152,0,0.1)' : 'rgba(255,152,0,0.05)', border: 1, borderColor: 'warning.light', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Cancel color="warning" />
          <Typography variant="h6" fontWeight={600} color="warning.main">
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
          p: 2,
          bgcolor: isDark ? 'rgba(255,0,255,0.08)' : 'rgba(255,0,255,0.04)',
          border: 1,
          borderColor: theme.palette.error.main,
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Gavel sx={{ color: theme.palette.error.main }} />
          <Typography variant="h6" fontWeight={600} color={theme.palette.error.main}>
            Under Dispute
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
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
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: isCompleted
                        ? 'success.main'
                        : isActive
                        ? 'primary.main'
                        : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                      color: isCompleted || isActive ? 'white' : 'text.disabled',
                    }}
                  >
                    <Icon sx={{ fontSize: 16 }} />
                  </Box>
                )}
              >
                <Typography
                  variant="body2"
                  fontWeight={isActive ? 700 : 500}
                  color={isActive ? 'primary.main' : 'text.primary'}
                >
                  {step.label}
                </Typography>
              </StepLabel>
              <StepContent>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5, display: 'block' }}>
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
            p: 1.5,
            bgcolor: isDark ? 'rgba(76,175,80,0.12)' : 'rgba(76,175,80,0.08)',
            border: 1,
            borderColor: 'success.light',
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <CheckCircle color="success" sx={{ fontSize: 18 }} />
          <Typography variant="body2" fontWeight={600} color="success.main">
            Job completed successfully!
          </Typography>
        </Box>
      )}
    </Box>
  );
}
