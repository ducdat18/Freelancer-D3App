/**
 * Chat API Authentication Utilities
 * Provides functions to sign messages for secure API access.
 *
 * Signatures are cached for 4 minutes (the API allows up to 5 minutes)
 * so the user only sees one wallet popup per session, not on every request.
 */

import { WalletContextState } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';

// ── Signature Cache ─────────────────────────────────────────
// Cache the signed headers so we don't prompt the wallet on every API call.
// The API accepts signatures up to 5 minutes old; we re-sign after 4 minutes.

interface CachedAuth {
  headers: Record<string, string>;
  createdAt: number;
  walletAddress: string;
}

const CACHE_TTL_MS = 4 * 60 * 1000; // 4 minutes (API allows 5)
let cachedAuth: CachedAuth | null = null;

function isCacheValid(walletAddress: string): boolean {
  if (!cachedAuth) return false;
  if (cachedAuth.walletAddress !== walletAddress) return false;
  if (Date.now() - cachedAuth.createdAt > CACHE_TTL_MS) return false;
  return true;
}

// ── Public API ──────────────────────────────────────────────

/**
 * Generate authentication message for wallet signing
 * @param walletAddress - The wallet's public key as a base58 string
 * @returns Message to be signed
 */
export function generateAuthMessage(walletAddress: string): string {
  const timestamp = Date.now();
  return `Authenticate to Freelance DApp\nWallet: ${walletAddress}\nTimestamp: ${timestamp}`;
}

/**
 * Sign a message with the connected wallet
 * @param wallet - Wallet context from useWallet()
 * @param message - Message to sign
 * @returns Signature as base58 string, or null if signing fails
 */
export async function signMessage(
  wallet: WalletContextState,
  message: string
): Promise<string | null> {
  if (!wallet.signMessage || !wallet.publicKey) {
    console.error('Wallet does not support message signing');
    return null;
  }

  if (!message || typeof message !== 'string') {
    console.error('Invalid message to sign:', message);
    return null;
  }

  try {
    const messageBytes = new TextEncoder().encode(message);
    const signature = await wallet.signMessage(messageBytes);
    
    if (!signature || signature.length === 0) {
      console.error('Empty signature returned from wallet');
      return null;
    }
    
    const encodedSignature = bs58.encode(signature);
    
    if (!encodedSignature || encodedSignature === 'undefined' || encodedSignature === 'null') {
      console.error('Invalid encoded signature:', encodedSignature);
      return null;
    }
    
    return encodedSignature;
  } catch (error) {
    console.error('Error signing message:', error);
    return null;
  }
}

/**
 * Create authenticated headers for chat API requests.
 * Uses a 4-minute cache so the wallet popup only appears once per session.
 *
 * @param wallet - Wallet context from useWallet()
 * @returns Headers object with authentication, or null if signing fails
 */
export async function createChatAuthHeaders(
  wallet: WalletContextState
): Promise<Record<string, string> | null> {
  if (!wallet.publicKey) {
    console.error('Wallet not connected');
    return null;
  }

  const walletAddress = wallet.publicKey.toBase58();

  // Return cached headers if still valid
  if (isCacheValid(walletAddress)) {
    return cachedAuth!.headers;
  }

  // Sign a fresh message
  const message = generateAuthMessage(walletAddress);
  const signature = await signMessage(wallet, message);

  if (!signature || signature === 'undefined' || signature === 'null') {
    console.error('createChatAuthHeaders: Invalid signature', signature);
    return null;
  }

  // Validate all values before creating headers
  if (!walletAddress || !message) {
    console.error('createChatAuthHeaders: Missing required values', { walletAddress, message });
    return null;
  }

  // Encode the message in base64 to avoid newline characters in HTTP headers
  const encodedMessage = Buffer.from(message).toString('base64');

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${walletAddress}`,
    'X-Wallet-Signature': signature,
    'X-Signed-Message': encodedMessage,
    'Content-Type': 'application/json',
  };

  // Debug: Check if any header value is invalid
  console.log('createChatAuthHeaders - Created headers:', {
    hasAuthorization: !!headers.Authorization && headers.Authorization !== 'Bearer undefined',
    hasSignature: !!headers['X-Wallet-Signature'] && headers['X-Wallet-Signature'] !== 'undefined',
    hasMessage: !!headers['X-Signed-Message'] && headers['X-Signed-Message'] !== 'undefined',
    walletAddress,
  });

  // Cache for reuse
  cachedAuth = {
    headers,
    createdAt: Date.now(),
    walletAddress,
  };

  return headers;
}

/**
 * Clear the cached authentication (e.g. on wallet disconnect)
 */
export function clearChatAuthCache(): void {
  cachedAuth = null;
}

/**
 * Make an authenticated request to the chat API
 * @param wallet - Wallet context
 * @param endpoint - API endpoint (e.g., '/api/chat/messages')
 * @param options - Fetch options
 * @returns Response from the API
 */
export async function authenticatedChatRequest(
  wallet: WalletContextState,
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = await createChatAuthHeaders(wallet);

  if (!headers) {
    throw new Error('Failed to create authentication headers');
  }

  return fetch(endpoint, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });
}
