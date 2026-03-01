import type { Address } from 'viem'

// Smart Contract ABIs will be imported here
export interface JobManagerContract {
  address: Address
  abi: any[]
}

export interface EscrowManagerContract {
  address: Address
  abi: any[]
}

export interface ReputationManagerContract {
  address: Address
  abi: any[]
}

// Contract Event Types
export interface JobCreatedEvent {
  jobId: bigint
  client: Address
  title: string
  budget: bigint
  deadline: bigint
}

export interface JobAssignedEvent {
  jobId: bigint
  freelancer: Address
}

export interface JobCompletedEvent {
  jobId: bigint
  completedAt: bigint
}

export interface PaymentReleasedEvent {
  jobId: bigint
  amount: bigint
  to: Address
}

export interface DisputeRaisedEvent {
  jobId: bigint
  raisedBy: Address
  reason: string
}

export interface RatingSubmittedEvent {
  jobId: bigint
  from: Address
  to: Address
  rating: number
}
