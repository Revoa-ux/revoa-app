import { supabase } from './supabase';

/**
 * Template Variable Replacement Service
 *
 * Replaces template variables like {{variable_name}} with actual data
 * from orders, customers, products, and configuration.
 */

interface VariableContext {
  orderId?: string;
  userId?: string;
  threadId?: string;
  productIds?: string[];
}

interface VariableData {
  // Order variables
  order_number?: string;
  order_date?: string;
  order_total?: string;
  order_subtotal?: string;
  order_tax?: string;
  order_shipping?: string;
  order_currency?: string;
  fulfillment_status?: string;
  financial_status?: string;
  order_note?: string;
  ordered_at?: string;

  // Customer variables
  customer_first_name?: string;
  customer_last_name?: string;
  customer_full_name?: string;
  customer_email?: string;
  customer_phone?: string;

  // Address variables
  shipping_address_full?: string;
  shipping_address_line1?: string;
  shipping_address_line2?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_zip?: string;
  shipping_country?: string;
  billing_address_full?: string;
  billing_city?: string;
  billing_state?: string;
  billing_zip?: string;
  billing_country?: string;

  // Tracking variables
  tracking_number?: string;
  tracking_company?: string;
  tracking_url?: string;
  last_mile_tracking_number?: string;
  last_mile_carrier?: string;
  shipment_status?: string;

  // Delivery delay variables
  fulfillment_date?: string;
  expected_delivery_date?: string;
  delay_status?: string;
  days_past_expected?: string;
  business_days_elapsed?: string;
  estimated_timeframe?: string;
  delay_customer_message?: string;
  delay_admin_note?: string;

  // Merchant variables
  merchant_name?: string;
  merchant_store_name?: string;
  merchant_email?: string;
  merchant_company?: string;

  // Return/Policy variables
  restocking_fee?: string;
  return_warehouse_address?: string;
  carrier_name?: string;
  carrier_phone_number?: string;

  // Product policy variables (dynamic)
  product_damage_claim_deadline_days?: string;
  product_replacement_ship_time_days?: string;
  product_defect_coverage_days?: string;
  product_return_window_days?: string;
  product_factory_name?: string;
  product_warranty_period?: string;

  // Thread-specific
  warehouse_entry_number?: string;

  // Dynamic variables
  current_date?: string;
  current_time?: string;

  // Quote/Product variables
  product_name?: string;
  warranty_days?: string;
  warranty_expiry_date?: string;
  covers_damaged?: string;
  covers_lost?: string;
  order_items?: string;

  // Additional product variables
  [key: string]: string | undefined;
}

/**
 * Fetch all variable data from database based on context
 */
