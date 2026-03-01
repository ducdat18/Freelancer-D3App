import React from 'react';
import {
  Box,
  Autocomplete,
  TextField,
  Chip,
  Stack
} from '@mui/material';
import { ALL_SKILLS, POPULAR_SKILLS } from '../../config/categories';

interface SkillFilterProps {
  selectedSkills: string[];
  onChange: (skills: string[]) => void;
  availableSkills?: string[];
  maxSkills?: number;
}

export default function SkillFilter({
  selectedSkills,
  onChange,
  availableSkills = ALL_SKILLS,
  maxSkills = 10
}: SkillFilterProps) {
  const handleChange = (event: any, newValue: string[]) => {
    if (newValue.length <= maxSkills) {
      onChange(newValue);
    }
  };

  return (
    <Box>
      <Autocomplete
        multiple
        options={availableSkills}
        value={selectedSkills}
        onChange={handleChange}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Skills"
            placeholder={selectedSkills.length === 0 ? "Select skills..." : ""}
            helperText={`${selectedSkills.length}/${maxSkills} skills selected`}
          />
        )}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              label={option}
              {...getTagProps({ index })}
              key={option}
              size="small"
            />
          ))
        }
        filterOptions={(options, state) => {
          const inputValue = state.inputValue.toLowerCase();

          // Filter options that match input and aren't already selected
          const filtered = options.filter(option =>
            option.toLowerCase().includes(inputValue) &&
            !selectedSkills.includes(option)
          );

          // Prioritize popular skills in results
          const popular = filtered.filter(opt => POPULAR_SKILLS.includes(opt));
          const others = filtered.filter(opt => !POPULAR_SKILLS.includes(opt));

          return [...popular, ...others].slice(0, 20);
        }}
        disabled={selectedSkills.length >= maxSkills}
        sx={{ minWidth: 250 }}
      />

      {/* Quick Select Popular Skills */}
      {selectedSkills.length === 0 && (
        <Box sx={{ mt: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {POPULAR_SKILLS.slice(0, 8).map(skill => (
              <Chip
                key={skill}
                label={skill}
                size="small"
                onClick={() => onChange([...selectedSkills, skill])}
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'primary.light',
                    color: 'primary.contrastText'
                  }
                }}
              />
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}
