import { useState, useRef, useEffect } from 'react'
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  Alert,
  IconButton,
  Paper,
  Chip,
  Stack,
} from '@mui/material'
import {
  CloudUpload,
  Delete,
  CheckCircle,
  PictureAsPdf,
  Description,
  Folder,
} from '@mui/icons-material'
import { useIPFS } from '../../hooks/useIPFS'

interface CVUploadProps {
  onUploadComplete: (hashes: string[]) => void
  disabled?: boolean
  multiple?: boolean
  maxFiles?: number
}

interface UploadedFile {
  hash: string
  name: string
  type: string
  size: number
}

export default function CVUpload({
  onUploadComplete,
  disabled = false,
  multiple = false,
  maxFiles = 5,
}: CVUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploadFile, isUploading: uploading, error } = useIPFS()
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

  // Notify parent when uploaded files change (after render, not during)
  useEffect(() => {
    onUploadComplete(uploadedFiles.map((f) => f.hash))
  }, [uploadedFiles, onUploadComplete])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Check max files limit
    if (uploadedFiles.length + files.length > maxFiles) {
      alert(`You can only upload up to ${maxFiles} files`)
      return
    }

    // Validate each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      // Validate file type - CV/Resume formats only
      const allowedTypes = [
        'application/pdf', // PDF
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'text/plain', // .txt
        'application/rtf', // Rich Text Format
      ]

      if (!allowedTypes.includes(file.type)) {
        alert(
          `Invalid file type: ${file.name}\nPlease upload PDF, DOC, DOCX, RTF, or TXT files only.`
        )
        continue
      }

      // Validate file size (max 10MB for CVs)
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Maximum size is 10MB`)
        continue
      }

      try {
        const hash = await uploadFile(file)

        if (hash) {
          const newFile: UploadedFile = {
            hash,
            name: file.name,
            type: file.type,
            size: file.size,
          }

          // Just update state - useEffect will notify parent
          setUploadedFiles((prev) => [...prev, newFile])
        }
      } catch (err) {
        console.error(`Upload failed for ${file.name}:`, err)
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemove = (hash: string) => {
    // Just update state - useEffect will notify parent
    setUploadedFiles((prev) => prev.filter((f) => f.hash !== hash))
  }

  const handleClearAll = () => {
    // Just update state - useEffect will notify parent with empty array
    setUploadedFiles([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getFileIcon = (type: string) => {
    if (type === 'application/pdf') return <PictureAsPdf color="error" />
    if (type.includes('word')) return <Description color="primary" />
    return <Folder color="action" />
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Box>
      <Typography variant="body2" fontWeight={600} gutterBottom>
        CV / Resume Upload
      </Typography>

      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
        Upload your CV or resume (PDF, DOC, DOCX, RTF, TXT). Max: 10MB per file, up to {maxFiles}{' '}
        files
      </Typography>

      {/* Upload Button */}
      <Box sx={{ mb: 2 }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.doc,.docx,.rtf,.txt"
          multiple={multiple}
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          disabled={disabled || uploading || uploadedFiles.length >= maxFiles}
        />
        <Button
          variant="outlined"
          startIcon={<CloudUpload />}
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading || uploadedFiles.length >= maxFiles}
          fullWidth
        >
          {uploadedFiles.length > 0 ? 'Upload More Files' : 'Upload CV/Resume'}
        </Button>
      </Box>

      {/* Upload Progress */}
      {uploading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            Uploading to IPFS... Please wait.
          </Typography>
        </Box>
      )}

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => {}}>
          {error}
        </Alert>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" fontWeight={600}>
              Uploaded Files ({uploadedFiles.length}/{maxFiles})
            </Typography>
            <Button
              size="small"
              color="error"
              onClick={handleClearAll}
              disabled={disabled}
              startIcon={<Delete />}
            >
              Clear All
            </Button>
          </Box>

          <Stack spacing={1.5}>
            {uploadedFiles.map((file) => (
              <Paper
                key={file.hash}
                variant="outlined"
                sx={{
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  bgcolor: 'background.default',
                }}
              >
                {/* File Icon */}
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {getFileIcon(file.type)}
                </Box>

                {/* File Info */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    fontWeight={500}
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {file.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                    <Chip
                      label={formatFileSize(file.size)}
                      size="small"
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                    <Chip
                      label="IPFS"
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                    <CheckCircle color="success" sx={{ fontSize: 16 }} />
                  </Box>
                </Box>

                {/* Delete Button */}
                <IconButton
                  size="small"
                  onClick={() => handleRemove(file.hash)}
                  disabled={disabled}
                  color="error"
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Paper>
            ))}
          </Stack>

          {/* IPFS Hashes (for debugging) */}
          {process.env.NODE_ENV === 'development' && (
            <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                IPFS Hashes (Dev Only):
              </Typography>
              {uploadedFiles.map((file) => (
                <Typography
                  key={file.hash}
                  variant="caption"
                  display="block"
                  sx={{ fontFamily: 'monospace', fontSize: '0.65rem', wordBreak: 'break-all' }}
                >
                  {file.hash}
                </Typography>
              ))}
            </Box>
          )}
        </Paper>
      )}

      {/* Help Text */}
      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="caption">
          <strong>Tips:</strong>
          <br />• PDF format is recommended for best compatibility
          <br />• Ensure your CV is up-to-date before uploading
          <br />• Files are stored on IPFS (decentralized storage)
          <br />• You can upload multiple versions of your CV
        </Typography>
      </Alert>
    </Box>
  )
}
