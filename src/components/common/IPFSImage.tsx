import { useMemo, useState } from 'react'
import { Box, CircularProgress, IconButton, useTheme } from '@mui/material'
import { BrokenImage, OpenInNew } from '@mui/icons-material'
import { getIPFSUrls } from '../../services/ipfs'

interface IPFSImageProps {
  hash: string
  alt?: string
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
  /** Optional explicit gateway prefix (e.g. "https://my-gw/ipfs/"). Defaults to the configured Pinata gateway with public fallbacks. */
  gateway?: string
  showOpenButton?: boolean
}

export default function IPFSImage({
  hash,
  alt = 'IPFS Image',
  width = '100%',
  height = 'auto',
  borderRadius = 8,
  objectFit = 'cover',
  gateway,
  showOpenButton = false,
}: IPFSImageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  // Index into the candidate gateway list; advances each time a gateway fails.
  const [gatewayIndex, setGatewayIndex] = useState(0)
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // Build the ordered list of gateway URLs to try. An explicit `gateway` prop
  // takes priority, then the configured Pinata gateway + public fallbacks.
  const urls = useMemo(() => {
    const cleanHash = hash.startsWith('ipfs://') ? hash.slice(7) : hash
    const fallbacks = getIPFSUrls(hash)
    if (gateway) {
      return Array.from(new Set([`${gateway}${cleanHash}`, ...fallbacks]))
    }
    return fallbacks
  }, [hash, gateway])

  const imageUrl = urls[gatewayIndex] ?? urls[0] ?? ''

  const handleLoad = () => {
    setLoading(false)
  }

  const handleError = () => {
    // Try the next gateway before giving up entirely.
    if (gatewayIndex < urls.length - 1) {
      setGatewayIndex(gatewayIndex + 1)
      return
    }
    setLoading(false)
    setError(true)
  }

  const handleOpenInNew = () => {
    window.open(imageUrl, '_blank', 'noopener,noreferrer')
  }

  if (error) {
    return (
      <Box
        sx={{
          width,
          height: typeof height === 'number' ? `${height}px` : height,
          borderRadius,
          bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'grey.100',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 1,
          border: 1,
          borderColor: 'divider',
        }}
      >
        <BrokenImage sx={{ fontSize: 48, color: 'text.disabled' }} />
        <Box sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 600 }}>Failed to load image</Box>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        position: 'relative',
        width,
        height: typeof height === 'number' && height !== 0 ? `${height}px` : height,
        borderRadius,
        overflow: 'hidden',
        bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'grey.50',
        border: 1,
        borderColor: 'divider',
      }}
    >
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress size={32} />
        </Box>
      )}
      <img
        src={imageUrl}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          width: '100%',
          height: '100%',
          objectFit,
          display: loading ? 'none' : 'block',
        }}
      />
      {showOpenButton && !loading && !error && (
        <IconButton
          onClick={handleOpenInNew}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            bgcolor: 'rgba(0,0,0,0.5)',
            color: 'white',
            backdropFilter: 'blur(4px)',
            '&:hover': {
              bgcolor: 'rgba(0,0,0,0.7)',
            },
          }}
          size="small"
        >
          <OpenInNew fontSize="small" />
        </IconButton>
      )}
    </Box>
  )
}