export async function fetchVariableData(context: VariableContext): Promise<VariableData> {
  const data: VariableData = {
    current_date: new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }),
    current_time: new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  };

  try {
    // Fetch order data if orderId provided
    if (context.orderId) {
      const { data: orderData, error: orderError } = await supabase
        .from('shopify_orders')
        .select(`
          order_number,
          total_price,
          subtotal_price,
          total_tax,
          total_shipping,
          currency,
          customer_first_name,
          customer_last_name,
          customer_email,
          customer_phone,
          shipping_address_line1,
          shipping_address_line2,
          shipping_city,
          shipping_state,
          shipping_zip,
          shipping_country,
          billing_address_line1,
          billing_address_line2,
          billing_city,
          billing_state,
          billing_zip,
          billing_country,
          fulfillment_status,
          financial_status,
          note,
          ordered_at,
          shopify_order_id,
          created_at
        `)
        .eq('id', context.orderId)
        .maybeSingle();

      if (orderData && !orderError) {
        // Order variables
        data.order_number = orderData.order_number;
        data.order_date = orderData.ordered_at
          ? new Date(orderData.ordered_at).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })
          : undefined;
        data.ordered_at = orderData.ordered_at
          ? new Date(orderData.ordered_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })
          : undefined;
        data.order_total = orderData.total_price
          ? `${orderData.currency || 'USD'} ${Number(orderData.total_price).toFixed(2)}`
          : undefined;
        data.order_subtotal = orderData.subtotal_price
          ? `${orderData.currency || 'USD'} ${Number(orderData.subtotal_price).toFixed(2)}`
          : undefined;
        data.order_tax = orderData.total_tax
          ? `${orderData.currency || 'USD'} ${Number(orderData.total_tax).toFixed(2)}`
          : undefined;
        data.order_shipping = orderData.total_shipping
          ? `${orderData.currency || 'USD'} ${Number(orderData.total_shipping).toFixed(2)}`
          : undefined;
        data.order_currency = orderData.currency;
        data.fulfillment_status = orderData.fulfillment_status || 'Pending';
        data.financial_status = orderData.financial_status || 'Pending';
        data.order_note = orderData.note || undefined;

        // Customer variables
        data.customer_first_name = orderData.customer_first_name || undefined;
        data.customer_last_name = orderData.customer_last_name || undefined;
        data.customer_full_name = [orderData.customer_first_name, orderData.customer_last_name]
          .filter(Boolean)
          .join(' ') || undefined;
        data.customer_email = orderData.customer_email || undefined;
        data.customer_phone = orderData.customer_phone || undefined;

        // Address variables
        data.shipping_address_line1 = orderData.shipping_address_line1 || undefined;
        data.shipping_address_line2 = orderData.shipping_address_line2 || undefined;
        data.shipping_city = orderData.shipping_city || undefined;
        data.shipping_state = orderData.shipping_state || undefined;
        data.shipping_zip = orderData.shipping_zip || undefined;
        data.shipping_country = orderData.shipping_country || undefined;

        // Build full shipping address
        const shippingParts = [
          orderData.shipping_address_line1,
          orderData.shipping_address_line2,
          [orderData.shipping_city, orderData.shipping_state].filter(Boolean).join(', '),
          orderData.shipping_zip,
          orderData.shipping_country
        ].filter(Boolean);
        data.shipping_address_full = shippingParts.length > 0 ? shippingParts.join(', ') : undefined;

        data.billing_city = orderData.billing_city || undefined;
        data.billing_state = orderData.billing_state || undefined;
        data.billing_zip = orderData.billing_zip || undefined;
        data.billing_country = orderData.billing_country || undefined;

        // Build full billing address
        const billingParts = [
          orderData.billing_address_line1,
          orderData.billing_address_line2,
          [orderData.billing_city, orderData.billing_state].filter(Boolean).join(', '),
          orderData.billing_zip,
          orderData.billing_country
        ].filter(Boolean);
        data.billing_address_full = billingParts.length > 0 ? billingParts.join(', ') : undefined;

        // Fetch tracking/fulfillment data
        const { data: fulfillmentData } = await supabase
          .from('shopify_order_fulfillments')
          .select('*')
          .eq('order_id', context.orderId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fulfillmentData) {
          data.tracking_number = fulfillmentData.tracking_number || undefined;
          data.tracking_company = fulfillmentData.tracking_company || undefined;
          data.tracking_url = fulfillmentData.tracking_url || undefined;
          data.last_mile_tracking_number = fulfillmentData.last_mile_tracking_number || undefined;
          data.last_mile_carrier = fulfillmentData.last_mile_carrier || undefined;
          data.shipment_status = fulfillmentData.shipment_status || undefined;
        }

        // Fetch delay analysis data if order has fulfillment info
        const { data: delayOrderData } = await supabase
          .from('shopify_orders')
          .select('fulfillment_created_at, expected_delivery_date, tracking_number, tracking_company')
          .eq('id', context.orderId)
          .maybeSingle();

        if (delayOrderData?.fulfillment_created_at) {
          const { analyzeOrderDelay } = await import('./packageDelayDetectionService');
          const delayAnalysis = await analyzeOrderDelay(context.orderId);

          if (delayAnalysis) {
            data.fulfillment_date = new Date(delayOrderData.fulfillment_created_at).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            });
            data.expected_delivery_date = delayAnalysis.expectedDeliveryDate
              ? new Date(delayAnalysis.expectedDeliveryDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })
              : undefined;
            data.delay_status = delayAnalysis.status;
            data.days_past_expected = delayAnalysis.daysPastExpected > 0
              ? delayAnalysis.daysPastExpected.toString()
              : undefined;
            data.business_days_elapsed = delayAnalysis.businessDaysElapsed.toString();
            data.estimated_timeframe = delayAnalysis.estimatedTimeframe;
            data.delay_customer_message = delayAnalysis.customerMessage;
            data.delay_admin_note = delayAnalysis.internalNote;
          }
        }

        // Fetch product IDs from order line items if not provided
        if (!context.productIds || context.productIds.length === 0) {
          const { data: lineItems } = await supabase
            .from('order_line_items')
            .select('product_id')
            .eq('shopify_order_id', orderData.shopify_order_id);

          if (lineItems && lineItems.length > 0) {
            context.productIds = lineItems
              .map(item => item.product_id)
              .filter(Boolean) as string[];
          }
        }
      }
    }

    // Fetch product policy variables if productIds provided
    if (context.productIds && context.productIds.length > 0) {
      const { data: policyVars } = await supabase
        .from('product_policy_variables')
        .select('variable_key, variable_value')
        .in('product_id', context.productIds);

      if (policyVars && policyVars.length > 0) {
        // Use first product's variables (or we could aggregate)
        policyVars.forEach(varItem => {
          data[varItem.variable_key] = varItem.variable_value;
        });
      }

      // Fetch factory config
      const { data: factoryConfig } = await supabase
        .from('product_factory_configs')
        .select('factory_name, contact_name, contact_email, contact_phone')
        .in('product_id', context.productIds)
        .limit(1)
        .maybeSingle();

      if (factoryConfig) {
        data.product_factory_name = factoryConfig.factory_name || undefined;
      }
    }

    // Fetch merchant/user data if userId provided
    if (context.userId) {
      const { data: userData } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, company, email')
        .eq('user_id', context.userId)
        .maybeSingle();

      if (userData) {
        data.merchant_name = userData.first_name && userData.last_name
          ? `${userData.first_name} ${userData.last_name}`
          : userData.company || undefined;
        data.merchant_store_name = userData.company || undefined;
        data.merchant_email = userData.email || undefined;
        data.merchant_company = userData.company || undefined;
      }

      // Fetch store configuration for return/policy variables
      const { data: storeConfig } = await supabase
        .from('user_store_configurations')
        .select('restocking_fee_type, restocking_fee_percent, restocking_fee_fixed, return_warehouse_address, carrier_name, carrier_phone_number')
        .eq('user_id', context.userId)
        .maybeSingle();

      if (storeConfig) {
        // Format restocking fee based on type
        if (storeConfig.restocking_fee_type === 'percentage' && storeConfig.restocking_fee_percent) {
          data.restocking_fee = `${storeConfig.restocking_fee_percent}%`;
        } else if (storeConfig.restocking_fee_type === 'fixed' && storeConfig.restocking_fee_fixed) {
          data.restocking_fee = `$${Number(storeConfig.restocking_fee_fixed).toFixed(2)}`;
        } else {
          data.restocking_fee = 'no restocking fee';
        }

        data.return_warehouse_address = storeConfig.return_warehouse_address ||
          '5130 E. Santa Ana Street, Ontario, CA 91761';
        data.carrier_name = storeConfig.carrier_name || 'the carrier';
        data.carrier_phone_number = storeConfig.carrier_phone_number || 'their customer service number';
      } else {
        // Defaults if no config exists
        data.restocking_fee = 'no restocking fee';
        data.return_warehouse_address = '5130 E. Santa Ana Street, Ontario, CA 91761';
        data.carrier_name = 'the carrier';
        data.carrier_phone_number = 'their customer service number';
      }
    }

    // Fetch thread-specific data if threadId provided
    if (context.threadId) {
      const { data: threadData } = await supabase
        .from('chat_threads')
        .select('warehouse_entry_number, order_id')
        .eq('id', context.threadId)
        .maybeSingle();

      if (threadData) {
        data.warehouse_entry_number = threadData.warehouse_entry_number || undefined;

        // If thread has order, fetch order items and quote data
        if (threadData.order_id) {
          // Fetch order line items
          const { data: lineItems } = await supabase
            .from('order_line_items')
            .select('product_name, variant_name, quantity, unit_price, product_id')
            .eq('order_id', threadData.order_id);

          if (lineItems && lineItems.length > 0) {
            // Format order items as bulleted list
            const itemsList = lineItems.map(item => {
              const name = item.variant_name
                ? `${item.product_name} - ${item.variant_name}`
                : item.product_name;
              return `- ${name} (Quantity: ${item.quantity})`;
            }).join('\n');
            data.order_items = itemsList;

            // Get first product for quote data
            const firstProductId = lineItems[0].product_id;
            if (firstProductId) {
              const { data: quoteData } = await supabase
                .from('product_quotes')
                .select('product_name, warranty_days, covers_damaged_items, covers_lost_items')
                .eq('id', firstProductId)
                .maybeSingle();

              if (quoteData) {
                data.product_name = quoteData.product_name;
                data.warranty_days = quoteData.warranty_days?.toString() || '90';
                data.covers_damaged = quoteData.covers_damaged_items ? 'Yes' : 'No';
                data.covers_lost = quoteData.covers_lost_items ? 'Yes' : 'No';

                // Calculate warranty expiry date (from order date + warranty days)
                if (data.order_date && quoteData.warranty_days) {
                  const orderDate = new Date(data.order_date);
                  const expiryDate = new Date(orderDate);
                  expiryDate.setDate(expiryDate.getDate() + quoteData.warranty_days);
                  data.warranty_expiry_date = expiryDate.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  });
                }
              }
            }
          }
        }
      }
    }

  } catch (error) {
    console.error('Error fetching variable data:', error);
  }

  return data;
}

