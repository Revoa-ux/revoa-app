import { z } from 'zod';

// Schema for Shopify store URL validation
export const shopifyUrlSchema = z.string()
  .min(1, 'Store URL is required')
  .transform(url => {
    // Remove https:// and www. if present
    let domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
    
    // Add myshopify.com if not present and doesn't contain it
    if (!domain.includes('myshopify.com')) {
      domain = `${domain}.myshopify.com`;
    }
    
    return domain;
  })
  .refine(
    domain => {
      // Allow both standard myshopify.com and development store domains
      const validDomainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
      return validDomainPattern.test(domain);
    },
    {
      message: 'Please enter a valid Shopify store URL'
    }
  );

// Validate store URL
export const validateStoreUrl = (url: string): { success: boolean; error?: string; data?: string } => {
  try {
    console.debug('Validating store URL:', url);
    
    // Validate store URL format
    const result = shopifyUrlSchema.safeParse(url);
    
    if (!result.success) {
      console.error('Store URL validation failed:', result.error);
      return {
        success: false,
        error: result.error.errors[0].message
      };
    }

    console.debug('Store URL validation successful:', result.data);
    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    console.error('Store URL validation error:', error);
    return {
      success: false,
      error: 'Please enter a valid Shopify store URL'
    };
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

// Validate webhook HMAC
export const validateWebhookHmac = (hmac: string, body: string, secret: string): boolean => {
  const crypto = require('crypto');
  const calculated = crypto
    .createHmac('sha256', secret)
    .update(Buffer.from(body), 'utf8')
    .digest('base64');

  return hmac === calculated;
};