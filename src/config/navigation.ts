import type { UserRole } from '../utils/userRole';

export interface NavItem {
  name: string;
  path: string;
  requiresAuth?: boolean;
  group: 'primary' | 'secondary' | 'footer';
}

export const NAV_ITEMS: NavItem[] = [
  // Primary - always visible (3 items max when not connected)
  { name: 'Browse Jobs', path: '/jobs', group: 'primary' },
  { name: 'Find Talent', path: '/freelancers', group: 'primary' },

  // Primary - requires auth (adds up to 5 total when connected)
  { name: 'Post Job', path: '/jobs/create', group: 'primary', requiresAuth: true },
  { name: 'Dashboard', path: '/dashboard', group: 'primary', requiresAuth: true },

  // Secondary - "More" dropdown (auth)
  { name: 'My Bids', path: '/freelancer/my-bids', group: 'secondary', requiresAuth: true },
  { name: 'Disputes', path: '/disputes', group: 'secondary', requiresAuth: true },
  { name: 'Governance', path: '/governance', group: 'secondary', requiresAuth: true },
  { name: 'Staking', path: '/staking', group: 'secondary', requiresAuth: true },
  { name: 'Referral', path: '/referral', group: 'secondary', requiresAuth: true },
  { name: 'Identity', path: '/identity', group: 'secondary', requiresAuth: true },
  { name: 'Arbitrator Fees', path: '/arbitrator/fees', group: 'secondary', requiresAuth: true },
  { name: 'Arbitrator Staking', path: '/arbitrator/staking', group: 'secondary', requiresAuth: true },
  { name: 'Settings', path: '/settings/recovery', group: 'secondary', requiresAuth: true },

  // Secondary - "More" dropdown (public)
  { name: 'How It Works', path: '/how-it-works', group: 'secondary' },

  // Footer
  { name: 'Terms', path: '/terms', group: 'footer' },
  { name: 'Privacy', path: '/privacy', group: 'footer' },
  { name: 'Docs', path: '/docs', group: 'footer' },
  { name: 'How It Works', path: '/how-it-works', group: 'footer' },
  { name: 'Governance', path: '/governance', group: 'footer' },
];

export function getNavItems(connected: boolean, group: 'primary' | 'secondary' | 'footer'): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (item.group !== group) return false;
    if (item.requiresAuth && !connected) return false;
    return true;
  });
}

export function getDashboardPath(role: UserRole): string {
  if (role.primary === 'client') return '/client/dashboard';
  if (role.primary === 'freelancer') return '/freelancer/dashboard';
  return '/dashboard';
}