export const VARIABLE_FALLBACKS: Record<string, string> = {
  'product_damage_claim_deadline_days': '30 days',
  'product_replacement_ship_time_days': '7-14 business days',
  'product_defect_coverage_days': '90 days',
  'product_return_window_days': '30 days',
  'last_mile_carrier': 'your local postal service',
  'product_factory_name': 'our partner factory',
  'tracking_number': 'not yet available',
  'tracking_company': 'carrier',
  'warehouse_entry_number': 'to be provided',
  'customer_first_name': 'Customer',
  'customer_full_name': 'Customer',
  'product_name': 'your product',
  'warranty_days': '90',
  'covers_damaged': 'Yes',
  'covers_lost': 'No',
  'order_items': 'your order items',
  'shipping_address_full': 'your shipping address',
  'estimated_delivery': '7-10 business days',
  'merchant_name': 'Our Team',
  'merchant_store_name': 'Our Store',
  'restocking_fee': 'no restocking fee',
  'return_warehouse_address': '5130 E. Santa Ana Street, Ontario, CA 91761',
  'carrier_name': 'the carrier',
  'carrier_phone_number': 'their customer service number',
  'tracking_status': 'tracking status pending',
  'order_status_url': 'your order status page',
  'shipped_date': 'your ship date',
  'fulfillment_date': 'shipment date',
  'expected_delivery_date': 'estimated delivery date',
  'delay_status': 'on time',
  'days_past_expected': '0',
  'business_days_elapsed': '0',
  'estimated_timeframe': '4-7 business days',
  'delay_customer_message': 'Your package is on its way',
  'delay_admin_note': 'No delay information available'
};

