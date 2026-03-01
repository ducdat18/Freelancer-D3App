import { useState, useEffect } from 'react'
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Alert,
  Divider,
  Stack,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
} from '@mui/material'
import { Save, Person, Delete, PictureAsPdf, Description, CloudUpload } from '@mui/icons-material'
import { useWallet } from '@solana/wallet-adapter-react'
import Layout from '../../src/components/Layout'
import PortfolioUpload from '../../src/components/freelancer/PortfolioUpload'
import { useCVStorage } from '../../src/hooks/useCVStorage'
import { uploadFileToIPFS } from '../../src/services/ipfs'

interface FreelancerProfile {
  name: string
  title: string
  bio: string
  skills: string
  hourlyRate: string
  portfolioHashes: string[]
}

export default function FreelancerProfile() {
  const { publicKey } = useWallet()
  const [profile, setProfile] = useState<FreelancerProfile>({
    name: '',
    title: '',
    bio: '',
    skills: '',
    hourlyRate: '',
    portfolioHashes: [],
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [uploading, setUploading] = useState(false)

  // CV Storage
  const { savedCVs, saveCV, deleteCV } = useCVStorage()

  // Load profile from localStorage
  useEffect(() => {
    if (publicKey) {
      const stored = localStorage.getItem(`freelancer_profile_${publicKey.toString()}`)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setProfile(parsed)
        } catch (e) {
          console.error('Failed to parse profile:', e)
        }
      }
    }
  }, [publicKey])

  const handleInputChange = (field: keyof FreelancerProfile) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setProfile((prev) => ({
      ...prev,
      [field]: e.target.value,
    }))
  }

  const handlePortfolioUpload = (hash: string) => {
    if (hash) {
      setProfile((prev) => ({
        ...prev,
        portfolioHashes: [...prev.portfolioHashes, hash],
      }))
    }
  }

  const handleSaveProfile = async () => {
    if (!publicKey) {
      alert('Please connect your wallet first')
      return
    }

    setSaving(true)
    setSuccess(false)

    try {
      localStorage.setItem(
        `freelancer_profile_${publicKey.toString()}`,
        JSON.stringify(profile)
      )

      setSuccess(true)
      setTimeout(() => setSuccess(false), 5000)
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Handle CV file upload
  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf',
    ]

    if (!allowedTypes.includes(file.type)) {
      alert('Please upload PDF, DOC, DOCX, RTF, or TXT files only')
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }

    setUploading(true)
    try {
      await saveCV(file)
      alert('CV uploaded successfully!')
      // Reset input
      e.target.value = ''
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Failed to upload CV. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteCV = (hash: string) => {
    if (confirm('Are you sure you want to delete this CV?')) {
      deleteCV(hash)
    }
  }

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.pdf')) return <PictureAsPdf color="error" />
    return <Description color="primary" />
  }

  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Person fontSize="large" color="primary" />
            <Box>
              <Typography variant="h4" fontWeight={700}>
                Freelancer Profile
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Complete your profile to attract more clients
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Success Message */}
          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Profile saved successfully!
            </Alert>
          )}

          {/* Wallet Warning */}
          {!publicKey && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              Please connect your wallet to manage your profile
            </Alert>
          )}

          {/* Basic Information */}
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Basic Information
          </Typography>

          <Stack spacing={2} sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 300px' }}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={profile.name}
                  onChange={handleInputChange('name')}
                  disabled={!publicKey}
                  required
                />
              </Box>
              <Box sx={{ flex: '1 1 300px' }}>
                <TextField
                  fullWidth
                  label="Professional Title"
                  placeholder="e.g. Full Stack Developer"
                  value={profile.title}
                  onChange={handleInputChange('title')}
                  disabled={!publicKey}
                  required
                />
              </Box>
            </Box>
            <TextField
              fullWidth
              label="Bio / About Me"
              placeholder="Tell clients about yourself, your experience, and what makes you unique..."
              value={profile.bio}
              onChange={handleInputChange('bio')}
              disabled={!publicKey}
              multiline
              rows={4}
              required
            />
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '2 1 400px' }}>
                <TextField
                  fullWidth
                  label="Skills"
                  placeholder="e.g. React, Solana, Web3, TypeScript"
                  value={profile.skills}
                  onChange={handleInputChange('skills')}
                  disabled={!publicKey}
                  helperText="Separate skills with commas"
                />
              </Box>
              <Box sx={{ flex: '1 1 200px' }}>
                <TextField
                  fullWidth
                  label="Hourly Rate (SOL)"
                  placeholder="0.5"
                  value={profile.hourlyRate}
                  onChange={handleInputChange('hourlyRate')}
                  disabled={!publicKey}
                  type="number"
                  inputProps={{ step: '0.1', min: '0' }}
                />
              </Box>
            </Box>
          </Stack>

          <Divider sx={{ mb: 3 }} />

          {/* CV Management */}
          <Typography variant="h6" fontWeight={600} gutterBottom>
            CV / Resume Management
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload your CVs here. You can reuse them when submitting bids.
          </Typography>

          {/* CV Upload Button */}
          <Box sx={{ mb: 3 }}>
            <input
              accept="application/pdf,.doc,.docx,.rtf,.txt"
              style={{ display: 'none' }}
              id="cv-upload-input"
              type="file"
              onChange={handleCVUpload}
              disabled={!publicKey || uploading}
            />
            <label htmlFor="cv-upload-input">
              <Button
                variant="outlined"
                component="span"
                startIcon={uploading ? null : <CloudUpload />}
                disabled={!publicKey || uploading}
                fullWidth
              >
                {uploading ? 'Uploading...' : 'Upload New CV'}
              </Button>
            </label>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Supported: PDF, DOC, DOCX, RTF, TXT (Max 10MB)
            </Typography>
          </Box>

          {/* Saved CVs List */}
          {savedCVs.length > 0 ? (
            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Your Saved CVs ({savedCVs.length})
                </Typography>
                <Chip label="Ready to use in bids" size="small" color="success" variant="outlined" />
              </Box>
              <List>
                {savedCVs.map((cv, index) => (
                  <ListItem
                    key={cv.hash}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1,
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Box sx={{ mr: 2 }}>
                      {getFileIcon(cv.fileName)}
                    </Box>
                    <ListItemText
                      primary={cv.fileName}
                      secondary={
                        <Box component="span" sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            Uploaded: {new Date(cv.uploadedAt).toLocaleDateString()}
                          </Typography>
                          <Chip label="IPFS" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleDeleteCV(cv.hash)}
                        disabled={!publicKey}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  💡 These CVs are saved to your wallet and can be quickly selected when bidding on jobs!
                </Typography>
              </Alert>
            </Paper>
          ) : (
            <Alert severity="info" sx={{ mb: 3 }}>
              No CVs uploaded yet. Upload your CV to quickly apply for jobs!
            </Alert>
          )}

          <Divider sx={{ mb: 3 }} />

          {/* Portfolio Upload */}
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Portfolio Samples
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload samples of your previous work to showcase your skills
          </Typography>

          <Box sx={{ mb: 4 }}>
            <PortfolioUpload onUploadComplete={handlePortfolioUpload} disabled={!publicKey} />
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Save Button */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button variant="outlined" onClick={() => window.history.back()}>
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSaveProfile}
              disabled={!publicKey || saving}
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </Box>

        </Paper>
      </Container>
    </Layout>
  )
}
