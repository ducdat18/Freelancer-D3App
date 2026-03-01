import { Container, Typography, Box, Paper, List, ListItem, ListItemButton, ListItemAvatar, ListItemText, Avatar, Badge, Chip, Alert, Divider, CircularProgress } from '@mui/material'
import { Chat as ChatIcon, Circle } from '@mui/icons-material'
import { useState, useEffect } from 'react'
import { useDatabaseChat } from '../../src/hooks/useDatabaseChat'
import Layout from '../../src/components/Layout'
import ChatDialog from '../../src/components/chat/ChatDialog'
import { useWallet } from '@solana/wallet-adapter-react'

export default function MessagesPage() {
  const { publicKey } = useWallet()
  const { getAllConversations, markConversationAsRead } = useDatabaseChat()
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Load conversations
  useEffect(() => {
    if (publicKey) {
      loadConversations()
    }
  }, [publicKey])

  const loadConversations = async () => {
    setLoading(true)
    try {
      const convos = await getAllConversations()
      setConversations(convos)
    } catch (err) {
      console.error('Failed to load conversations:', err)
    } finally {
      setLoading(false)
    }
  }

  const getTotalUnread = () => {
    return conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0)
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const handleChatOpen = async (recipientAddress: string) => {
    setSelectedChat(recipientAddress)
    await markConversationAsRead(recipientAddress)
    await loadConversations()
  }

  const handleChatClose = () => {
    setSelectedChat(null)
    loadConversations()
  }

  if (!publicKey) {
    return (
      <Layout>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Alert severity="warning">
            Please connect your wallet to view your messages
          </Alert>
        </Container>
      </Layout>
    )
  }

  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Messages
            </Typography>
            <Typography variant="body2" color="text.secondary">
              All your conversations in one place
            </Typography>
          </Box>
          {getTotalUnread() > 0 && (
            <Chip
              label={`${getTotalUnread()} unread`}
              color="error"
              size="small"
            />
          )}
        </Box>

        {/* Chat List */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : conversations.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <ChatIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No messages yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Start a conversation by messaging a client or freelancer from a job page
            </Typography>
          </Paper>
        ) : (
          <Paper>
            <List sx={{ p: 0 }}>
              {conversations.map((conv, index) => (
                <Box key={conv.other_address}>
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => handleChatOpen(conv.other_address)}
                      sx={{
                        py: 2,
                        bgcolor: conv.unread_count > 0 ? 'action.hover' : 'transparent',
                        '&:hover': {
                          bgcolor: 'action.selected',
                        },
                      }}
                    >
                    <ListItemAvatar>
                      <Badge
                        badgeContent={conv.unread_count}
                        color="error"
                        overlap="circular"
                      >
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {conv.other_address.slice(0, 2).toUpperCase()}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={formatAddress(conv.other_address)}
                      secondary={conv.last_message || ''}
                      primaryTypographyProps={{
                        fontWeight: conv.unread_count > 0 ? 700 : 500,
                        variant: 'subtitle1',
                      }}
                      secondaryTypographyProps={{
                        sx: {
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontWeight: conv.unread_count > 0 ? 600 : 400,
                        },
                      }}
                    />
                    {conv.last_message_time && (
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 2, flexShrink: 0 }}>
                        {formatTime(conv.last_message_time)}
                      </Typography>
                    )}
                    </ListItemButton>
                  </ListItem>
                  {index < conversations.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          </Paper>
        )}

        {/* Chat Dialog */}
        {selectedChat && (
          <ChatDialog
            open={!!selectedChat}
            onClose={handleChatClose}
            recipientAddress={selectedChat}
          />
        )}
      </Container>
    </Layout>
  )
}
