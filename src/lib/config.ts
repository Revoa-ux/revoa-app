// Application configuration
export const config = {
  app: {
    url: import.meta.env.VITE_APP_URL || 'https://fancy-chaja-8af20a.netlify.app',
    environment: import.meta.env.MODE,
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD
  },
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || 'https://iipaykvimkbbnoobtpzz.supabase.co',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpcGF5a3ZpbWtiYm5vb2J0cHp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxNjU4MTgsImV4cCI6MjA1Nzc0MTgxOH0.qjJd6vbFZMHiTR7IA8IGtVxAzFuPbR5YHcAtLTSlUlA',
    serviceKey: import.meta.env.VITE_SUPABASE_SERVICE_KEY
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
  CLIENT_ID: import.meta.env.VITE_SHOPIFY_CLIENT_ID || "21f747d6719351a523236f5481e5a60c",
  CLIENT_SECRET: import.meta.env.VITE_SHOPIFY_CLIENT_SECRET,
  
  // URLs
  APP_URL: import.meta.env.VITE_APP_URL || 'https://members.revoa.app',
  API_URL: import.meta.env.VITE_API_URL || 'https://api.revoa.app',
  REDIRECT_URI: `${window.location.origin}/auth/callback`,
  
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
  API_VERSION: '2025-01',

  // Webhook configuration
  WEBHOOK_VERSION: '2025-01',
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