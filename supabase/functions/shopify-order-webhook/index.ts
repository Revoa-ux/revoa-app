import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { verifyShopifyWebhook, getWebhookSecret } from './_shared/shopify-hmac.ts';
import { sendPurchaseEvent } from './_shared/capi-helper.ts';
import { shopifyGraphQL, QUERIES } from '../_shared/shopify-graphql.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Shopify-Hmac-Sha256, X-Shopify-Shop-Domain, X-Shopify-API-Version, X-Shopify-Webhook-Id, X-Shopify-Topic',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};


function parseUTMFromURL(url: string): Record<string, string> {
  if (!url) return {};
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    const utmParams: Record<string, string> = {};
    if (params.get('utm_source')) utmParams.utm_source = params.get('utm_source')!;
    if (params.get('utm_medium')) utmParams.utm_medium = params.get('utm_medium')!;
    if (params.get('utm_campaign')) utmParams.utm_campaign = params.get('utm_campaign')!;
    if (params.get('utm_term')) utmParams.utm_term = params.get('utm_term')!;
    if (params.get('utm_content')) utmParams.utm_content = params.get('utm_content')!;
    return utmParams;
  } catch (error) {
    console.warn('[Order Webhook] Failed to parse URL:', url, error);
    return {};
  }
}

function parseClickIDsFromURL(url: string): Record<string, string> {
  if (!url) return {};
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    const clickIDs: Record<string, string> = {};
    if (params.get('fbclid')) clickIDs.fbclid = params.get('fbclid')!;
    if (params.get('gclid')) clickIDs.gclid = params.get('gclid')!;
    if (params.get('ttclid')) clickIDs.ttclid = params.get('ttclid')!;
    return clickIDs;
  } catch (error) {
    console.warn('[Order Webhook] Failed to parse click IDs:', url, error);
    return {};
  }
}

function addBusinessDays(startDate: Date, businessDays: number): Date {
  let currentDate = new Date(startDate);
  let daysAdded = 0;

  while (daysAdded < businessDays) {
    currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
    }
  }

  return currentDate;
}

