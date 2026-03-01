import {
  Card,
  CardContent,
  Typography,
  Avatar,
  Box,
  Chip,
  Rating,
  Divider,
} from '@mui/material';
import type { UserProfile } from '../types';
import { formatAddress, formatWeiToEth } from '../utils/format';
import { SolanaIconSimple } from './SolanaIcon';

interface ProfileCardProps {
  profile: UserProfile;
}

export default function ProfileCard({ profile }: ProfileCardProps) {
  const completionRate =
    profile.reputation.totalJobs > 0
      ? (profile.reputation.completedJobs / profile.reputation.totalJobs) * 100
      : 0;

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Avatar src={profile.avatarUrl} sx={{ width: 80, height: 80, mr: 2 }}>
            {profile.address.slice(2, 4).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h5">
              {profile.name || formatAddress(profile.address)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatAddress(profile.address, 8)}
            </Typography>
            <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
              {profile.isFreelancer && (
                <Chip label="Freelancer" size="small" color="primary" />
              )}
              {profile.isClient && (
                <Chip label="Client" size="small" color="secondary" />
              )}
            </Box>
          </Box>
        </Box>

        {profile.bio && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {profile.bio}
          </Typography>
        )}

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Average Rating
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Rating
                value={profile.reputation.averageRating}
                readOnly
                precision={0.1}
              />
              <Typography variant="body2">
                ({profile.reputation.averageRating.toFixed(1)})
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Total Jobs
          </Typography>
          <Typography variant="body2" fontWeight="bold">
            {profile.reputation.totalJobs}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Completed
          </Typography>
          <Typography variant="body2" fontWeight="bold" color="success.main">
            {profile.reputation.completedJobs} ({completionRate.toFixed(0)}%)
          </Typography>
        </Box>

        {profile.isFreelancer && profile.hourlyRate && (
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}
          >
            <Typography variant="body2" color="text.secondary">
              Hourly Rate
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <SolanaIconSimple sx={{ fontSize: 14 }} />
              <Typography variant="body2" fontWeight="bold">
                {formatWeiToEth(profile.hourlyRate)}/hr
              </Typography>
            </Box>
          </Box>
        )}

        {profile.isClient && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Total Spent
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <SolanaIconSimple sx={{ fontSize: 14 }} />
              <Typography variant="body2" fontWeight="bold">
                {formatWeiToEth(profile.reputation.totalSpent)}
              </Typography>
            </Box>
          </Box>
        )}

        {profile.skills && profile.skills.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Skills
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {profile.skills.map((skill, index) => (
                <Chip
                  key={index}
                  label={skill}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}
