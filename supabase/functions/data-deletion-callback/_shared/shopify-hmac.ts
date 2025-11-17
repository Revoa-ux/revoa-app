function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  const aLen = a.length;
  const bLen = b.length;
  const maxLen = Math.max(aLen, bLen);
  const aPadded = a.padEnd(maxLen, '\0');
  const bPadded = b.padEnd(maxLen, '\0');
  let result = 0;
  for (let i = 0; i < maxLen; i++) {
    result |= aPadded.charCodeAt(i) ^ bPadded.charCodeAt(i);
  }
  result |= aLen ^ bLen;
  return result === 0;
}

async function cryptoTimingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const bufferA = encoder.encode(a);
  const bufferB = encoder.encode(b);
  if (bufferA.length !== bufferB.length) {
    const dummy = new Uint8Array(Math.max(bufferA.length, bufferB.length));
    let result = 0;
    for (let i = 0; i < dummy.length; i++) {
      result |= (bufferA[i] || 0) ^ (bufferB[i] || 0);
    }
    return false;
  }
  let result = 0;
  for (let i = 0; i < bufferA.length; i++) {
    result |= bufferA[i] ^ bufferB[i];
  }
  return result === 0;
}

export async function verifyShopifyWebhook(
  body: string,
  hmacHeader: string,
  secret: string
): Promise<boolean> {
  try {
    if (!hmacHeader || hmacHeader.trim() === '') {
      console.error('[HMAC] Empty or missing HMAC header');
      return false;
    }
    if (!secret || secret.trim() === '') {
      console.error('[HMAC] Empty or missing secret');
      return false;
    }
    const bodyToVerify = body || '';
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
      encoder.encode(bodyToVerify)
    );
    const signatureArray = new Uint8Array(signature);
    const calculatedHmac = btoa(String.fromCharCode(...signatureArray));
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
    const isValid = await cryptoTimingSafeEqual(calculatedHmac, hmacHeader);
    if (isValid) {
      console.log('[HMAC] ✅ Verification PASSED');
    } else {
      console.log('[HMAC] ❌ Verification FAILED');
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

export function getWebhookSecret(): string {
  // Try webhook-specific secret first, then fall back to API secret
  const secret = Deno.env.get('SHOPIFY_WEBHOOK_SECRET') || Deno.env.get('SHOPIFY_API_SECRET') || Deno.env.get('SHOPIFY_CLIENT_SECRET');
  if (!secret) {
    console.error('[HMAC] No Shopify secret environment variable is set');
    console.error('[HMAC] Required: SHOPIFY_WEBHOOK_SECRET (preferred) or SHOPIFY_API_SECRET');
    throw new Error('Missing required environment variable: SHOPIFY_WEBHOOK_SECRET or SHOPIFY_API_SECRET');
  }
  const secretSource = Deno.env.get('SHOPIFY_WEBHOOK_SECRET') ? 'SHOPIFY_WEBHOOK_SECRET' : (Deno.env.get('SHOPIFY_API_SECRET') ? 'SHOPIFY_API_SECRET' : 'SHOPIFY_CLIENT_SECRET');
  console.log(`[HMAC] Using ${secretSource} for webhook verification`);
  return secret;
}