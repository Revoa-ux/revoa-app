import { supabase } from '../supabase';

export interface ShopifyInstallation {
  id: string;
  store_url: string;
  status: string;
  uninstalled_at: string | null;
  last_synced_at?: string | null;
  orders_synced_count?: number;
}

// Internal type for backend use only - includes access_token
export interface ShopifyInstallationWithToken extends ShopifyInstallation {
  access_token: string;
}

/**
 * Check if user has an active Shopify store installation
 * Returns the installation if found and active, null otherwise
 */
export async function getActiveShopifyInstallation(
  userId: string
): Promise<ShopifyInstallation | null> {
  try {
    console.log('[ShopifyStatus] ===== QUERYING FOR ACTIVE INSTALLATION =====');
    console.log('[ShopifyStatus] User ID:', userId);

    // First, check ALL installations for this user (debug)
    const { data: allInstallations, error: allError } = await supabase
      .from('shopify_installations')
      .select('id, store_url, status, uninstalled_at, last_auth_at, installed_at')
      .eq('user_id', userId)
      .order('last_auth_at', { ascending: false });

    console.log('[ShopifyStatus] ALL installations for user:', allInstallations);
    if (allError) {
      console.error('[ShopifyStatus] Error fetching all installations:', allError);
    }

    // Now the actual filtered query
    const { data, error } = await supabase
      .from('shopify_installations')
      .select('id, store_url, status, uninstalled_at, last_synced_at, orders_synced_count')
      .eq('user_id', userId)
      .eq('status', 'installed')
      .is('uninstalled_at', null)
      .order('last_auth_at', { ascending: false })
      .limit(1);

    console.log('[ShopifyStatus] Filtered query result:', data);
    console.log('[ShopifyStatus] Query error:', error);

    if (error) {
      console.error('[ShopifyStatus] Error checking installation:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.log('[ShopifyStatus] ✗ No active installation found');
      console.log('[ShopifyStatus] Criteria: status=installed AND uninstalled_at IS NULL');
      return null;
    }

    console.log('[ShopifyStatus] ✓ Found active installation:', data[0].store_url);
    console.log('[ShopifyStatus] ==========================================');
    return data[0];
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
