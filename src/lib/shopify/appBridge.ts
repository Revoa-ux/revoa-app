import { AppBridgeProvider, createApp } from '@shopify/app-bridge-react';
import { getSessionToken } from '@shopify/app-bridge-utils';
import { APP_BRIDGE_CONFIG } from '../../config/shopify';

// Initialize App Bridge
export const initializeAppBridge = () => {
  const host = new URLSearchParams(window.location.search).get('host');
  
  if (!host || !APP_BRIDGE_CONFIG.forceRedirect) { // Assuming forceRedirect implies embedded for this check
    return null;
  }

  return createApp({
    apiKey: APP_BRIDGE_CONFIG.apiKey,
    host,
    forceRedirect: true
  });
};

// Get session token for API calls
export const getShopifySessionToken = async () => {
  const app = initializeAppBridge();
  if (!app) return null;

  try {
    return await getSessionToken(app);
  } catch (error) {
    console.error('Error getting session token:', error);
    return null;
  }
};

// Check if running in Shopify admin
export const isShopifyAdmin = () => {
  return Boolean(new URLSearchParams(window.location.search).get('host'));
};

// AppBridge Provider component
export const ShopifyAppBridgeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const app = initializeAppBridge();
  
  if (!app) {
    return <>{children}</>;
  }

  return (
    <AppBridgeProvider config={app}>
      {children}
    </AppBridgeProvider>
  );
};