import type { NextApiRequest, NextApiResponse } from 'next'
import { getConversations } from './messages'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const walletAddress = req.headers.authorization?.replace('Bearer ', '')
    if (!walletAddress) return res.status(401).json({ error: 'Unauthorized' })

    const conversations = await getConversations(walletAddress)
    return res.status(200).json({ conversations })
  } catch (error) {
    console.error('Conversations API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
