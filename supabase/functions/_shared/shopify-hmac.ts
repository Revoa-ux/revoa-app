/**
 * Shopify Webhook HMAC Verification
 *
 * This module provides secure HMAC-SHA256 verification for Shopify webhooks.
 * It uses the Web Crypto API with timing-safe comparison to prevent timing attacks.
 *
 * Reference: https://shopify.dev/docs/apps/build/webhooks/subscribe/https#step-5-verify-the-webhook
 */

/**
 * Converts an ArrayBuffer to a hex string
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Timing-safe comparison of two strings
 * This prevents timing attacks by ensuring comparison always takes the same time
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Verifies a Shopify webhook HMAC signature
 *
 * @param body - The raw webhook body as a string (must not be parsed as JSON first)
 * @param hmacHeader - The X-Shopify-Hmac-Sha256 header value (base64 encoded)
 * @param secret - The Shopify Client Secret (from SHOPIFY_CLIENT_SECRET environment variable)
 * @returns True if the HMAC is valid, false otherwise
 */
export async function verifyShopifyWebhook(
  body: string,
  hmacHeader: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();

    // Import the secret key for HMAC
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Calculate HMAC signature
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(body)
    );

    // Convert signature to base64 for comparison with Shopify's header
    const calculatedHmac = btoa(String.fromCharCode(...new Uint8Array(signature)));

    // Use timing-safe comparison to prevent timing attacks
    return timingSafeEqual(calculatedHmac, hmacHeader);
  } catch (error) {
    console.error('[HMAC] Verification error:', error);
    return false;
  }
}

/**
 * Alternative hex-based HMAC verification (for debugging)
 * Shopify primarily uses base64, but this can help diagnose issues
 */
export async function verifyShopifyWebhookHex(
  body: string,
  hmacHeader: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(body)
    );

    const calculatedHmac = bufferToHex(signature);

    return timingSafeEqual(calculatedHmac.toLowerCase(), hmacHeader.toLowerCase());
  } catch (error) {
    console.error('[HMAC-Hex] Verification error:', error);
    return false;
  }
}

/**
 * Gets the webhook secret from environment variables
 *
 * IMPORTANT: Shopify uses the Client Secret for BOTH OAuth token exchange
 * AND webhook HMAC verification. There is no separate "webhook secret".
 *
 * @returns The Shopify Client Secret used for webhook verification
 * @throws Error if SHOPIFY_CLIENT_SECRET is not set
 */
export function getWebhookSecret(): string {
  const secret = Deno.env.get('SHOPIFY_CLIENT_SECRET');

  if (!secret) {
    console.error('[HMAC] SHOPIFY_CLIENT_SECRET environment variable is not set');
    console.error('[HMAC] This variable must be configured in your Supabase project settings');
    throw new Error('Missing required environment variable: SHOPIFY_CLIENT_SECRET');
  }

  console.log('[HMAC] Using SHOPIFY_CLIENT_SECRET for webhook verification');
  return secret;
}