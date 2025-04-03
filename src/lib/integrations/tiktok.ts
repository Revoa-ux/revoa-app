import { supabase } from '../supabase';

export class TikTokAdsIntegration {
  private accessToken: string;
  private pixelCode: string;

  constructor() {
    this.accessToken = import.meta.env.VITE_TIKTOK_ACCESS_TOKEN;
    this.pixelCode = import.meta.env.VITE_TIKTOK_PIXEL_CODE;
  }

  async initializePixel() {
    try {
      // Initialize TikTok Pixel
      window.ttq.load(this.pixelCode);
      window.ttq.page();

      return true;
    } catch (error) {
      console.error('Error initializing TikTok Pixel:', error);
      throw error;
    }
  }

  async setupEventTracking() {
    try {
      const response = await fetch('/api/tiktok/setup-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pixelCode: this.pixelCode,
          accessToken: this.accessToken
        })
      });

      if (!response.ok) {
        throw new Error('Failed to set up event tracking');
      }

      return true;
    } catch (error) {
      console.error('Error setting up TikTok event tracking:', error);
      throw error;
    }
  }

  async syncProductCatalog() {
    try {
      const { data: products } = await supabase
        .from('shopify_products')
        .select('*');

      if (!products) {
        throw new Error('No products found');
      }

      // Format products for TikTok catalog
      const catalogItems = products.map(product => ({
        sku_id: product.id,
        title: product.title,
        description: product.description,
        availability: product.inventory_quantity > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
        price: {
          price: product.price,
          currency: 'USD'
        },
        image_link: product.image_url
      }));

      // Upload to TikTok catalog
      const response = await fetch('/api/tiktok/sync-catalog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items: catalogItems })
      });

      if (!response.ok) {
        throw new Error('Failed to sync product catalog');
      }

      return true;
    } catch (error) {
      console.error('Error syncing TikTok product catalog:', error);
      throw error;
    }
  }

  trackEvent(eventName: string, parameters: any) {
    try {
      // Track event using pixel
      window.ttq.track(eventName, parameters);

      // Send server-side event
      fetch('/api/tiktok/track-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventName,
          eventParams: parameters
        })
      });
    } catch (error) {
      console.error('Error tracking TikTok event:', error);
      throw error;
    }
  }
}