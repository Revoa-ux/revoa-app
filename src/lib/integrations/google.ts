import { supabase } from '../supabase';

export class GoogleAdsIntegration {
  private clientId: string;
  private trackingId: string;

  constructor() {
    this.clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    this.trackingId = import.meta.env.VITE_GOOGLE_TRACKING_ID;
  }

  async initializeTracking() {
    try {
      // Initialize Google Ads tracking
      window.gtag('js', new Date());
      window.gtag('config', this.trackingId);

      return true;
    } catch (error) {
      console.error('Error initializing Google Ads tracking:', error);
      throw error;
    }
  }

  async setupConversionTracking() {
    try {
      const response = await fetch('/api/google/setup-conversions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          trackingId: this.trackingId,
          clientId: this.clientId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to set up conversion tracking');
      }

      return true;
    } catch (error) {
      console.error('Error setting up Google conversion tracking:', error);
      throw error;
    }
  }

  async syncProductFeed() {
    try {
      const { data: products } = await supabase
        .from('shopify_products')
        .select('*');

      if (!products) {
        throw new Error('No products found');
      }

      // Format products for Google Merchant Center
      const feedItems = products.map(product => ({
        id: product.id,
        title: product.title,
        description: product.description,
        link: product.url,
        image_link: product.image_url,
        availability: product.inventory_quantity > 0 ? 'in_stock' : 'out_of_stock',
        price: {
          value: product.price,
          currency: 'USD'
        },
        brand: product.vendor,
        condition: 'new'
      }));

      // Upload to Google Merchant Center
      const response = await fetch('/api/google/sync-feed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items: feedItems })
      });

      if (!response.ok) {
        throw new Error('Failed to sync product feed');
      }

      return true;
    } catch (error) {
      console.error('Error syncing Google product feed:', error);
      throw error;
    }
  }

  async setupRemarketing() {
    try {
      // Set up remarketing tag
      window.gtag('config', this.trackingId, {
        allow_ad_personalization_signals: true,
        restricted_data_processing: false
      });

      // Create remarketing audiences
      const response = await fetch('/api/google/setup-remarketing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          trackingId: this.trackingId,
          clientId: this.clientId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to set up remarketing');
      }

      return true;
    } catch (error) {
      console.error('Error setting up Google remarketing:', error);
      throw error;
    }
  }

  trackEvent(eventName: string, parameters: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      // Track event
      window.gtag('event', eventName, parameters);

      // Send server-side event
      fetch('/api/google/track-event', {
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
      console.error('Error tracking Google event:', error);
      throw error;
    }
  }
}