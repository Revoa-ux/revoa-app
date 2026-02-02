import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface FulfillmentToSync {
  id: string;
  order_id: string;
  shopify_order_id: string;
  tracking_number: string;
  tracking_company: string;
  tracking_url?: string;
  user_id: string;
}

interface ShopifyStore {
  id: string;
  shop_domain: string;
  access_token: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get request body
    const { userId, fulfillmentId } = await req.json().catch(() => ({}));

    // Build query for fulfillments to sync
    let query = supabase
      .from('shopify_order_fulfillments')
      .select('*, shopify_orders!inner(shopify_order_id)')
      .eq('synced_to_shopify', false)
      .is('sync_error', null)
      .limit(100);

    if (fulfillmentId) {
      query = query.eq('id', fulfillmentId);
    } else if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: fulfillments, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    if (!fulfillments || fulfillments.length === 0) {
      return new Response(
        JSON.stringify({ synced: 0, failed: 0, message: 'No fulfillments to sync' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Group fulfillments by user/store
    const fulfillmentsByUser = new Map<string, FulfillmentToSync[]>();
    for (const f of fulfillments) {
      const userId = f.user_id;
      if (!fulfillmentsByUser.has(userId)) {
        fulfillmentsByUser.set(userId, []);
      }
      fulfillmentsByUser.get(userId)!.push(f as FulfillmentToSync);
    }

    let syncedCount = 0;
    let failedCount = 0;

    // Process each store
    for (const [userId, userFulfillments] of fulfillmentsByUser) {
      try {
        // Get Shopify installation details
        const { data: installation, error: installError } = await supabase
          .from('shopify_installations')
          .select('shop_domain, access_token')
          .eq('user_id', userId)
          .is('uninstalled_at', null)
          .maybeSingle();

        if (installError || !installation) {
          console.error(`No active Shopify installation for user ${userId}`);
          // Mark all as failed
          for (const f of userFulfillments) {
            await supabase
              .from('shopify_order_fulfillments')
              .update({
                sync_error: 'Store not connected',
                sync_retry_count: (f as any).sync_retry_count + 1
              })
              .eq('id', f.id);
            failedCount++;
          }
          continue;
        }

        // Sync each fulfillment
        for (const fulfillment of userFulfillments) {
          try {
            // Extract order ID from shopify_order_id (format: gid://shopify/Order/1234567890)
            const orderIdMatch = fulfillment.shopify_order_id.match(/\/(\d+)$/);
            if (!orderIdMatch) {
              throw new Error('Invalid Shopify order ID format');
            }
            const shopifyOrderId = orderIdMatch[1];

            // Get order line item IDs
            const { data: lineItems } = await supabase
              .from('shopify_order_line_items')
              .select('shopify_line_item_id')
              .eq('order_id', fulfillment.order_id);

            const lineItemIds = lineItems?.map(li => {
              const match = li.shopify_line_item_id?.match(/\/(\d+)$/);
              return match ? parseInt(match[1]) : null;
            }).filter(id => id !== null) || [];

            // Call Shopify API to create fulfillment
            const shopifyUrl = `https://${installation.shop_domain}/admin/api/2026-01/orders/${shopifyOrderId}/fulfillments.json`;
            
            const fulfillmentPayload: any = {
              fulfillment: {
                notify_customer: true,
                tracking_info: {
                  number: fulfillment.tracking_number,
                  company: fulfillment.tracking_company,
                }
              }
            };

            // Only add line items if we have them
            if (lineItemIds.length > 0) {
              fulfillmentPayload.fulfillment.line_items_by_fulfillment_order = lineItemIds.map(id => ({
                fulfillment_order_line_item_id: id
              }));
            }

            const shopifyResponse = await fetch(shopifyUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': installation.access_token,
              },
              body: JSON.stringify(fulfillmentPayload),
            });

            if (!shopifyResponse.ok) {
              const errorData = await shopifyResponse.json().catch(() => ({}));
              
              // Check if already fulfilled
              if (errorData.errors && typeof errorData.errors === 'string' && 
                  errorData.errors.includes('already been fulfilled')) {
                // Mark as synced anyway
                await supabase
                  .from('shopify_order_fulfillments')
                  .update({
                    synced_to_shopify: true,
                    synced_to_shopify_at: new Date().toISOString(),
                    sync_error: null,
                  })
                  .eq('id', fulfillment.id);
                syncedCount++;
                continue;
              }

              throw new Error(JSON.stringify(errorData));
            }

            // Mark as synced
            await supabase
              .from('shopify_order_fulfillments')
              .update({
                synced_to_shopify: true,
                synced_to_shopify_at: new Date().toISOString(),
                sync_error: null,
              })
              .eq('id', fulfillment.id);

            // Update order
            await supabase
              .from('shopify_orders')
              .update({
                last_synced_to_shopify_at: new Date().toISOString(),
              })
              .eq('id', fulfillment.order_id);

            syncedCount++;

            // Rate limiting: Wait 500ms between requests
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error: any) {
            console.error(`Error syncing fulfillment ${fulfillment.id}:`, error);
            
            // Update with error
            await supabase
              .from('shopify_order_fulfillments')
              .update({
                sync_error: error.message?.substring(0, 500),
                sync_retry_count: ((fulfillment as any).sync_retry_count || 0) + 1,
              })
              .eq('id', fulfillment.id);
            
            failedCount++;
          }
        }
      } catch (error: any) {
        console.error(`Error processing user ${userId}:`, error);
        failedCount += userFulfillments.length;
      }
    }

    return new Response(
      JSON.stringify({
        synced: syncedCount,
        failed: failedCount,
        message: `Successfully synced ${syncedCount} fulfillments, ${failedCount} failed`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in shopify-sync-fulfillments:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});