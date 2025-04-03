import { SupabaseClient } from '@supabase/supabase-js';
import { ShopifyService } from './shopify';

export class ShopifyAnalyticsService {
  private supabase: SupabaseClient;
  private shopifyService: ShopifyService;

  constructor(supabase: SupabaseClient, shopifyService: ShopifyService) {
    this.supabase = supabase;
    this.shopifyService = shopifyService;
  }

  async calculateProfitMetrics(orderId: string) {
    const startTime = Date.now();
    try {
      // Validate input
      if (!orderId) {
        throw new Error('Order ID is required');
      }

      const { data: order, error: orderError } = await this.supabase
        .from('shopify_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) {
        throw orderError;
      }

      if (!order) {
        throw new Error('Order not found');
      }

      const lineItems = order.line_items;
      let totalCost = 0;
      let processingFees = 0;
      let shippingCost = order.total_shipping;

      // Calculate costs and fees
      for (const item of lineItems) {
        const { data: product, error: productError } = await this.supabase
          .from('shopify_products')
          .select('metadata')
          .eq('shopify_product_id', item.product_id)
          .single();

        if (productError) {
          console.error('Error fetching product:', productError);
          continue;
        }

        if (product?.metadata?.cost_per_item) {
          totalCost += product.metadata.cost_per_item * item.quantity;
        }

        // Calculate payment processing fees (example: 2.9% + $0.30)
        processingFees += (item.price * 0.029) + 0.30;
      }

      const grossProfit = order.total_price - totalCost;
      const netProfit = grossProfit - processingFees - shippingCost;

      // Update order with profit metrics
      const { error: updateError } = await this.supabase
        .from('shopify_orders')
        .update({
          processing_fees: processingFees,
          net_profit: netProfit,
          metadata: {
            ...order.metadata,
            cost_breakdown: {
              total_cost: totalCost,
              processing_fees: processingFees,
              shipping_cost: shippingCost
            }
          }
        })
        .eq('id', orderId);

      if (updateError) {
        throw updateError;
      }

      // Log performance
      await this.logPerformance('profit_calculation', {
        order_id: orderId,
        duration_ms: Date.now() - startTime,
        metrics: {
          gross_profit: grossProfit,
          net_profit: netProfit
        }
      });

      return {
        gross_profit: grossProfit,
        net_profit: netProfit,
        metrics: {
          total_cost: totalCost,
          processing_fees: processingFees,
          shipping_cost: shippingCost
        }
      };
    } catch (error) {
      console.error('Error calculating profit metrics:', error);
      await this.logPerformance('profit_calculation', {
        order_id: orderId,
        error: error.message,
        duration_ms: Date.now() - startTime
      }, 'error');
      throw error;
    }
  }

  async updateInventorySnapshot(storeId: string) {
    const startTime = Date.now();
    try {
      // Validate input
      if (!storeId) {
        throw new Error('Store ID is required');
      }

      const products = await this.shopifyService.getProducts();
      const snapshot_date = new Date().toISOString().split('T')[0];

      const snapshots = products.map(product => ({
        shopify_store_id: storeId,
        shopify_product_id: product.id,
        quantity: product.inventory_quantity || 0,
        available_quantity: product.available || 0,
        committed_quantity: product.committed || 0,
        inventory_value: product.inventory_value || 0,
        snapshot_date,
        metadata: {
          variant_inventory: product.variants?.map(v => ({
            id: v.id,
            quantity: v.inventory_quantity || 0
          })) || []
        }
      }));

      const { error: insertError } = await this.supabase
        .from('shopify_inventory_snapshots')
        .insert(snapshots);

      if (insertError) {
        throw insertError;
      }

      await this.logPerformance('inventory_snapshot', {
        store_id: storeId,
        products_count: products.length,
        duration_ms: Date.now() - startTime
      });

      return snapshots;
    } catch (error) {
      console.error('Error updating inventory snapshot:', error);
      await this.logPerformance('inventory_snapshot', {
        store_id: storeId,
        error: error.message,
        duration_ms: Date.now() - startTime
      }, 'error');
      throw error;
    }
  }

  async updateCustomerInsights(storeId: string, customerId: string) {
    const startTime = Date.now();
    try {
      // Validate inputs
      if (!storeId || !customerId) {
        throw new Error('Store ID and Customer ID are required');
      }

      const { data: orders, error: ordersError } = await this.supabase
        .from('shopify_orders')
        .select('*')
        .eq('shopify_store_id', storeId)
        .eq('customer_data->id', customerId);

      if (ordersError) {
        throw ordersError;
      }

      if (!orders || orders.length === 0) {
        throw new Error('No orders found for customer');
      }

      const totalOrders = orders.length;
      const totalSpent = orders.reduce((sum, order) => sum + (order.total_price || 0), 0);
      const averageOrderValue = totalSpent / totalOrders;

      const orderDates = orders.map(order => new Date(order.created_at));
      const firstOrderDate = new Date(Math.min(...orderDates));
      const lastOrderDate = new Date(Math.max(...orderDates));

      // Calculate purchase frequency
      const daysBetween = (lastOrderDate.getTime() - firstOrderDate.getTime()) / (1000 * 60 * 60 * 24);
      const purchaseFrequency = daysBetween / totalOrders;

      // Analyze product categories
      const categories = new Set<string>();
      orders.forEach(order => {
        order.line_items?.forEach(item => {
          if (item.product_type) {
            categories.add(item.product_type);
          }
        });
      });

      // Determine customer segment
      let customerSegment = 'one_time';
      if (totalOrders > 3) {
        customerSegment = 'loyal';
      } else if (totalOrders > 1) {
        customerSegment = 'returning';
      }

      const insights = {
        shopify_store_id: storeId,
        customer_id: customerId,
        total_orders: totalOrders,
        total_spent: totalSpent,
        average_order_value: averageOrderValue,
        first_order_date: firstOrderDate,
        last_order_date: lastOrderDate,
        purchase_frequency: `${Math.round(purchaseFrequency)} days`,
        product_categories: Array.from(categories),
        customer_segment: customerSegment,
        metadata: {
          order_history: orders.map(order => ({
            id: order.id,
            date: order.created_at,
            total: order.total_price || 0
          }))
        }
      };

      const { error: upsertError } = await this.supabase
        .from('shopify_customer_insights')
        .upsert(insights, { onConflict: 'customer_id' });

      if (upsertError) {
        throw upsertError;
      }

      await this.logPerformance('customer_insights', {
        customer_id: customerId,
        duration_ms: Date.now() - startTime
      });

      return insights;
    } catch (error) {
      console.error('Error updating customer insights:', error);
      await this.logPerformance('customer_insights', {
        customer_id: customerId,
        error: error.message,
        duration_ms: Date.now() - startTime
      }, 'error');
      throw error;
    }
  }

  private async logPerformance(
    logType: string,
    details: any,
    status: 'success' | 'error' = 'success'
  ) {
    try {
      const { error } = await this.supabase
        .from('shopify_performance_logs')
        .insert({
          log_type: logType,
          status,
          duration_ms: details.duration_ms,
          api_calls_count: details.api_calls_count || 0,
          error_count: status === 'error' ? 1 : 0,
          details
        });

      if (error) {
        console.error('Error logging performance:', error);
      }
    } catch (error) {
      console.error('Error logging performance:', error);
    }
  }
}