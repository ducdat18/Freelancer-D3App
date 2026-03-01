import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'

interface Message {
  id: string
  sender: string
  content: string
  timestamp: number
  read: boolean
}

interface ChatRoom {
  participantAddress: string
  lastMessage?: Message
  unreadCount: number
}

export function useChat() {
  const { publicKey } = useWallet()
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])

  // Load all chat rooms for current user
  useEffect(() => {
    if (publicKey) {
      loadChatRooms()
    }
  }, [publicKey])

  const getChatKey = (address1: string, address2: string) => {
    const addresses = [address1, address2].sort()
    return `chat_${addresses[0]}_${addresses[1]}`
  }

  const loadChatRooms = () => {
    if (!publicKey) return

    try {
      const rooms: ChatRoom[] = []
      const myAddress = publicKey.toBase58()
      const seenChats = new Set<string>()

      // Scan localStorage for all chat keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('chat_')) {
          const parts = key.split('_')
          if (parts.length === 3) {
            const addr1 = parts[1]
            const addr2 = parts[2]

            // Only include chats where current user is a participant
            if (addr1 === myAddress || addr2 === myAddress) {
              const participantAddress = addr1 === myAddress ? addr2 : addr1

              // Avoid duplicates
              if (!seenChats.has(participantAddress)) {
                seenChats.add(participantAddress)

                const messages = JSON.parse(localStorage.getItem(key) || '[]')
                const unreadMessages = messages.filter(
                  (msg: Message) => msg.sender !== myAddress && !msg.read
                )

                rooms.push({
                  participantAddress,
                  lastMessage: messages[messages.length - 1],
                  unreadCount: unreadMessages.length,
                })
              }
            }
          }
        }
      }

      // Sort by last message timestamp (most recent first)
      rooms.sort((a, b) => {
        const timeA = a.lastMessage?.timestamp || 0
        const timeB = b.lastMessage?.timestamp || 0
        return timeB - timeA
      })

      setChatRooms(rooms)
    } catch (e) {
      console.error('Failed to load chat rooms:', e)
    }
  }

  const getTotalUnread = () => {
    return chatRooms.reduce((sum, room) => sum + room.unreadCount, 0)
  }

  const markAsRead = (participantAddress: string) => {
    if (!publicKey) return

    const chatKey = getChatKey(publicKey.toBase58(), participantAddress)
    try {
      const stored = localStorage.getItem(chatKey)
      if (stored) {
        const messages: Message[] = JSON.parse(stored)
        const updatedMessages = messages.map((msg) => ({ ...msg, read: true }))
        localStorage.setItem(chatKey, JSON.stringify(updatedMessages))
        loadChatRooms()
      }
    } catch (e) {
      console.error('Failed to mark messages as read:', e)
    }
  }

  return {
    chatRooms,
    getTotalUnread,
    markAsRead,
    refreshRooms: loadChatRooms,
  }
}
