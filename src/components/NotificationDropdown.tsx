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
          mr: 2,
          color: 'white',
          transition: 'transform 0.2s',
          '&:hover': {
            transform: 'scale(1.1)',
          },
        }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 600,
            mt: 1,
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2, pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight="bold">
              Notifications
            </Typography>
            {unreadCount > 0 && (
              <Chip
                label={`${unreadCount} new`}
                size="small"
                color="primary"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
          </Box>
        </Box>

        <Divider />

        {notifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <NotificationsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">No notifications yet</Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {notifications.map((notification) => (
                <MenuItem
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    py: 1.5,
                    px: 2,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: notification.read ? 'transparent' : 'action.hover',
                    '&:hover': {
                      backgroundColor: 'action.selected',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {getNotificationIcon(notification.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={notification.read ? 'normal' : 'bold'}>
                          {notification.title}
                        </Typography>
                        {!notification.read && (
                          <Circle sx={{ fontSize: 8, color: 'primary.main' }} />
                        )}
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                        </Typography>
                      </>
                    }
                  />
                </MenuItem>
              ))}
            </Box>

            <Divider />

            <Box sx={{ p: 1, display: 'flex', gap: 1 }}>
              {unreadCount > 0 && (
                <Button
                  size="small"
                  onClick={handleMarkAllAsRead}
                  sx={{ flex: 1 }}
                >
                  Mark all as read
                </Button>
              )}
              <Button
                size="small"
                color="error"
                onClick={handleClearAll}
                sx={{ flex: 1 }}
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
