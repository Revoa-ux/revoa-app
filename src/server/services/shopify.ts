import { SupabaseClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';

interface ShopifyConfig {
  shopifyUrl: string;
  accessToken: string;
}

export class ShopifyService {
  private supabase: SupabaseClient;
  private config: ShopifyConfig;

  constructor(supabase: SupabaseClient, config: ShopifyConfig) {
    this.supabase = supabase;
    this.config = config;
  }

  private async fetchFromShopify(endpoint: string, options: RequestInit = {}) {
    const url = `${this.config.shopifyUrl}/admin/api/2024-01${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': this.config.accessToken,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.statusText}`);
    }

    return response.json();
  }

  async createProduct(quoteData: any) {
    try {
      const product = {
        title: quoteData.productName,
        body_html: quoteData.description || '',
        vendor: 'Revoa',
        product_type: 'Quote Product',
        variants: quoteData.variants.map((variant: any) => ({
          price: variant.totalCost,
          sku: `QT-${quoteData.id}-${variant.quantity}`,
          inventory_management: 'shopify',
          inventory_quantity: variant.quantity,
          requires_shipping: true
        })),
        status: 'draft'
      };

      const response = await this.fetchFromShopify('/products.json', {
        method: 'POST',
        body: JSON.stringify({ product })
      });

      await this.supabase
        .from('shopify_products')
        .insert({
          quote_id: quoteData.id,
          shopify_product_id: response.product.id,
          shopify_store_id: this.config.shopifyUrl,
          status: 'draft',
          sync_status: 'synced',
          metadata: {
            original_quote: quoteData,
            shopify_data: response.product
          }
        });

      return response.product;
    } catch (error) {
      console.error('Error creating Shopify product:', error);
      throw error;
    }
  }

  async updateProduct(shopifyProductId: string, quoteData: any) {
    try {
      const product = {
        variants: quoteData.variants.map((variant: any) => ({
          price: variant.totalCost,
          inventory_quantity: variant.quantity
        }))
      };

      const response = await this.fetchFromShopify(`/products/${shopifyProductId}.json`, {
        method: 'PUT',
        body: JSON.stringify({ product })
      });

      await this.supabase
        .from('shopify_products')
        .update({
          sync_status: 'synced',
          last_synced_at: new Date().toISOString(),
          metadata: {
            last_update: quoteData,
            shopify_data: response.product
          }
        })
        .eq('shopify_product_id', shopifyProductId);

      return response.product;
    } catch (error) {
      console.error('Error updating Shopify product:', error);
      throw error;
    }
  }

  async calculatePrice(quoteData: any) {
    try {
      const { data: rules } = await this.supabase
        .from('shopify_price_rules')
        .select('*')
        .eq('status', 'active')
        .order('priority', { ascending: false });

      if (!rules || rules.length === 0) {
        return quoteData.variants;
      }

      const updatedVariants = quoteData.variants.map((variant: any) => {
        let finalPrice = variant.totalCost;

        for (const rule of rules) {
          if (this.evaluateRuleConditions(rule.conditions, variant)) {
            finalPrice = this.applyRuleActions(rule.actions, finalPrice);
            break;
          }
        }

        return {
          ...variant,
          shopifyPrice: finalPrice
        };
      });

      return updatedVariants;
    } catch (error) {
      console.error('Error calculating prices:', error);
      throw error;
    }
  }

  private evaluateRuleConditions(conditions: any, variant: any): boolean {
    // Implement condition evaluation logic
    return true;
  }

  private applyRuleActions(actions: any, price: number): number {
    if (actions.type === 'markup') {
      return price * (1 + actions.percentage / 100);
    }
    if (actions.type === 'fixed') {
      return price + actions.amount;
    }
    return price;
  }

  async verifyWebhook(data: any, hmac: string): Promise<boolean> {
    const calculatedHmac = createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET || '')
      .update(JSON.stringify(data))
      .digest('base64');

    return hmac === calculatedHmac;
  }

  async createRecurringCharge(options: {
    name: string;
    price: number;
    test?: boolean;
    trialDays?: number;
  }) {
    try {
      const charge = {
        recurring_application_charge: {
          name: options.name,
          price: options.price,
          return_url: `${process.env.SHOPIFY_APP_URL}/billing/callback`,
          test: options.test || false,
          trial_days: options.trialDays
        }
      };

      const response = await this.fetchFromShopify('/recurring_application_charges.json', {
        method: 'POST',
        body: JSON.stringify(charge)
      });

      return {
        id: response.recurring_application_charge.id,
        confirmationUrl: response.recurring_application_charge.confirmation_url
      };
    } catch (error) {
      console.error('Error creating recurring charge:', error);
      throw error;
    }
  }
}