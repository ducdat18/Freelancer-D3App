import { useState } from 'react'
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  IconButton, 
  CircularProgress,
  Alert,
  Stack,
  Chip
} from '@mui/material'
import { 
  CloudUpload, 
  Close, 
  Image as ImageIcon,
  InsertDriveFile 
} from '@mui/icons-material'
import { uploadToIPFS } from '@/services/ipfs'

interface EvidenceUploadProps {
  onUploadComplete: (ipfsUri: string) => Promise<void>
  uploaderRole: 'client' | 'freelancer'
  disabled?: boolean
}

export default function EvidenceUpload({ 
  onUploadComplete, 
  uploaderRole,
  disabled = false 
}: EvidenceUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      setError('Only images (JPG, PNG, GIF, WEBP) and PDF files are allowed')
      return
    }

    setSelectedFile(file)
    setError(null)

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setPreviewUrl(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    setError(null)
    setSuccess(null)

    try {
      // Upload to IPFS
      const ipfsHash = await uploadToIPFS(selectedFile)
      const ipfsUri = `ipfs://${ipfsHash}`

      // Call parent callback to add evidence to blockchain
      await onUploadComplete(ipfsUri)

      setSuccess(`Evidence uploaded successfully! IPFS: ${ipfsHash.slice(0, 8)}...`)
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setSelectedFile(null)
        setPreviewUrl(null)
        setSuccess(null)
      }, 2000)
    } catch (err: any) {
      console.error('Error uploading evidence:', err)
      setError(err.message || 'Failed to upload evidence')
    } finally {
      setUploading(false)
    }
  }

  const handleCancel = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setError(null)
    setSuccess(null)
  }

  const isImage = selectedFile?.type.startsWith('image/')

  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        background: 'linear-gradient(135deg, rgba(21, 101, 192, 0.05) 0%, rgba(156, 39, 176, 0.05) 100%)',
        border: '1px solid',
        borderColor: 'primary.light',
        borderRadius: 2,
      }}
    >
      <Stack spacing={2}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CloudUpload color="primary" />
          <Typography variant="h6" color="primary">
            Upload Evidence
          </Typography>
          <Chip 
            label={uploaderRole === 'client' ? 'Client' : 'Freelancer'} 
            size="small" 
            color={uploaderRole === 'client' ? 'primary' : 'secondary'}
          />
        </Box>

        <Typography variant="body2" color="text.secondary">
          Upload images or documents to support your case. Max 10MB per file.
        </Typography>

        {/* Error/Success Messages */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* File Upload Area */}
        {!selectedFile ? (
          <Box
            sx={{
              border: '2px dashed',
              borderColor: 'primary.main',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.5 : 1,
              transition: 'all 0.3s',
              '&:hover': disabled ? {} : {
                borderColor: 'primary.dark',
                bgcolor: 'rgba(21, 101, 192, 0.05)',
              },
            }}
            onClick={() => !disabled && document.getElementById('evidence-file-input')?.click()}
          >
            <input
              id="evidence-file-input"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              disabled={disabled}
            />
            <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="body1" color="primary" fontWeight="bold">
              Click to select a file
            </Typography>
            <Typography variant="caption" color="text.secondary">
              JPG, PNG, GIF, WEBP, or PDF (max 10MB)
            </Typography>
          </Box>
        ) : (
          <Paper
            elevation={1}
            sx={{
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              {/* Preview */}
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: 1,
                  overflow: 'hidden',
                  bgcolor: 'grey.100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {isImage && previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <InsertDriveFile sx={{ fontSize: 40, color: 'grey.400' }} />
                )}
              </Box>

              {/* File Info */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography 
                  variant="body1" 
                  fontWeight="bold" 
                  noWrap 
                  title={selectedFile.name}
                >
                  {selectedFile.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Chip 
                    label={selectedFile.type.split('/')[1].toUpperCase()} 
                    size="small" 
                    color="primary" 
                    variant="outlined" 
                  />
                </Box>
              </Box>

              {/* Remove Button */}
              <IconButton onClick={handleCancel} size="small" disabled={uploading}>
                <Close />
              </IconButton>
            </Box>
          </Paper>
        )}

        {/* Upload Button */}
        {selectedFile && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleUpload}
              disabled={uploading || disabled}
              startIcon={uploading ? <CircularProgress size={20} /> : <CloudUpload />}
              fullWidth
            >
              {uploading ? 'Uploading to IPFS...' : 'Upload Evidence'}
            </Button>
            <Button
              variant="outlined"
              onClick={handleCancel}
              disabled={uploading}
            >
              Cancel
            </Button>
          </Box>
        )}
      </Stack>
    </Paper>
  )
}

