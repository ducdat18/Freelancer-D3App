import { useWallet } from '@solana/wallet-adapter-react'
import { useState, useEffect } from 'react'
import { uploadFileToIPFS } from '../services/ipfs'

interface StoredCV {
  hash: string
  fileName: string
  uploadedAt: string
}

export function useCVStorage() {
  const { publicKey } = useWallet()
  const [savedCVs, setSavedCVs] = useState<StoredCV[]>([])
  const [loading, setLoading] = useState(false)

  // Load saved CVs from localStorage
  useEffect(() => {
    if (!publicKey) {
      setSavedCVs([])
      return
    }

    const key = `cv_storage_${publicKey.toString()}`
    const stored = localStorage.getItem(key)
    if (stored) {
      try {
        setSavedCVs(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to parse stored CVs:', e)
        setSavedCVs([])
      }
    }
  }, [publicKey])

  // Save CV
  const saveCV = async (file: File): Promise<string> => {
    if (!publicKey) {
      throw new Error('Wallet not connected')
    }

    setLoading(true)
    try {
      // Upload to IPFS
      const hash = await uploadFileToIPFS(file)

      // Save to localStorage
      const newCV: StoredCV = {
        hash,
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
      }

      const key = `cv_storage_${publicKey.toString()}`
      const updated = [...savedCVs, newCV]
      setSavedCVs(updated)
      localStorage.setItem(key, JSON.stringify(updated))

      return hash
    } finally {
      setLoading(false)
    }
  }

  // Delete CV
  const deleteCV = (hash: string) => {
    if (!publicKey) return

    const key = `cv_storage_${publicKey.toString()}`
    const updated = savedCVs.filter((cv) => cv.hash !== hash)
    setSavedCVs(updated)
    localStorage.setItem(key, JSON.stringify(updated))
  }

  return {
    savedCVs,
    saveCV,
    deleteCV,
    loading,
  }
}