export const VARIABLE_DISPLAY_NAMES: Record<string, string> = {
  'tracking_number': 'Tracking Number',
  'tracking_url': 'Tracking URL',
  'tracking_company': 'Tracking Company',
  'order_status_url': 'Order Status Page',
  'shipped_date': 'Ship Date',
  'tracking_status': 'Tracking Status',
  'warehouse_entry_number': 'Warehouse Entry Number',
  'customer_first_name': 'Customer First Name',
  'customer_full_name': 'Customer Name',
  'shipping_address_full': 'Shipping Address',
  'merchant_name': 'Merchant Name',
  'merchant_store_name': 'Store Name',
  'product_name': 'Product Name',
  'order_items': 'Order Items',
  'carrier_name': 'Carrier Name',
  'carrier_phone_number': 'Carrier Phone',
  'last_mile_carrier': 'Last Mile Carrier',
  'product_factory_name': 'Factory Name',
  'estimated_delivery': 'Estimated Delivery',
  'fulfillment_date': 'Fulfillment Date',
  'expected_delivery_date': 'Expected Delivery Date',
  'delay_status': 'Delay Status',
  'days_past_expected': 'Days Past Expected',
  'business_days_elapsed': 'Business Days Since Shipment',
  'estimated_timeframe': 'Estimated Timeframe',
  'delay_customer_message': 'Delay Customer Message',
  'delay_admin_note': 'Delay Admin Note'
};

export interface ReplaceVariablesResult {
  content: string;
  fallbackVariables: string[];
  unresolvedVariables: string[];
}

/**
 * Replace all {{variable}} placeholders in content with actual data
 */
export function replaceVariables(content: string, data: VariableData): string {
  const result = replaceVariablesWithTracking(content, data);
  return result.content;
}

/**
 * Replace variables and track which ones used fallbacks or remain unresolved
 */
export function replaceVariablesWithTracking(content: string, data: VariableData): ReplaceVariablesResult {
  let result = content;
  const fallbackVariables: string[] = [];
  const unresolvedVariables: string[] = [];

  const variablePattern = /\{\{([a-zA-Z0-9_]+)\}\}/g;

  result = result.replace(variablePattern, (match, variableName) => {
    const value = data[variableName];

    if (value !== undefined && value !== null && value !== '') {
      return value;
    }

    const fallback = VARIABLE_FALLBACKS[variableName];
    if (fallback) {
      fallbackVariables.push(variableName);
      return fallback;
    }

    unresolvedVariables.push(variableName);
    return match;
  });

  return {
    content: result,
    fallbackVariables,
    unresolvedVariables
  };
}

/**
 * Main function: Fetch data and replace variables in content
 */
export async function renderTemplate(
  content: string,
  context: VariableContext
): Promise<string> {
  const variableData = await fetchVariableData(context);
  return replaceVariables(content, variableData);
}
