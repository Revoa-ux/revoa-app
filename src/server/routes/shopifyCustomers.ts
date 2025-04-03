import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { rateLimit } from '../middleware/rateLimit';
import { createSupabaseClient } from '../db/client';
import { ShopifyService } from '../services/shopify';
import { ShopifyAnalyticsService } from '../services/shopifyAnalytics';

const router = Router();
const supabase = createSupabaseClient();

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Get customers
router.get(
  '/',
  limiter,
  [
    query('limit').optional().isInt({ min: 1, max: 250 }),
    query('since_id').optional().isString(),
    query('created_at_min').optional().isISO8601(),
    query('created_at_max').optional().isISO8601(),
    query('updated_at_min').optional().isISO8601(),
    query('updated_at_max').optional().isISO8601(),
    query('query').optional().isString()
  ],
  validate,
  async (req, res) => {
    try {
      const shop = req.headers['x-shopify-shop-domain'] as string;
      const accessToken = req.headers['x-shopify-access-token'] as string;

      if (!shop || !accessToken) {
        return res.status(401).json({ error: 'Missing shop or access token' });
      }

      const shopify = new ShopifyService(supabase, {
        shopifyUrl: shop,
        accessToken
      });

      const customers = await shopify.getCustomers(req.query);

      // Store customers in Supabase for syncing
      const { error: syncError } = await supabase
        .from('shopify_customer_insights')
        .upsert(
          customers.map(customer => ({
            shopify_store_id: shop,
            customer_id: customer.id,
            total_orders: customer.orders_count,
            total_spent: customer.total_spent,
            average_order_value: customer.orders_count > 0 
              ? customer.total_spent / customer.orders_count 
              : 0,
            first_order_date: customer.first_order_date,
            last_order_date: customer.last_order_date,
            metadata: customer
          })),
          { onConflict: 'customer_id' }
        );

      if (syncError) {
        console.error('Error syncing customers:', syncError);
      }

      res.json({ customers });
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch customers'
      });
    }
  }
);

// Get single customer
router.get(
  '/:id',
  limiter,
  [param('id').isString()],
  validate,
  async (req, res) => {
    try {
      const shop = req.headers['x-shopify-shop-domain'] as string;
      const accessToken = req.headers['x-shopify-access-token'] as string;

      if (!shop || !accessToken) {
        return res.status(401).json({ error: 'Missing shop or access token' });
      }

      const shopify = new ShopifyService(supabase, {
        shopifyUrl: shop,
        accessToken
      });

      const customer = await shopify.getCustomer(req.params.id);

      // Update customer insights
      const analytics = new ShopifyAnalyticsService(supabase, shopify);
      const insights = await analytics.updateCustomerInsights(shop, req.params.id);

      res.json({ customer, insights });
    } catch (error) {
      console.error('Error fetching customer:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch customer'
      });
    }
  }
);

// Create customer
router.post(
  '/',
  limiter,
  [
    body('email').isEmail(),
    body('first_name').optional().isString(),
    body('last_name').optional().isString(),
    body('phone').optional().isString(),
    body('addresses').optional().isArray(),
    body('password').optional().isString(),
    body('password_confirmation').optional().isString(),
    body('send_email_welcome').optional().isBoolean(),
    body('tags').optional().isString(),
    body('tax_exempt').optional().isBoolean(),
    body('tax_exemptions').optional().isArray()
  ],
  validate,
  async (req, res) => {
    try {
      const shop = req.headers['x-shopify-shop-domain'] as string;
      const accessToken = req.headers['x-shopify-access-token'] as string;

      if (!shop || !accessToken) {
        return res.status(401).json({ error: 'Missing shop or access token' });
      }

      const shopify = new ShopifyService(supabase, {
        shopifyUrl: shop,
        accessToken
      });

      const customer = await shopify.createCustomer(req.body);

      // Store in Supabase
      await supabase
        .from('shopify_customer_insights')
        .insert({
          shopify_store_id: shop,
          customer_id: customer.id,
          total_orders: 0,
          total_spent: 0,
          average_order_value: 0,
          metadata: customer
        });

      res.json({ customer });
    } catch (error) {
      console.error('Error creating customer:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to create customer'
      });
    }
  }
);

