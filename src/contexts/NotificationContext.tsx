import { createContext, useContext, ReactNode, useEffect } from 'react'
import { useNotifications } from '../hooks/useNotifications'
import { NotificationType } from '../types'
import { useWallet } from '@solana/wallet-adapter-react'

interface NotificationContextType {
  notifications: any[]
  unreadCount: number
  addNotification: (type: NotificationType, title: string, message: string, link?: string, signature?: string) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  deleteNotification: (id: string) => void
  clearAll: () => void
  requestPermission: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const notificationHook = useNotifications()
  const { connected } = useWallet()

  // Request notification permission when user connects wallet
  useEffect(() => {
    if (connected) {
      notificationHook.requestPermission()
    }
  }, [connected, notificationHook.requestPermission])

  return (
    <NotificationContext.Provider value={notificationHook}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotificationContext() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider')
  }
  return context
}
