import { useState } from 'react'
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Box,
  Typography,
  Divider,
  Button,
  ListItemIcon,
  ListItemText,
  Chip,
  useTheme,
} from '@mui/material'
import {
  Notifications as NotificationsIcon,
  Work,
  Assignment,
  CheckCircle,
  PlayArrow,
  AttachMoney,
  Gavel,
  Star,
  Circle,
} from '@mui/icons-material'
import { useNotificationContext } from '../contexts/NotificationContext'
import { NotificationType } from '../types'
import { useRouter } from 'next/router'
import { formatDistanceToNow } from 'date-fns'

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case NotificationType.JOB_CREATED:
      return <Work fontSize="small" />
    case NotificationType.PROPOSAL_RECEIVED:
      return <Assignment fontSize="small" />
    case NotificationType.PROPOSAL_ACCEPTED:
      return <CheckCircle fontSize="small" color="success" />
    case NotificationType.JOB_STARTED:
      return <PlayArrow fontSize="small" color="info" />
    case NotificationType.JOB_COMPLETED:
      return <CheckCircle fontSize="small" color="success" />
    case NotificationType.PAYMENT_RECEIVED:
      return <AttachMoney fontSize="small" color="success" />
    case NotificationType.DISPUTE_RAISED:
      return <Gavel fontSize="small" color="warning" />
    case NotificationType.RATING_RECEIVED:
      return <Star fontSize="small" color="primary" />
    default:
      return <NotificationsIcon fontSize="small" />
  }
}

export default function NotificationDropdown() {
  const router = useRouter()
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotificationContext()

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id)
    if (notification.link) {
      router.push(notification.link)
    }
    handleClose()
  }

  const handleMarkAllAsRead = () => {
    markAllAsRead()
  }

  const handleClearAll = () => {
    clearAll()
    handleClose()
  }

  return (
    <>
      <IconButton
        onClick={handleOpen}
        sx={{
          mr: { xs: 1, md: 2 },
          color: 'inherit',
          transition: 'all 0.2s',
          '&:hover': {
            transform: 'scale(1.1)',
            bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
          },
        }}
      >
        <Badge badgeContent={unreadCount} color="error" sx={{ '& .MuiBadge-badge': { fontWeight: 700 } }}>
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: { xs: '100vw', sm: 400 },
            maxWidth: 400,
            maxHeight: 500,
            mt: 1.5,
            border: 1,
            borderColor: 'divider',
            boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.1)',
            backgroundImage: 'none',
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight={700}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Chip
              label={`${unreadCount} new`}
              size="small"
              color="primary"
              sx={{ fontSize: '0.65rem', height: 20, fontWeight: 700 }}
            />
          )}
        </Box>

        <Divider />

        {notifications.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <NotificationsIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5, opacity: 0.5 }} />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Your inbox is clear
            </Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ maxHeight: 350, overflow: 'auto' }}>
              {notifications.map((notification) => (
                <MenuItem
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    py: 1.5,
                    px: 2,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: notification.read ? 'transparent' : (isDark ? 'rgba(0,255,195,0.03)' : 'rgba(5,150,105,0.03)'),
                    transition: 'all 0.2s',
                    whiteSpace: 'normal',
                    '&:hover': {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: notification.read ? 'text.disabled' : 'primary.main' }}>
                    {getNotificationIcon(notification.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={notification.read ? 600 : 800} color={notification.read ? 'text.primary' : 'primary.main'}>
                          {notification.title}
                        </Typography>
                        {!notification.read && (
                          <Circle sx={{ fontSize: 6, color: 'primary.main' }} />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4, mb: 0.5, fontWeight: 500 }}>
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', fontWeight: 600 }}>
                          {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                        </Typography>
                      </Box>
                    }
                  />
                </MenuItem>
              ))}
            </Box>

            <Divider />

            <Box sx={{ p: 1, display: 'flex', gap: 1, bgcolor: isDark ? 'transparent' : 'grey.50' }}>
              {unreadCount > 0 && (
                <Button
                  size="small"
                  variant="text"
                  onClick={handleMarkAllAsRead}
                  sx={{ flex: 1, fontSize: '0.7rem', fontWeight: 700 }}
                >
                  Mark all as read
                </Button>
              )}
              <Button
                size="small"
                variant="text"
                color="inherit"
                onClick={handleClearAll}
                sx={{ flex: 1, fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary' }}
              >
                Clear all
              </Button>
            </Box>
          </>
        )}
      </Menu>
    </>
  )
}
