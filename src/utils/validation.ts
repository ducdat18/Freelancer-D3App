import { isAddress } from 'viem'

/**
 * Validate Ethereum address
 */
export function validateAddress(address: string): boolean {
  return isAddress(address)
}

/**
 * Validate ETH amount
 */
export function validateEthAmount(amount: string): boolean {
  if (!amount || amount === '0') return false
  const num = parseFloat(amount)
  return !isNaN(num) && num > 0
}

/**
 * Validate job title
 */
export function validateJobTitle(title: string): string | null {
  if (!title || title.trim().length === 0) {
    return 'Title is required'
  }
  if (title.length < 5) {
    return 'Title must be at least 5 characters'
  }
  if (title.length > 100) {
    return 'Title must be less than 100 characters'
  }
  return null
}

/**
 * Validate job description
 */
export function validateJobDescription(description: string): string | null {
  if (!description || description.trim().length === 0) {
    return 'Description is required'
  }
  if (description.length < 20) {
    return 'Description must be at least 20 characters'
  }
  if (description.length > 5000) {
    return 'Description must be less than 5000 characters'
  }
  return null
}

/**
 * Validate budget
 */
export function validateBudget(budget: string): string | null {
  if (!budget || budget === '0') {
    return 'Budget is required'
  }
  const num = parseFloat(budget)
  if (isNaN(num) || num <= 0) {
    return 'Budget must be greater than 0'
  }
  if (num > 10000) {
    return 'Budget seems too high. Please check the amount'
  }
  return null
}

/**
 * Validate deadline (must be in the future)
 */
export function validateDeadline(deadline: Date): string | null {
  if (!deadline) {
    return 'Deadline is required'
  }
  const now = new Date()
  if (deadline <= now) {
    return 'Deadline must be in the future'
  }
  const maxDate = new Date()
  maxDate.setFullYear(maxDate.getFullYear() + 1)
  if (deadline > maxDate) {
    return 'Deadline cannot be more than 1 year in the future'
  }
  return null
}

/**
 * Validate rating (1-5)
 */
export function validateRating(rating: number): string | null {
  if (rating < 1 || rating > 5) {
    return 'Rating must be between 1 and 5'
  }
  return null
}

/**
 * Validate URL
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Validate IPFS hash
 */
export function validateIpfsHash(hash: string): boolean {
  // Basic IPFS hash validation (Qm... or ba...)
  return /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|ba[A-Za-z2-7]{57})$/.test(hash)
}
