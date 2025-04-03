import { Request, Response } from 'express';
import { ShopifyService } from '../services/shopify';
import { ShopifyAnalyticsService } from '../services/shopifyAnalytics';
import { createSupabaseClient } from '../db/client';

const supabase = createSupabaseClient();

export const calculateOrderProfits = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { storeId } = req.body;

    const { data: store } = await supabase
      .from('shopify_stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (!store) {
      return res.status(404).json({ error: 'Shopify store not found' });
    }

    const shopify = new ShopifyService(supabase, {
      shopifyUrl: store.store_url,
      accessToken: store.access_token
    });

    const analytics = new ShopifyAnalyticsService(supabase, shopify);
    const profits = await analytics.calculateProfitMetrics(orderId);

    res.json({ profits });
  } catch (error) {
    console.error('Error calculating order profits:', error);
    res.status(500).json({ error: 'Failed to calculate profits' });
  }
};

export const updateInventorySnapshot = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;

    const { data: store } = await supabase
      .from('shopify_stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (!store) {
      return res.status(404).json({ error: 'Shopify store not found' });
    }

    const shopify = new ShopifyService(supabase, {
      shopifyUrl: store.store_url,
      accessToken: store.access_token
    });

    const analytics = new ShopifyAnalyticsService(supabase, shopify);
    const snapshot = await analytics.updateInventorySnapshot(storeId);

    res.json({ snapshot });
  } catch (error) {
    console.error('Error updating inventory snapshot:', error);
    res.status(500).json({ error: 'Failed to update inventory snapshot' });
  }
};

export const updateCustomerInsights = async (req: Request, res: Response) => {
  try {
    const { storeId, customerId } = req.params;

    const { data: store } = await supabase
      .from('shopify_stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (!store) {
      return res.status(404).json({ error: 'Shopify store not found' });
    }

    const shopify = new ShopifyService(supabase, {
      shopifyUrl: store.store_url,
      accessToken: store.access_token
    });

    const analytics = new ShopifyAnalyticsService(supabase, shopify);
    const insights = await analytics.updateCustomerInsights(storeId, customerId);

    res.json({ insights });
  } catch (error) {
    console.error('Error updating customer insights:', error);
    res.status(500).json({ error: 'Failed to update customer insights' });
  }
};