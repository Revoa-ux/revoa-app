import { SHOPIFY_CONFIG } from './config';

// Cookie utilities
export const cookies = {
  set: (name: string, value: string, options: { expires?: Date; secure?: boolean; httpOnly?: boolean; sameSite?: 'Strict' | 'Lax' | 'None' } = {}) => {
    let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/`;
    
    if (options.expires) {
      cookie += `; expires=${options.expires.toUTCString()}`;
    }
    
    if (options.secure) {
      cookie += '; Secure';
    }
    
    if (options.httpOnly) {
      cookie += '; HttpOnly';
    }
    
    if (options.sameSite) {
      cookie += `; SameSite=${options.sameSite}`;
    }
    
    document.cookie = cookie;
  },

  get: (name: string): string | null => {
    const match = document.cookie.match(new RegExp(`(^|;\\s*)(${name})=([^;]*)`));
    return match ? decodeURIComponent(match[3]) : null;
  },

  remove: (name: string) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
};

// OAuth cookie configuration
export const OAUTH_COOKIE_CONFIG = {
  secure: SHOPIFY_CONFIG.APP_URL.startsWith('https'),
  sameSite: 'Lax' as const,
  expires: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
};