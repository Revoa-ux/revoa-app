import { supabase } from '../supabase';
import { ShopifyService } from '../services/shopify';

export class ShopifyIntegration {
  private shopifyService: ShopifyService;

  constructor() {
    this.shopifyService = new ShopifyService(supabase, {
      shopifyUrl: import.meta.env.VITE_SHOPIFY_STORE_URL,
      accessToken: import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN
    });
  }

  async setupWebhooks() {
    try {
      const webhooks = [
        {
          topic: 'products/create',
          address: `${window.location.origin}/api/webhooks/shopify/products`
        },
        {
          topic: 'products/update',
          address: `${window.location.origin}/api/webhooks/shopify/products`
        },
        {
          topic: 'orders/create',
          address: `${window.location.origin}/api/webhooks/shopify/orders`
        },
        {
          topic: 'inventory_items/update',
          address: `${window.location.origin}/api/webhooks/shopify/inventory`
        }
      ];

      for (const webhook of webhooks) {
        await this.shopifyService.createWebhook(webhook);
      }

      return true;
    } catch (error) {
      console.error('Error setting up Shopify webhooks:', error);
      throw error;
    }
  }

  async syncInventory() {
    try {
      const products = await this.shopifyService.getProducts();
      
      for (const product of products) {
        await supabase.from('shopify_inventory_snapshots').upsert({
          shopify_product_id: product.id,
          quantity: product.variants[0].inventory_quantity,
          available_quantity: product.variants[0].inventory_quantity,
          snapshot_date: new Date().toISOString().split('T')[0]
        });
      }

      return true;
    } catch (error) {
      console.error('Error syncing inventory:', error);
      throw error;
    }
  }

  async validateOrder(orderId: string) {
    try { // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const order = await this.shopifyService.getOrder(orderId);
      
      // Validate payment
      const paymentValid = await this.validatePayment(order); // eslint-disable-next-line @typescript-eslint/no-unused-vars
      if (!paymentValid) { // eslint-disable-next-line @typescript-eslint/no-unused-vars
        throw new Error('Payment validation failed');
      }

      // Check inventory
      const inventoryValid = await this.validateInventory(order);
      if (!inventoryValid) {
        throw new Error('Insufficient inventory');
      }

      return true;
    } catch (error) {
      console.error('Error validating order:', error);
      throw error;
    }
  }

  private async validatePayment(order: any) {
    // Implement payment validation logic
    return true;
  }

  private async validateInventory(order: any) {
    // Implement inventory validation logic
    return true;
  }
}