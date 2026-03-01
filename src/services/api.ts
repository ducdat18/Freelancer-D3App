import axios from 'axios'
import type { Job, UserProfile, Rating, PaginatedResponse, PaginationParams } from '../types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add request interceptor for auth token if needed
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/**
 * Job API
 */
export const jobApi = {
  getAll: async (params?: PaginationParams & { status?: number; search?: string }) => {
    const response = await api.get<PaginatedResponse<Job>>('/jobs', { params })
    return response.data
  },

  getById: async (id: string) => {
    const response = await api.get<Job>(`/jobs/${id}`)
    return response.data
  },

  getByClient: async (address: string) => {
    const response = await api.get<Job[]>(`/jobs/client/${address}`)
    return response.data
  },

  getByFreelancer: async (address: string) => {
    const response = await api.get<Job[]>(`/jobs/freelancer/${address}`)
    return response.data
  },

  create: async (job: Partial<Job>) => {
    const response = await api.post<Job>('/jobs', job)
    return response.data
  },

  update: async (id: string, job: Partial<Job>) => {
    const response = await api.put<Job>(`/jobs/${id}`, job)
    return response.data
  },
}

/**
 * User Profile API
 */
export const userApi = {
  getProfile: async (address: string) => {
    const response = await api.get<UserProfile>(`/users/${address}`)
    return response.data
  },

  updateProfile: async (address: string, profile: Partial<UserProfile>) => {
    const response = await api.put<UserProfile>(`/users/${address}`, profile)
    return response.data
  },

  getRatings: async (address: string) => {
    const response = await api.get<Rating[]>(`/users/${address}/ratings`)
    return response.data
  },
}

/**
 * Rating API
 */
export const ratingApi = {
  submit: async (rating: Partial<Rating>) => {
    const response = await api.post<Rating>('/ratings', rating)
    return response.data
  },

  getByJob: async (jobId: string) => {
    const response = await api.get<Rating[]>(`/ratings/job/${jobId}`)
    return response.data
  },
}

/**
 * Statistics API
 */
export const statsApi = {
  getPlatformStats: async () => {
    const response = await api.get('/stats/platform')
    return response.data
  },

  getUserStats: async (address: string) => {
    const response = await api.get(`/stats/user/${address}`)
    return response.data
  },
}

export default api
