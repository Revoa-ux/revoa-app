import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Daily Order Count Update Job
 *
 * This edge function should be called daily (via cron or scheduled job)
 * to update rolling 30-day order counts for all active stores.
 *
 * It also checks if stores need tier upgrade notifications.
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Verify this is a cron job or authorized request
    const authHeader = req.headers.get('Authorization');
    const expectedAuth = `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`;

    if (authHeader !== expectedAuth) {
      console.error('Unauthorized request to update-order-counts');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting daily order count update...');

    // Get all active stores with their associated user_id
    const { data: installations, error: storesError } = await supabase
      .from('shopify_installations')
      .select(`
        user_id,
        store_url,
        shopify_stores!inner(
          id,
          store_url,
          current_tier,
          monthly_order_count,
          subscription_status
        )
      `)
      .in('shopify_stores.subscription_status', ['ACTIVE', 'PENDING']);

    if (storesError) {
      console.error('Error fetching stores:', storesError);
      throw storesError;
    }

    // Flatten the data structure
    const stores = installations?.map(inst => ({
      id: (inst.shopify_stores as any).id,
      store_url: inst.store_url,
      current_tier: (inst.shopify_stores as any).current_tier,
      monthly_order_count: (inst.shopify_stores as any).monthly_order_count,
      user_id: inst.user_id
    })) || [];

    console.log(`Found ${stores?.length || 0} active stores to update`);

    const results = {
      total: stores?.length || 0,
      updated: 0,
      notificationsSent: 0,
      errors: 0,
      details: [] as Array<{
        storeId: string;
        storeUrl: string;
        oldCount: number;
        newCount: number;
        tier: string;
        notificationSent: boolean;
      }>,
    };

    // Process each store
    for (const store of stores || []) {
      try {
        const oldCount = store.monthly_order_count || 0;

        // Update order count using database function
        const { error: updateError } = await supabase.rpc('update_store_order_count', {
          store_id_param: store.id,
        });

        if (updateError) {
          console.error(`Error updating store ${store.id}:`, updateError);
          results.errors++;
          continue;
        }

        // Fetch updated count
        const { data: updatedStore } = await supabase
          .from('shopify_stores')
          .select('monthly_order_count')
          .eq('id', store.id)
          .single();

        const newCount = updatedStore?.monthly_order_count || 0;
        results.updated++;

        // Check if notification is needed
        const tier = store.current_tier || 'startup';
        const tierLimits: Record<string, number> = {
          startup: 100,
          momentum: 300,
          scale: 1000,
          enterprise: Infinity,
        };

        const limit = tierLimits[tier] || 100;
        const percentage = (newCount / limit) * 100;
        let notificationSent = false;

        // Send notification if at 80% or 95%
        if (percentage >= 80 && tier !== 'enterprise' && store.user_id) {
          const isUrgent = percentage >= 95;

          // Create in-app notification
          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: store.user_id,
              type: isUrgent ? 'tier_limit_urgent' : 'tier_limit_warning',
              title: isUrgent ? 'Action Required: Order Limit Reached' : 'Approaching Order Limit',
              message: isUrgent
                ? `You've used ${Math.round(percentage)}% of your ${tier} plan's order limit. Upgrade now to continue using all features.`
                : `You've used ${Math.round(percentage)}% of your ${tier} plan's order limit. Consider upgrading to avoid interruption.`,
              metadata: {
                current_tier: tier,
                order_count: newCount,
                order_limit: limit,
                utilization_percentage: Math.round(percentage),
              },
            });

          if (!notifError) {
            notificationSent = true;
            results.notificationsSent++;

            // Send email notification via edge function
            try {
              await fetch(`${supabaseUrl}/functions/v1/send-subscription-notification`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({
                  userId: store.user_id,
                  type: isUrgent ? 'order-limit-urgent' : 'order-limit-warning',
                  data: {
                    usagePercentage: Math.round(percentage),
                    currentCount: newCount,
                    limit: limit,
                  },
                }),
              });
            } catch (emailError) {
              console.error('Error sending email notification:', emailError);
            }
          }
        }

        results.details.push({
          storeId: store.id,
          storeUrl: store.store_url,
          oldCount,
          newCount,
          tier,
          notificationSent,
        });

        console.log(`Updated ${store.store_url}: ${oldCount} → ${newCount} orders (${tier})`);
      } catch (error) {
        console.error(`Error processing store ${store.id}:`, error);
        results.errors++;
      }
    }

    console.log('Order count update complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Order counts updated successfully',
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in update-order-counts:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
