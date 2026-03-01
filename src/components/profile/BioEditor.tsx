import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  LinearProgress,
  Alert
} from '@mui/material';

interface BioEditorProps {
  bio: string;
  onBioChange: (bio: string) => void;
  maxLength?: number;
  minLength?: number;
  placeholder?: string;
  readonly?: boolean;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

export default function BioEditor({
  bio,
  onBioChange,
  maxLength = 1000,
  minLength = 0,
  placeholder = "Tell us about yourself, your experience, what makes you unique...",
  readonly = false,
  autoSave = false,
  autoSaveDelay = 2000
}: BioEditorProps) {
  const [localBio, setLocalBio] = useState(bio);
  const [saved, setSaved] = useState(true);

  // Update local bio when prop changes
  useEffect(() => {
    setLocalBio(bio);
  }, [bio]);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || localBio === bio) return;

    setSaved(false);
    const timer = setTimeout(() => {
      onBioChange(localBio);
      setSaved(true);
    }, autoSaveDelay);

    return () => clearTimeout(timer);
  }, [localBio, bio, autoSave, autoSaveDelay, onBioChange]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newBio = event.target.value;
    if (newBio.length <= maxLength) {
      setLocalBio(newBio);
      if (!autoSave) {
        onBioChange(newBio);
      }
    }
  };

  const progress = (localBio.length / maxLength) * 100;
  const isNearLimit = progress > 90;
  const isTooShort = minLength > 0 && localBio.length > 0 && localBio.length < minLength;

  return (
    <Box>
      <TextField
        multiline
        rows={6}
        fullWidth
        value={localBio}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={readonly}
        variant="outlined"
        helperText={
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              {localBio.length}/{maxLength} characters
              {autoSave && !saved && ' (saving...)'}
              {autoSave && saved && localBio !== bio && ' (saved)'}
            </span>
            {isTooShort && (
              <span style={{ color: 'warning.main' }}>
                Minimum {minLength} characters recommended
              </span>
            )}
          </Box>
        }
        sx={{
          '& .MuiInputBase-input': {
            fontSize: '0.95rem',
            lineHeight: 1.6
          }
        }}
      />

      {/* Progress bar */}
      <Box sx={{ mt: 1 }}>
        <LinearProgress
          variant="determinate"
          value={Math.min(progress, 100)}
          color={isNearLimit ? 'warning' : 'primary'}
          sx={{ height: 4, borderRadius: 2 }}
        />
      </Box>

      {/* Warnings */}
      {isNearLimit && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          You're approaching the character limit
        </Alert>
      )}

      {/* Tips */}
      {localBio.length === 0 && !readonly && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2" fontWeight="bold" gutterBottom>
            Tips for a great bio:
          </Typography>
          <Typography variant="body2" component="ul" sx={{ m: 0, pl: 2 }}>
            <li>Highlight your expertise and experience</li>
            <li>Mention specific technologies or skills</li>
            <li>Include notable projects or achievements</li>
            <li>Be authentic and professional</li>
            <li>Keep it concise but informative</li>
          </Typography>
        </Alert>
      )}
    </Box>
  );
}
