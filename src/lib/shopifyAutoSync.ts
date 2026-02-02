import { supabase } from './supabase';
import { getSubscription, hasActiveSubscription } from './subscriptionService';

/**
 * Shopify Auto-Sync Service
 *
 * Automatically syncs Shopify orders every 30 minutes when user is active.
 * Uses a lock mechanism to prevent duplicate concurrent syncs.
 * Respects subscription status - will not sync if subscription is inactive.
 */

interface SyncLock {
  isLocked: boolean;
  lastSync: Date | null;
  timer: number | null;
}

const SYNC_INTERVAL = 30 * 60 * 1000; // 30 minutes
const MIN_SYNC_INTERVAL = 5 * 60 * 1000; // Don't sync more than once every 5 minutes
const syncState: SyncLock = {
  isLocked: false,
  lastSync: null,
  timer: null,
};

/**
 * Sync orders for a user
 * Returns true if sync was initiated, false if skipped
 */
async function syncOrders(userId: string): Promise<boolean> {
  // Check if sync is already in progress
  if (syncState.isLocked) {
    console.log('[AutoSync] Sync already in progress, skipping');
    return false;
  }

  // Check minimum interval
  if (syncState.lastSync) {
    const timeSinceLastSync = Date.now() - syncState.lastSync.getTime();
    if (timeSinceLastSync < MIN_SYNC_INTERVAL) {
      console.log('[AutoSync] Too soon since last sync, skipping');
      return false;
    }
  }

  try {
    // Acquire lock
    syncState.isLocked = true;
    console.log('[AutoSync] Starting automatic order sync');

    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      console.log('[AutoSync] No active session, skipping');
      return false;
    }

    // Check if Shopify is connected
    const { data: installation } = await supabase
      .from('shopify_installations')
      .select('id, last_synced_at')
      .eq('user_id', userId)
      .eq('status', 'installed')
      .is('uninstalled_at', null)
      .maybeSingle();

    if (!installation) {
      console.log('[AutoSync] No Shopify installation found, skipping');
      return false;
    }

    // Check subscription status before syncing
    const subscription = await getSubscription(installation.id);
    if (!subscription || !hasActiveSubscription(subscription.subscriptionStatus)) {
      console.log('[AutoSync] Subscription inactive, skipping sync:', subscription?.subscriptionStatus);
      return false;
    }

    // Call sync endpoint
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-shopify-orders`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('[AutoSync] Sync failed:', result.error);
      return false;
    }

    console.log('[AutoSync] Sync completed:', {
      totalOrders: result.totalOrders,
      fulfillments: result.fulfillmentsCreated,
      pages: result.pages,
    });

    syncState.lastSync = new Date();
    return true;
  } catch (error) {
    console.error('[AutoSync] Error during sync:', error);
    return false;
  } finally {
    // Release lock
    syncState.isLocked = false;
  }
}

/**
 * Start automatic syncing for a user
 * Returns a cleanup function to stop syncing
 */
export function startAutoSync(userId: string): () => void {
  if (!userId) {
    console.warn('[AutoSync] Cannot start without userId');
    return () => {};
  }

  console.log('[AutoSync] Starting auto-sync service for user:', userId);

  // Do initial sync after a short delay (30 seconds)
  const initialDelay = setTimeout(() => {
    syncOrders(userId);
  }, 30000);

  // Set up recurring sync
  const syncTimer = setInterval(() => {
    syncOrders(userId);
  }, SYNC_INTERVAL);

  syncState.timer = syncTimer as unknown as number;

  // Return cleanup function
  return () => {
    console.log('[AutoSync] Stopping auto-sync service');
    clearTimeout(initialDelay);
    clearInterval(syncTimer);
    syncState.timer = null;
    syncState.isLocked = false;
  };
}

/**
 * Manually trigger a sync (bypasses minimum interval check)
 * Used for manual refresh buttons
 */
export async function manualSync(userId: string): Promise<{
  success: boolean;
  totalOrders?: number;
  fulfillmentsCreated?: number;
  pages?: number;
  error?: string;
}> {
  if (syncState.isLocked) {
    return {
      success: false,
      error: 'Sync already in progress',
    };
  }

  try {
    syncState.isLocked = true;

    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    // Check subscription status for manual sync too
    const { data: installation } = await supabase
      .from('shopify_installations')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'installed')
      .maybeSingle();

    if (installation) {
      const subscription = await getSubscription(installation.id);
      if (!subscription || !hasActiveSubscription(subscription.subscriptionStatus)) {
        return {
          success: false,
          error: 'Active subscription required',
        };
      }
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-shopify-orders`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Sync failed',
      };
    }

    syncState.lastSync = new Date();

    return {
      success: true,
      totalOrders: result.totalOrders,
      fulfillmentsCreated: result.fulfillmentsCreated,
      pages: result.pages,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    syncState.isLocked = false;
  }
}

/**
 * Check if sync is currently in progress
 */
export function isSyncing(): boolean {
  return syncState.isLocked;
}

/**
 * Get last sync time
 */
export function getLastSyncTime(): Date | null {
  return syncState.lastSync;
}
