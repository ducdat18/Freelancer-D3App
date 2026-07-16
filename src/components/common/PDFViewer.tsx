import { useState } from 'react';
import { Box, Typography, IconButton, CircularProgress, Alert, useTheme } from '@mui/material';
import { OpenInNew, Close, Fullscreen, FullscreenExit } from '@mui/icons-material';
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

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
        border: 1,
        borderColor: 'divider',
        borderRadius: isFullscreen ? 0 : 1,
        overflow: 'hidden',
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
            bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'grey.50',
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
            px: 2,
            py: 1,
            bgcolor: isDark ? 'background.paper' : 'grey.100',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ maxWidth: '70%' }}>
            {title || 'PDF Document'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {showOpenButton && (
              <IconButton size="small" onClick={handleOpen} title="Open in new tab">
                <OpenInNew fontSize="small" />
              </IconButton>
            )}
            <IconButton size="small" onClick={handleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
              {isFullscreen ? <FullscreenExit fontSize="small" /> : <Fullscreen fontSize="small" />}
            </IconButton>
            {isFullscreen && (
              <IconButton size="small" onClick={handleFullscreen}>
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
          background: '#fff', // PDF viewers usually look best on white background
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
        <Box sx={{ p: 1, textAlign: 'center', bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'grey.50', borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" fontWeight={500}>
            Can&apos;t see the PDF?{' '}
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: theme.palette.primary.main, fontWeight: 700 }}>
              Open in new tab
            </a>
          </Typography>
        </Box>
      )}
    </Box>
  );
}