async function processOrderCOGS(supabase: any, userId: string, orderData: any, storedOrderId: string) {
  console.log('[Order Webhook] Processing COGS for order:', orderData.name);
  const lineItems = orderData.line_items || [];
  if (lineItems.length === 0) {
    console.log('[Order Webhook] No line items in order');
    return;
  }
  let totalCOGS = 0;
  const orderLineItemsToUpsert = [];
  for (const item of lineItems) {
    const { data: product } = await supabase.from('products').select('id, name, cogs_cost, supplier_id').or(`shopify_product_id.eq.${item.product_id},sku.eq.${item.sku}`).maybeSingle();
    const unitCost = product?.cogs_cost || 0;
    const totalCost = unitCost * item.quantity;
    const unitPrice = parseFloat(item.price || '0');
    totalCOGS += totalCost;
    orderLineItemsToUpsert.push({
      user_id: userId,
      shopify_order_id: orderData.id.toString(),
      product_id: product?.id || null,
      product_name: item.title || item.name || 'Unknown Product',
      variant_name: item.variant_title || null,
      quantity: item.quantity,
      unit_cost: unitCost,
      total_cost: totalCost,
      unit_price: unitPrice,
      fulfillment_status: 'pending'
    });
    console.log('[Order Webhook] Line item:', {product: item.name, quantity: item.quantity, unit_price: unitPrice, unit_cost: unitCost, total_cost: totalCost});
  }
  const { error: lineItemsError } = await supabase.from('order_line_items').upsert(orderLineItemsToUpsert, {
    onConflict: 'shopify_order_id,product_name,variant_name',
    ignoreDuplicates: false
  });
  if (lineItemsError) {
    console.error('[Order Webhook] Error upserting line items:', lineItemsError);
    throw new Error(`Failed to upsert order line items: ${lineItemsError.message}`);
  }
  console.log('[Order Webhook] Upserted', orderLineItemsToUpsert.length, 'line items');
  if (totalCOGS > 0) {
    const { data: balanceAccount } = await supabase.from('balance_accounts').select('*').eq('user_id', userId).maybeSingle();
    if (!balanceAccount) {
      await supabase.from('balance_accounts').insert({user_id: userId, current_balance: 0, currency: 'USD'});
    }
    const { data: currentAccount } = await supabase.from('balance_accounts').select('current_balance').eq('user_id', userId).single();
    const newBalance = (currentAccount?.current_balance || 0) - totalCOGS;
    const { error: balanceUpdateError } = await supabase.from('balance_accounts').update({current_balance: newBalance, last_transaction_at: new Date().toISOString()}).eq('user_id', userId);
    if (balanceUpdateError) {
      console.error('[Order Webhook] Error updating balance:', balanceUpdateError);
      throw new Error(`Failed to update balance: ${balanceUpdateError.message}`);
    }
    const { error: transactionError } = await supabase.from('balance_transactions').insert({user_id: userId, type: 'order_charge', amount: -totalCOGS, balance_after: newBalance, description: `Order ${orderData.name || orderData.order_number} - ${orderLineItemsToUpsert.length} items`, reference_type: 'order', reference_id: storedOrderId, metadata: {shopify_order_id: orderData.id.toString(), order_name: orderData.name, line_items_count: orderLineItemsToUpsert.length}});
    if (transactionError) {
      console.error('[Order Webhook] Error recording transaction:', transactionError);
    }
    console.log('[Order Webhook] Balance debited:', {amount: totalCOGS, newBalance: newBalance});
  } else {
    console.log('[Order Webhook] No COGS to charge for this order');
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {status: 200, headers: corsHeaders});
  }
  try {
    console.log('[Order Webhook] Received request');
    const shop = req.headers.get('X-Shopify-Shop-Domain');
    const hmac = req.headers.get('X-Shopify-Hmac-Sha256');
    const topic = req.headers.get('X-Shopify-Topic');
    const webhookId = req.headers.get('X-Shopify-Webhook-Id');
    console.log('[Order Webhook] Headers:', { shop, topic, hasHmac: !!hmac, webhookId });
    if (!shop || !hmac || !topic) {
      console.error('[Order Webhook] Missing required headers');
      throw new Error('Missing required headers');
    }
    if (!topic.startsWith('orders/')) {
      console.warn('[Order Webhook] Ignoring non-order topic:', topic);
      return new Response(JSON.stringify({ success: true, message: 'Ignored non-order topic' }), {status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }
    const body = await req.text();
    console.log('[Order Webhook] Body received, length:', body.length);

    let secret: string;
    try {
      secret = getWebhookSecret();
    } catch (error) {
      console.error('[Order Webhook] Error getting webhook secret:', error);
      throw new Error('Server configuration error: Webhook secret not configured');
    }

    console.log('[Order Webhook] Using webhook secret for HMAC verification');
    const isValid = await verifyShopifyWebhook(body, hmac, secret);
    if (!isValid) {
      console.error('[Order Webhook] Invalid HMAC signature');
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Invalid HMAC signature',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    console.log('[Order Webhook] HMAC verified successfully');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      console.error('[Order Webhook] Missing Supabase credentials');
      throw new Error('Server configuration error');
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    if (webhookId) {
      const { data: existingWebhook } = await supabase.from('webhook_logs').select('id').eq('webhook_id', webhookId).maybeSingle();
      if (existingWebhook) {
        console.log('[Order Webhook] Duplicate webhook detected, skipping:', webhookId);
        return new Response(JSON.stringify({ success: true, message: 'Webhook already processed' }), {status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
      }
      await supabase.from('webhook_logs').insert({webhook_id: webhookId, topic, shop_domain: shop, processed_at: new Date().toISOString()});
    }
    const orderData = JSON.parse(body);
    console.log('[Order Webhook] Order:', orderData.name || orderData.id);
    const { data: installation } = await supabase.from('shopify_installations').select('user_id').eq('store_url', shop).eq('status', 'installed').maybeSingle();
    if (!installation) {
      console.warn('[Order Webhook] No active installation found for shop:', shop);
      return new Response(JSON.stringify({ success: true, message: 'Shop not found or uninstalled' }), {status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }
    const userId = installation.user_id;
    console.log('[Order Webhook] Processing for user:', userId);
    const landingSite = orderData.landing_site || '';
    const referringSite = orderData.referring_site || '';
    const utmParams = parseUTMFromURL(landingSite);
    const clickIDs = parseClickIDsFromURL(landingSite);
    console.log('[Order Webhook] UTM data:', {has_utm_source: !!utmParams.utm_source, has_utm_term: !!utmParams.utm_term, has_fbclid: !!clickIDs.fbclid});

    const billingAddress = orderData.billing_address || {};
    const shippingAddress = orderData.shipping_address || {};
    const discountCodes = (orderData.discount_codes || []).map((dc: any) => dc.code);

    let customerData = orderData.customer;
    const hasIncompleteCustomer = orderData.customer?.id &&
      (!orderData.customer?.first_name || !orderData.customer?.last_name || !orderData.customer?.email);

    if (hasIncompleteCustomer) {
      console.log('[Order Webhook] Customer data incomplete, fetching from API...');
      try {
        const { data: installationForToken } = await supabase
          .from('shopify_installations')
          .select('access_token')
          .eq('user_id', userId)
          .eq('status', 'installed')
          .maybeSingle();

        if (installationForToken?.access_token) {
          const result = await shopifyGraphQL(
            shop,
            installationForToken.access_token,
            QUERIES.GET_CUSTOMER,
            { id: `gid://shopify/Customer/${orderData.customer.id}` }
          );

          if (result?.customer) {
            customerData = {
              id: orderData.customer.id,
              email: result.customer.email,
              first_name: result.customer.firstName,
              last_name: result.customer.lastName,
              phone: result.customer.phone
            };
            console.log('[Order Webhook GraphQL] Customer data fetched:', {
              first_name: customerData.first_name,
              last_name: customerData.last_name,
              email: customerData.email
            });
          }
        }
      } catch (error) {
        console.warn('[Order Webhook] Failed to fetch customer details:', error);
      }
    }

    const customerEmail = orderData.email || customerData?.email;
    let isRepeatCustomer = false;
    let orderCount = 1;

    if (customerEmail) {
      const { data: existingOrders } = await supabase.from('shopify_orders').select('id').eq('user_id', userId).eq('customer_email', customerEmail);
      if (existingOrders && existingOrders.length > 0) {
        isRepeatCustomer = true;
        orderCount = existingOrders.length + 1;
      }
    }

    console.log('[Order Webhook] Customer data:', {
      has_customer_object: !!customerData,
      customer_first_name: customerData?.first_name,
      customer_last_name: customerData?.last_name,
      customer_email: customerData?.email || orderData.email,
      shipping_first_name: shippingAddress.first_name,
      shipping_last_name: shippingAddress.last_name
    });

    const { data: storedOrder, error: orderError } = await supabase.from('shopify_orders').upsert({
      user_id: userId,
      shopify_order_id: orderData.id.toString(),
      order_number: orderData.name || orderData.order_number,
      total_price: parseFloat(orderData.total_price || orderData.current_total_price || '0'),
      currency: orderData.currency || 'USD',
      customer_email: customerEmail,
      customer_first_name: customerData?.first_name || shippingAddress.first_name || billingAddress.first_name || null,
      customer_last_name: customerData?.last_name || shippingAddress.last_name || billingAddress.last_name || null,
      customer_phone: customerData?.phone || shippingAddress.phone || billingAddress.phone || orderData.phone || null,
      shipping_address_line1: shippingAddress.address1 || null,
      shipping_address_line2: shippingAddress.address2 || null,
      shipping_city: shippingAddress.city || null,
      shipping_state: shippingAddress.province || shippingAddress.province_code || null,
      shipping_zip: shippingAddress.zip || null,
      shipping_country: shippingAddress.country || shippingAddress.country_code || null,
      billing_address_line1: billingAddress.address1 || null,
      billing_address_line2: billingAddress.address2 || null,
      billing_city: billingAddress.city || null,
      billing_state: billingAddress.province || billingAddress.province_code || null,
      billing_zip: billingAddress.zip || null,
      billing_country: billingAddress.country || billingAddress.country_code || null,
      subtotal_price: parseFloat(orderData.subtotal_price || '0'),
      total_tax: parseFloat(orderData.total_tax || '0'),
      total_shipping: parseFloat(orderData.total_shipping_price_set?.shop_money?.amount || orderData.shipping_lines?.[0]?.price || '0'),
      total_discounts: parseFloat(orderData.total_discounts || '0'),
      discount_codes: discountCodes,
      note: orderData.note || null,
      tags: orderData.tags || null,
      financial_status: orderData.financial_status || null,
      fulfillment_status: orderData.fulfillment_status || null,
      order_status_url: orderData.order_status_url || null,
      is_repeat_customer: isRepeatCustomer,
      order_count: orderCount,
      cancelled_at: orderData.cancelled_at || null,
      cancel_reason: orderData.cancel_reason || null,
      processed_at: orderData.processed_at || null,
      landing_site: landingSite,
      referring_site: referringSite,
      ordered_at: orderData.created_at || new Date().toISOString(),
      fulfillment_created_at: orderData.fulfillments?.[0]?.created_at || null,
      fulfillment_updated_at: orderData.fulfillments?.[0]?.updated_at || null,
      tracking_number: orderData.fulfillments?.[0]?.tracking_number || null,
      tracking_company: orderData.fulfillments?.[0]?.tracking_company || null,
      ...utmParams,
      ...clickIDs
    }, {onConflict: 'user_id,shopify_order_id', ignoreDuplicates: false}).select('id').single();
    if (orderError) {
      console.error('[Order Webhook] Error storing order:', orderError);
      throw new Error(`Failed to store order: ${orderError.message}`);
    }
    console.log('[Order Webhook] Order stored:', storedOrder.id);

    const responsePromise = new Response(
      JSON.stringify({success: true, message: 'Order received', order_id: storedOrder.id, timestamp: new Date().toISOString()}),
      {status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );

    const backgroundProcessing = (async () => {
      try {
        await processOrderCOGS(supabase, userId, orderData, storedOrder.id);

        console.log('[Order Webhook] Attempting to send CAPI purchase event...');
        const capiOrderData = {
          id: storedOrder.id,
          shopify_order_id: orderData.id.toString(),
          order_number: orderData.name || orderData.order_number,
          total_price: parseFloat(orderData.total_price || orderData.current_total_price || '0'),
          currency: orderData.currency || 'USD',
          customer_email: customerEmail,
          customer_phone: customerData?.phone || shippingAddress.phone || billingAddress.phone || orderData.phone,
          customer_first_name: customerData?.first_name || shippingAddress.first_name || billingAddress.first_name,
          customer_last_name: customerData?.last_name || shippingAddress.last_name || billingAddress.last_name,
          shipping_city: shippingAddress.city,
          shipping_province: shippingAddress.province || shippingAddress.province_code,
          shipping_zip: shippingAddress.zip,
          shipping_country: shippingAddress.country || shippingAddress.country_code,
          landing_site: landingSite,
          referring_site: referringSite,
          ordered_at: orderData.created_at || new Date().toISOString(),
          fbclid: clickIDs.fbclid,
          line_items: orderData.line_items,
        };

        const capiResult = await sendPurchaseEvent(supabase, userId, capiOrderData, storedOrder.id);
        if (capiResult.sent) {
          console.log('[Order Webhook] CAPI purchase event sent successfully');
        } else if (capiResult.error === 'CAPI not configured') {
          console.log('[Order Webhook] CAPI not configured for user, skipping');
        } else {
          console.warn('[Order Webhook] CAPI event failed:', capiResult.error);
        }

        if (orderData.fulfillments?.[0]?.created_at) {
          console.log('[Order Webhook] Calculating expected delivery date...');
          const { data: lineItems } = await supabase
            .from('shopify_line_items')
            .select('quote_id')
            .eq('order_id', storedOrder.id)
            .not('quote_id', 'is', null)
            .limit(1);

          let shippingTimeframeMax = 7;
          if (lineItems && lineItems.length > 0 && lineItems[0].quote_id) {
            const { data: quote } = await supabase
              .from('product_quotes')
              .select('shipping_timeframe_max')
              .eq('id', lineItems[0].quote_id)
              .maybeSingle();

            if (quote?.shipping_timeframe_max) {
              shippingTimeframeMax = quote.shipping_timeframe_max;
            }
          }

          const fulfillmentDate = new Date(orderData.fulfillments[0].created_at);
          const expectedDeliveryDate = addBusinessDays(fulfillmentDate, shippingTimeframeMax);

          await supabase
            .from('shopify_orders')
            .update({ expected_delivery_date: expectedDeliveryDate.toISOString().split('T')[0] })
            .eq('id', storedOrder.id);

          console.log('[Order Webhook] Expected delivery date set:', expectedDeliveryDate.toISOString().split('T')[0]);
        }

        if (utmParams.utm_source && utmParams.utm_term) {
          console.log('[Order Webhook] Attempting to match order to ads...');
          const { data: matchingAds } = await supabase.from('ads').select(`id,platform_ad_id,name,ad_sets!inner(campaign_id,ad_campaigns!inner(ad_account_id,ad_accounts!inner(user_id)))`).eq('ad_sets.ad_campaigns.ad_accounts.user_id', userId);
          if (matchingAds && matchingAds.length > 0) {
            const utmTerm = utmParams.utm_term.toLowerCase().trim();
            let matchedAd = matchingAds.find(ad => ad.platform_ad_id === utmParams.utm_term);
            let confidenceScore = matchedAd ? 1.0 : 0;
            let attributionMethod = 'utm_match';
            if (!matchedAd) {
              matchedAd = matchingAds.find(ad => ad.name.toLowerCase().trim() === utmTerm);
              if (matchedAd) { confidenceScore = 0.95; attributionMethod = 'ad_name_match'; }
            }
            if (!matchedAd) {
              matchedAd = matchingAds.find(ad => ad.name.toLowerCase().includes(utmTerm));
              if (matchedAd) { confidenceScore = 0.8; attributionMethod = 'ad_name_match'; }
            }
            if (matchedAd) {
              console.log('[Order Webhook] Matched to ad:', matchedAd.name);
              const { error: conversionError } = await supabase.from('ad_conversions').upsert({user_id: userId, ad_id: matchedAd.id, order_id: storedOrder.id, platform: utmParams.utm_source, conversion_value: parseFloat(orderData.total_price || orderData.current_total_price || '0'), attribution_method: attributionMethod, confidence_score: confidenceScore, converted_at: orderData.created_at || new Date().toISOString()}, {onConflict: 'order_id,ad_id', ignoreDuplicates: true});
              if (conversionError) { console.error('[Order Webhook] Error creating conversion:', conversionError); }
              else { console.log('[Order Webhook] Conversion recorded'); }
            } else { console.log('[Order Webhook] No matching ad found for utm_term:', utmTerm); }
          }
        }

        // Update rolling 30-day order count for subscription limit enforcement
        console.log('[Order Webhook] Updating order count for subscription check...');
        try {
          const { error: updateCountError } = await supabase.rpc('update_store_order_count', {
            store_id_param: userId,
          });

          if (updateCountError) {
            console.error('[Order Webhook] Error updating order count:', updateCountError);
          } else {
            console.log('[Order Webhook] Order count updated successfully');

            // Check if user is approaching or exceeding limits
            const { data: storeData } = await supabase
              .from('shopify_stores')
              .select('monthly_order_count, current_tier, subscription_status')
              .eq('id', userId)
              .maybeSingle();

            if (storeData && storeData.subscription_status === 'ACTIVE') {
              const tierLimits: Record<string, number> = {
                startup: 100,
                momentum: 300,
                scale: 1000,
                enterprise: Infinity,
              };

              const limit = tierLimits[storeData.current_tier || 'startup'] || 100;
              const percentage = (storeData.monthly_order_count / limit) * 100;

              // Send notification if at 80% or 95%
              if (percentage >= 80 && storeData.current_tier !== 'enterprise') {
                const isUrgent = percentage >= 95;
                const isBlocked = percentage >= 100;

                const notificationType = isBlocked ? 'tier_limit_blocked' :
                                        isUrgent ? 'tier_limit_urgent' :
                                        'tier_limit_warning';

                await supabase.from('notifications').insert({
                  user_id: userId,
                  type: notificationType,
                  title: isBlocked ? 'Order Limit Exceeded' :
                         isUrgent ? 'Action Required: Order Limit Reached' :
                         'Approaching Order Limit',
                  message: isBlocked
                    ? `You've exceeded your ${storeData.current_tier} plan's order limit. Upgrade now to continue processing orders.`
                    : isUrgent
                    ? `You've used ${Math.round(percentage)}% of your ${storeData.current_tier} plan's order limit. Upgrade now to continue using all features.`
                    : `You've used ${Math.round(percentage)}% of your ${storeData.current_tier} plan's order limit. Consider upgrading to avoid interruption.`,
                  metadata: {
                    current_tier: storeData.current_tier,
                    order_count: storeData.monthly_order_count,
                    order_limit: limit,
                    utilization_percentage: Math.round(percentage),
                  },
                });

                console.log(`[Order Webhook] ${notificationType} notification created`);
              }
            }
          }
        } catch (countError) {
          console.error('[Order Webhook] Error in order count update:', countError);
        }

        console.log('[Order Webhook] Background processing completed');
      } catch (bgError) { console.error('[Order Webhook] Background processing error:', bgError); }
    })();

    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) { EdgeRuntime.waitUntil(backgroundProcessing); }
    return responsePromise;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Order Webhook] Error:', errorMessage);
    return new Response(JSON.stringify({error: errorMessage, timestamp: new Date().toISOString()}), {status: 500, headers: {...corsHeaders, 'Content-Type': 'application/json'}});
  }
});