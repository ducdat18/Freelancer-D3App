import { useEffect, useCallback } from 'react'
import { useJobs } from './useJobs'
import { useNotificationContext } from '../contexts/NotificationContext'
import { NotificationType } from '../types'
import { useWallet } from '@solana/wallet-adapter-react'
import type { PublicKey } from '../types/solana'

/**
 * Enhanced useJobs hook that automatically sends notifications
 * for job-related events
 */
export function useJobsWithNotifications(params?: any) {
  const jobsHook = useJobs(params)
  const { addNotification } = useNotificationContext()
  const { publicKey } = useWallet()

  // Monitor for new bids on client's jobs
  useEffect(() => {
    if (!publicKey || !jobsHook.jobs) return

    const checkForNewBids = async () => {
      try {
        // Get all jobs created by the current user
        const myJobs = jobsHook.jobs.filter(
          (job) => job.account.client.toString() === publicKey.toString()
        )

        for (const job of myJobs) {
          const previousBidCount = parseInt(localStorage.getItem(`job_${job.publicKey.toString()}_bidCount`) || '0')
          const currentBidCount = job.account.bidCount

          // If there are new bids, send a notification
          if (currentBidCount > previousBidCount) {
            const newBidsCount = currentBidCount - previousBidCount
            addNotification(
              NotificationType.PROPOSAL_RECEIVED,
              'New Bid Received',
              `You received ${newBidsCount} new ${newBidsCount === 1 ? 'bid' : 'bids'} on "${job.account.title}"`,
              `/jobs/${job.publicKey.toString()}`
            )
            localStorage.setItem(`job_${job.publicKey.toString()}_bidCount`, currentBidCount.toString())
          }
        }
      } catch (error) {
        console.error('Error checking for new bids:', error)
      }
    }

    // Check immediately and then periodically
    checkForNewBids()
    const interval = setInterval(checkForNewBids, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [jobsHook.jobs, publicKey, addNotification])

  // Wrapped createJob with notification
  const createJobWithNotification = useCallback(
    async (
      title: string,
      description: string,
      budgetSol: string,
      deadline: number,
      metadataUri: string
    ) => {
      const result = await jobsHook.createJob(title, description, budgetSol, deadline, metadataUri)

      addNotification(
        NotificationType.JOB_CREATED,
        'Job Posted Successfully',
        `Your job "${title}" has been posted and is now live on the marketplace`,
        `/jobs/${result.jobPda.toString()}`
      )

      return result
    },
    [jobsHook.createJob, addNotification]
  )

  // Wrapped submitBid with notification
  const submitBidWithNotification = useCallback(
    async (
      jobPda: PublicKey,
      proposedBudgetSol: number,
      proposal: string,
      timelineDays: number,
      cvUri?: string
    ) => {
      const result = await jobsHook.submitBid(jobPda, proposedBudgetSol, proposal, timelineDays, cvUri)

      addNotification(
        NotificationType.PROPOSAL_RECEIVED,
        'Bid Submitted',
        'Your bid has been submitted successfully. The client will review it shortly.',
        `/jobs/${jobPda.toString()}`
      )

      return result
    },
    [jobsHook.submitBid, addNotification]
  )

  // Wrapped selectBid with notification
  const selectBidWithNotification = useCallback(
    async (jobPda: PublicKey, bidPda: PublicKey) => {
      const result = await jobsHook.selectBid(jobPda, bidPda)

      addNotification(
        NotificationType.PROPOSAL_ACCEPTED,
        'Bid Selected',
        'You have successfully selected a freelancer for this job',
        `/jobs/${jobPda.toString()}`
      )

      return result
    },
    [jobsHook.selectBid, addNotification]
  )

  // Wrapped completeJob with notification
  const completeJobWithNotification = useCallback(
    async (jobPda: PublicKey, escrowPda: PublicKey, freelancerPubkey: PublicKey) => {
      const result = await jobsHook.completeJob(jobPda, escrowPda, freelancerPubkey)

      addNotification(
        NotificationType.JOB_COMPLETED,
        'Job Completed',
        'The job has been marked as completed and payment has been released',
        `/jobs/${jobPda.toString()}`
      )

      return result
    },
    [jobsHook.completeJob, addNotification]
  )

  return {
    ...jobsHook,
    createJob: createJobWithNotification,
    submitBid: submitBidWithNotification,
    selectBid: selectBidWithNotification,
    completeJob: completeJobWithNotification,
  }
}
