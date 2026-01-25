// App credentials
export const SHOPIFY_CONFIG = {
  // App credentials
  CLIENT_ID: import.meta.env.VITE_SHOPIFY_CLIENT_ID,

  // URLs
  APP_URL: import.meta.env.VITE_APP_URL || 'https://members.revoa.app',
  API_URL: import.meta.env.VITE_API_URL || 'https://api.revoa.app',
  // CRITICAL: Must match EXACTLY what's in Shopify Partner Dashboard
  REDIRECT_URI: import.meta.env.VITE_SHOPIFY_REDIRECT_URI ||
    (typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:5173/shopify-callback'
      : 'https://members.revoa.app/shopify-callback'),
  
  // Required scopes for all app features
  SCOPES: [
    'read_all_orders',
    'read_fulfillments',
    'read_inventory',
    'read_orders',
    'read_products',
    'write_products',
    'read_returns'
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