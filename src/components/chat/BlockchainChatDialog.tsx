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
  Alert,
  Chip,
} from '@mui/material'
import LoadingSpinner from '../LoadingSpinner'
import { Send, Close, Refresh } from '@mui/icons-material'
import { useWallet } from '@solana/wallet-adapter-react'
import { useBlockchainChat, BlockchainMessage } from '../../hooks/useBlockchainChat'

interface BlockchainChatDialogProps {
  open: boolean
  onClose: () => void
  recipientAddress: string
  recipientName?: string
}

export default function BlockchainChatDialog({
  open,
  onClose,
  recipientAddress,
  recipientName,
}: BlockchainChatDialogProps) {
  const { publicKey } = useWallet()
  const { sendMessage, getConversation, loading, error } = useBlockchainChat()
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<BlockchainMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load messages when dialog opens
  useEffect(() => {
    if (open && recipientAddress) {
      loadMessages()
    }
  }, [open, recipientAddress])

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadMessages = async () => {
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
    if (!message.trim()) return

    const content = message.trim()
    setMessage('')

    // Optimistically add message to UI
    const tempMessage: BlockchainMessage = {
      sender: publicKey!,
      recipient: new (await import('@solana/web3.js')).PublicKey(recipientAddress),
      content,
      timestamp: Date.now() / 1000,
      read: false,
      messageId: messages.length,
      publicKey: new (await import('@solana/web3.js')).PublicKey('11111111111111111111111111111111'),
    }
    setMessages((prev) => [...prev, tempMessage])

    // Send to blockchain
    const tx = await sendMessage(recipientAddress, content)

    if (tx) {
      // Reload to get actual blockchain data
      setTimeout(loadMessages, 2000)
    } else {
      // Remove optimistic message if failed
      setMessages((prev) => prev.filter((m) => m !== tempMessage))
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
    const date = new Date(timestamp * 1000)
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" fontWeight={600}>
                  {recipientName || formatAddress(recipientAddress)}
                </Typography>
                <Chip label="On-Chain" size="small" color="success" variant="outlined" />
              </Box>
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
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loadingMessages ? (
          <LoadingSpinner
            message="Loading blockchain messages..."
            logs={[
              { text: 'PDA: chat_thread[sender, receiver]...', type: 'info' },
              { text: 'gPA: ChatMessage[thread = thread_pda]', type: 'info' },
              { text: 'Borsh-decoding message payloads...', type: 'info' },
              { text: 'Messages sorted by slot ASC', type: 'ok' },
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
              Messages are stored permanently on Solana blockchain
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {messages.map((msg, index) => (
              <Box
                key={`${msg.messageId}-${index}`}
                sx={{
                  display: 'flex',
                  justifyContent: isMyMessage(msg.sender.toBase58()) ? 'flex-end' : 'flex-start',
                }}
              >
                <Paper
                  elevation={1}
                  sx={{
                    p: 1.5,
                    maxWidth: '70%',
                    bgcolor: isMyMessage(msg.sender.toBase58()) ? 'primary.main' : 'white',
                    color: isMyMessage(msg.sender.toBase58()) ? 'white' : 'text.primary',
                    borderRadius: 2,
                    borderTopRightRadius: isMyMessage(msg.sender.toBase58()) ? 0 : 2,
                    borderTopLeftRadius: isMyMessage(msg.sender.toBase58()) ? 2 : 0,
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
                </Paper>
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </Box>
        )}
      </DialogContent>

      <Divider />

      {/* Input */}
      <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="caption">
            Messages are stored on Solana blockchain. Each message costs a small transaction fee (~0.0001 SOL)
          </Typography>
        </Alert>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message... (max 280 chars)"
            variant="outlined"
            size="small"
            disabled={loading}
            inputProps={{ maxLength: 280 }}
            helperText={`${message.length}/280`}
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!message.trim() || loading}
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
          Press Enter to send • Shift+Enter for new line
        </Typography>
      </Box>
    </Dialog>
  )
}
