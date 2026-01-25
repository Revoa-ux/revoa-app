// Application configuration
export const config = {
  app: {
    url: import.meta.env.VITE_APP_URL || 'https://members.revoa.app',
    environment: import.meta.env.MODE,
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD
  },
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
  },
  auth: {
    cookieName: 'sb-auth-token',
    cookieLifetime: 60 * 60 * 24 * 7, // 7 days
    cookieDomain: import.meta.env.PROD ? '.revoa.app' : undefined,
    secureCookie: import.meta.env.PROD,
    persistSession: true,
    detectSessionInUrl: true,
    autoRefreshToken: true,
    multiTab: true,
    debug: import.meta.env.DEV
  }
};

// Shopify configuration
export const SHOPIFY_CONFIG = {
  // App credentials
  CLIENT_ID: import.meta.env.VITE_SHOPIFY_CLIENT_ID,

  // URLs
  APP_URL: import.meta.env.VITE_APP_URL || 'https://members.revoa.app',
  API_URL: import.meta.env.VITE_API_URL || 'https://api.revoa.app',
  REDIRECT_URI: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'https://members.revoa.app/auth/callback',
  
  // Required scopes for all app features
  SCOPES: [
    'read_products',
    'write_products',
    'read_orders',
    'write_orders',
    'read_customers',
    'write_customers',
    'read_inventory',
    'write_inventory',
    'read_reports'
  ].join(','),

  // API version - using latest stable version
  API_VERSION: '2026-01',

  // Webhook configuration
  WEBHOOK_VERSION: '2026-01',
  WEBHOOK_TOPICS: [
    'app/uninstalled',
    'orders/create',
    'orders/paid',
    'orders/fulfilled',
    'inventory_items/update',
    'customers/create',
    'customers/update'
  ]
};

export default config;