import type { AppProps } from 'next/app';
import { useMemo, useEffect } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { web3 } from '@coral-xyz/anchor';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { pageTransition } from '../src/utils/animations';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { cryptoTheme } from '../src/config/theme';
import { NotificationProvider } from '../src/contexts/NotificationContext';
import { UserRoleProvider } from '../src/contexts/UserRoleContext';
import { useRealtimeNotifications } from '../src/hooks/useRealtimeNotifications';
import { useWebSocketSync } from '../src/hooks/useWebSocketSync';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';
import '../styles/globals.css';

// ✅ Optimized React Query config for better performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // Data stays fresh for 5 minutes
      gcTime: 10 * 60 * 1000,        // Garbage collection time (was cacheTime in v4)
      refetchOnWindowFocus: false,   // Don't refetch on window focus
      refetchOnMount: false,         // Don't refetch if data exists
      retry: 1,                      // Only retry once on failure
      refetchInterval: false,        // No automatic polling
    },
  },
});

// Real-time notifications component
function RealtimeNotificationsWrapper() {
  useRealtimeNotifications();
  return null;
}

// WebSocket-to-cache sync component
function WebSocketSyncWrapper() {
  useWebSocketSync();
  return null;
}

// Capture ?ref=WALLET from any page visit and persist to localStorage
function ReferralCaptureWrapper({ router }: { router: AppProps['router'] }) {
  useEffect(() => {
    const ref = router.query?.ref;
    if (ref && typeof ref === 'string') {
      try {
        // Only store if not already referred
        if (!localStorage.getItem('referral_from')) {
          localStorage.setItem('referral_from', ref);
        }
      } catch {}
    }
  }, [router.query]);
  return null;
}

export default function App({ Component, pageProps, router }: AppProps) {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'
  // ⚠️ IMPORTANT: This is set to DEVNET for testing
  const network = WalletAdapterNetwork.Devnet;

  // You can also provide a custom RPC endpoint
  // Using environment variable if available, otherwise default to devnet
  const endpoint = useMemo(() => {
    // Force devnet for testing
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || web3.clusterApiUrl(network);
    return rpcUrl;
  }, [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <QueryClientProvider client={queryClient}>
            <NotificationProvider>
              <UserRoleProvider>
              {/* Temporarily disabled - requires proper RPC with WebSocket support */}
              {/* <RealtimeNotificationsWrapper /> */}
              {/* WebSocket-to-cache sync (auto-disables on public devnet) */}
              <WebSocketSyncWrapper />
              <ReferralCaptureWrapper router={router} />
              <ThemeProvider theme={cryptoTheme}>
                <CssBaseline />
                <AnimatePresence mode="wait">
                  <motion.div
                    key={router.route}
                    variants={pageTransition}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    style={{ minHeight: '100vh' }}
                  >
                    <Component {...pageProps} />
                  </motion.div>
                </AnimatePresence>
              </ThemeProvider>
              </UserRoleProvider>
            </NotificationProvider>
            {/* React Query Devtools - Only in development */}
            {process.env.NODE_ENV === 'development' && (
              <ReactQueryDevtools initialIsOpen={false} />
            )}
          </QueryClientProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
