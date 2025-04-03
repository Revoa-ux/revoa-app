import { createHmac, randomBytes } from 'crypto';

interface SecurityOptions {
  saltRounds?: number;
  tokenExpiration?: number;
  csrfSecret?: string;
}

export class SecurityService {
  private options: Required<SecurityOptions>;

  constructor(options: SecurityOptions = {}) {
    this.options = {
      saltRounds: options.saltRounds || 10,
      tokenExpiration: options.tokenExpiration || 3600, // 1 hour
      csrfSecret: options.csrfSecret || randomBytes(32).toString('hex')
    };
  }

  generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  generateCsrfToken(): string {
    const timestamp = Date.now().toString();
    const random = randomBytes(8).toString('hex');
    return createHmac('sha256', this.options.csrfSecret)
      .update(`${timestamp}${random}`)
      .digest('hex');
  }

  validateCsrfToken(token: string): boolean {
    // Implement CSRF token validation
    return token.length === 64;
  }

  sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove < and >
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  validateHeaders(headers: Headers): boolean {
    const requiredHeaders = [
      'content-type',
      'x-requested-with',
      'x-csrf-token'
    ];

    return requiredHeaders.every(header => headers.has(header));
  }

  validateOrigin(origin: string): boolean {
    const allowedOrigins = [
      'https://my.revoa.app',
      'https://app.revoa.app',
      'http://localhost:5173'
    ];

    return allowedOrigins.includes(origin);
  }

  generateNonce(): string {
    return randomBytes(16).toString('base64');
  }

  getSecurityHeaders(): Record<string, string> {
    const nonce = this.generateNonce();

    return {
      'Content-Security-Policy': `
        default-src 'self';
        script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
        style-src 'self' 'unsafe-inline' https://rsms.me;
        img-src 'self' data: https://*.unsplash.com https://*.supabase.co;
        font-src 'self' https://rsms.me;
        connect-src 'self' https://*.supabase.co wss://*.supabase.co;
        frame-ancestors 'none';
        form-action 'self';
        base-uri 'self';
      `,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
    };
  }
}

// Create singleton instance
export const security = new SecurityService({
  csrfSecret: import.meta.env.VITE_CSRF_SECRET
});