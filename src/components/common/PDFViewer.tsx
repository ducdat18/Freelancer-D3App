import { useState } from 'react';
import { Box, Typography, IconButton, CircularProgress, Alert } from '@mui/material';
import { OpenInNew, Close } from '@mui/icons-material';
import { getIPFSUrl } from '../../services/ipfs';

interface PDFViewerProps {
  hash: string;
  title?: string;
  height?: number | string;
  showOpenButton?: boolean;
}

export default function PDFViewer({
  hash,
  title,
  height = 600,
  showOpenButton = true
}: PDFViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const pdfUrl = getIPFSUrl(hash);

  const handleOpen = () => {
    window.open(pdfUrl, '_blank');
  };

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (error) {
    return (
      <Alert severity="error">
        Failed to load PDF. <a href={pdfUrl} target="_blank" rel="noopener noreferrer">Open in new tab</a>
      </Alert>
    );
  }

  return (
    <Box
      sx={{
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : 'auto',
        width: isFullscreen ? '100vw' : '100%',
        height: isFullscreen ? '100vh' : height,
        zIndex: isFullscreen ? 9999 : 1,
        bgcolor: isFullscreen ? 'background.paper' : 'transparent',
      }}
    >
      {/* Loading indicator */}
      {loading && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            bgcolor: 'grey.100',
            borderRadius: 1,
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {/* Controls */}
      {!loading && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 1,
            bgcolor: 'grey.900',
            color: 'white',
          }}
        >
          <Typography variant="body2" noWrap>
            {title || 'PDF Document'}
          </Typography>
          <Box>
            {showOpenButton && (
              <IconButton size="small" onClick={handleOpen} sx={{ color: 'white' }}>
                <OpenInNew fontSize="small" />
              </IconButton>
            )}
            {isFullscreen && (
              <IconButton size="small" onClick={handleFullscreen} sx={{ color: 'white' }}>
                <Close fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Box>
      )}

      {/* PDF Embed */}
      <iframe
        src={`${pdfUrl}#view=FitH`}
        style={{
          width: '100%',
          height: loading ? 0 : isFullscreen ? 'calc(100% - 48px)' : typeof height === 'number' ? `${height - 48}px` : `calc(${height} - 48px)`,
          border: 'none',
          display: loading ? 'none' : 'block',
        }}
        onLoad={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
        title={title || 'PDF Document'}
      />

      {/* Fallback: Direct link */}
      {!loading && (
        <Box sx={{ p: 1, textAlign: 'center', bgcolor: 'grey.100' }}>
          <Typography variant="caption" color="text.secondary">
            Can't see the PDF?{' '}
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>
              Open in new tab
            </a>
          </Typography>
        </Box>
      )}
    </Box>
  );
}
