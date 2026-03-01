import { useState, useRef } from 'react'
import {
  Card,
  CardContent,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from '@mui/material'
import { CloudUpload, Delete, Send, PictureAsPdf } from '@mui/icons-material'
import { useIPFS } from '../../hooks/useIPFS'
import IPFSImage from '../common/IPFSImage'
import PDFViewer from '../common/PDFViewer'

interface Deliverable {
  hash: string
  description: string
  fileType?: string
  fileName?: string
}

interface DeliverableSubmitProps {
  jobId: string
  jobTitle: string
  onSubmit: (deliverables: Deliverable[]) => Promise<void>
  loading?: boolean
}

export default function DeliverableSubmit({
  jobId: _jobId,
  jobTitle,
  onSubmit,
  loading = false,
}: DeliverableSubmitProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploadFile, isUploading: uploading, uploadProgress } = useIPFS()
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [currentDescription, setCurrentDescription] = useState('')
  const [error, setError] = useState('')

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB')
      return
    }

    if (!currentDescription.trim()) {
      setError('Please provide a description for this file')
      return
    }

    try {
      setError('')
      const hash = await uploadFile(file)
      if (!hash) {
        setError('Failed to upload file - no hash returned')
        return
      }
      setDeliverables([
        ...deliverables,
        {
          hash,
          description: currentDescription,
          fileType: file.type,
          fileName: file.name
        }
      ])
      setCurrentDescription('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setError('Failed to upload file')
    }
  }

  const handleRemoveDeliverable = (index: number) => {
    setDeliverables(deliverables.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (deliverables.length === 0) {
      setError('Please upload at least one deliverable')
      return
    }

    try {
      await onSubmit(deliverables)
      setDeliverables([])
      setCurrentDescription('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit deliverables')
    }
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Submit Deliverables
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Job: {jobTitle}
        </Typography>

        <Box sx={{ mt: 3 }}>
          <TextField
            label="Description"
            value={currentDescription}
            onChange={(e) => setCurrentDescription(e.target.value)}
            fullWidth
            placeholder="Describe this deliverable..."
            disabled={uploading || loading}
            sx={{ mb: 2 }}
          />

          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
            disabled={uploading || loading}
          />

          <Button
            variant="outlined"
            startIcon={uploading ? <CircularProgress size={20} /> : <CloudUpload />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || loading || !currentDescription.trim()}
            fullWidth
          >
            {uploading ? `Uploading... ${uploadProgress}%` : 'Upload File'}
          </Button>

          {uploading && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}>
                {uploadProgress}% uploaded
              </Typography>
            </Box>
          )}
        </Box>

        {deliverables.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Uploaded Deliverables ({deliverables.length})
            </Typography>
            <List>
              {deliverables.map((deliverable, index) => (
                <ListItem
                  key={index}
                  secondaryAction={
                    <IconButton edge="end" onClick={() => handleRemoveDeliverable(index)}>
                      <Delete />
                    </IconButton>
                  }
                  sx={{ bgcolor: 'grey.50', mb: 1, borderRadius: 1 }}
                >
                  <Box sx={{ width: '100%' }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {deliverable.fileType === 'application/pdf' && <PictureAsPdf color="error" />}
                          <Typography variant="body1">{deliverable.description}</Typography>
                        </Box>
                      }
                      secondary={deliverable.fileName || undefined}
                    />
                    {deliverable.fileType === 'application/pdf' ? (
                      <PDFViewer hash={deliverable.hash} height={300} />
                    ) : deliverable.fileType?.startsWith('image/') ? (
                      <IPFSImage hash={deliverable.hash} height={150} borderRadius={1} />
                    ) : null}
                  </Box>
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

        <Button
          variant="contained"
          size="large"
          fullWidth
          startIcon={loading ? <CircularProgress size={20} /> : <Send />}
          onClick={handleSubmit}
          disabled={loading || deliverables.length === 0}
          sx={{ mt: 3 }}
        >
          {loading ? 'Submitting...' : 'Submit Work'}
        </Button>
      </CardContent>
    </Card>
  )
}
