import { useState, useRef } from 'react'
import { Box, Button, Typography, LinearProgress, Alert, IconButton } from '@mui/material'
import { CloudUpload, Delete, CheckCircle } from '@mui/icons-material'
import { useIPFS } from '../../hooks/useIPFS'
import IPFSImage from '../common/IPFSImage'

interface PortfolioUploadProps {
  onUploadComplete: (hash: string) => void
  disabled?: boolean
}

export default function PortfolioUpload({ onUploadComplete, disabled = false }: PortfolioUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploadFile, isUploading: uploading, error } = useIPFS()
  const [uploadedHash, setUploadedHash] = useState<string>('')

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type - Allow images, PDFs, Word docs, and common document formats
    const allowedTypes = [
      'image/', // All image types
      'application/pdf',
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/zip',
      'application/x-zip-compressed',
      'text/plain', // .txt
    ]

    const isAllowed = allowedTypes.some(type => file.type.startsWith(type) || file.type === type)

    if (!isAllowed) {
      alert('Please upload an image, PDF, Word document, or ZIP file')
      return
    }

    // Validate file size (max 50MB for documents, 10MB for images)
    const maxSize = file.type.startsWith('image/') ? 10 * 1024 * 1024 : 50 * 1024 * 1024
    if (file.size > maxSize) {
      const maxSizeMB = file.type.startsWith('image/') ? '10MB' : '50MB'
      alert(`File size must be less than ${maxSizeMB}`)
      return
    }

    try {
      const hash = await uploadFile(file)

      if (hash) {
        setUploadedHash(hash)
        onUploadComplete(hash)
      }
    } catch (err) {
      console.error('Upload failed:', err)
    }
  }

  const handleRemove = () => {
    setUploadedHash('')
    onUploadComplete('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Portfolio Sample (Optional)
      </Typography>

      {!uploadedHash ? (
        <Box>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,.doc,.docx,.zip,.txt"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
            disabled={disabled || uploading}
          />
          <Button
            variant="outlined"
            startIcon={<CloudUpload />}
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            fullWidth
          >
            Upload Portfolio Sample
          </Button>

          {uploading && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Uploading to IPFS...
              </Typography>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Box>
      ) : (
        <Box sx={{ position: 'relative' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <CheckCircle color="success" fontSize="small" />
            <Typography variant="caption" color="success.main">
              Uploaded successfully!
            </Typography>
            <IconButton size="small" onClick={handleRemove} disabled={disabled}>
              <Delete fontSize="small" />
            </IconButton>
          </Box>
          <IPFSImage hash={uploadedHash} height={200} borderRadius={1} showOpenButton />
        </Box>
      )}

      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
        Upload your portfolio (images, PDF, Word, ZIP). Max: 10MB for images, 50MB for documents
      </Typography>
    </Box>
  )
}
