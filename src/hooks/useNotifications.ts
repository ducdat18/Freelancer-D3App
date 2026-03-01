import { useState, useEffect, useCallback } from 'react'
import { type Notification, NotificationType } from '../types'

/**
 * Hook to manage notifications
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  // Load notifications from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('notifications')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Ensure parsed is an array
        const notifications = Array.isArray(parsed) ? parsed : []
        setNotifications(notifications)
        setUnreadCount(notifications.filter((n: Notification) => !n.read).length)
      } catch (error) {
        console.error('Failed to parse notifications from localStorage:', error)
        // Clear corrupted data
        localStorage.removeItem('notifications')
        setNotifications([])
        setUnreadCount(0)
      }
    }
  }, [])

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem('notifications', JSON.stringify(notifications))
    } else {
      // If no notifications, ensure we store an empty array
      localStorage.setItem('notifications', JSON.stringify([]))
    }
  }, [notifications])

  const addNotification = useCallback(
    (
      type: NotificationType,
      title: string,
      message: string,
      link?: string
    ) => {
      const notification: Notification = {
        id: Date.now().toString(),
        type,
        title,
        message,
        read: false,
        createdAt: Date.now(),
        link,
      }

      setNotifications((prev) => [notification, ...prev])
      setUnreadCount((prev) => prev + 1)

      // Show browser notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body: message,
          icon: '/logo.png',
        })
      }
    },
    []
  )

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [])

  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => {
      const notification = prev.find((n) => n.id === id)
      if (notification && !notification.read) {
        setUnreadCount((count) => Math.max(0, count - 1))
      }
      return prev.filter((n) => n.id !== id)
    })
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
    setUnreadCount(0)
    localStorage.removeItem('notifications')
  }, [])

  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }, [])

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    requestPermission,
  }
}
