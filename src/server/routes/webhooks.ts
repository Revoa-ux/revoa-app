import { Router } from 'express';
import { createHmac } from 'crypto';
import { createSupabaseClient } from '../db/client';
import { ShopifyService } from '../services/shopify';
import { ShopifyAnalyticsService } from '../services/shopifyAnalytics';

const router = Router();
const supabase = createSupabaseClient();

// Verify webhook signature
const verifyWebhook = (data: string, hmac: string, secret: string): boolean => {
  const calculated = createHmac('sha256', secret)
    .update(Buffer.from(data), 'utf8')
    .digest('base64');
  return hmac === calculated;
};

// Generic webhook handler
router.post('/:topic', async (req, res) => {
  try {
    const hmac = req.headers['x-shopify-hmac-sha256'] as string;
    const topic = req.params.topic;
    const shop = req.headers['x-shopify-shop-domain'] as string;

    if (!hmac || !topic || !shop) {
      return res.status(401).json({ error: 'Missing required headers' });
    }

    // Verify webhook signature
    const rawBody = JSON.stringify(req.body);
    const isValid = verifyWebhook(
      rawBody,
      hmac,
      process.env.VITE_SHOPIFY_WEBHOOK_SECRET || ''
    );

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    // Get shop installation
    const { data: installation } = await supabase
      .from('shopify_installations')
      .select('*')
      .eq('store_url', shop)
      .single();

    if (!installation) {
      return res.status(404).json({ error: 'Shop installation not found' });
    }

    const shopify = new ShopifyService(supabase, {
      shopifyUrl: shop,
      accessToken: installation.access_token
    });

    const analytics = new ShopifyAnalyticsService(supabase, shopify);

    // Log webhook
    await supabase
      .from('shopify_sync_logs')
      .insert({
        store_id: installation.id,
        event_type: topic,
        status: 'received',
        details: {
          topic,
          shop,
          data: req.body,
          received_at: new Date().toISOString()
        }
      });

    // Process webhook based on topic
    switch (topic) {
      case 'products/create':
      case 'products/update':
        await handleProductWebhook(req.body, shop, shopify);
        break;

      case 'orders/create':
      case 'orders/paid':
      case 'orders/fulfilled':
        await handleOrderWebhook(req.body, shop, shopify, analytics);
        break;

      case 'customers/create':
      case 'customers/update':
        await handleCustomerWebhook(req.body, shop, shopify, analytics);
        break;

      case 'inventory_items/update':
        await handleInventoryWebhook(req.body, shop, shopify);
        break;

      case 'app/uninstalled':
        await handleUninstallWebhook(shop);
        break;

      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }

    // Log success
    await supabase
      .from('shopify_sync_logs')
      .insert({
        store_id: installation.id,
        event_type: topic,
        status: 'success',
        details: {
          topic,
          shop,
          processed_at: new Date().toISOString()
        }
      });

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);

    // Log error
    if (req.params.topic && req.headers['x-shopify-shop-domain']) {
      await supabase
        .from('shopify_sync_logs')
        .insert({
          store_id: req.headers['x-shopify-shop-domain'],
          event_type: req.params.topic,
          status: 'error',
          details: {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }
        });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Webhook processing failed'
    });
  }
});

// Webhook handlers
const handleProductWebhook = async (
  data: any,
  shop: string,
  shopify: ShopifyService
) => {
  const { id, variants, status } = data;
  
  // Update product in database
  await supabase
    .from('shopify_products')
    .upsert({
      shopify_product_id: id,
      shopify_store_id: shop,
      title: data.title,
      status,
      sync_status: 'synced',
      metadata: data
    });

  // Update inventory levels
  for (const variant of variants) {
    await supabase
      .from('shopify_inventory_snapshots')
      .insert({
        shopify_store_id: shop,
        shopify_product_id: id,
        quantity: variant.inventory_quantity,
        available_quantity: variant.inventory_quantity,
        committed_quantity: 0,
        inventory_value: variant.price * variant.inventory_quantity,
        snapshot_date: new Date().toISOString().split('T')[0]
      });
  }
};

const handleOrderWebhook = async (
  data: any,
  shop: string,
  shopify: ShopifyService,
  analytics: ShopifyAnalyticsService
) => {
  const { id, financial_status, fulfillment_status, total_price, customer } = data;
  
  // Update order in database
  await supabase
    .from('shopify_orders')
    .upsert({
      shopify_order_id: id,
      shopify_store_id: shop,
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

  // Calculate profit metrics
  await analytics.calculateProfitMetrics(id);

  // Update customer insights if customer exists
  if (customer?.id) {
    await analytics.updateCustomerInsights(shop, customer.id);
  }
};

const handleCustomerWebhook = async (
  data: any,
  shop: string,
  shopify: ShopifyService,
  analytics: ShopifyAnalyticsService
) => {
  // Update customer insights
  await analytics.updateCustomerInsights(shop, data.id);

  // Store in Supabase
  await supabase
    .from('shopify_customer_insights')
    .upsert({
      shopify_store_id: shop,
      customer_id: data.id,
      total_orders: data.orders_count,
      total_spent: data.total_spent,
      average_order_value: data.orders_count > 0 
        ? data.total_spent / data.orders_count 
        : 0,
      first_order_date: data.first_order_date,
      last_order_date: data.last_order_date,
      metadata: data
    });
};

const handleInventoryWebhook = async (
  data: any,
  shop: string,
  shopify: ShopifyService
) => {
  const { inventory_item_id, available, updated_at } = data;

  // Get product ID from inventory item
  const product = await shopify.getProductByInventoryItem(inventory_item_id);

  // Update inventory snapshot
  await supabase
    .from('shopify_inventory_snapshots')
    .insert({
      shopify_store_id: shop,
      shopify_product_id: product.id,
      quantity: available,
      available_quantity: available,
      committed_quantity: 0,
      snapshot_date: new Date(updated_at).toISOString().split('T')[0]
    });
};

const handleUninstallWebhook = async (shop: string) => {
  // Update installation status
  await supabase
    .from('shopify_installations')
    .update({
      status: 'uninstalled',
      metadata: {
        uninstalled_at: new Date().toISOString()
      }
    })
    .eq('store_url', shop);

  // Log uninstall event
  await supabase
    .from('shopify_sync_logs')
    .insert({
      store_id: shop,
      event_type: 'app_uninstalled',
      status: 'success',
      details: {
        uninstalled_at: new Date().toISOString()
      }
    });
};

export { router as webhooksRouter };