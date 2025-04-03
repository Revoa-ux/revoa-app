import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { rateLimit } from '../middleware/rateLimit';
import { createSupabaseClient } from '../db/client';
import { ShopifyService } from '../services/shopify';

const router = Router();
const supabase = createSupabaseClient();

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Get products
router.get(
  '/',
  limiter,
  [
    query('limit').optional().isInt({ min: 1, max: 250 }),
    query('page').optional().isInt({ min: 1 }),
    query('status').optional().isIn(['active', 'archived', 'draft']),
    query('collection_id').optional().isString(),
    query('created_at_min').optional().isISO8601(),
    query('created_at_max').optional().isISO8601(),
    query('updated_at_min').optional().isISO8601(),
    query('updated_at_max').optional().isISO8601()
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

      const products = await shopify.getProducts(req.query);

      // Store products in Supabase for syncing
      const { error: syncError } = await supabase
        .from('shopify_products')
        .upsert(
          products.map(product => ({
            shopify_product_id: product.id,
            shopify_store_id: shop,
            title: product.title,
            status: product.status,
            sync_status: 'synced',
            metadata: product
          })),
          { onConflict: 'shopify_product_id' }
        );

      if (syncError) {
        console.error('Error syncing products:', syncError);
      }

      res.json({ products });
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch products'
      });
    }
  }
);

// Get single product
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

      const product = await shopify.getProduct(req.params.id);
      res.json({ product });
    } catch (error) {
      console.error('Error fetching product:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch product'
      });
    }
  }
);

// Create product
router.post(
  '/',
  limiter,
  [
    body('title').isString().notEmpty(),
    body('body_html').optional().isString(),
    body('vendor').optional().isString(),
    body('product_type').optional().isString(),
    body('status').optional().isIn(['active', 'archived', 'draft']),
    body('variants').optional().isArray(),
    body('options').optional().isArray(),
    body('images').optional().isArray()
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

      const product = await shopify.createProduct(req.body);

      // Store in Supabase
      await supabase
        .from('shopify_products')
        .insert({
          shopify_product_id: product.id,
          shopify_store_id: shop,
          title: product.title,
          status: product.status,
          sync_status: 'synced',
          metadata: product
        });

      res.json({ product });
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to create product'
      });
    }
  }
);

// Update product
router.put(
  '/:id',
  limiter,
  [
    param('id').isString(),
    body('title').optional().isString(),
    body('body_html').optional().isString(),
    body('vendor').optional().isString(),
    body('product_type').optional().isString(),
    body('status').optional().isIn(['active', 'archived', 'draft']),
    body('variants').optional().isArray(),
    body('options').optional().isArray(),
    body('images').optional().isArray()
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

      const product = await shopify.updateProduct(req.params.id, req.body);

      // Update in Supabase
      await supabase
        .from('shopify_products')
        .update({
          title: product.title,
          status: product.status,
          sync_status: 'synced',
          metadata: product,
          updated_at: new Date().toISOString()
        })
        .eq('shopify_product_id', product.id)
        .eq('shopify_store_id', shop);

      res.json({ product });
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to update product'
      });
    }
  }
);

// Delete product
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

      await shopify.deleteProduct(req.params.id);

      // Update status in Supabase
      await supabase
        .from('shopify_products')
        .update({
          status: 'deleted',
          sync_status: 'deleted',
          updated_at: new Date().toISOString()
        })
        .eq('shopify_product_id', req.params.id)
        .eq('shopify_store_id', shop);

      res.sendStatus(200);
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to delete product'
      });
    }
  }
);

// Update product inventory
router.put(
  '/:id/inventory',
  limiter,
  [
    param('id').isString(),
    body('inventory_item_id').isString(),
    body('location_id').isString(),
    body('available').isInt()
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

      await shopify.updateInventoryLevel(
        req.body.inventory_item_id,
        req.body.location_id,
        req.body.available
      );

      // Update inventory snapshot
      await supabase
        .from('shopify_inventory_snapshots')
        .insert({
          shopify_store_id: shop,
          shopify_product_id: req.params.id,
          quantity: req.body.available,
          available_quantity: req.body.available,
          committed_quantity: 0,
          snapshot_date: new Date().toISOString().split('T')[0]
        });

      res.sendStatus(200);
    } catch (error) {
      console.error('Error updating inventory:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to update inventory'
      });
    }
  }
);

export { router as shopifyProductsRouter };