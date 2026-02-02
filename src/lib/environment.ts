/**
 * Environment detection utilities
 *
 * Determines the current runtime environment to enable
 * environment-specific features and behaviors.
 */

/**
 * Checks if the app is running in production environment
 * @returns true if running in production (members.revoa.app)
 */
export const isProduction = (): boolean => {
  // Check hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // Production domains
    if (hostname === 'members.revoa.app' || hostname === 'revoa.app') {
      return true;
    }

    // Localhost or preview deployments are not production
    if (hostname === 'localhost' || hostname.includes('127.0.0.1')) {
      return false;
    }

    // Netlify preview/branch deploys are not production
    if (hostname.includes('netlify.app') && !hostname.startsWith('members.revoa.app')) {
      return false;
    }
  }

  // Fallback to Vite mode
  return import.meta.env.MODE === 'production' && import.meta.env.PROD;
};

/**
 * Checks if the app is running in development environment
 * @returns true if running in development (localhost or dev mode)
 */
export const isDevelopment = (): boolean => {
  return !isProduction();
};

/**
 * Determines if manual Shopify store URL connection should be allowed
 *
 * Per Shopify App Store policies:
 * - Production apps MUST NOT allow manual .myshopify.com URL entry
 * - Users must install via Shopify App Store
 * - Development/testing environments can use manual entry
 *
 * @returns true if manual connection is allowed (development only)
 */
export const shouldAllowManualShopifyConnect = (): boolean => {
  // Only allow manual connection in development
  return isDevelopment();
};

/**
 * Gets the environment name for display/logging
 * @returns 'production' | 'development'
 */
export const getEnvironmentName = (): 'production' | 'development' => {
  return isProduction() ? 'production' : 'development';
};

/**
 * Checks if the app is running on a Netlify preview deployment
 * @returns true if running on a Netlify preview/branch deploy
 */
export const isNetlifyPreview = (): boolean => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    return hostname.includes('netlify.app') && !hostname.startsWith('members.revoa.app');
  }
  return false;
};
