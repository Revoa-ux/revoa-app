import { supabase } from '../supabase';
import { SHOPIFY_CONFIG } from './config';

const SHOPIFY_STORAGE_KEY = "shopify_auth";

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
  localStorage.removeItem('shopify_state');
  localStorage.removeItem('shopify_shop');
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
export const getShopifyAuthUrl = async (shopDomain: string): Promise<string> => {
  try {
    console.debug('Generating Shopify auth URL for shop:', shopDomain);
    
    // Get current session first to ensure we're authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      throw new Error('Authentication required');
    }

    if (!session?.user) {
      console.error('No authenticated user found');
      throw new Error('No authenticated user found');
    }

    // Normalize the shop URL
    let normalizedDomain = shopDomain.trim().toLowerCase();
    normalizedDomain = normalizedDomain.replace(/^https?:\/\//, '');
    normalizedDomain = normalizedDomain.replace(/^www\./, '');
    
    // Add .myshopify.com if not present and doesn't already have a TLD
    if (!normalizedDomain.includes('.')) {
      normalizedDomain = `${normalizedDomain}.myshopify.com`;
    }

    // Generate a cryptographically secure state parameter
    const state = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    console.debug('Generated state parameter:', state);
    
    // Store state and shop in localStorage
    localStorage.setItem('shopify_state', state);
    localStorage.setItem('shopify_shop', normalizedDomain);

    // Store pending OAuth session in database
    const { error: oauthError } = await supabase
      .from('oauth_sessions')
      .insert({
        state,
        shop_domain: normalizedDomain,
        user_id: session.user.id,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes expiry
        error: "Session Started...",
        metadata: {
          created_at: new Date().toISOString(),
          user_agent: navigator.userAgent
        }
      });

    if (oauthError) {
      console.error('Error storing OAuth session:', {
        message: oauthError.message,
        details: oauthError.details,
        hint: oauthError.hint,
        code: oauthError.code
      });
      throw new Error(`Failed to store OAuth session: ${oauthError.message}`);
    }

    // Validate required config
    if (!SHOPIFY_CONFIG.CLIENT_ID) {
      console.error('SHOPIFY_CONFIG.CLIENT_ID is not defined');
      throw new Error('Shopify configuration error: CLIENT_ID is missing');
    }

    if (!SHOPIFY_CONFIG.REDIRECT_URI) {
      console.error('SHOPIFY_CONFIG.REDIRECT_URI is not defined');
      throw new Error('Shopify configuration error: REDIRECT_URI is missing');
    }

    // Build the authorization URL with required parameters
    const params = new URLSearchParams({
      client_id: SHOPIFY_CONFIG.CLIENT_ID,
      scope: SHOPIFY_CONFIG.SCOPES,
      redirect_uri: SHOPIFY_CONFIG.REDIRECT_URI,
      state
    });

    const authUrl = `https://${normalizedDomain}/admin/oauth/authorize?${params.toString()}`;
    console.debug('Generated auth URL:', authUrl);

    return authUrl;
  } catch (error) {
    console.error('Error generating Shopify auth URL:', error);
    throw error;
  }
};

// Handle OAuth callback
export const handleCallback = async (params: URLSearchParams): Promise<ShopifyAuthData> => {
  try {
    console.debug('Processing OAuth callback with params:', Object.fromEntries(params));
    
    // Get and validate required parameters
    const shop = params.get('shop');
    const code = params.get('code');
    const state = params.get('state');
    const hmac = params.get('hmac');

    if (!shop || !code || !state || !hmac) {
      console.error('Missing required parameters:', { shop, code, state, hmac });
      throw new Error('Missing required parameters');
    }

    // Verify state parameter
    const storedState = localStorage.getItem('shopify_state');
    const storedShop = localStorage.getItem('shopify_shop');

    console.debug('Stored values:', { storedState, storedShop });

    if (!storedState || state !== storedState) {
      console.error('State mismatch:', { received: state, stored: storedState });
      throw new Error('Invalid state parameter');
    }

    if (!storedShop || shop !== storedShop) {
      console.error('Shop mismatch:', { received: shop, stored: storedShop });
      throw new Error('Shop mismatch');
    }

    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    if (!session?.user) {
      throw new Error('No authenticated user found');
    }

    // Exchange code for access token
    const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: SHOPIFY_CONFIG.CLIENT_ID,
          client_secret: SHOPIFY_CONFIG.CLIENT_SECRET,
          code
        })
      });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to exchange token');
    }

    const { access_token, scope } = await response.json();

    // Create installation record in Supabase
    const { error: installError } = await supabase
      .from('shopify_installations')
      .upsert({
        user_id: session.user.id,
        store_url: shop,
        access_token,
        scopes: scope.split(','),
        status: 'installed',
        installed_at: new Date().toISOString(),
        last_auth_at: new Date().toISOString(),
        metadata: {
          install_count: 1,
          last_install: new Date().toISOString()
        }
      });

    if (installError) {
      console.error('Error creating Shopify installation:', installError);
      throw installError;
    }

    // Save auth data to localStorage for backward compatibility
    const authData: ShopifyAuthData = {
      shop,
      accessToken: access_token,
      scope,
      timestamp: Date.now()
    };
    
    saveShopifyAuth(authData);
    
    // Clear state from localStorage
    localStorage.removeItem('shopify_state');
    localStorage.removeItem('shopify_shop');

    return authData;
  } catch (error) {
    console.error('Error handling Shopify callback:', error);
    
    // Clean up localStorage on error
    localStorage.removeItem('shopify_state');
    localStorage.removeItem('shopify_shop');
    
    throw error;
  }
};

// Validate store URL format
export const validateStoreUrl = (url: string): { success: boolean; error?: string; data?: string } => {
  try {
    console.debug('Validating store URL:', url);

    // Basic validation
    if (!url.trim()) {
      return { success: false, error: 'Store URL is required' };
    }

    // Remove protocol if present
    let domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '');

    // Add myshopify.com if not present and doesn't contain it
    if (!domain.includes('myshopify.com')) {
      domain = `${domain}.myshopify.com`;
    }

    // Validate domain format
    const validDomainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
    if (!validDomainPattern.test(domain)) {
      return { success: false, error: 'Please enter a valid Shopify store URL' };
    }

    console.debug('Store URL validation successful:', domain);
    return { success: true, data: domain };
  } catch (error) {
    console.error('Store URL validation error:', error);
    return { success: false, error: 'Please enter a valid Shopify store URL' };
  }
};

// Initiate Shopify OAuth flow - prompts user for shop domain
export const initiateShopifyOAuth = async (userId: string): Promise<void> => {
  const shopDomain = window.prompt('Enter your Shopify store URL (e.g., mystore.myshopify.com):');

  if (!shopDomain) {
    throw new Error('Store URL is required');
  }

  const validation = validateStoreUrl(shopDomain);
  if (!validation.success) {
    throw new Error(validation.error || 'Invalid store URL');
  }

  const authUrl = await getShopifyAuthUrl(validation.data!);

  // Open OAuth in new window
  const width = 600;
  const height = 700;
  const left = window.screen.width / 2 - width / 2;
  const top = window.screen.height / 2 - height / 2;

  window.open(
    authUrl,
    'shopify-oauth',
    `width=${width},height=${height},left=${left},top=${top}`
  );
};