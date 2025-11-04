import { supabase } from '../supabase';

export interface ShopifyInstallation {
  id: string;
  store_url: string;
  status: string;
  uninstalled_at: string | null;
}

/**
 * Check if user has an active Shopify store installation
 * Returns the installation if found and active, null otherwise
 */
export async function getActiveShopifyInstallation(
  userId: string
): Promise<ShopifyInstallation | null> {
  try {
    const { data, error } = await supabase
      .from('shopify_installations')
      .select('id, store_url, status, uninstalled_at')
      .eq('user_id', userId)
      .eq('status', 'installed')
      .is('uninstalled_at', null)
      .maybeSingle();

    if (error) {
      console.error('[ShopifyStatus] Error checking installation:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('[ShopifyStatus] Unexpected error:', err);
    return null;
  }
}

/**
 * Check if user has an active Shopify store (boolean)
 */
export async function hasActiveShopifyStore(userId: string): Promise<boolean> {
  const installation = await getActiveShopifyInstallation(userId);
  return installation !== null;
}

/**
 * Subscribe to changes in Shopify installation status
 * Also immediately checks and calls callback with current status
 */
export function subscribeToShopifyStatus(
  userId: string,
  callback: (isConnected: boolean, installation: ShopifyInstallation | null) => void
) {
  // Immediately check current status
  getActiveShopifyInstallation(userId).then((installation) => {
    console.log('[ShopifyStatus] Initial subscription check:', installation);
    callback(installation !== null, installation);
  });

  // Set up real-time subscription for changes
  const channel = supabase
    .channel(`shopify_status_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'shopify_installations',
        filter: `user_id=eq.${userId}`,
      },
      async (payload) => {
        console.log('[ShopifyStatus] Installation changed:', payload);
        const installation = await getActiveShopifyInstallation(userId);
        callback(installation !== null, installation);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
