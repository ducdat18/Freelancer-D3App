/**
 * RPC Retry Utilities
 *
 * Handles rate limiting (403/429) with exponential backoff and jitter.
 * Provides a custom fetch wrapper for @solana/web3.js Connection.
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterFactor?: number;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 5,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitterFactor: 0.3,
};

/**
 * Check if an error is a rate limit error (403 or 429)
 */
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('403') ||
      message.includes('429') ||
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('access forbidden')
    );
  }
  return false;
}

/**
 * Check if a response status indicates rate limiting
 */
export function isRateLimitStatus(status: number): boolean {
  return status === 403 || status === 429;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
export function calculateBackoffDelay(
  attempt: number,
  options: Required<RetryOptions>
): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = options.baseDelayMs * Math.pow(2, attempt);

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, options.maxDelayMs);

  // Add jitter to prevent thundering herd
  const jitter = cappedDelay * options.jitterFactor * Math.random();

  return Math.round(cappedDelay + jitter);
}

/**
 * Sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic (exponential backoff)
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const finalOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= finalOptions.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Only retry on rate limit errors
      if (!isRateLimitError(error)) {
        throw error;
      }

      // Don't wait after the last attempt
      if (attempt < finalOptions.maxRetries) {
        const delay = calculateBackoffDelay(attempt, finalOptions);
        console.warn(
          `[RPC Retry] Rate limited (attempt ${attempt + 1}/${finalOptions.maxRetries + 1}), ` +
          `retrying in ${delay}ms...`
        );
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Create a custom fetch function with retry logic for Solana Connection
 *
 * Usage:
 * const connection = new Connection(endpoint, {
 *   fetch: createRetryFetch(),
 * });
 */
export function createRetryFetch(options?: RetryOptions): typeof fetch {
  const finalOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let lastError: Error | undefined;
    let lastResponse: Response | undefined;

    for (let attempt = 0; attempt <= finalOptions.maxRetries; attempt++) {
      try {
        const response = await fetch(input, init);

        // Check for rate limit status codes
        if (isRateLimitStatus(response.status)) {
          lastResponse = response;

          if (attempt < finalOptions.maxRetries) {
            const delay = calculateBackoffDelay(attempt, finalOptions);
            console.warn(
              `[RPC Fetch] Rate limited (${response.status}) at attempt ${attempt + 1}/${finalOptions.maxRetries + 1}, ` +
              `retrying in ${delay}ms...`
            );
            await sleep(delay);
            continue;
          }
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Network errors - retry with backoff
        if (attempt < finalOptions.maxRetries) {
          const delay = calculateBackoffDelay(attempt, finalOptions);
          console.warn(
            `[RPC Fetch] Network error at attempt ${attempt + 1}/${finalOptions.maxRetries + 1}: ${lastError.message}, ` +
            `retrying in ${delay}ms...`
          );
          await sleep(delay);
          continue;
        }
      }
    }

    // If we have a response (even if rate limited), return it
    // This lets the caller handle the error
    if (lastResponse) {
      return lastResponse;
    }

    throw lastError || new Error('Max retries exceeded');
  };
}

/**
 * Request queue to limit concurrent requests and enforce rate limits
 */
class RequestQueue {
  private queue: Array<() => Promise<void>> = [];
  private activeRequests = 0;
  private maxConcurrent: number;
  private minDelayMs: number;
  private lastRequestTime = 0;

  constructor(maxConcurrent = 3, requestsPerSecond = 10) {
    this.maxConcurrent = maxConcurrent;
    this.minDelayMs = 1000 / requestsPerSecond;
  }

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const execute = async () => {
        // Ensure minimum delay between requests
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.minDelayMs) {
          await sleep(this.minDelayMs - timeSinceLastRequest);
        }

        this.activeRequests++;
        this.lastRequestTime = Date.now();

        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.activeRequests--;
          this.processQueue();
        }
      };

      this.queue.push(execute);
      this.processQueue();
    });
  }

  private processQueue() {
    while (this.activeRequests < this.maxConcurrent && this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    }
  }

  get pending(): number {
    return this.queue.length;
  }

  get active(): number {
    return this.activeRequests;
  }
}

// Singleton queue instance
let globalQueue: RequestQueue | null = null;

export function getRequestQueue(maxConcurrent = 3, requestsPerSecond = 10): RequestQueue {
  if (!globalQueue) {
    globalQueue = new RequestQueue(maxConcurrent, requestsPerSecond);
  }
  return globalQueue;
}

/**
 * Execute a function through the rate-limited queue with retry
 */
export async function queuedRequest<T>(
  fn: () => Promise<T>,
  retryOptions?: RetryOptions
): Promise<T> {
  const queue = getRequestQueue();
  return queue.add(() => retryWithBackoff(fn, retryOptions));
}

/**
 * Simple cache for RPC responses to reduce duplicate requests
 */
class ResponseCache {
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private readonly ttl: number;

  constructor(ttlMs: number = 30000) {
    this.ttl = ttlMs;
  }

  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  set(key: string, data: unknown): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

export const rpcCache = new ResponseCache(30000);

/**
 * Normalize a Solana JSON-RPC response to fix provider-specific format issues.
 *
 * @solana/web3.js v1.91+ uses strict superstruct validation for RPC responses.
 * Some providers (Ankr, etc.) return fields like `lastValidBlockHeight` as strings
 * or with unexpected types, causing a StructError before any transaction is sent.
 *
 * This function reads the JSON body, coerces numeric fields to the expected types,
 * and returns a new Response so the original stream is never left consumed.
 */
async function normalizeRpcResponse(response: Response): Promise<Response> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return response;

  let text: string;
  try {
    text = await response.text();
  } catch {
    return response;
  }

  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    // Not valid JSON — return a reconstructed response from the text we read
    return new Response(text, {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers),
    });
  }

  // Fix: lastValidBlockHeight must be an integer (superstruct `number()` validator)
  const value = body?.result?.value;
  if (value && typeof value.lastValidBlockHeight !== 'undefined') {
    const raw = value.lastValidBlockHeight;
    if (typeof raw !== 'number' || !Number.isInteger(raw)) {
      value.lastValidBlockHeight = Math.trunc(Number(raw));
    }
  }

  // Always reconstruct so the caller always gets a fresh readable stream
  return new Response(JSON.stringify(body), {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers),
  });
}

/**
 * Create a deduplicated fetch that prevents multiple identical requests.
 * Also applies RPC response normalization to fix provider compatibility issues.
 */
const inflightRequests = new Map<string, Promise<Response>>();

export function createDedupedRetryFetch(options?: RetryOptions): typeof fetch {
  const retryFetch = createRetryFetch(options);

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    // Create a cache key from the request
    const url = input instanceof Request ? input.url : input.toString();
    const body = init?.body?.toString() || '';
    const cacheKey = `${url}:${body}`;

    // Check if there's already an identical request in flight
    const inflight = inflightRequests.get(cacheKey);
    if (inflight) {
      // Clone the response since Response can only be read once
      const response = await inflight;
      return response.clone();
    }

    // Create the new request, wrapped with normalization
    const requestPromise = retryFetch(input, init).then(normalizeRpcResponse);
    inflightRequests.set(cacheKey, requestPromise);

    try {
      const response = await requestPromise;
      return response;
    } finally {
      // Clean up after a short delay to handle near-simultaneous requests
      setTimeout(() => {
        inflightRequests.delete(cacheKey);
      }, 100);
    }
  };
}
