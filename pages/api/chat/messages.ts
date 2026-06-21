import type { NextApiRequest, NextApiResponse } from 'next'
import { PublicKey } from '@solana/web3.js'
import bs58 from 'bs58'
import nacl from 'tweetnacl'
import { getMessages, addMessage, markAsRead, findMessage } from '../../../src/utils/chatStore'
import { chatRateLimit } from '../../../src/utils/rateLimit'

// ─── Auth helpers ─────────────────────────────────────────────────────────────

function verifyWalletSignature(address: string, signature?: string, message?: string): boolean {
  if (!address || !signature || !message) return false
  try {
    const publicKey = new PublicKey(address)
    const sigBytes = bs58.decode(signature)
    const msgBytes = new TextEncoder().encode(message)
    return nacl.sign.detached.verify(msgBytes, sigBytes, publicKey.toBytes())
  } catch {
    return false
  }
}

function isMessageRecent(message: string): boolean {
  try {
    const m = message.match(/Timestamp: (\d+)/)
    if (!m) return false
    return Date.now() - parseInt(m[1]) < 5 * 60 * 1000
  } catch {
    return false
  }
}

export function generateAuthMessage(address: string): string {
  return `Authenticate to Freelance DApp\nWallet: ${address}\nTimestamp: ${Date.now()}`
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Wallet-Signature, X-Signed-Message')

  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const walletAddress = req.headers.authorization?.replace('Bearer ', '')
    const signature = req.headers['x-wallet-signature'] as string
    const encodedMessage = req.headers['x-signed-message'] as string

    if (!walletAddress) return res.status(401).json({ error: 'Unauthorized: No wallet address provided' })

    let signedMessage: string
    try {
      signedMessage = Buffer.from(encodedMessage, 'base64').toString('utf-8')
    } catch {
      return res.status(400).json({ error: 'Invalid message encoding' })
    }

    if (!verifyWalletSignature(walletAddress, signature, signedMessage))
      return res.status(401).json({ error: 'Invalid signature' })
    if (!isMessageRecent(signedMessage))
      return res.status(401).json({ error: 'Signature expired. Please sign in again.' })
    if (!signedMessage.includes(walletAddress))
      return res.status(401).json({ error: 'Signature does not match wallet address' })

    if (!chatRateLimit(req, res)) return

    switch (req.method) {
      case 'GET':  return handleGetMessages(req, res, walletAddress)
      case 'POST': return handleSendMessage(req, res, walletAddress)
      case 'PUT':  return handleMarkAsRead(req, res, walletAddress)
      default:     return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Chat API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

function handleGetMessages(req: NextApiRequest, res: NextApiResponse, walletAddress: string) {
  const { other } = req.query
  if (!other || typeof other !== 'string') return res.status(400).json({ error: 'Missing recipient address' })

  const result = getMessages(walletAddress, other)
  return res.status(200).json({ messages: result })
}

async function handleSendMessage(req: NextApiRequest, res: NextApiResponse, walletAddress: string) {
  const { recipient, content } = req.body
  if (!recipient || !content) return res.status(400).json({ error: 'Missing recipient or content' })
  if (content.length > 1000) return res.status(400).json({ error: 'Message too long (max 1000 characters)' })
  if (recipient === walletAddress) return res.status(400).json({ error: 'Cannot message yourself' })

  const msg = await addMessage(walletAddress, recipient, content)
  return res.status(201).json({ message: msg })
}

async function handleMarkAsRead(req: NextApiRequest, res: NextApiResponse, walletAddress: string) {
  const { messageId } = req.body
  if (!messageId) return res.status(400).json({ error: 'Missing message ID' })

  const msg = findMessage(messageId)
  if (!msg) return res.status(404).json({ error: 'Message not found' })
  if (msg.recipient !== walletAddress) return res.status(403).json({ error: 'Not authorized' })

  await markAsRead(messageId, walletAddress)
  return res.status(200).json({ success: true })
}
