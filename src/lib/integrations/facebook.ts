import { supabase } from '../supabase';

export class FacebookAdsIntegration {
  private accessToken: string;
  private pixelId: string;

  constructor() {
    this.accessToken = import.meta.env.VITE_FACEBOOK_ACCESS_TOKEN;
    this.pixelId = import.meta.env.VITE_FACEBOOK_PIXEL_ID;
  }

  async initializePixel() {
    try {
      // Initialize Facebook Pixel
      window.fbq('init', this.pixelId);
      window.fbq('track', 'PageView');

      return true;
    } catch (error) {
      console.error('Error initializing Facebook Pixel:', error);
      throw error;
    }
  }

  async setupConversionAPI() {
    try {
      // Set up server-side events API
      const response = await fetch('/api/facebook/setup-capi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pixelId: this.pixelId,
          accessToken: this.accessToken
        })
      });

      if (!response.ok) {
        throw new Error('Failed to set up Conversions API');
      }

      return true;
    } catch (error) {
      console.error('Error setting up Conversions API:', error);
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

      // Format products for Facebook catalog
      const catalogItems = products.map(product => ({
        id: product.id,
        title: product.title,
        description: product.description,
        availability: product.inventory_quantity > 0 ? 'in stock' : 'out of stock',
        condition: 'new',
        price: product.price,
        link: product.url,
        image_link: product.image_url
      }));

      // Upload to Facebook catalog
      const response = await fetch('/api/facebook/sync-catalog', {
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
      console.error('Error syncing product catalog:', error);
      throw error;
    }
  }

  trackEvent(eventName: string, parameters: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      // Track event using pixel
      window.fbq('track', eventName, parameters);

      // Send server-side event
      fetch('/api/facebook/track-event', {
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
      console.error('Error tracking Facebook event:', error);
      throw error;
    }
  }
}