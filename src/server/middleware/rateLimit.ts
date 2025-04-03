interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  message?: string;
  statusCode?: number;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
}

interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: number;
}

export class RateLimiter {
  private store: Map<string, { count: number; resetTime: number }>;
  private options: Required<RateLimitOptions>;

  constructor(options: RateLimitOptions = {}) {
    this.store = new Map();
    this.options = {
      windowMs: options.windowMs || 60 * 1000, // 1 minute
      max: options.max || 100,
      message: options.message || 'Too many requests, please try again later.',
      statusCode: options.statusCode || 429,
      skipFailedRequests: options.skipFailedRequests || false,
      skipSuccessfulRequests: options.skipSuccessfulRequests || false
    };
  }

  async checkLimit(key: string): Promise<RateLimitInfo> {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || now > record.resetTime) {
      // First request or window expired
      this.store.set(key, {
        count: 1,
        resetTime: now + this.options.windowMs
      });

      return {
        limit: this.options.max,
        current: 1,
        remaining: this.options.max - 1,
        resetTime: now + this.options.windowMs
      };
    }

    // Increment counter
    record.count++;
    this.store.set(key, record);

    return {
      limit: this.options.max,
      current: record.count,
      remaining: Math.max(0, this.options.max - record.count),
      resetTime: record.resetTime
    };
  }

  async isRateLimited(key: string): Promise<boolean> {
    const info = await this.checkLimit(key);
    return info.remaining <= 0;
  }

  async increment(key: string, success: boolean): Promise<void> {
    if ((success && this.options.skipSuccessfulRequests) ||
        (!success && this.options.skipFailedRequests)) {
      return;
    }

    const record = this.store.get(key);
    if (record) {
      record.count++;
      this.store.set(key, record);
    }
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

// Create rate limiters for different actions
export const authLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later.'
});

export const apiLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many API requests, please try again later.'
});

// Start cleanup interval
setInterval(() => {
  authLimiter.cleanup();
  apiLimiter.cleanup();
}, 60 * 1000); // Clean up every minute