# Chat API Authentication Guide

## Overview

The Chat API now uses **Solana wallet signature verification** for secure authentication. This prevents unauthorized access and replay attacks.

## Security Features

1. **Wallet Signature Verification** - Uses `tweetnacl` to verify signatures
2. **Timestamp-based Expiration** - Messages expire after 5 minutes
3. **Replay Attack Prevention** - Each signature is tied to a specific timestamp
4. **Address Matching** - Ensures signature matches the claimed wallet address

## Backend Implementation

### API Endpoint: `/pages/api/chat/messages.ts`

**Required Headers:**
- `Authorization: Bearer {wallet_address}` - Wallet public key
- `X-Wallet-Signature: {signature}` - Base58-encoded signature
- `X-Signed-Message: {message}` - Original message that was signed

**Message Format:**
```
Authenticate to Freelance DApp
Wallet: {wallet_address}
Timestamp: {unix_timestamp_ms}
```

**Dependencies:**
```bash
npm install bs58 tweetnacl @solana/web3.js
```

## Frontend Integration

### Using the Utility Helper

**File:** `/src/utils/chatAuth.ts`

#### Example 1: Simple Authenticated Request

```typescript
import { useWallet } from '@solana/wallet-adapter-react';
import { authenticatedChatRequest } from '../utils/chatAuth';

function ChatComponent() {
  const wallet = useWallet();

  const fetchMessages = async (otherAddress: string) => {
    try {
      const response = await authenticatedChatRequest(
        wallet,
        `/api/chat/messages?other=${otherAddress}`,
        { method: 'GET' }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('Messages:', data.messages);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  return <button onClick={() => fetchMessages('...')}>Load Messages</button>;
}
```

#### Example 2: Send Message

```typescript
import { authenticatedChatRequest } from '../utils/chatAuth';

const sendMessage = async (recipient: string, content: string) => {
  const response = await authenticatedChatRequest(
    wallet,
    '/api/chat/messages',
    {
      method: 'POST',
      body: JSON.stringify({ recipient, content }),
    }
  );

  if (response.ok) {
    const data = await response.json();
    console.log('Message sent:', data.message);
  }
};
```

#### Example 3: Manual Header Creation

```typescript
import { createChatAuthHeaders } from '../utils/chatAuth';

const fetchWithCustomAuth = async () => {
  const headers = await createChatAuthHeaders(wallet);

  if (!headers) {
    console.error('Failed to authenticate');
    return;
  }

  const response = await fetch('/api/chat/messages?other=abc123', {
    method: 'GET',
    headers,
  });
};
```

## API Endpoints

### GET /api/chat/messages?other={address}
Get conversation with another user

**Response:**
```json
{
  "messages": [
    {
      "id": 1,
      "sender": "wallet_address",
      "recipient": "other_address",
      "content": "Hello!",
      "timestamp": 1234567890,
      "read": false
    }
  ]
}
```

### POST /api/chat/messages
Send a new message

**Request Body:**
```json
{
  "recipient": "wallet_address",
  "content": "Message text (max 1000 chars)"
}
```

**Response:**
```json
{
  "message": {
    "id": 1,
    "sender": "your_wallet",
    "recipient": "recipient_wallet",
    "content": "Message text",
    "timestamp": 1234567890,
    "read": false
  }
}
```

### PUT /api/chat/messages
Mark message as read

**Request Body:**
```json
{
  "messageId": 123
}
```

## Error Responses

- `401 Unauthorized` - Missing wallet address
- `401 Invalid signature` - Signature verification failed
- `401 Signature expired` - Message timestamp > 5 minutes old
- `401 Signature does not match wallet address` - Address mismatch
- `400 Bad Request` - Missing required fields
- `403 Forbidden` - Not authorized for this action
- `404 Not Found` - Resource not found

## Migration Guide

### If you're using localStorage-based chat (useChat.ts):
The current `useChat` hook uses localStorage and doesn't need authentication. If you want to migrate to the API:

1. Import the auth helper:
```typescript
import { authenticatedChatRequest } from '../utils/chatAuth';
```

2. Replace localStorage calls with API calls:
```typescript
// Old (localStorage)
const messages = JSON.parse(localStorage.getItem(chatKey) || '[]');

// New (API)
const response = await authenticatedChatRequest(
  wallet,
  `/api/chat/messages?other=${otherAddress}`
);
const { messages } = await response.json();
```

### Testing Authentication

Use the browser console to test:

```javascript
// In browser console (on a page with connected wallet)
const wallet = window.solana; // or your wallet adapter
const message = `Authenticate to Freelance DApp\nWallet: ${wallet.publicKey}\nTimestamp: ${Date.now()}`;
const signature = await wallet.signMessage(new TextEncoder().encode(message));
console.log('Signature:', bs58.encode(signature));
```

## Security Considerations

1. **Never** store signatures - Generate fresh ones for each request
2. **Always** check timestamp validity on server (5-minute window)
3. **Validate** that the signed message contains the correct wallet address
4. **Use HTTPS** in production to prevent man-in-the-middle attacks
5. Consider implementing **rate limiting** to prevent spam

## Troubleshooting

### "Wallet does not support message signing"
Some wallets don't support the `signMessage` API. Supported wallets include:
- Phantom
- Solflare
- Backpack
- Most major Solana wallets

### "Signature expired"
The signature is only valid for 5 minutes. Generate a new one by calling `createChatAuthHeaders()` again.

### "Invalid signature"
- Ensure the wallet address matches the one used to sign
- Check that the message format is exactly correct
- Verify bs58 encoding is correct

## Future Enhancements

- [ ] Session tokens (reduce signing frequency)
- [ ] WebSocket support with authentication
- [ ] Rate limiting per wallet
- [ ] Message encryption
- [ ] Group chat support
