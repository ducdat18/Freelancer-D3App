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
  Chip,
  useTheme
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primaryMain = theme.palette.primary.main;

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
      elevation={0}
      sx={{
        p: 3,
        background: isDark
          ? 'linear-gradient(135deg, rgba(0, 255, 195, 0.05) 0%, rgba(128, 132, 238, 0.05) 100%)'
          : 'linear-gradient(135deg, rgba(5, 150, 105, 0.05) 0%, rgba(79, 70, 229, 0.05) 100%)',
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        backgroundImage: 'none',
      }}
    >
      <Stack spacing={2.5}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CloudUpload sx={{ color: primaryMain }} />
          <Typography variant="h6" fontWeight={700} sx={{ color: 'text.primary' }}>
            Evidence Submission
          </Typography>
          <Chip 
            label={uploaderRole.toUpperCase()} 
            size="small" 
            color={uploaderRole === 'client' ? 'primary' : 'secondary'}
            sx={{ fontWeight: 800, fontSize: '0.6rem', letterSpacing: 0.5, height: 20 }}
          />
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          Provide documentation or visual evidence to support your case. Max 10MB.
        </Typography>

        {/* Error/Success Messages */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ fontWeight: 500 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" onClose={() => setSuccess(null)} sx={{ fontWeight: 600 }}>
            {success}
          </Alert>
        )}

        {/* File Upload Area */}
        {!selectedFile ? (
          <Box
            sx={{
              border: '2px dashed',
              borderColor: isDark ? 'rgba(0, 255, 195, 0.3)' : 'rgba(5, 150, 105, 0.3)',
              borderRadius: 2,
              p: 5,
              textAlign: 'center',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.5 : 1,
              transition: 'all 0.2s ease',
              bgcolor: isDark ? 'rgba(0, 255, 195, 0.02)' : 'rgba(5, 150, 105, 0.02)',
              '&:hover': disabled ? {} : {
                borderColor: primaryMain,
                bgcolor: isDark ? 'rgba(0, 255, 195, 0.08)' : 'rgba(5, 150, 105, 0.05)',
                boxShadow: isDark ? `0 0 20px ${primaryMain}10` : 'none',
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
            <CloudUpload sx={{ fontSize: 48, color: primaryMain, mb: 1.5, opacity: 0.8 }} />
            <Typography variant="body1" color="primary" fontWeight={700}>
              Click to select a file
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              JPG, PNG, WEBP, or PDF
            </Typography>
          </Box>
        ) : (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.paper',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
              {/* Preview */}
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: 1,
                  overflow: 'hidden',
                  bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'grey.100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                {isImage && previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <InsertDriveFile sx={{ fontSize: 32, color: 'text.disabled' }} />
                )}
              </Box>

              {/* File Info */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography 
                  variant="body2" 
                  fontWeight={700} 
                  noWrap 
                  title={selectedFile.name}
                >
                  {selectedFile.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip 
                    label={selectedFile.type.split('/')[1].toUpperCase()} 
                    size="small" 
                    variant="outlined" 
                    sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }}
                  />
                </Box>
              </Box>

              {/* Remove Button */}
              <IconButton onClick={handleCancel} size="small" disabled={uploading}>
                <Close fontSize="small" />
              </IconButton>
            </Box>
          </Paper>
        )}

        {/* Upload Button */}
        {selectedFile && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={uploading || disabled}
              startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : <CloudUpload />}
              fullWidth
              sx={{ fontWeight: 700 }}
            >
              {uploading ? 'UPLOADING...' : 'SUBMIT EVIDENCE'}
            </Button>
            <Button
              variant="outlined"
              onClick={handleCancel}
              disabled={uploading}
              sx={{ fontWeight: 700 }}
            >
              CANCEL
            </Button>
          </Box>
        )}
      </Stack>
    </Paper>
  )
}
