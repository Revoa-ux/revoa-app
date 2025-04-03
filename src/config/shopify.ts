// App credentials
export const SHOPIFY_CONFIG = {
  CLIENT_ID: import.meta.env.VITE_SHOPIFY_CLIENT_ID || "21f747d6719351a523236f5481e5a60c",
  CLIENT_SECRET: import.meta.env.VITE_SHOPIFY_CLIENT_SECRET,
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
  REDIRECT_URI: `${window.location.origin}/auth/callback`,
  APP_URL: import.meta.env.VITE_APP_URL || "https://my.revoa.app",
  API_VERSION: '2025-01',
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

// For local development proxy
export const API_PROXY_URL = import.meta.env.VITE_API_PROXY_URL || 
  (import.meta.env.PROD ? undefined : "http://localhost:3000/api/shopify");

// Shopify App Bridge configuration
export const APP_BRIDGE_CONFIG = {
  apiKey: SHOPIFY_CONFIG.CLIENT_ID,
  host: import.meta.env.VITE_SHOPIFY_STORE_URL,
  forceRedirect: true
};

// Export types
export type ShopifyAppConfig = typeof SHOPIFY_CONFIG;
export type ShopifyAppBridgeConfig = typeof APP_BRIDGE_CONFIG;