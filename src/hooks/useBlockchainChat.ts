import { useCallback, useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor'
import { useSolanaProgram } from './useSolanaProgram'

export interface BlockchainMessage {
  sender: PublicKey
  recipient: PublicKey
  content: string
  timestamp: number
  read: boolean
  messageId: number
  publicKey: PublicKey
}

export function useBlockchainChat() {
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const { program } = useSolanaProgram()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Send a message on-chain
   */
  const sendMessage = useCallback(
    async (recipientAddress: string, content: string): Promise<string | null> => {
      if (!publicKey || !program || !signTransaction) {
        setError('Wallet not connected')
        return null
      }

      try {
        setLoading(true)
        setError(null)

        const recipient = new PublicKey(recipientAddress)

        // Get next message ID (count existing messages)
        const messages = await getConversation(recipientAddress)
        const messageId = messages.length

        // Derive message PDA
        const [messagePda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from('chat_message'),
            publicKey.toBuffer(),
            recipient.toBuffer(),
            new BN(messageId).toArrayLike(Buffer, 'le', 8),
          ],
          program.programId
        )

        // Send transaction
        const tx = await program.methods
          .sendMessage(recipient, content, new BN(messageId))
          .accounts({
            message: messagePda,
            sender: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc()

        console.log('Message sent:', tx)
        return tx
      } catch (err) {
        console.error('Failed to send message:', err)
        setError(err instanceof Error ? err.message : 'Failed to send message')
        return null
      } finally {
        setLoading(false)
      }
    },
    [publicKey, program, signTransaction]
  )

  /**
   * Get all messages in a conversation
   */
  const getConversation = useCallback(
    async (otherAddress: string): Promise<BlockchainMessage[]> => {
      if (!publicKey || !program) {
        return []
      }

      try {
        const other = new PublicKey(otherAddress)

        // Fetch all chat message accounts
        // @ts-ignore - ChatMessage account type not in current IDL
        const accounts = await program.account.chatMessage?.all([
          {
            memcmp: {
              offset: 8, // discriminator
              bytes: publicKey.toBase58(),
            },
          },
        ])

        // Filter messages in this conversation (sent or received)
        const messages = accounts
          .filter((acc: any) => {
            const msg = acc.account
            return (
              (msg.sender.equals(publicKey) && msg.recipient.equals(other)) ||
              (msg.sender.equals(other) && msg.recipient.equals(publicKey))
            )
          })
          .map((acc: any) => ({
            sender: acc.account.sender,
            recipient: acc.account.recipient,
            content: acc.account.content,
            timestamp: acc.account.timestamp.toNumber(),
            read: acc.account.read,
            messageId: acc.account.messageId,
            publicKey: acc.publicKey,
          }))
          .sort((a: any, b: any) => a.timestamp - b.timestamp)

        return messages
      } catch (err) {
        console.error('Failed to fetch conversation:', err)
        return []
      }
    },
    [publicKey, program]
  )

  /**
   * Mark a message as read
   */
  const markAsRead = useCallback(
    async (messagePublicKey: PublicKey): Promise<boolean> => {
      if (!publicKey || !program || !signTransaction) {
        return false
      }

      try {
        await program.methods
          .markMessageRead()
          .accounts({
            message: messagePublicKey,
            recipient: publicKey,
          })
          .rpc()

        return true
      } catch (err) {
        console.error('Failed to mark as read:', err)
        return false
      }
    },
    [publicKey, program, signTransaction]
  )

  /**
   * Get all conversations for current user
   */
  const getAllConversations = useCallback(async () => {
    if (!publicKey || !program) {
      return []
    }

    try {
      // Get all messages where user is sender or recipient
      // @ts-ignore - ChatMessage account type not in current IDL
      const sentMessages = await program.account.chatMessage?.all([
        {
          memcmp: {
            offset: 8, // sender field
            bytes: publicKey.toBase58(),
          },
        },
      ])

      // @ts-ignore - ChatMessage account type not in current IDL
      const receivedMessages = await program.account.chatMessage?.all([
        {
          memcmp: {
            offset: 40, // recipient field (8 + 32)
            bytes: publicKey.toBase58(),
          },
        },
      ])

      // Combine and deduplicate by other participant
      const participants = new Set<string>()
      const conversations: any[] = []

      ;[...sentMessages, ...receivedMessages].forEach((acc: any) => {
        const msg = acc.account
        const otherParty = msg.sender.equals(publicKey)
          ? msg.recipient.toBase58()
          : msg.sender.toBase58()

        if (!participants.has(otherParty)) {
          participants.add(otherParty)
          conversations.push({
            participantAddress: otherParty,
            lastMessage: msg,
          })
        }
      })

      return conversations
    } catch (err) {
      console.error('Failed to fetch conversations:', err)
      return []
    }
  }, [publicKey, program])

  return {
    sendMessage,
    getConversation,
    markAsRead,
    getAllConversations,
    loading,
    error,
  }
}