// Update customer
router.put(
  '/:id',
  limiter,
  [
    param('id').isString(),
    body('email').optional().isEmail(),
    body('first_name').optional().isString(),
    body('last_name').optional().isString(),
    body('phone').optional().isString(),
    body('addresses').optional().isArray(),
    body('password').optional().isString(),
    body('password_confirmation').optional().isString(),
    body('tags').optional().isString(),
    body('tax_exempt').optional().isBoolean(),
    body('tax_exemptions').optional().isArray()
  ],
  validate,
  async (req, res) => {
    try {
      const shop = req.headers['x-shopify-shop-domain'] as string;
      const accessToken = req.headers['x-shopify-access-token'] as string;

      if (!shop || !accessToken) {
        return res.status(401).json({ error: 'Missing shop or access token' });
      }

      const shopify = new ShopifyService(supabase, {
        shopifyUrl: shop,
        accessToken
      });

      const customer = await shopify.updateCustomer(req.params.id, req.body);

      // Update in Supabase
      await supabase
        .from('shopify_customer_insights')
        .update({
          metadata: customer,
          updated_at: new Date().toISOString()
        })
        .eq('customer_id', customer.id)
        .eq('shopify_store_id', shop);

      res.json({ customer });
    } catch (error) {
      console.error('Error updating customer:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to update customer'
      });
    }
  }
);

// Delete customer
router.delete(
  '/:id',
  limiter,
  [param('id').isString()],
  validate,
  async (req, res) => {
    try {
      const shop = req.headers['x-shopify-shop-domain'] as string;
      const accessToken = req.headers['x-shopify-access-token'] as string;

      if (!shop || !accessToken) {
        return res.status(401).json({ error: 'Missing shop or access token' });
      }

      const shopify = new ShopifyService(supabase, {
        shopifyUrl: shop,
        accessToken
      });

      await shopify.deleteCustomer(req.params.id);

      // Update status in Supabase
      await supabase
        .from('shopify_customer_insights')
        .update({
          status: 'deleted',
          updated_at: new Date().toISOString()
        })
        .eq('customer_id', req.params.id)
        .eq('shopify_store_id', shop);

      res.sendStatus(200);
    } catch (error) {
      console.error('Error deleting customer:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to delete customer'
      });
    }
  }
);

// Search customers
router.get(
  '/search',
  limiter,
  [query('query').isString()],
  validate,
  async (req, res) => {
    try {
      const shop = req.headers['x-shopify-shop-domain'] as string;
      const accessToken = req.headers['x-shopify-access-token'] as string;

      if (!shop || !accessToken) {
        return res.status(401).json({ error: 'Missing shop or access token' });
      }

      const shopify = new ShopifyService(supabase, {
        shopifyUrl: shop,
        accessToken
      });

      const customers = await shopify.searchCustomers(req.query.query as string);
      res.json({ customers });
    } catch (error) {
      console.error('Error searching customers:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to search customers'
      });
    }
  }
);

// Get customer orders
router.get(
  '/:id/orders',
  limiter,
  [
    param('id').isString(),
    query('status').optional().isIn(['any', 'open', 'closed', 'cancelled']),
    query('limit').optional().isInt({ min: 1, max: 250 })
  ],
  validate,
  async (req, res) => {
    try {
      const shop = req.headers['x-shopify-shop-domain'] as string;
      const accessToken = req.headers['x-shopify-access-token'] as string;

      if (!shop || !accessToken) {
        return res.status(401).json({ error: 'Missing shop or access token' });
      }

      const shopify = new ShopifyService(supabase, {
        shopifyUrl: shop,
        accessToken
      });

      const orders = await shopify.getCustomerOrders(req.params.id, req.query);
      res.json({ orders });
    } catch (error) {
      console.error('Error fetching customer orders:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch customer orders'
      });
    }
  }
);

export { router as shopifyCustomersRouter };