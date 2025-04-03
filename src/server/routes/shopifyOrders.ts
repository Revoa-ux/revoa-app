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

// Get orders
router.get(
  '/',
  limiter,
  [
    query('limit').optional().isInt({ min: 1, max: 250 }),
    query('status').optional().isIn(['any', 'open', 'closed', 'cancelled']),
    query('financial_status').optional().isIn([
      'authorized', 'pending', 'paid', 'partially_paid', 'refunded', 
      'voided', 'partially_refunded'
    ]),
    query('fulfillment_status').optional().isIn([
      'shipped', 'partial', 'unshipped', 'any', 'unfulfilled'
    ]),
    query('created_at_min').optional().isISO8601(),
    query('created_at_max').optional().isISO8601()
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

      const orders = await shopify.getOrders(req.query);

      // Store orders in Supabase for syncing
      const { error: syncError } = await supabase
        .from('shopify_orders')
        .upsert(
          orders.map(order => ({
            shopify_order_id: order.id,
            shopify_store_id: shop,
            order_number: order.order_number,
            total_price: order.total_price,
            subtotal_price: order.subtotal_price,
            total_tax: order.total_tax,
            total_shipping: order.total_shipping_price,
            total_discounts: order.total_discounts,
            status: order.financial_status,
            fulfillment_status: order.fulfillment_status,
            payment_status: order.financial_status,
            customer_data: order.customer,
            line_items: order.line_items,
            metadata: order
          })),
          { onConflict: 'shopify_order_id' }
        );

      if (syncError) {
        console.error('Error syncing orders:', syncError);
      }

      res.json({ orders });
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch orders'
      });
    }
  }
);

// Get single order
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

      const order = await shopify.getOrder(req.params.id);

      // Calculate profit metrics
      const analytics = new ShopifyAnalyticsService(supabase, shopify);
      const profits = await analytics.calculateProfitMetrics(req.params.id);

      res.json({ order, profits });
    } catch (error) {
      console.error('Error fetching order:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch order'
      });
    }
  }
);

// Create order
router.post(
  '/',
  limiter,
  [
    body('line_items').isArray(),
    body('customer').optional().isObject(),
    body('shipping_address').optional().isObject(),
    body('billing_address').optional().isObject(),
    body('financial_status').optional().isIn(['pending', 'authorized', 'paid']),
    body('fulfillment_status').optional().isIn(['unfulfilled', 'partial', 'fulfilled']),
    body('tags').optional().isString(),
    body('note').optional().isString()
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

      const order = await shopify.createOrder(req.body);

      // Store in Supabase
      await supabase
        .from('shopify_orders')
        .insert({
          shopify_order_id: order.id,
          shopify_store_id: shop,
          order_number: order.order_number,
          total_price: order.total_price,
          subtotal_price: order.subtotal_price,
          total_tax: order.total_tax,
          total_shipping: order.total_shipping_price,
          total_discounts: order.total_discounts,
          status: order.financial_status,
          fulfillment_status: order.fulfillment_status,
          payment_status: order.financial_status,
          customer_data: order.customer,
          line_items: order.line_items,
          metadata: order
        });

      res.json({ order });
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to create order'
      });
    }
  }
);

// Update order
router.put(
  '/:id',
  limiter,
  [
    param('id').isString(),
    body('note').optional().isString(),
    body('tags').optional().isString(),
    body('email').optional().isEmail(),
    body('financial_status').optional().isIn([
      'authorized', 'pending', 'paid', 'partially_paid', 'refunded', 
      'voided', 'partially_refunded'
    ]),
    body('fulfillment_status').optional().isIn([
      'fulfilled', 'partial', 'unfulfilled', 'restocked'
    ])
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

      const order = await shopify.updateOrder(req.params.id, req.body);

      // Update in Supabase
      await supabase
        .from('shopify_orders')
        .update({
          status: order.financial_status,
          fulfillment_status: order.fulfillment_status,
          metadata: order,
          updated_at: new Date().toISOString()
        })
        .eq('shopify_order_id', order.id)
        .eq('shopify_store_id', shop);

      res.json({ order });
    } catch (error) {
      console.error('Error updating order:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to update order'
      });
    }
  }
);

// Cancel order
router.post(
  '/:id/cancel',
  limiter,
  [
    param('id').isString(),
    body('reason').optional().isString(),
    body('email').optional().isBoolean(),
    body('restock').optional().isBoolean()
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

      const order = await shopify.cancelOrder(req.params.id, req.body);

      // Update in Supabase
      await supabase
        .from('shopify_orders')
        .update({
          status: 'cancelled',
          metadata: order,
          updated_at: new Date().toISOString()
        })
        .eq('shopify_order_id', order.id)
        .eq('shopify_store_id', shop);

      res.json({ order });
    } catch (error) {
      console.error('Error cancelling order:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to cancel order'
      });
    }
  }
);

// Refund order
router.post(
  '/:id/refund',
  limiter,
  [
    param('id').isString(),
    body('refund_line_items').optional().isArray(),
    body('shipping').optional().isObject(),
    body('note').optional().isString(),
    body('notify').optional().isBoolean(),
    body('restock').optional().isBoolean()
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

      const refund = await shopify.createRefund(req.params.id, req.body);

      // Update order in Supabase
      await supabase
        .from('shopify_orders')
        .update({
          status: 'refunded',
          metadata: {
            ...refund.order,
            refunds: refund.refunds
          },
          updated_at: new Date().toISOString()
        })
        .eq('shopify_order_id', req.params.id)
        .eq('shopify_store_id', shop);

      res.json({ refund });
    } catch (error) {
      console.error('Error refunding order:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to refund order'
      });
    }
  }
);

// Fulfill order
router.post(
  '/:id/fulfill',
  limiter,
  [
    param('id').isString(),
    body('location_id').isString(),
    body('tracking_number').optional().isString(),
    body('tracking_company').optional().isString(),
    body('tracking_url').optional().isString(),
    body('notify_customer').optional().isBoolean()
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

      const fulfillment = await shopify.createFulfillment(req.params.id, req.body);

      // Update order in Supabase
      await supabase
        .from('shopify_orders')
        .update({
          fulfillment_status: 'fulfilled',
          metadata: {
            ...fulfillment.order,
            fulfillments: fulfillment.fulfillments
          },
          updated_at: new Date().toISOString()
        })
        .eq('shopify_order_id', req.params.id)
        .eq('shopify_store_id', shop);

      res.json({ fulfillment });
    } catch (error) {
      console.error('Error fulfilling order:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fulfill order'
      });
    }
  }
);

export { router as shopifyOrdersRouter };