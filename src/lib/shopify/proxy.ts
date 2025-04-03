import { SHOPIFY_CONFIG } from './config';

// Proxy API endpoint for token exchange
export const exchangeTokenViaProxy = async (params: {
  shop: string;
  code: string;
  hmac?: string;
}) => {
  try {
    // Make request to our proxy server
    const apiUrl = import.meta.env.VITE_API_URL || 'https://api.revoa.app';
    
    const response = await fetch(`${apiUrl}/shopify/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        shop: params.shop,
        code: params.code,
        hmac: params.hmac,
        redirectUri: SHOPIFY_CONFIG.redirectUri,
        clientId: SHOPIFY_CONFIG.clientId,
        clientSecret: SHOPIFY_CONFIG.clientSecret
      }),
      credentials: 'include'
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let errorMessage = 'Failed to exchange token';
      
      if (contentType?.includes('application/json')) {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } else {
        const text = await response.text();
        console.error('Non-JSON error response:', text);
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      scope: data.scope,
      shop: params.shop
    };
  } catch (error) {
    console.error('Token exchange error:', error);
    throw error;
  }
};