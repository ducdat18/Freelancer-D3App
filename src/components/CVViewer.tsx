import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import { Close, Download, OpenInNew } from '@mui/icons-material';

interface CVViewerProps {
  open: boolean;
  onClose: () => void;
  cvHash: string;
  freelancerName?: string;
}

export default function CVViewer({ open, onClose, cvHash, freelancerName }: CVViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract bare CID then build a clean URL with exactly one /ipfs/ segment
  const cid = (() => {
    const m = cvHash.match(/(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{58,})/i);
    return m ? m[1] : cvHash.replace(/^ipfs:\/\//i, '').replace(/^\/+/, '').replace(/^ipfs\//i, '').trim();
  })();
  const gatewayBase = (process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/')
    .replace(/\/+$/, '').replace(/\/ipfs$/, '');
  const gatewayUrl = `${gatewayBase}/ipfs/${cid}`;

  const isMockHash = cid.startsWith('QmMock');

  const handleLoad = () => {
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    if (isMockHash) {
      setError('This is a test CV (mock IPFS hash). Upload a real CV file to view it here.');
    } else {
      setError('Failed to load CV. The file might be unavailable or the gateway is slow. Try "Open in New Tab".');
    }
  };

  const handleDownload = () => {
    window.open(gatewayUrl, '_blank');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: '90vh',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              CV/Resume {freelancerName ? `- ${freelancerName}` : ''}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
              IPFS: {cvHash}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              startIcon={<OpenInNew />}
              onClick={handleDownload}
              variant="outlined"
            >
              Open in New Tab
            </Button>
            <IconButton onClick={onClose}>
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0, position: 'relative' }}>
        {/* Warning for mock CV */}
        {isMockHash && (
          <Alert severity="warning" sx={{ m: 2 }}>
            ⚠️ This is a <strong>test/mock CV</strong>. The file doesn't exist on IPFS.
            Upload a real CV file to see it displayed here.
          </Alert>
        )}

        {loading && !isMockHash && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}
          >
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Loading CV...
            </Typography>
          </Box>
        )}

        {error ? (
          <Box sx={{ p: 4 }}>
            <Alert severity={isMockHash ? 'info' : 'error'} sx={{ mb: 2 }}>
              {error}
            </Alert>
            {!isMockHash && (
              <Button
                variant="outlined"
                startIcon={<OpenInNew />}
                onClick={handleDownload}
                fullWidth
              >
                Try Opening in New Tab
              </Button>
            )}
          </Box>
        ) : !isMockHash ? (
          <iframe
            src={gatewayUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: loading ? 'none' : 'block',
            }}
            onLoad={handleLoad}
            onError={handleError}
            title="CV/Resume Viewer"
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
