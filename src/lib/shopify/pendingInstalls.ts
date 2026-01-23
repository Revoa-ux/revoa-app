import { supabase } from '../supabase';

interface PendingInstall {
  id: string;
  user_id: string;
  state_token: string;
  created_at: string;
  expires_at: string;
  completed_at: string | null;
  source: string;
  metadata: Record<string, any>;
}

/**
 * Creates a pending install record for a user initiating Shopify App Store installation
 * @param userId - The user ID from auth.users
 * @param source - Where the install was initiated (default: 'members_site')
 * @returns The state token to pass through OAuth flow
 */
export async function createPendingInstall(
  userId: string,
  source: string = 'members_site'
): Promise<string> {
  try {
    // Generate unique state token
    const stateToken = crypto.randomUUID();

    // Set expiration to 30 minutes from now
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    const { data, error } = await supabase
      .from('pending_app_store_installs')
      .insert({
        user_id: userId,
        state_token: stateToken,
        expires_at: expiresAt.toISOString(),
        source,
      })
      .select('state_token')
      .single();

    if (error) {
      console.error('[PendingInstalls] Error creating pending install:', error);
      throw new Error('Failed to create installation request. Please try again.');
    }

    return data.state_token;
  } catch (error) {
    console.error('[PendingInstalls] Exception creating pending install:', error);
    throw error;
  }
}

/**
 * Gets a pending install by state token
 * @param stateToken - The state token from OAuth callback
 * @returns The pending install record or null if not found/expired
 */
export async function getPendingInstall(
  stateToken: string
): Promise<PendingInstall | null> {
  try {
    const { data, error } = await supabase
      .from('pending_app_store_installs')
      .select('*')
      .eq('state_token', stateToken)
      .maybeSingle();

    if (error) {
      console.error('[PendingInstalls] Error fetching pending install:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(data.expires_at);

    if (now > expiresAt) {
      console.log('[PendingInstalls] State token expired:', stateToken);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[PendingInstalls] Exception fetching pending install:', error);
    return null;
  }
}

/**
 * Marks a pending install as completed
 * @param stateToken - The state token that was completed
 * @returns The user_id associated with the pending install
 */
export async function completePendingInstall(
  stateToken: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('pending_app_store_installs')
      .update({
        completed_at: new Date().toISOString(),
      })
      .eq('state_token', stateToken)
      .select('user_id')
      .single();

    if (error) {
      console.error('[PendingInstalls] Error completing pending install:', error);
      return null;
    }

    return data.user_id;
  } catch (error) {
    console.error('[PendingInstalls] Exception completing pending install:', error);
    return null;
  }
}

/**
 * Cleans up expired pending install records
 * @returns The number of records deleted
 */
export async function cleanupExpiredInstalls(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('cleanup_expired_pending_installs');

    if (error) {
      console.error('[PendingInstalls] Error cleaning up expired installs:', error);
      return 0;
    }

    return data || 0;
  } catch (error) {
    console.error('[PendingInstalls] Exception cleaning up expired installs:', error);
    return 0;
  }
}

/**
 * Gets the Shopify App Store URL with state token
 * @param stateToken - The state token to include in the URL
 * @returns The complete App Store URL with state parameter
 */
export function getAppStoreUrl(stateToken: string): string {
  const appStoreUrl = import.meta.env.VITE_SHOPIFY_APP_STORE_URL || 'https://apps.shopify.com/revoa';
  return `${appStoreUrl}?state=${stateToken}`;
}
