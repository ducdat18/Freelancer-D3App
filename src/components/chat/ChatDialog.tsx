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
        },
      }}
    >
      {/* Header */}
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {recipientAddress.slice(0, 2).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={600}>
                {recipientName || formatAddress(recipientAddress)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {recipientAddress}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={loadMessages} disabled={loadingMessages}>
              <Refresh />
            </IconButton>
            <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}>
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <Divider />

      {/* Messages */}
      <DialogContent sx={{ flex: 1, overflow: 'auto', bgcolor: 'grey.50', p: 2 }}>
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
            message="Connecting to chat..."
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
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              No messages yet. Start the conversation!
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Messages are stored in database (free & fast!)
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {messages.map((msg, index) => (
              <Box
                key={`${msg.id}-${index}`}
                sx={{
                  display: 'flex',
                  justifyContent: isMyMessage(msg.sender) ? 'flex-end' : 'flex-start',
                }}
              >
                <Box
                  sx={{
                    p: 1.5,
                    maxWidth: '70%',
                    bgcolor: isMyMessage(msg.sender) ? '#1976d2' : '#e8f5e9',
                    color: isMyMessage(msg.sender) ? 'white' : '#000000',
                    borderRadius: 2,
                    borderTopRightRadius: isMyMessage(msg.sender) ? 0 : 2,
                    borderTopLeftRadius: isMyMessage(msg.sender) ? 2 : 0,
                    boxShadow: 1,
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {msg.content}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mt: 0.5,
                      opacity: 0.7,
                      fontSize: '0.7rem',
                    }}
                  >
                    {formatTime(msg.timestamp)}
                  </Typography>
                </Box>
              </Box>
            ))}
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
                : 'Type your message... (max 1000 chars)'
            }
            variant="outlined"
            size="small"
            disabled={loading || !recipientAddress || recipientAddress.length === 0}
            inputProps={{ maxLength: 1000 }}
            helperText={`${message.length}/1000`}
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!message.trim() || loading || !recipientAddress || recipientAddress.length === 0}
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': { bgcolor: 'primary.dark' },
              '&:disabled': { bgcolor: 'grey.300' },
            }}
          >
            {loading ? <CircularProgress size={20} /> : <Send />}
          </IconButton>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Press Enter to send • Shift+Enter for new line • Auto-refreshes every 5s
        </Typography>
      </Box>
    </Dialog>
  )
}
