import { Router } from 'express';
import { validateWebhookHmac } from '../lib/shopify/validation';
import { createSupabaseClient } from '../db/client';

const router = Router();
const supabase = createSupabaseClient();

// Customer Data Request endpoint
router.post('/customers/data_request', async (req, res) => {
  try {
    const hmac = req.headers['x-shopify-hmac-sha256'] as string;
    const valid = validateWebhookHmac(
      hmac,
      JSON.stringify(req.body),
      process.env.VITE_SHOPIFY_WEBHOOK_SECRET || ''
    );

    if (!valid) {
      return res.status(401).json({ message: 'Invalid HMAC' });
    }

    const { shop_domain, customer } = req.body;

    // Fetch customer data from your database
    const { data: customerData, error } = await supabase
      .from('shopify_customer_insights')
      .select('*')
      .eq('shopify_store_id', shop_domain)
      .eq('customer_id', customer.id)
      .single();

    if (error) {
      throw error;
    }

    // Return customer data in a structured format
    res.json({
      customer: {
        id: customer.id,
        insights: customerData || {},
        orders: [], // Add order history if tracked
        preferences: {} // Add any stored preferences
      }
    });
  } catch (error) {
    console.error('Error processing customer data request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Customer Data Erasure endpoint
router.post('/customers/data_erasure', async (req, res) => {
  try {
    const hmac = req.headers['x-shopify-hmac-sha256'] as string;
    const valid = validateWebhookHmac(
      hmac,
      JSON.stringify(req.body),
      process.env.VITE_SHOPIFY_WEBHOOK_SECRET || ''
    );

    if (!valid) {
      return res.status(401).json({ message: 'Invalid HMAC' });
    }

    const { shop_domain, customer } = req.body;

    // Delete customer data from all relevant tables
    const tables = [
      'shopify_customer_insights',
      'shopify_orders',
      'chat_participants',
      'messages'
    ];

    for (const table of tables) {
      await supabase
        .from(table)
        .delete()
        .eq('customer_id', customer.id);
    }

    res.json({ message: 'Customer data deleted successfully' });
  } catch (error) {
    console.error('Error processing customer data erasure:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Shop Data Erasure endpoint
router.post('/shop/data_erasure', async (req, res) => {
  try {
    const hmac = req.headers['x-shopify-hmac-sha256'] as string;
    const valid = validateWebhookHmac(
      hmac,
      JSON.stringify(req.body),
      process.env.VITE_SHOPIFY_WEBHOOK_SECRET || ''
    );

    if (!valid) {
      return res.status(401).json({ message: 'Invalid HMAC' });
    }

    const { shop_domain } = req.body;

    // Delete all shop-related data from all relevant tables
    const tables = [
      'shopify_stores',
      'shopify_products',
      'shopify_orders',
      'shopify_customer_insights',
      'shopify_inventory_snapshots',
      'shopify_financial_metrics',
      'shopify_price_rules',
      'shopify_sync_logs',
      'shopify_performance_logs'
    ];

    for (const table of tables) {
      await supabase
        .from(table)
        .delete()
        .eq('shopify_store_id', shop_domain);
    }

    res.json({ message: 'Shop data deleted successfully' });
  } catch (error) {
    console.error('Error processing shop data erasure:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export { router as gdprRouter };