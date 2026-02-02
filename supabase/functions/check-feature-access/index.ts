import { createClient } from 'npm:@supabase/supabase-js@2';
import { shopifyGraphQL } from '../_shared/shopify-graphql.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

/**
 * Check Feature Access Edge Function
 *
 * Verifies if a store has access to a feature based on subscription status.
 * If cache is stale (>5 minutes), refreshes from Shopify first.
 *
 * This ensures Shopify is always the source of truth for subscription state.
 */

interface CheckAccessRequest {
  storeId: string;
  feature?: string; // Optional: specific feature to check (future enhancement)
}

interface CheckAccessResponse {
  hasAccess: boolean;
  reason: string;
  currentStatus: string;
  currentTier: string | null;
  lastVerified: string;
  refreshedFromShopify: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { storeId, feature }: CheckAccessRequest = await req.json();

    if (!storeId) {
      return new Response(
        JSON.stringify({
          hasAccess: false,
          reason: 'Missing storeId parameter',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get store data with subscription info
    const { data: storeData, error: storeError } = await supabase
      .from('shopify_stores')
      .select('id, store_url, access_token, subscription_status, current_tier, last_verified_at, uninstalled_at')
      .eq('id', storeId)
      .maybeSingle();

    if (storeError || !storeData) {
      return new Response(
        JSON.stringify({
          hasAccess: false,
          reason: 'Store not found',
          currentStatus: 'UNKNOWN',
          currentTier: null,
          lastVerified: new Date().toISOString(),
          refreshedFromShopify: false,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if uninstalled
    if (storeData.uninstalled_at) {
      return new Response(
        JSON.stringify({
          hasAccess: false,
          reason: 'App is uninstalled',
          currentStatus: 'UNINSTALLED',
          currentTier: null,
          lastVerified: storeData.last_verified_at || new Date().toISOString(),
          refreshedFromShopify: false,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let refreshedFromShopify = false;
    let currentStatus = storeData.subscription_status;
    let currentTier = storeData.current_tier;

    // Check if cache is stale (>5 minutes) and refresh from Shopify
    if (storeData.last_verified_at && storeData.access_token) {
      const lastVerified = new Date(storeData.last_verified_at);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      if (lastVerified < fiveMinutesAgo) {
        console.log('[Check Feature Access] Cache is stale, refreshing from Shopify...');

        try {
          const shop = storeData.store_url.replace('https://', '');

          const SUBSCRIPTION_QUERY = `
            query {
              currentAppInstallation {
                activeSubscriptions {
                  id
                  name
                  status
                  currentPeriodEnd
                  trialDays
                }
              }
            }
          `;

          const result = await shopifyGraphQL(shop, storeData.access_token, SUBSCRIPTION_QUERY);
          const subscriptions = result?.currentAppInstallation?.activeSubscriptions || [];

          if (subscriptions.length > 0) {
            const subscription = subscriptions[0];
            const shopifyStatus = subscription.status.toLowerCase();

            // Map Shopify status (consistent with verify and webhook)
            const statusMap: Record<string, string> = {
              'active': 'ACTIVE',
              'accepted': 'ACTIVE',
              'pending': 'PENDING',
              'declined': 'CANCELLED',
              'expired': 'EXPIRED',
              'frozen': 'PENDING',
              'cancelled': 'CANCELLED',
            };

            currentStatus = statusMap[shopifyStatus] || 'PENDING';

            // Map plan name to tier
            const normalizePlanName = (name: string): string => {
              const normalized = name.toLowerCase().trim();
              if (normalized.includes('startup')) return 'startup';
              if (normalized.includes('momentum')) return 'momentum';
              if (normalized.includes('scale')) return 'scale';
              if (normalized.includes('enterprise')) return 'enterprise';
              return 'startup';
            };

            currentTier = normalizePlanName(subscription.name);

            // Update DB with fresh data
            await supabase
              .from('shopify_stores')
              .update({
                subscription_status: currentStatus,
                current_tier: currentTier,
                last_verified_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', storeId);

            refreshedFromShopify = true;
            console.log('[Check Feature Access] Refreshed from Shopify:', { currentStatus, currentTier });
          }
        } catch (refreshError) {
          console.error('[Check Feature Access] Error refreshing from Shopify:', refreshError);
          // Continue with cached data
        }
      }
    }

    // Determine access based on subscription status
    const activeStatuses = ['ACTIVE', 'PENDING'];
    const hasAccess = activeStatuses.includes(currentStatus);

    let reason = '';
    if (!hasAccess) {
      if (currentStatus === 'CANCELLED') {
        reason = 'Subscription has been cancelled';
      } else if (currentStatus === 'EXPIRED') {
        reason = 'Subscription has expired';
      } else if (currentStatus === 'DECLINED') {
        reason = 'Payment was declined';
      } else {
        reason = `Subscription status is ${currentStatus}`;
      }
    } else {
      reason = 'Access granted';
    }

    const response: CheckAccessResponse = {
      hasAccess,
      reason,
      currentStatus,
      currentTier,
      lastVerified: storeData.last_verified_at || new Date().toISOString(),
      refreshedFromShopify,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Check Feature Access] Error:', error);
    return new Response(
      JSON.stringify({
        hasAccess: false,
        reason: 'Internal server error',
        currentStatus: 'ERROR',
        currentTier: null,
        lastVerified: new Date().toISOString(),
        refreshedFromShopify: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
