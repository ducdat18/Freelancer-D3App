import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  TextField,
  IconButton,
  Typography,
  Paper,
  Avatar,
  Divider,
  CircularProgress,
  Chip,
  Alert,
  useTheme,
} from '@mui/material'
import LoadingSpinner from '../LoadingSpinner'
import { Send, Close, Refresh } from '@mui/icons-material'
import { useWallet } from '@solana/wallet-adapter-react'
import { useDatabaseChat, DatabaseMessage } from '../../hooks/useDatabaseChat'

interface ChatDialogProps {
  open: boolean
  onClose: () => void
  recipientAddress: string
  recipientName?: string
}

export default function ChatDialog({
  open,
  onClose,
  recipientAddress,
  recipientName,
}: ChatDialogProps) {
  const { publicKey } = useWallet()
  const { sendMessage: sendMsg, getConversation, markConversationAsRead, loading, error } = useDatabaseChat()
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<DatabaseMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const primaryMain = theme.palette.primary.main

  // Load messages from database
  useEffect(() => {
    if (open && recipientAddress && recipientAddress.length > 0) {
      loadMessages()
      markConversationAsRead(recipientAddress)
    }
  }, [open, recipientAddress])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Auto-refresh messages every 5 seconds
  useEffect(() => {
    if (!open) return

    const interval = setInterval(() => {
      loadMessages()
    }, 5000)

    return () => clearInterval(interval)
  }, [open, recipientAddress])

  const loadMessages = async () => {
    if (!recipientAddress || recipientAddress.length === 0) {
      console.warn('Cannot load messages: invalid recipient address')
      return
    }
    setLoadingMessages(true)
    try {
      const msgs = await getConversation(recipientAddress)
      setMessages(msgs)
    } catch (err) {
      console.error('Failed to load messages:', err)
    } finally {
      setLoadingMessages(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = async () => {
    if (!message.trim() || !recipientAddress || recipientAddress.length === 0) return

    const content = message.trim()
    setMessage('')

    const result = await sendMsg(recipientAddress, content)

    if (result) {
      // Reload messages to show new one
      await loadMessages()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const isMyMessage = (sender: string) => {
    return sender === publicKey?.toBase58()
  }

  if (!publicKey) {
    return null
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          height: '80vh',
          maxHeight: '700px',
          display: 'flex',
          flexDirection: 'column',
          backgroundImage: 'none',
        },
      }}
    >
      {/* Header */}
      <DialogTitle sx={{ bgcolor: 'background.paper', py: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: primaryMain, color: theme.palette.primary.contrastText, fontWeight: 700 }}>
              {recipientAddress.slice(0, 2).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                {recipientName || formatAddress(recipientAddress)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                {recipientAddress.slice(0, 8)}...{recipientAddress.slice(-8)}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton onClick={loadMessages} disabled={loadingMessages} size="small">
              <Refresh fontSize="small" />
            </IconButton>
            <IconButton onClick={onClose} sx={{ color: 'text.secondary' }} size="small">
              <Close fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <Divider />

      {/* Messages */}
      <DialogContent sx={{ flex: 1, overflow: 'auto', bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'grey.50', p: 2, display: 'flex', flexDirection: 'column' }}>
        {!recipientAddress || recipientAddress.length === 0 ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            No recipient selected. Please select a freelancer first.
          </Alert>
        ) : error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loadingMessages && messages.length === 0 ? (
          <LoadingSpinner
            message="Connecting to secure chat..."
            logs={[
              { text: 'POST /auth/challenge — wallet sign...', type: 'info' },
              { text: 'Session token issued', type: 'ok' },
              { text: 'SELECT * FROM messages ORDER BY created_at', type: 'info' },
            ]}
            sx={{ mt: 1, mx: 1 }}
          />
        ) : messages.length === 0 ? (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              opacity: 0.6,
            }}
          >
            <Typography variant="body2" fontWeight={600}>
              No messages yet
            </Typography>
            <Typography variant="caption">
              Start the conversation with this freelancer
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {messages.map((msg, index) => {
              const mine = isMyMessage(msg.sender);
              return (
                <Box
                  key={`${msg.id}-${index}`}
                  sx={{
                    display: 'flex',
                    justifyContent: mine ? 'flex-end' : 'flex-start',
                  }}
                >
                  <Box
                    sx={{
                      p: 1.5,
                      maxWidth: '85%',
                      bgcolor: mine ? primaryMain : (isDark ? 'background.paper' : '#fff'),
                      color: mine ? theme.palette.primary.contrastText : 'text.primary',
                      borderRadius: 2,
                      borderTopRightRadius: mine ? 0 : 2,
                      borderTopLeftRadius: mine ? 2 : 0,
                      boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.05)',
                      border: 1,
                      borderColor: mine ? 'transparent' : 'divider',
                    }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontWeight: 500, lineHeight: 1.5 }}>
                      {msg.content}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        mt: 0.5,
                        opacity: 0.6,
                        fontSize: '0.65rem',
                        textAlign: mine ? 'right' : 'left',
                        fontWeight: 600,
                      }}
                    >
                      {formatTime(msg.timestamp)}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
            <div ref={messagesEndRef} />
          </Box>
        )}
      </DialogContent>

      <Divider />

      {/* Input */}
      <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              !recipientAddress || recipientAddress.length === 0
                ? 'No recipient selected'
                : 'Type a message...'
            }
            variant="outlined"
            size="small"
            disabled={loading || !recipientAddress || recipientAddress.length === 0}
            inputProps={{ maxLength: 1000 }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'grey.50',
              }
            }}
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!message.trim() || loading || !recipientAddress || recipientAddress.length === 0}
            sx={{
              bgcolor: primaryMain,
              color: theme.palette.primary.contrastText,
              '&:hover': { bgcolor: 'primary.dark' },
              '&:disabled': { bgcolor: 'action.disabledBackground', color: 'action.disabled' },
              width: 40,
              height: 40,
            }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : <Send fontSize="small" />}
          </IconButton>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Press Enter to send
          </Typography>
          <Typography variant="caption" color={message.length > 900 ? 'error' : 'text.secondary'}>
            {message.length}/1000
          </Typography>
        </Box>
      </Box>
    </Dialog>
  )
}
