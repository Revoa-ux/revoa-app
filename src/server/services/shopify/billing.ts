import { SupabaseClient } from '@supabase/supabase-js';
import { PricingTier } from '@/types/pricing';
import { pricingTiers } from '@/components/pricing/PricingTiers';

export class ShopifyBillingService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async createUsageCharge(shopDomain: string, orderCount: number, orderValue: number) {
    try {
      // Determine pricing tier based on 30-day order volume
      const { data: orderStats } = await this.supabase
        .from('shopify_orders')
        .select('count')
        .eq('shopify_store_id', shopDomain)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .single();

      const monthlyOrders = orderStats?.count || 0;
      const tier = this.determineOrderTier(monthlyOrders);

      // Calculate fees
      const orderFee = tier.perOrderFee;
      const transactionFee = (orderValue * tier.transactionFee) / 100;
      const totalFee = orderFee + transactionFee;

      // Create usage record
      const { data: usage, error } = await this.supabase
        .from('subscription_usage')
        .insert({
          store_id: shopDomain,
          order_count: orderCount,
          order_value: orderValue,
          fees: {
            order: orderFee,
            transaction: transactionFee,
            total: totalFee
          },
          tier_id: tier.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return usage;
    } catch (error) {
      console.error('Error creating usage charge:', error);
      throw error;
    }
  }

  private determineOrderTier(monthlyOrders: number): PricingTier {
    if (monthlyOrders <= 50) {
      return pricingTiers.find(t => t.id === 'startup')!;
    } else if (monthlyOrders <= 500) {
      return pricingTiers.find(t => t.id === 'momentum')!;
    } else if (monthlyOrders <= 1000) {
      return pricingTiers.find(t => t.id === 'scale')!;
    } else {
      return pricingTiers.find(t => t.id === 'business')!;
    }
  }

  async calculateMonthlyUsage(shopDomain: string, month: string) {
    try {
      const { data: usage, error } = await this.supabase
        .from('subscription_usage')
        .select('*')
        .eq('store_id', shopDomain)
        .like('created_at', `${month}%`);

      if (error) throw error;

      const totalFees = usage?.reduce((sum, record) => sum + record.fees.total, 0) || 0;
      const totalOrders = usage?.reduce((sum, record) => sum + record.order_count, 0) || 0;
      const totalOrderValue = usage?.reduce((sum, record) => sum + record.order_value, 0) || 0;

      return {
        totalFees,
        totalOrders,
        totalOrderValue,
        usage
      };
    } catch (error) {
      console.error('Error calculating monthly usage:', error);
      throw error;
    }
  }
}