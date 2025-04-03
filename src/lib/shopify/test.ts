import { SHOPIFY_CONFIG } from './config';
import { getShopifyAuthUrl, exchangeCodeForToken } from './auth';
import { validateCallback } from './validation';

describe('Shopify Auth Flow', () => {
  // Mock localStorage
  const localStorageMock = {
    store: {} as Record<string, string>,
    getItem: (key: string) => localStorageMock.store[key],
    setItem: (key: string, value: string) => localStorageMock.store[key] = value,
    removeItem: (key: string) => delete localStorageMock.store[key],
    clear: () => localStorageMock.store = {}
  };

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    localStorageMock.clear();
    
    // Mock crypto.getRandomValues
    Object.defineProperty(window, 'crypto', {
      value: {
        getRandomValues: () => new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])
      }
    });
  });

  describe('getShopifyAuthUrl', () => {
    it('generates valid auth URL with correct parameters', () => {
      const authUrl = getShopifyAuthUrl();
      const url = new URL(authUrl);
      
      // Verify URL structure
      expect(url.origin).toBe('https://accounts.shopify.com');
      expect(url.pathname).toBe('/oauth/authorize');
      
      // Verify required parameters
      const params = new URLSearchParams(url.search);
      expect(params.get('client_id')).toBe(SHOPIFY_CONFIG.clientId);
      expect(params.get('scope')).toBe(SHOPIFY_CONFIG.scopes.join(','));
      expect(params.get('redirect_uri')).toBe(SHOPIFY_CONFIG.redirectUri);
      expect(params.get('state')).toBeTruthy();
      
      // Verify nonce storage
      const storedNonce = localStorage.getItem('shopify_nonce');
      expect(storedNonce).toBe(params.get('state'));
    });
  });

  describe('validateCallback', () => {
    it('validates successful callback parameters', () => {
      const nonce = '0102030405060708090a0b0c0d0e0f10';
      localStorage.setItem('shopify_nonce', nonce);
      
      const params = new URLSearchParams({
        shop: 'test-store.myshopify.com',
        code: 'test_code',
        state: nonce,
        hmac: 'valid_hmac',
        timestamp: (Date.now() / 1000).toString()
      });

      const isValid = validateCallback(params);
      expect(isValid).toBe(true);
    });

    it('rejects invalid state parameter', () => {
      localStorage.setItem('shopify_nonce', 'correct_nonce');
      
      const params = new URLSearchParams({
        shop: 'test-store.myshopify.com',
        code: 'test_code',
        state: 'wrong_nonce',
        hmac: 'valid_hmac',
        timestamp: (Date.now() / 1000).toString()
      });

      const isValid = validateCallback(params);
      expect(isValid).toBe(false);
    });

    it('rejects expired timestamp', () => {
      const nonce = '0102030405060708090a0b0c0d0e0f10';
      localStorage.setItem('shopify_nonce', nonce);
      
      const params = new URLSearchParams({
        shop: 'test-store.myshopify.com',
        code: 'test_code',
        state: nonce,
        hmac: 'valid_hmac',
        timestamp: (Date.now() / 1000 - 400).toString() // 400 seconds ago (> 5 minutes)
      });

      const isValid = validateCallback(params);
      expect(isValid).toBe(false);
    });
  });

  describe('exchangeCodeForToken', () => {
    beforeEach(() => {
      // Mock fetch
      global.fetch = jest.fn();
    });

    it('exchanges code for access token successfully', async () => {
      const mockResponse = {
        access_token: 'test_access_token',
        scope: 'read_products,write_products'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await exchangeCodeForToken('test_code', 'test-store.myshopify.com');
      
      // Verify API call
      expect(global.fetch).toHaveBeenCalledWith('/api/shopify/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: 'test_code',
          shop: 'test-store.myshopify.com',
          redirectUri: SHOPIFY_CONFIG.redirectUri
        })
      });

      // Verify response handling
      expect(result).toEqual({
        accessToken: 'test_access_token',
        scope: 'read_products,write_products'
      });

      // Verify local storage
      expect(localStorage.getItem('shopifyAccessToken')).toBe('test_access_token');
      expect(localStorage.getItem('shopifyShop')).toBe('test-store.myshopify.com');
      expect(localStorage.getItem('shopifyScope')).toBe('read_products,write_products');
      expect(localStorage.getItem('shopify_nonce')).toBeNull();
    });

    it('handles API errors appropriately', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Invalid code' })
      });

      await expect(exchangeCodeForToken('invalid_code', 'test-store.myshopify.com'))
        .rejects
        .toThrow('Invalid code');

      // Verify no tokens were stored
      expect(localStorage.getItem('shopifyAccessToken')).toBeNull();
      expect(localStorage.getItem('shopifyShop')).toBeNull();
      expect(localStorage.getItem('shopifyScope')).toBeNull();
    });
  });
});

// Manual test helper
export const testAuthFlow = async () => {
  try {
    console.log('Testing Shopify auth flow...');

    // Step 1: Generate auth URL
    console.log('1. Generating auth URL...');
    const authUrl = getShopifyAuthUrl();
    console.log('Auth URL generated:', authUrl);
    console.log('Stored nonce:', localStorage.getItem('shopify_nonce'));

    // Step 2: Simulate callback validation
    console.log('\n2. Simulating callback validation...');
    const mockParams = new URLSearchParams({
      shop: 'test-store.myshopify.com',
      code: 'test_code',
      state: localStorage.getItem('shopify_nonce') || '',
      hmac: 'test_hmac',
      timestamp: (Date.now() / 1000).toString()
    });
    
    const isValid = validateCallback(mockParams);
    console.log('Callback validation result:', isValid);

    // Step 3: Exchange code for token
    console.log('\n3. Testing token exchange...');
    try {
      const result = await exchangeCodeForToken('test_code', 'test-store.myshopify.com');
      console.log('Token exchange successful:', result);
    } catch (error) {
      console.log('Token exchange failed (expected in test environment):', error);
    }

    return {
      success: true,
      authUrl,
      validationResult: isValid
    };
  } catch (error) {
    console.error('Auth flow test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};