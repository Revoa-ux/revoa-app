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

    // CRITICAL: Delete any existing OAuth sessions for this user/shop to avoid polling wrong session
    console.debug('Cleaning up old OAuth sessions for user:', session.user.id, 'shop:', normalizedDomain);
    await supabase
      .from('oauth_sessions')
      .delete()
      .eq('user_id', session.user.id)
      .eq('shop_domain', normalizedDomain);

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
    console.log('[Auth] Checking Shopify config...');
    console.log('[Auth] CLIENT_ID:', SHOPIFY_CONFIG.CLIENT_ID ? 'present' : '❌ MISSING ❌');
    console.log('[Auth] REDIRECT_URI:', SHOPIFY_CONFIG.REDIRECT_URI);
    console.log('[Auth] SCOPES:', SHOPIFY_CONFIG.SCOPES.substring(0, 50) + '...');

    if (!SHOPIFY_CONFIG.CLIENT_ID) {
      console.error('❌ SHOPIFY_CONFIG.CLIENT_ID is not defined');
      console.error('Check your .env file for VITE_SHOPIFY_CLIENT_ID');
      throw new Error('Shopify configuration error: CLIENT_ID is missing. Check your .env file.');
    }

    if (!SHOPIFY_CONFIG.REDIRECT_URI) {
      console.error('❌ SHOPIFY_CONFIG.REDIRECT_URI is not defined');
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
    console.log('[Auth] ✅ Generated auth URL:');
    console.log('[Auth] URL:', authUrl);
    console.log('[Auth] redirect_uri being sent:', SHOPIFY_CONFIG.REDIRECT_URI);
    console.log('[Auth] ⚠️  CRITICAL: redirect_uri MUST match one of these EXACTLY:');
    console.log('[Auth]   - https://members.revoa.app/shopify-callback');
    console.log('[Auth]   - http://localhost:5173/shopify-callback');
    console.log('[Auth]   - https://members.revoa.app/shopify-callback.html');
    console.log('[Auth]   - http://localhost:5173/shopify-callback.html');

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

    // Verify state parameter and get user_id from database
    // NOTE: We don't use localStorage here because popup windows may not have access
    // to the parent window's localStorage. Instead, we retrieve everything from the database.
    const { data: oauthSession, error: oauthError } = await supabase
      .from('oauth_sessions')
      .select('*')
      .eq('state', state)
      .eq('shop_domain', shop)
      .single();

    if (oauthError || !oauthSession) {
      console.error('OAuth session not found or error:', oauthError);
      throw new Error('Invalid or expired OAuth session. Please try again.');
    }

    // Check if session has expired (5 minutes)
    const expiresAt = new Date(oauthSession.expires_at);
    if (expiresAt < new Date()) {
      console.error('OAuth session expired');
      throw new Error('OAuth session expired. Please try again.');
    }

    const userId = oauthSession.user_id;

    // Use edge function to complete OAuth securely
    const proxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-proxy`;

    // Get the current session to include auth token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Authentication required to complete OAuth');
    }

    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        action: 'complete-oauth',
        shop,
        code,
        state
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OAuth completion failed:', errorData);
      throw new Error(errorData.error || 'Failed to complete OAuth');
    }

    const { access_token, scope } = await response.json();

    // Save auth data to localStorage
    const authData: ShopifyAuthData = {
      shop,
      accessToken: access_token,
      scope,
      timestamp: Date.now()
    };

    saveShopifyAuth(authData);

    // Mark OAuth session as completed
    await supabase
      .from('oauth_sessions')
      .update({
        completed_at: new Date().toISOString(),
        error: null
      })
      .eq('state', state);

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