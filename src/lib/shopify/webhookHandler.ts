import { supabase } from '../supabase';

// Server-side webhook handler
export const handleWebhookEvent = async (
  topic: string,
  data: any,
  shopifyDomain: string
) => {
  try {
    // Log webhook event
    await supabase.from('shopify_sync_logs').insert({
      shopify_store_id: shopifyDomain,
      event_type: topic,
      status: 'success',
      details: data
    });

    // Handle specific webhook topics
    switch (topic) {
      case 'products/create':
      case 'products/update':
        await handleProductWebhook(data, shopifyDomain);
        break;
      case 'orders/create':
      case 'orders/paid':
        await handleOrderWebhook(data, shopifyDomain);
        break;
      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }
  } catch (error) {
    console.error(`Error handling ${topic} webhook:`, error);
    
    // Log error
    await supabase.from('shopify_sync_logs').insert({
      shopify_store_id: shopifyDomain,
      event_type: topic,
      status: 'error',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        data
      }
    });
    
    throw error;
  }
};

const handleProductWebhook = async (data: any, shopifyDomain: string) => {
  const { id, variants, status } = data;
  
  // Update product in database
  await supabase.from('shopify_products').upsert({
    shopify_product_id: id,
    shopify_store_id: shopifyDomain,
    status,
    sync_status: 'synced',
    metadata: data
  });

  // Update inventory levels
  for (const variant of variants) {
    await supabase.from('shopify_inventory_snapshots').insert({
      shopify_store_id: shopifyDomain,
      shopify_product_id: id,
      quantity: variant.inventory_quantity,
      available_quantity: variant.inventory_quantity,
      committed_quantity: 0,
      inventory_value: variant.price * variant.inventory_quantity,
      snapshot_date: new Date().toISOString().split('T')[0]
    });
  }
};

const handleOrderWebhook = async (data: any, shopifyDomain: string) => {
  const { id, financial_status, fulfillment_status, total_price, customer } = data;
  
  // Update order in database
  await supabase.from('shopify_orders').upsert({
    shopify_store_id: shopifyDomain,
    shopify_order_id: id,
    order_number: data.order_number,
    total_price,
    subtotal_price: data.subtotal_price,
    total_tax: data.total_tax,
    total_shipping: data.total_shipping_price,
    total_discounts: data.total_discounts,
    status: financial_status,
    fulfillment_status,
    payment_status: financial_status,
    customer_data: customer,
    line_items: data.line_items,
    metadata: data
  });
};