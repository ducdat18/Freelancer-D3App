/**
 * Simple in-memory cache with expiration
 * Optimizes repeated data fetching
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();

  /**
   * Get data from cache if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.expiresIn) {
      // Expired - remove from cache
      this.cache.delete(key);
      return null;
    }

    console.log(`📦 Cache HIT: ${key}`);
    return entry.data as T;
  }

  /**
   * Set data in cache with expiration time (ms)
   */
  set<T>(key: string, data: T, expiresIn: number = 60000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn,
    });
    console.log(`💾 Cached: ${key} (expires in ${expiresIn / 1000}s)`);
  }

  /**
   * Clear specific key or all cache
   */
  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
      console.log(`🗑️ Cleared cache: ${key}`);
    } else {
      this.cache.clear();
      console.log('🗑️ Cleared all cache');
    }
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > entry.expiresIn) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.expiresIn) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
  }
}

// Singleton instance
export const cache = new CacheManager();

// Auto-cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => cache.cleanup(), 5 * 60 * 1000);
}

/**
 * Cache duration constants (in milliseconds)
 */
export const CACHE_DURATIONS = {
  SHORT: 30 * 1000,      // 30 seconds
  MEDIUM: 5 * 60 * 1000,  // 5 minutes
  LONG: 30 * 60 * 1000,   // 30 minutes
  DAY: 24 * 60 * 60 * 1000, // 1 day
};

