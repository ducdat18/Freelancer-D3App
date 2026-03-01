import React, { useState } from 'react';
import {
  Box,
  Chip,
  Autocomplete,
  TextField,
  Typography,
  Stack,
  Alert
} from '@mui/material';
import { ALL_SKILLS, POPULAR_SKILLS } from '../../config/categories';

interface SkillsManagerProps {
  skills: string[];
  onSkillsChange: (skills: string[]) => void;
  maxSkills?: number;
  suggestedSkills?: string[];
  readonly?: boolean;
}

export default function SkillsManager({
  skills,
  onSkillsChange,
  maxSkills = 15,
  suggestedSkills = POPULAR_SKILLS,
  readonly = false
}: SkillsManagerProps) {
  const [inputValue, setInputValue] = useState('');

  const handleAddSkill = (event: any, newValue: string | null) => {
    if (!newValue || !newValue.trim()) return;

    const trimmedSkill = newValue.trim();

    // Check if skill already exists (case-insensitive)
    if (skills.some(s => s.toLowerCase() === trimmedSkill.toLowerCase())) {
      return;
    }

    // Check max skills limit
    if (skills.length >= maxSkills) {
      return;
    }

    onSkillsChange([...skills, trimmedSkill]);
    setInputValue('');
  };

  const handleDeleteSkill = (skillToDelete: string) => {
    if (readonly) return;
    onSkillsChange(skills.filter(skill => skill !== skillToDelete));
  };

  const handleAddSuggestedSkill = (skill: string) => {
    if (readonly || skills.includes(skill) || skills.length >= maxSkills) return;
    onSkillsChange([...skills, skill]);
  };

  const availableSuggestedSkills = suggestedSkills.filter(
    skill => !skills.includes(skill)
  );

  return (
    <Box>
      <Stack spacing={2}>
        {/* Skill Input */}
        {!readonly && (
          <Box>
            <Autocomplete
              freeSolo
              options={ALL_SKILLS}
              value={null}
              inputValue={inputValue}
              onInputChange={(_, newValue) => setInputValue(newValue)}
              onChange={handleAddSkill}
              disabled={skills.length >= maxSkills}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Add Skills"
                  placeholder={skills.length >= maxSkills ? `Maximum ${maxSkills} skills reached` : "Type or select a skill"}
                  helperText={`${skills.length}/${maxSkills} skills added`}
                />
              )}
              filterOptions={(options, state) => {
                const filtered = options.filter(option =>
                  option.toLowerCase().includes(state.inputValue.toLowerCase()) &&
                  !skills.includes(option)
                );
                return filtered.slice(0, 10); // Limit suggestions to 10
              }}
            />
          </Box>
        )}

        {/* Current Skills */}
        {skills.length > 0 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Your Skills ({skills.length}/{maxSkills})
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {skills.map((skill) => (
                <Chip
                  key={skill}
                  label={skill}
                  onDelete={readonly ? undefined : () => handleDeleteSkill(skill)}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Suggested Skills */}
        {!readonly && availableSuggestedSkills.length > 0 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom color="text.secondary">
              Popular Skills (Click to add)
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {availableSuggestedSkills.slice(0, 10).map((skill) => (
                <Chip
                  key={skill}
                  label={skill}
                  onClick={() => handleAddSuggestedSkill(skill)}
                  variant="outlined"
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                  disabled={skills.length >= maxSkills}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Warning when limit reached */}
        {!readonly && skills.length >= maxSkills && (
          <Alert severity="info">
            You've reached the maximum of {maxSkills} skills. Remove some skills to add new ones.
          </Alert>
        )}

        {/* Empty state */}
        {skills.length === 0 && readonly && (
          <Typography variant="body2" color="text.secondary">
            No skills added yet
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
