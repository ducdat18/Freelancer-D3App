import React, { useState } from 'react';
import {
  Box,
  Avatar,
  Button,
  IconButton,
  CircularProgress,
  Typography,
  Alert
} from '@mui/material';
import { PhotoCamera, Delete } from '@mui/icons-material';
import { useIPFS } from '../../hooks/useIPFS';

interface AvatarUploadProps {
  avatarUri?: string;
  walletAddress?: string;
  onAvatarChange: (uri: string) => Promise<void>;
  size?: number;
  readonly?: boolean;
}

export default function AvatarUpload({
  avatarUri,
  walletAddress,
  onAvatarChange,
  size = 120,
  readonly = false
}: AvatarUploadProps) {
  const { uploadFile } = useIPFS();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid image file (JPG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('Image size must be less than 5MB');
      return;
    }

    try {
      setUploading(true);

      // Show preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to IPFS
      const ipfsHash = await uploadFile(file);

      // Update avatar
      if (ipfsHash) {
        await onAvatarChange(ipfsHash);
      } else {
        throw new Error('Failed to upload file to IPFS');
      }

      setPreview(null);
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload avatar');
      setPreview(null);
    } finally {
      setUploading(false);
    }

    // Clear input
    event.target.value = '';
  };

  const handleRemove = async () => {
    try {
      setError(null);
      setUploading(true);
      await onAvatarChange('');
      setPreview(null);
    } catch (err) {
      console.error('Error removing avatar:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove avatar');
    } finally {
      setUploading(false);
    }
  };

  // Generate initials from wallet address
  const getInitials = () => {
    if (!walletAddress) return '?';
    return walletAddress.slice(0, 2).toUpperCase();
  };

  // Get avatar URL (IPFS or preview)
  const getAvatarUrl = () => {
    if (preview) return preview;
    if (avatarUri) {
      // Check if it's an IPFS hash
      if (avatarUri.startsWith('Qm') || avatarUri.startsWith('bafy')) {
        return `https://gateway.pinata.cloud/ipfs/${avatarUri}`;
      }
      return avatarUri;
    }
    return null;
  };

  const avatarUrl = getAvatarUrl();

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box sx={{ position: 'relative', display: 'inline-block' }}>
        <Avatar
          src={avatarUrl || undefined}
          sx={{
            width: size,
            height: size,
            fontSize: size / 3,
            bgcolor: 'primary.main',
            border: '4px solid',
            borderColor: 'background.paper',
            boxShadow: 3
          }}
        >
          {!avatarUrl && getInitials()}
        </Avatar>

        {!readonly && (
          <>
            {/* Upload button */}
            <IconButton
              component="label"
              disabled={uploading}
              sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark'
                },
                boxShadow: 2
              }}
            >
              {uploading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <PhotoCamera fontSize="small" />
              )}
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleFileSelect}
                disabled={uploading}
              />
            </IconButton>

            {/* Remove button */}
            {avatarUri && !uploading && (
              <IconButton
                onClick={handleRemove}
                sx={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  bgcolor: 'error.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'error.dark'
                  },
                  boxShadow: 2,
                  width: 32,
                  height: 32
                }}
                size="small"
              >
                <Delete fontSize="small" />
              </IconButton>
            )}
          </>
        )}
      </Box>

      {!readonly && (
        <Box sx={{ mt: 2 }}>
          <Button
            component="label"
            variant="outlined"
            size="small"
            disabled={uploading}
            startIcon={uploading ? <CircularProgress size={16} /> : <PhotoCamera />}
          >
            {avatarUri ? 'Change Avatar' : 'Upload Avatar'}
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={handleFileSelect}
              disabled={uploading}
            />
          </Button>
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
            JPG, PNG, GIF or WebP. Max 5MB.
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}
