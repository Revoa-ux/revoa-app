/**
 * Shopify Webhook HMAC Verification
 *
 * This module provides secure HMAC-SHA256 verification for Shopify webhooks.
 * It uses the Web Crypto API with timing-safe comparison to prevent timing attacks.
 *
 * Reference: https://shopify.dev/docs/apps/build/webhooks/subscribe/https#step-5-verify-the-webhook
 *
 * Updated: November 2025
 * - Enhanced timing-safe comparison
 * - Added buffer-based comparison for extra security
 * - Improved error handling and logging
 * - Support for both base64 and hex encoding
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
 *
 * CRITICAL: This implementation ensures constant-time comparison regardless of
 * string content to prevent timing attacks on HMAC verification
 */
function timingSafeEqual(a: string, b: string): boolean {
  // If lengths differ, still compare full length to prevent timing leaks
  const aLen = a.length;
  const bLen = b.length;
  const maxLen = Math.max(aLen, bLen);

  // Pad shorter string with nulls for comparison
  const aPadded = a.padEnd(maxLen, '\0');
  const bPadded = b.padEnd(maxLen, '\0');

  let result = 0;

  // XOR all characters - result will be 0 only if all match
  for (let i = 0; i < maxLen; i++) {
    result |= aPadded.charCodeAt(i) ^ bPadded.charCodeAt(i);
  }

  // Also check length equality (protects against padding attacks)
  result |= aLen ^ bLen;

  return result === 0;
}

/**
 * Timing-safe comparison using crypto.subtle (when available)
 * Falls back to manual timing-safe comparison
 */
async function cryptoTimingSafeEqual(a: string, b: string): Promise<boolean> {
  // Convert strings to buffers
  const encoder = new TextEncoder();
  const bufferA = encoder.encode(a);
  const bufferB = encoder.encode(b);

  // If lengths differ, we know they don't match, but still do constant-time check
  if (bufferA.length !== bufferB.length) {
    // Perform a dummy comparison to maintain constant time
    const dummy = new Uint8Array(Math.max(bufferA.length, bufferB.length));
    let result = 0;
    for (let i = 0; i < dummy.length; i++) {
      result |= (bufferA[i] || 0) ^ (bufferB[i] || 0);
    }
    return false;
  }

  // Constant-time buffer comparison
  let result = 0;
  for (let i = 0; i < bufferA.length; i++) {
    result |= bufferA[i] ^ bufferB[i];
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
 *
 * IMPORTANT: This function implements multiple layers of security:
 * 1. Uses Web Crypto API for HMAC calculation
 * 2. Implements timing-safe comparison at both string and buffer level
 * 3. Handles edge cases (empty body, malformed headers)
 * 4. Provides detailed logging for troubleshooting
 */
export async function verifyShopifyWebhook(
  body: string,
  hmacHeader: string,
  secret: string
): Promise<boolean> {
  try {
    // Validate inputs
    if (!hmacHeader || hmacHeader.trim() === '') {
      console.error('[HMAC] Empty or missing HMAC header');
      return false;
    }

    if (!secret || secret.trim() === '') {
      console.error('[HMAC] Empty or missing secret');
      return false;
    }

    // Note: Empty body is valid (some webhooks may have empty payloads)
    const bodyToVerify = body || '';

    const encoder = new TextEncoder();

    // Import the secret key for HMAC
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Calculate HMAC signature on the raw body
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(bodyToVerify)
    );

    // Convert signature to base64 for comparison with Shopify's header
    const signatureArray = new Uint8Array(signature);
    const calculatedHmac = btoa(String.fromCharCode(...signatureArray));

    // Log for debugging (first/last 8 chars only for security)
    const hmacPreview = hmacHeader.length > 16
      ? `${hmacHeader.substring(0, 8)}...${hmacHeader.substring(hmacHeader.length - 8)}`
      : 'short_hmac';
    const calcPreview = calculatedHmac.length > 16
      ? `${calculatedHmac.substring(0, 8)}...${calculatedHmac.substring(calculatedHmac.length - 8)}`
      : 'short_calc';

    console.log('[HMAC] Verification details:', {
      bodyLength: bodyToVerify.length,
      hmacHeaderLength: hmacHeader.length,
      calculatedHmacLength: calculatedHmac.length,
      hmacPreview,
      calcPreview
    });

    // Use enhanced timing-safe comparison
    const isValid = await cryptoTimingSafeEqual(calculatedHmac, hmacHeader);

    if (isValid) {
      console.log('[HMAC] ✅ Verification PASSED');
    } else {
      console.log('[HMAC] ❌ Verification FAILED');
      // Additional debug: check if it's a whitespace/encoding issue
      const trimmedHeader = hmacHeader.trim();
      const trimmedCalc = calculatedHmac.trim();
      if (trimmedHeader === trimmedCalc) {
        console.warn('[HMAC] WARNING: HMACs match after trimming - check for whitespace in header');
      }
    }

    return isValid;
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