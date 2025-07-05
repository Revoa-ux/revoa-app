// App credentials
export const SHOPIFY_CONFIG = {
  // App credentials
  CLIENT_ID: import.meta.env.VITE_SHOPIFY_CLIENT_ID || "21f747d6719351a523236f5481e5a60c",
  CLIENT_SECRET: import.meta.env.VITE_SHOPIFY_CLIENT_SECRET,
  
  // URLs
  APP_URL: import.meta.env.VITE_APP_URL || 'https://members.revoa.app',
  API_URL: import.meta.env.VITE_API_URL || 'https://api.revoa.app',
  REDIRECT_URI: `http://localhost:8888/.netlify/functions/shopify-oauth`,
  
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
    'read_reports',
    'read_fulfillments',
    'write_fulfillments',
    'read_shipping',
    'write_shipping',
    'read_analytics',
    'read_themes',
    'write_themes',
    'read_content',
    'write_content',
    'read_price_rules',
    'write_price_rules'
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