import { useState } from 'react'
import { uploadToIPFS, uploadFileToIPFS, fetchFromIPFS } from '../services/ipfs'

/**
 * Hook for IPFS operations
 */
export function useIPFS() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = async (data: any): Promise<string | null> => {
    setIsUploading(true)
    setUploadProgress(0)
    setError(null)
    try {
      setUploadProgress(30)
      const hash = await uploadToIPFS(data)
      setUploadProgress(100)
      return hash
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload to IPFS'
      setError(message)
      return null
    } finally {
      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress(0)
      }, 500)
    }
  }

  const uploadFile = async (file: File): Promise<string | null> => {
    setIsUploading(true)
    setUploadProgress(0)
    setError(null)
    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const hash = await uploadFileToIPFS(file)

      clearInterval(progressInterval)
      setUploadProgress(100)

      return hash
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload file to IPFS'
      setError(message)
      return null
    } finally {
      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress(0)
      }, 500)
    }
  }

  const fetch = async <T,>(hash: string): Promise<T | null> => {
    setIsFetching(true)
    setError(null)
    try {
      const data = await fetchFromIPFS<T>(hash)
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch from IPFS'
      setError(message)
      return null
    } finally {
      setIsFetching(false)
    }
  }

  return {
    upload,
    uploadFile,
    fetch,
    isUploading,
    uploadProgress,
    isFetching,
    error,
  }
}
