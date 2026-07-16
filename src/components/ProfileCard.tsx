import {
  Card,
  CardContent,
  Typography,
  Avatar,
  Box,
  Chip,
  Rating,
  Divider,
  useTheme,
} from '@mui/material';
import type { UserProfile } from '../types';
import { formatAddress, formatWeiToEth } from '../utils/format';
import { SolanaIconSimple } from './SolanaIcon';

interface ProfileCardProps {
  profile: UserProfile;
}

export default function ProfileCard({ profile }: ProfileCardProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primaryMain = theme.palette.primary.main;

  const completionRate =
    profile.reputation.totalJobs > 0
      ? (profile.reputation.completedJobs / profile.reputation.totalJobs) * 100
      : 0;

  return (
    <Card sx={{ border: 1, borderColor: 'divider', transition: 'all 0.2s ease', '&:hover': { borderColor: primaryMain, boxShadow: isDark ? `0 0 20px ${primaryMain}15` : '0 4px 12px rgba(0,0,0,0.05)' } }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Avatar src={profile.avatarUrl} sx={{ width: 72, height: 72, mr: 2, border: 2, borderColor: primaryMain }}>
            {profile.address.slice(0, 2).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {profile.name || formatAddress(profile.address)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              {formatAddress(profile.address, 8)}
            </Typography>
            <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
              {profile.isFreelancer && (
                <Chip label="Freelancer" size="small" color="primary" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
              )}
              {profile.isClient && (
                <Chip label="Client" size="small" color="secondary" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
              )}
            </Box>
          </Box>
        </Box>

        {profile.bio && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic', lineHeight: 1.6 }}>
            &quot;{profile.bio}&quot;
          </Typography>
        )}

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ letterSpacing: 0.5 }}>
              AVERAGE RATING
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Rating
                value={profile.reputation.averageRating}
                readOnly
                precision={0.1}
                size="small"
              />
              <Typography variant="body2" fontWeight={700}>
                {profile.reputation.averageRating.toFixed(1)}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            TOTAL JOBS
          </Typography>
          <Typography variant="body2" fontWeight={700}>
            {profile.reputation.totalJobs}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            COMPLETED
          </Typography>
          <Typography variant="body2" fontWeight={700} color="success.main">
            {profile.reputation.completedJobs} ({completionRate.toFixed(0)}%)
          </Typography>
        </Box>

        {profile.isFreelancer && profile.hourlyRate && (
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, alignItems: 'center' }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              HOURLY RATE
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <SolanaIconSimple sx={{ fontSize: 14, color: primaryMain }} />
              <Typography variant="body2" fontWeight={700} color="primary.main">
                {formatWeiToEth(profile.hourlyRate)}/hr
              </Typography>
            </Box>
          </Box>
        )}

        {profile.isClient && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              TOTAL SPENT
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <SolanaIconSimple sx={{ fontSize: 14, color: primaryMain }} />
              <Typography variant="body2" fontWeight={700} color="primary.main">
                {formatWeiToEth(profile.reputation.totalSpent)}
              </Typography>
            </Box>
          </Box>
        )}

        {profile.skills && profile.skills.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" color="text.secondary" gutterBottom fontWeight={600} sx={{ display: 'block', mb: 1 }}>
              SKILLS
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {profile.skills.map((skill, index) => (
                <Chip
                  key={index}
                  label={skill}
                  size="small"
                  variant="outlined"
                  sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600, borderColor: 'divider' }}
                />
              ))}
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}
