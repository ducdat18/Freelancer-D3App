import axios, { AxiosError } from 'axios'
import type { JobMetadata } from '../types'

const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY
const PINATA_SECRET_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY
const PINATA_API_URL = 'https://api.pinata.cloud'

// Primary gateway from env, with fallbacks
const PRIMARY_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/'

// Fallback gateways for resilience
const FALLBACK_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/',
]

// Timeout for IPFS requests (in ms)
const IPFS_TIMEOUT = 15000

/**
 * Validate CID format (basic validation for CIDv0 and CIDv1)
 */
export function isValidCID(cid: string): boolean {
  if (!cid || typeof cid !== 'string') return false
  if (cid.length < 10) return false

  // CIDv0: starts with Qm, 46 characters total
  const cidv0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/

  // CIDv1: starts with bafy (base32), typically 59+ chars
  const cidv1Base32Regex = /^bafy[a-z2-7]{50,}$/i

  // CIDv1: starts with b (other base32 variants)
  const cidv1BRegex = /^b[a-z2-7]{50,}$/i

  return cidv0Regex.test(cid) || cidv1Base32Regex.test(cid) || cidv1BRegex.test(cid)
}

/**
 * Check if a metadata URI looks like garbage/placeholder data
 */
export function isGarbageMetadataUri(uri: string | null | undefined): boolean {
  if (!uri) return true

  const normalized = normalizeCID(uri)

  // Known garbage patterns
  const garbagePatterns = [
    /^QmPerformance$/i,
    /^QmTest$/i,
    /^QmPlaceholder$/i,
    /^test$/i,
    /^placeholder$/i,
    /^null$/i,
    /^undefined$/i,
    /^0+$/,
  ]

  for (const pattern of garbagePatterns) {
    if (pattern.test(normalized)) return true
  }

  if (normalized.length < 10) return true

  return !isValidCID(normalized)
}

/**
 * Clean and normalize CID/hash
 */
function normalizeCID(hash: string): string {
  let clean = hash.trim()

  // Strip ipfs:// scheme
  if (clean.startsWith('ipfs://')) {
    clean = clean.slice(7)
  }

  // Strip all leading/trailing slashes
  clean = clean.replace(/^\/+|\/+$/g, '')

  // Strip any /ipfs/ or ipfs/ path prefix (e.g. from full gateway URLs or malformed URIs)
  const gatewayPrefixes = ['/ipfs/', 'ipfs/']
  for (const prefix of gatewayPrefixes) {
    if (clean.includes(prefix)) {
      clean = clean.split(prefix).pop() || clean
    }
  }

  return clean
}

/**
 * Build gateway URL without double slashes
 */
function buildGatewayUrl(gateway: string, cid: string): string {
  // Strip ALL trailing slashes from gateway
  const cleanGateway = gateway.replace(/\/+$/, '')
  // Strip ALL leading slashes from cid
  const cleanCid = cid.replace(/^\/+/, '')

  if (cleanGateway.endsWith('/ipfs')) {
    return `${cleanGateway}/${cleanCid}`
  }

  return `${cleanGateway}/ipfs/${cleanCid}`
}

/**
 * Upload JSON data to IPFS via Pinata
 */
export async function uploadToIPFS(data: any): Promise<string> {
  if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
    throw new Error('IPFS not configured. Please set NEXT_PUBLIC_PINATA_API_KEY and NEXT_PUBLIC_PINATA_SECRET_KEY')
  }

  try {
    const response = await axios.post(
      `${PINATA_API_URL}/pinning/pinJSONToIPFS`,
      data,
      {
        headers: {
          'Content-Type': 'application/json',
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
      }
    )
    return response.data.IpfsHash
  } catch (error) {
    console.error('[IPFS] Error uploading:', error)
    throw new Error('Failed to upload to IPFS')
  }
}

/**
 * Upload file to IPFS via Pinata
 */
export async function uploadFileToIPFS(file: File): Promise<string> {
  if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
    throw new Error('IPFS not configured. Please set NEXT_PUBLIC_PINATA_API_KEY and NEXT_PUBLIC_PINATA_SECRET_KEY')
  }

  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await axios.post(
      `${PINATA_API_URL}/pinning/pinFileToIPFS`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
      }
    )
    return response.data.IpfsHash
  } catch (error) {
    console.error('[IPFS] Error uploading file:', error)
    throw new Error('Failed to upload file to IPFS')
  }
}

/**
 * Fetch data from IPFS with validation, timeout, and fallback gateways
 * Returns null for invalid CIDs (graceful degradation)
 */
export async function fetchFromIPFS<T>(hash: string): Promise<T | null> {
  if (!hash || typeof hash !== 'string' || hash.trim().length === 0) {
    return null
  }

  const cleanHash = normalizeCID(hash)

  // Skip garbage/invalid CIDs silently
  if (isGarbageMetadataUri(cleanHash)) {
    console.warn('[IPFS] Skipping invalid CID:', cleanHash.slice(0, 30))
    return null
  }

  // Validate CID format
  if (!isValidCID(cleanHash)) {
    console.warn('[IPFS] Invalid CID format:', cleanHash.slice(0, 30))
    return null
  }

  const gateways = [PRIMARY_GATEWAY, ...FALLBACK_GATEWAYS]

  for (const gateway of gateways) {
    try {
      const url = buildGatewayUrl(gateway, cleanHash)

      const response = await axios.get<T>(url, {
        timeout: IPFS_TIMEOUT,
        headers: {
          'Accept': 'application/json, text/plain, */*',
        },
        validateStatus: (status) => status < 500,
      })

      if (response.status === 400 || response.status === 404 || response.status === 429) {
        continue
      }

      if (response.status >= 400) {
        continue
      }

      console.log(`[IPFS] Fetched from: ${gateway}`)
      return response.data

    } catch (error) {
      const axiosError = error as AxiosError
      console.warn(`[IPFS] Gateway ${gateway} failed:`, axiosError.code || axiosError.message)
      continue
    }
  }

  console.warn('[IPFS] All gateways failed for CID:', cleanHash.slice(0, 30))
  return null
}

/**
 * Upload job metadata to IPFS
 */
export async function uploadJobMetadata(metadata: JobMetadata): Promise<string> {
  return uploadToIPFS(metadata)
}

/**
 * Fetch job metadata from IPFS
 */
export async function fetchJobMetadata(hash: string): Promise<JobMetadata | null> {
  return fetchFromIPFS<JobMetadata>(hash)
}

/**
 * Generate IPFS URL from hash
 */
export function getIPFSUrl(hash: string): string {
  const cleanHash = normalizeCID(hash)
  const url = buildGatewayUrl(PRIMARY_GATEWAY, cleanHash)
  // Final safety: collapse duplicate /ipfs/ path segments (/ipfs//ipfs/ or /ipfs/ipfs/ → /ipfs/)
  return url.replace(/\/ipfs\/+ipfs\//g, '/ipfs/')
}

/**
 * Check if IPFS is configured
 */
export function isIPFSConfigured(): boolean {
  return !!(PINATA_API_KEY && PINATA_SECRET_KEY)
}
