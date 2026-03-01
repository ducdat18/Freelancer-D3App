import { useState, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { createChatAuthHeaders } from '../utils/chatAuth'

export interface DatabaseMessage {
  id: number
  sender: string
  recipient: string
  content: string
  timestamp: number
  read: boolean
}

export interface Conversation {
  other_address: string
  last_message: string
  last_message_time: number
  unread_count: number
}

const API_BASE = '/api/chat'

export function useDatabaseChat() {
  const wallet = useWallet()
  const { publicKey } = wallet
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Get authenticated headers with wallet signature.
   * Signs a timestamped message with the wallet so the API can verify ownership.
   * Returns null if wallet is not connected or signing is rejected.
   */
  const getSignedHeaders = useCallback(async (): Promise<Record<string, string> | null> => {
    if (!publicKey) return null

    const headers = await createChatAuthHeaders(wallet)
    return headers
  }, [publicKey, wallet])

  /**
   * Get simple bearer headers (for endpoints that don't require signature,
   * e.g. conversations list).
   */
  const getBearerHeaders = useCallback((): Record<string, string> => {
    if (!publicKey) {
      return { 'Content-Type': 'application/json' }
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicKey.toBase58()}`,
    }
  }, [publicKey])

  /**
   * Send a message
   */
  const sendMessage = useCallback(
    async (recipient: string, content: string): Promise<DatabaseMessage | null> => {
      if (!publicKey) {
        setError('Wallet not connected')
        return null
      }

      // Validate recipient is a valid non-empty string
      if (!recipient || typeof recipient !== 'string' || recipient.trim().length === 0) {
        setError('Invalid recipient address')
        console.warn('sendMessage: Invalid recipient address', recipient)
        return null
      }

      // Validate content
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        setError('Message cannot be empty')
        return null
      }

      try {
        setLoading(true)
        setError(null)

        // Sign a message with the wallet for API authentication
        const headers = await getSignedHeaders()
        if (!headers) {
          throw new Error('Failed to create authentication headers. Please check your wallet connection and try again.')
        }

        const url = `${API_BASE}/messages`
        const body = { 
          recipient: recipient.trim(), 
          content: content.trim() 
        }
        
        console.log('sendMessage - URL:', url)
        console.log('sendMessage - Recipient:', recipient.trim())
        console.log('sendMessage - Headers keys:', Object.keys(headers))

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to send message')
        }

        const data = await response.json()
        return data.message
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send message'
        setError(message)
        console.error('Send message error:', err)
        return null
      } finally {
        setLoading(false)
      }
    },
    [publicKey, getSignedHeaders]
  )

  /**
   * Get conversation with another user
   */
  const getConversation = useCallback(
    async (otherAddress: string): Promise<DatabaseMessage[]> => {
      if (!publicKey) return []
      
      // Validate otherAddress is a valid non-empty string
      if (!otherAddress || typeof otherAddress !== 'string' || otherAddress.trim().length === 0) {
        console.warn('getConversation: Invalid recipient address', otherAddress)
        return []
      }

      try {
        // Sign for authenticated GET request
        const headers = await getSignedHeaders()
        if (!headers) {
          console.warn('getConversation: No headers available')
          return []
        }

        // Properly encode the URL parameter to avoid invalid URLs
        const encodedAddress = encodeURIComponent(otherAddress.trim())
        const url = `${API_BASE}/messages?other=${encodedAddress}`
        
        console.log('getConversation - URL:', url)
        console.log('getConversation - Headers keys:', Object.keys(headers))

        const response = await fetch(url, {
          headers,
        })

        if (!response.ok) {
          throw new Error('Failed to fetch messages')
        }

        const data = await response.json()
        return data.messages || []
      } catch (err) {
        console.error('Get conversation error:', err)
        return []
      }
    },
    [publicKey, getSignedHeaders]
  )

  /**
   * Mark message as read
   */
  const markAsRead = useCallback(
    async (messageId: number): Promise<boolean> => {
      if (!publicKey) return false

      try {
        const headers = await getSignedHeaders()
        if (!headers) return false

        const response = await fetch(`${API_BASE}/messages`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ messageId }),
        })

        return response.ok
      } catch (err) {
        console.error('Mark as read error:', err)
        return false
      }
    },
    [publicKey, getSignedHeaders]
  )

  /**
   * Get all conversations (uses simple bearer token — no signature needed)
   */
  const getAllConversations = useCallback(async (): Promise<Conversation[]> => {
    if (!publicKey) return []

    try {
      const response = await fetch(`${API_BASE}/conversations`, {
        headers: getBearerHeaders(),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch conversations')
      }

      const data = await response.json()
      return data.conversations || []
    } catch (err) {
      console.error('Get conversations error:', err)
      return []
    }
  }, [publicKey, getBearerHeaders])

  /**
   * Mark all messages in conversation as read
   */
  const markConversationAsRead = useCallback(
    async (otherAddress: string): Promise<void> => {
      const messages = await getConversation(otherAddress)
      const unreadMessages = messages.filter((msg) => !msg.read && msg.sender === otherAddress)

      for (const msg of unreadMessages) {
        await markAsRead(msg.id)
      }
    },
    [getConversation, markAsRead]
  )

  return {
    sendMessage,
    getConversation,
    markAsRead,
    getAllConversations,
    markConversationAsRead,
    loading,
    error,
  }
}
