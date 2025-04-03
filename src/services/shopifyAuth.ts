import { SHOPIFY_CONFIG } from '../config/shopify';

// Utility for handling local storage
const SHOPIFY_STORAGE_KEY = 'shopify_auth';

interface ShopifyAuthData {
  shop: string;
  accessToken: string;
  scope: string;
  timestamp: number; // Store when the token was obtained
}

export const saveShopifyAuth = (data: ShopifyAuthData): void => {
  localStorage.setItem(SHOPIFY_STORAGE_KEY, JSON.stringify(data));
};

export const getShopifyAuth = (): ShopifyAuthData | null => {
  const data = localStorage.getItem(SHOPIFY_STORAGE_KEY);
  if (!data) return null;
  return JSON.parse(data);
};

export const clearShopifyAuth = (): void => {
  localStorage.removeItem(SHOPIFY_STORAGE_KEY);
};

// Check if token is valid (simplified - in a real app you'd check with Shopify API)
export const isTokenValid = (): boolean => {
  const auth = getShopifyAuth();
  if (!auth) return false;
  
  // Check if token is less than 24 hours old
  const now = Date.now();
  const tokenAge = now - auth.timestamp;
  const ONE_DAY = 24 * 60 * 60 * 1000;
  
  return tokenAge < ONE_DAY;
};

// Generate authorization URL
export const generateAuthUrl = (shop: string): string => {
  if (!shop) throw new Error('Shop URL is required');
  
  // Normalize the shop URL
  let shopUrl = shop.trim().toLowerCase();
  
  // Remove protocol if present
  shopUrl = shopUrl.replace(/^https?:\/\//, '');
  
  // Add .myshopify.com if not present and doesn't already have a TLD
  if (!shopUrl.includes('.')) {
    shopUrl = `${shopUrl}.myshopify.com`;
  }
  
  // Generate a nonce for security
  const nonce = crypto.getRandomValues(new Uint8Array(16))
    .reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
  
  // Store nonce in both storages for redundancy
  localStorage.setItem('shopify_nonce', nonce);
  sessionStorage.setItem('shopify_nonce', nonce);
  
  // Build the authorization URL
  const params = new URLSearchParams({
    client_id: SHOPIFY_CONFIG.CLIENT_ID,
    scope: SHOPIFY_CONFIG.SCOPES,
    redirect_uri: SHOPIFY_CONFIG.REDIRECT_URI,
    state: nonce,
    shop: shopUrl
  });
  
  return `https://${shopUrl}/admin/oauth/authorize?${params.toString()}`;
};

// Exchange authorization code for access token
export const exchangeCodeForToken = async (
  code: string, 
  shop: string
): Promise<{ accessToken: string; scope: string }> => {
  try {
    const response = await fetch('/api/shopify/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code,
        shop,
        redirectUri: SHOPIFY_CONFIG.REDIRECT_URI,
        clientId: SHOPIFY_CONFIG.CLIENT_ID,
        clientSecret: SHOPIFY_CONFIG.CLIENT_SECRET
      })
    });

    if (!response.ok) {
      throw new Error('Failed to exchange token');
    }

    return await response.json();
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    throw error;
  }
};