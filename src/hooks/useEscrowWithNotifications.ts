import { useCallback } from 'react'
import { useEscrow } from './useEscrow'
import { useNotificationContext } from '../contexts/NotificationContext'
import { NotificationType } from '../types'
import type { PublicKey } from '../types/solana'

/**
 * Enhanced useEscrow hook that automatically sends notifications
 * for escrow-related events
 */
export function useEscrowWithNotifications() {
  const escrowHook = useEscrow()
  const { addNotification } = useNotificationContext()

  // Wrapped depositEscrow with notification
  const depositEscrowWithNotification = useCallback(
    async (jobPda: PublicKey, amountSol: number) => {
      const result = await escrowHook.depositEscrow(jobPda, amountSol)

      addNotification(
        NotificationType.JOB_STARTED,
        'Escrow Deposited',
        `${amountSol} SOL has been deposited into escrow. The job can now begin!`,
        `/jobs/${jobPda.toString()}`
      )

      return result
    },
    [escrowHook.depositEscrow, addNotification]
  )

  // Wrapped submitWork with notification
  const submitWorkWithNotification = useCallback(
    async (jobPda: PublicKey, deliverableUri: string) => {
      const result = await escrowHook.submitWork(jobPda, deliverableUri)

      addNotification(
        NotificationType.JOB_COMPLETED,
        'Work Submitted',
        'Your work has been submitted for client review',
        `/jobs/${jobPda.toString()}`
      )

      return result
    },
    [escrowHook.submitWork, addNotification]
  )

  // Wrapped releaseEscrow with notification
  const releaseEscrowWithNotification = useCallback(
    async (jobPda: PublicKey, freelancerPubkey: PublicKey) => {
      const result = await escrowHook.releaseEscrow(jobPda, freelancerPubkey)

      addNotification(
        NotificationType.PAYMENT_RECEIVED,
        'Payment Released',
        'Payment has been released from escrow to the freelancer',
        `/jobs/${jobPda.toString()}`
      )

      return result
    },
    [escrowHook.releaseEscrow, addNotification]
  )

  // Wrapped openDispute with notification
  const openDisputeWithNotification = useCallback(
    async (jobPda: PublicKey, reason: string) => {
      const result = await escrowHook.openDispute(jobPda, reason)

      addNotification(
        NotificationType.DISPUTE_RAISED,
        'Dispute Raised',
        'A dispute has been raised for this job. Arbitrators will review the case.',
        `/jobs/${jobPda.toString()}`
      )

      return result
    },
    [escrowHook.openDispute, addNotification]
  )

  return {
    ...escrowHook,
    depositEscrow: depositEscrowWithNotification,
    submitWork: submitWorkWithNotification,
    releaseEscrow: releaseEscrowWithNotification,
    openDispute: openDisputeWithNotification,
  }
}
