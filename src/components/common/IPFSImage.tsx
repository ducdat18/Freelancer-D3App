import { useState } from 'react'
import { Box, CircularProgress, IconButton } from '@mui/material'
import { BrokenImage, OpenInNew } from '@mui/icons-material'

interface IPFSImageProps {
  hash: string
  alt?: string
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
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
  gateway = 'https://ipfs.io/ipfs/',
  showOpenButton = false,
}: IPFSImageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Remove ipfs:// prefix if present
  const cleanHash = hash.startsWith('ipfs://') ? hash.slice(7) : hash

  const imageUrl = `${gateway}${cleanHash}`

  const handleLoad = () => {
    setLoading(false)
  }

  const handleError = () => {
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
          bgcolor: 'grey.100',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <BrokenImage sx={{ fontSize: 48, color: 'grey.400' }} />
        <Box sx={{ fontSize: 12, color: 'grey.500' }}>Failed to load image</Box>
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
        bgcolor: 'grey.100',
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
