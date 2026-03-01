import { useCallback } from 'react'
import { useReputation } from './useReputation'
import { useNotificationContext } from '../contexts/NotificationContext'
import { NotificationType } from '../types'
import type { PublicKey } from '../types/solana'

/**
 * Enhanced useReputation hook that automatically sends notifications
 * for reputation-related events
 */
export function useReputationWithNotifications() {
  const reputationHook = useReputation()
  const { addNotification } = useNotificationContext()

  // Wrapped submitReview with notification
  const submitReviewWithNotification = useCallback(
    async (
      jobPda: PublicKey,
      revieweePubkey: PublicKey,
      rating: number,
      comment: string
    ) => {
      const result = await reputationHook.submitReview(jobPda, revieweePubkey, rating, comment)

      addNotification(
        NotificationType.RATING_RECEIVED,
        'Review Submitted',
        `You've submitted a ${rating}-star review`,
        `/jobs/${jobPda.toString()}`
      )

      return result
    },
    [reputationHook.submitReview, addNotification]
  )

  return {
    ...reputationHook,
    submitReview: submitReviewWithNotification,
  }
}
