import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { SvgIconProps } from '@mui/material'
import {
  Box,
  IconButton,
  Menu,
  Button,
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  Alert,
  AlertTitle,
  Badge,
  Divider,
  Typography,
  AppBar,
  Toolbar,
  Tooltip,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import WarningIcon from '@mui/icons-material/Warning'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import WorkOutlineIcon from '@mui/icons-material/WorkOutline'
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import GavelIcon from '@mui/icons-material/Gavel'
import BalanceIcon from '@mui/icons-material/Balance'
import HowToVoteIcon from '@mui/icons-material/HowToVote'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import ShareIcon from '@mui/icons-material/Share'
import FingerprintIcon from '@mui/icons-material/Fingerprint'
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn'
import SavingsIcon from '@mui/icons-material/Savings'
import SettingsIcon from '@mui/icons-material/Settings'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import { useRouter } from 'next/router'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import Logo from './Logo'
import { useQueryClient } from '@tanstack/react-query'
import { useDevnetVerification } from '../hooks/useDevnetVerification'
import { useDatabaseChat } from '../hooks/useDatabaseChat'
import NotificationDropdown from './NotificationDropdown'
import { queryKeys } from '../hooks/queries/queryKeys'

// ─── constants ────────────────────────────────────────────────────────────────

const W_OPEN = 256
const W_MINI = 64

// ─── nav data ─────────────────────────────────────────────────────────────────

type NavIcon = React.FC<SvgIconProps>

interface NavEntry {
  path: string
  name: string
  Icon: NavIcon
  prefetch?: boolean
  messageBadge?: boolean   // shows unread message count
}

interface NavSection {
  label: string
  requiresAuth: boolean
  entries: NavEntry[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'DISCOVER',
    requiresAuth: false,
    entries: [
      { path: '/jobs',         name: 'Browse Jobs',  Icon: WorkOutlineIcon,   prefetch: true },
      { path: '/freelancers',  name: 'Find Talent',  Icon: PeopleOutlineIcon, prefetch: true },
      { path: '/how-it-works', name: 'How It Works', Icon: HelpOutlineIcon },
    ],
  },
  {
    label: 'MY WORKSPACE',
    requiresAuth: true,
    entries: [
      { path: '/jobs/create',        name: 'Post Job',   Icon: AddCircleOutlineIcon },
      { path: '/dashboard',          name: 'Dashboard',  Icon: DashboardOutlinedIcon },
      { path: '/freelancer/my-bids', name: 'My Bids',    Icon: GavelIcon },
      { path: '/messages',           name: 'Messages',   Icon: ChatBubbleOutlineIcon, messageBadge: true },
      { path: '/disputes',           name: 'Disputes',   Icon: BalanceIcon },
    ],
  },
  {
    label: 'PLATFORM',
    requiresAuth: true,
    entries: [
      { path: '/governance',         name: 'Governance',      Icon: HowToVoteIcon },
      { path: '/staking',            name: 'Staking',         Icon: AccountBalanceIcon },
      { path: '/referral',           name: 'Referral',        Icon: ShareIcon },
      { path: '/identity',           name: 'Identity',        Icon: FingerprintIcon },
      { path: '/arbitrator/fees',    name: 'Arbitrator Fees', Icon: MonetizationOnIcon },
      { path: '/arbitrator/staking', name: 'Arb. Staking',    Icon: SavingsIcon },
      { path: '/settings/recovery',  name: 'Settings',        Icon: SettingsIcon },
    ],
  },
]

// ─── component ────────────────────────────────────────────────────────────────

interface LayoutProps { children: ReactNode }

export default function Layout({ children }: LayoutProps) {
  const router     = useRouter()
  const { publicKey, connected, disconnect } = useWallet()
  const { setVisible }                       = useWalletModal()
  const queryClient                          = useQueryClient()
  const { isCorrectNetwork, showNetworkWarning } = useDevnetVerification()
  const { getAllConversations }               = useDatabaseChat()

  const [mobileOpen,   setMobileOpen]   = useState(false)
  const [walletAnchor, setWalletAnchor] = useState<null | HTMLElement>(null)
  const [unreadCount,  setUnreadCount]  = useState(0)

  // Hydration-safe: always start true on server, sync from localStorage after mount
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [hoverOpen,   setHoverOpen]   = useState(false)

  useEffect(() => {
    if (localStorage.getItem('sidebarOpen') === 'false') setSidebarOpen(false)
  }, [])

  useEffect(() => {
    if (!connected || !publicKey) return
    const load = async () => {
      try {
        const convos = await getAllConversations()
        setUnreadCount(convos.reduce((s: number, c: any) => s + (c.unread_count || 0), 0))
      } catch { /* silent */ }
    }
    load()
    const t = setInterval(load, 10_000)
    return () => clearInterval(t)
  }, [connected, publicKey])

  const toggleSidebar = () => setSidebarOpen(prev => {
    const next = !prev
    localStorage.setItem('sidebarOpen', String(next))
    if (next) setHoverOpen(false) // pinning open: clear hover state
    return next
  })

  // sidebar is visually expanded if pinned open OR mouse is hovering when mini
  const isExpanded = sidebarOpen || hoverOpen

  const isActive = (path: string) =>
    path === '/' ? router.pathname === '/' : router.pathname === path || router.pathname.startsWith(path + '/')

  const shortAddr = publicKey
    ? `${publicKey.toBase58().slice(0, 5)}...${publicKey.toBase58().slice(-4)}`
    : null

  // ─── sub-components ─────────────────────────────────────────────────────────

  const SideNavItem = ({ path, name, Icon, prefetch, messageBadge }: NavEntry) => {
    const active = isActive(path)
    const badge  = messageBadge ? unreadCount : 0

    return (
      <ListItem disablePadding sx={{ mb: 0.25 }}>
        <Tooltip title={!isExpanded ? name : ''} placement="right" arrow>
          <ListItemButton
            onClick={() => {
              router.push(path)
              setMobileOpen(false)
              if (prefetch) {
                if (path === '/jobs')        queryClient.prefetchQuery({ queryKey: queryKeys.jobs.list('all'), staleTime: 2 * 60_000 })
                if (path === '/freelancers') queryClient.prefetchQuery({ queryKey: queryKeys.freelancers.top(6), staleTime: 5 * 60_000 })
              }
            }}
            sx={{
              borderRadius: '6px',
              mx: 1,
              px: isExpanded ? 1.5 : 0,
              py: 0.75,
              justifyContent: isExpanded ? 'flex-start' : 'center',
              color: active ? 'primary.main' : 'text.secondary',
              bgcolor: active ? 'rgba(0,255,195,0.07)' : 'transparent',
              borderLeft: active ? '2px solid #00ffc3' : '2px solid transparent',
              '& .MuiListItemIcon-root': { color: 'inherit' },
              '&:hover': {
                bgcolor: 'rgba(0,255,195,0.05)',
                color: 'primary.main',
                borderLeft: '2px solid rgba(0,255,195,0.5)',
              },
              transition: 'all 0.15s',
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: isExpanded ? 32 : 'auto',
                '& svg': active ? { filter: 'drop-shadow(0 0 4px rgba(0,255,195,0.5))' } : {},
              }}
            >
              <Badge badgeContent={badge} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', minWidth: 14, height: 14 } }}>
                <Icon sx={{ fontSize: 18 }} />
              </Badge>
            </ListItemIcon>
            {isExpanded && (
              <Typography noWrap sx={{ fontSize: '0.85rem', fontFamily: '"Rajdhani", sans-serif', fontWeight: active ? 700 : 500, letterSpacing: '0.03em' }}>
                {name}
              </Typography>
            )}
          </ListItemButton>
        </Tooltip>
      </ListItem>
    )
  }

  const SectionLabel = ({ label }: { label: string }) =>
    isExpanded ? (
      <Typography
        sx={{
          px: 2, pt: 1.5, pb: 0.5,
          fontSize: '0.6rem',
          fontFamily: '"Orbitron", sans-serif',
          fontWeight: 600,
          letterSpacing: '0.12em',
          color: 'rgba(0,255,195,0.3)',
          userSelect: 'none',
        }}
      >
        {label}
      </Typography>
    ) : (
      <Divider sx={{ my: 0.75, mx: 1.5, borderColor: 'rgba(0,255,195,0.08)' }} />
    )

  // ─── sidebar ────────────────────────────────────────────────────────────────

  const sidebar = (
    <Box
      sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
      onMouseEnter={() => { if (!sidebarOpen) setHoverOpen(true) }}
      onMouseLeave={() => { if (!sidebarOpen) setHoverOpen(false) }}
    >

      {/* Logo + toggle */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: isExpanded ? 2 : 0.75,
          minHeight: 64,
          flexShrink: 0,
          borderBottom: '1px solid rgba(0,255,195,0.1)',
          transition: 'padding 0.2s',
        }}
      >
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', overflow: 'hidden', flexShrink: 0 }}
          onClick={() => { router.push('/'); setMobileOpen(false) }}
        >
          <Logo size={isExpanded ? 32 : 28} showText={false} />
          {isExpanded && (
            <Box sx={{ overflow: 'hidden' }}>
              <Typography noWrap sx={{ fontFamily: '"Orbitron", sans-serif', fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.04em', background: 'linear-gradient(135deg, #00ffc3 0%, #8084ee 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                FreelanceChain
              </Typography>
              <Typography sx={{ fontFamily: '"Rajdhani", sans-serif', fontSize: '0.58rem', letterSpacing: '0.12em', color: 'rgba(0,255,195,0.35)', textTransform: 'uppercase' }}>
                Decentralized
              </Typography>
            </Box>
          )}
        </Box>

        {/* Collapse/pin toggle — always visible on desktop so icon order stays consistent */}
        <Tooltip title={sidebarOpen ? 'Collapse' : 'Pin open'} placement="right" arrow>
          <IconButton
            size="small"
            onClick={toggleSidebar}
            sx={{
              display: { xs: 'none', md: 'flex' },
              flexShrink: 0,
              color: 'text.disabled',
              '&:hover': { color: 'primary.main', bgcolor: 'rgba(0,255,195,0.08)' },
            }}
          >
            <ChevronLeftIcon sx={{ fontSize: isExpanded ? 18 : 14, transform: sidebarOpen ? 'none' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Wallet */}
      <Box
        sx={{
          px: isExpanded ? 1.5 : 1,
          py: 1.25,
          flexShrink: 0,
          borderBottom: '1px solid rgba(0,255,195,0.08)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: isExpanded ? 'stretch' : 'center',
          gap: 0.75,
          transition: 'padding 0.2s',
        }}
      >
        {isExpanded ? (
          <Button
            fullWidth size="small"
            variant={connected ? 'outlined' : 'contained'}
            startIcon={<AccountBalanceWalletIcon sx={{ fontSize: '15px !important' }} />}
            onClick={e => connected ? setWalletAnchor(e.currentTarget) : setVisible(true)}
            sx={{
              textTransform: 'none',
              justifyContent: 'flex-start',
              fontSize: '0.78rem',
              py: 0.75,
              borderColor: connected && !isCorrectNetwork ? 'error.main' : undefined,
              color:       connected && !isCorrectNetwork ? 'error.main' : undefined,
            }}
          >
            {connected && shortAddr ? shortAddr : 'Connect Wallet'}
          </Button>
        ) : (
          <Tooltip title={connected && shortAddr ? shortAddr : 'Connect Wallet'} placement="right" arrow>
            <IconButton
              size="small"
              onClick={e => connected ? setWalletAnchor(e.currentTarget) : setVisible(true)}
              sx={{ color: connected ? (isCorrectNetwork ? 'primary.main' : 'error.main') : 'text.secondary' }}
            >
              <AccountBalanceWalletIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )}

        {/* Notifications — separate row */}
        {connected && (
          <Box sx={{ display: 'flex', justifyContent: isExpanded ? 'flex-start' : 'center' }}>
            <NotificationDropdown />
          </Box>
        )}
      </Box>

      {/* Nav sections */}
      <Box sx={{ overflowY: 'auto', overflowX: 'hidden', flexGrow: 1 }}>
        {NAV_SECTIONS.map(section => {
          if (section.requiresAuth && !connected) return null
          return (
            <Box key={section.label}>
              <SectionLabel label={section.label} />
              <List dense disablePadding sx={{ mb: 0.5 }}>
                {section.entries.map(entry => (
                  <SideNavItem key={entry.path} {...entry} />
                ))}
              </List>
            </Box>
          )
        })}
      </Box>

      {/* About Us */}
      <Box sx={{ borderTop: '1px solid rgba(0,255,195,0.08)', flexShrink: 0 }}>
        <Tooltip title={!isExpanded ? 'About Us' : ''} placement="right" arrow>
          <ListItemButton
            onClick={() => { router.push('/about'); setMobileOpen(false) }}
            sx={{
              py: 1,
              px: isExpanded ? 2 : 0,
              justifyContent: isExpanded ? 'flex-start' : 'center',
              color: isActive('/about') ? 'primary.main' : 'text.disabled',
              '&:hover': { color: 'text.secondary', bgcolor: 'rgba(255,255,255,0.03)' },
            }}
          >
            <ListItemIcon sx={{ minWidth: isExpanded ? 30 : 'auto', color: 'inherit' }}>
              <InfoOutlinedIcon sx={{ fontSize: 18 }} />
            </ListItemIcon>
            {isExpanded && (
              <Typography sx={{ fontSize: '0.78rem', fontFamily: '"Rajdhani", sans-serif', letterSpacing: '0.04em', color: 'inherit' }}>
                About Us
              </Typography>
            )}
          </ListItemButton>
        </Tooltip>
      </Box>

    </Box>
  )

  const sideW = isExpanded ? W_OPEN : W_MINI

  // ─── render ─────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>

      {/* Mobile AppBar */}
      <AppBar position="fixed" sx={{ display: { md: 'none' }, zIndex: t => t.zIndex.drawer + 1 }}>
        <Toolbar variant="dense" sx={{ gap: 1 }}>
          <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)}>
            <MenuIcon />
          </IconButton>
          <Box sx={{ display: 'flex', cursor: 'pointer' }} onClick={() => router.push('/')}>
            <Logo size={26} showText={false} />
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          {connected && (
            <NotificationDropdown />
          )}
          <Button
            size="small"
            variant={connected ? 'outlined' : 'contained'}
            startIcon={<AccountBalanceWalletIcon />}
            onClick={e => connected ? setWalletAnchor(e.currentTarget) : setVisible(true)}
            sx={{
              textTransform: 'none',
              fontSize: '0.72rem',
              borderColor: connected && !isCorrectNetwork ? 'error.main' : undefined,
              color:       connected && !isCorrectNetwork ? 'error.main' : undefined,
            }}
          >
            {connected && shortAddr ? shortAddr : 'Connect'}
          </Button>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: W_OPEN } }}
      >
        {sidebar}
      </Drawer>

      {/* Desktop Permanent Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: sideW,
          flexShrink: 0,
          transition: 'width 0.2s ease',
          '& .MuiDrawer-paper': {
            width: sideW,
            overflowX: 'hidden',
            transition: 'width 0.2s ease',
          },
        }}
      >
        {sidebar}
      </Drawer>

      {/* Wallet menu */}
      <Menu anchorEl={walletAnchor} open={Boolean(walletAnchor)} onClose={() => setWalletAnchor(null)}>
        <MenuItem onClick={() => { router.push('/freelancer/profile'); setWalletAnchor(null) }}>
          Edit Profile
        </MenuItem>
        <MenuItem onClick={() => { router.push(`/profile/${publicKey?.toBase58()}`); setWalletAnchor(null) }}>
          View Public Profile
        </MenuItem>
        <MenuItem onClick={() => { disconnect(); setWalletAnchor(null) }}>
          Disconnect
        </MenuItem>
      </Menu>

      {/* Main */}
      <Box
        component="main"
        sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: '100vh', mt: { xs: '48px', md: 0 } }}
      >
        {showNetworkWarning && connected && (
          <Alert severity="error" icon={<WarningIcon />} sx={{ borderRadius: 0, animation: 'shake 0.5s', '@keyframes shake': { '0%,100%': { transform: 'translateX(0)' }, '10%,30%,50%,70%,90%': { transform: 'translateX(-5px)' }, '20%,40%,60%,80%': { transform: 'translateX(5px)' } } }}>
            <AlertTitle sx={{ fontWeight: 'bold' }}>Wrong Network — Switch to Devnet!</AlertTitle>
            Open your wallet → Settings → change network to <strong>Devnet</strong>, then refresh.
          </Alert>
        )}

        <Box sx={{ flexGrow: 1, py: 3 }}>
          {children}
        </Box>
      </Box>

    </Box>
  )
}
