/// <reference types="next" />
/// <reference types="next/image-types/global" />

// Next.js Environment Variables
declare namespace NodeJS {
  interface ProcessEnv {
    readonly NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: string
    readonly NEXT_PUBLIC_JOB_MANAGER_ADDRESS: string
    readonly NEXT_PUBLIC_ESCROW_MANAGER_ADDRESS: string
    readonly NEXT_PUBLIC_REPUTATION_MANAGER_ADDRESS: string
    readonly NEXT_PUBLIC_IPFS_GATEWAY: string
    readonly NEXT_PUBLIC_IPFS_API_URL: string
    readonly NEXT_PUBLIC_PINATA_API_KEY: string
    readonly NEXT_PUBLIC_PINATA_SECRET_KEY: string
    readonly NEXT_PUBLIC_DEFAULT_CHAIN_ID: string
    readonly NEXT_PUBLIC_API_URL: string
  }
}
