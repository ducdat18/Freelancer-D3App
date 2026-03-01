// Smart Contract Addresses
export const CONTRACT_ADDRESSES = {
  JOB_MANAGER: process.env.NEXT_PUBLIC_JOB_MANAGER_ADDRESS || '',
  ESCROW_MANAGER: process.env.NEXT_PUBLIC_ESCROW_MANAGER_ADDRESS || '',
  REPUTATION_MANAGER: process.env.NEXT_PUBLIC_REPUTATION_MANAGER_ADDRESS || '',
} as const

// Supported Chains
export const SUPPORTED_CHAINS = {
  MAINNET: 1,
  SEPOLIA: 11155111,
  HARDHAT: 31337,
} as const

// Job Status
export const JOB_STATUS = {
  OPEN: 0,
  IN_PROGRESS: 1,
  COMPLETED: 2,
  DISPUTED: 3,
  CANCELLED: 4,
} as const

// IPFS Configuration
export const IPFS_CONFIG = {
  GATEWAY: process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs/',
  API_URL: process.env.NEXT_PUBLIC_IPFS_API_URL || 'https://api.pinata.cloud',
} as const

// Pagination
export const ITEMS_PER_PAGE = 10

// Rating
export const MAX_RATING = 5
export const MIN_RATING = 1

// Types
export type JobStatus = typeof JOB_STATUS[keyof typeof JOB_STATUS]
export type SupportedChain = typeof SUPPORTED_CHAINS[keyof typeof SUPPORTED_CHAINS]
