import { SHOPIFY_CONFIG } from './config';

// Generate authorization URL
export const generateAuthUrl = (shopDomain: string): string => {
  if (!shopDomain) throw new Error('Shop URL is required');
  
  // Normalize the shop URL
  let shopUrl = shopDomain.trim().toLowerCase();
  
  // Remove protocol if present
  shopUrl = shopUrl.replace(/^https?:\/\//, '');
  
  // Add .myshopify.com if not present and doesn't already have a TLD
  if (!shopUrl.includes('.')) {
    shopUrl = `${shopUrl}.myshopify.com`;
  }
  
  // Generate a nonce for security
  const nonce = crypto.getRandomValues(new Uint8Array(16))
    .reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
  
  // Store nonce in localStorage for verification
  localStorage.setItem('shopify_state', nonce);
  localStorage.setItem('shopify_shop', shopUrl);
  
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
): Promise<{ access_token: string; scope: string }> => {
  try {
    const response = await fetch('/api/shopify/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code,
        shop,
        redirectUri: SHOPIFY_CONFIG.REDIRECT_URI
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to exchange token');
    }

    return await response.json();
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    throw error;
  }
};

// Validate callback parameters
export const validateCallback = (params: URLSearchParams): boolean => {
  const shop = params.get('shop');
  const code = params.get('code');
  const state = params.get('state');
  const hmac = params.get('hmac');
  const timestamp = params.get('timestamp');

  // Check required parameters
  if (!shop || !code || !state || !hmac || !timestamp) {
    console.error('Missing required parameters:', { shop, code, state, hmac, timestamp });
    return false;
  }

  // Verify state matches stored value
  const storedState = localStorage.getItem('shopify_state');
  if (!storedState || state !== storedState) {
    console.error('State mismatch:', { received: state, stored: storedState });
    return false;
  }

  // Verify timestamp is within 5 minutes
  const now = Math.floor(Date.now() / 1000);
  const requestTime = parseInt(timestamp, 10);
  const FIVE_MINUTES = 5 * 60;

  if (now - requestTime > FIVE_MINUTES) {
    console.error('Timestamp expired:', { now, requestTime });
    return false;
  }

  return true;
};