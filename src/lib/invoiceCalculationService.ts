import { supabase } from './supabase';

interface LineItem {
  sku: string;
  product_name: string;
  quantity: number;
  cost_per_item: number;
  shipping_cost: number;
  shipping_country: string;
  total_cost: number;
  quote_id: string;
}

interface InvoiceCalculation {
  userId: string;
  totalAmount: number;
  lineItemsCount: number;
  totalQuantity: number;
  orderIds: string[];
  breakdown: {
    productCosts: number;
    shippingCosts: number;
    commission: number;
  };
  lineItems: LineItem[];
}

export async function calculatePendingInvoice(
  userId: string
): Promise<InvoiceCalculation | null> {
  try {
    // Get unprocessed fulfilled orders
    const { data: orders, error: ordersError } = await supabase
      .from('shopify_order_fulfillment')
      .select('*')
      .eq('user_id', userId)
      .eq('processed_for_invoice', false)
      .eq('fulfillment_status', 'fulfilled');

    if (ordersError) throw ordersError;
    if (!orders || orders.length === 0) return null;

    // Aggregate all line items
    const allLineItems: LineItem[] = [];
    const orderIds: string[] = [];

    for (const order of orders) {
      orderIds.push(order.shopify_order_id);
      if (order.line_items && Array.isArray(order.line_items)) {
        allLineItems.push(...order.line_items);
      }
    }

    if (allLineItems.length === 0) return null;

    // Calculate totals
    const totalQuantity = allLineItems.reduce((sum, item) => sum + item.quantity, 0);
    const productCosts = allLineItems.reduce(
      (sum, item) => sum + item.cost_per_item * item.quantity,
      0
    );
    const shippingCosts = allLineItems.reduce(
      (sum, item) => sum + item.shipping_cost * item.quantity,
      0
    );

    const subtotal = productCosts + shippingCosts;
    const commission = subtotal * 0.02; // 2% commission
    const totalAmount = subtotal + commission;

    return {
      userId,
      totalAmount,
      lineItemsCount: allLineItems.length,
      totalQuantity,
      orderIds,
      breakdown: {
        productCosts,
        shippingCosts,
        commission,
      },
      lineItems: allLineItems,
    };
  } catch (error) {
    console.error('Error calculating pending invoice:', error);
    throw error;
  }
}

export async function generateInvoiceFromCalculation(
  calculation: InvoiceCalculation
): Promise<string> {
  try {
    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        user_id: calculation.userId,
        amount: calculation.totalAmount,
        status: 'pending',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        line_items: calculation.lineItems,
        auto_generated: true,
        generation_date: new Date().toISOString(),
        shopify_order_ids: calculation.orderIds,
        breakdown: calculation.breakdown,
      })
      .select('id')
      .single();

    if (invoiceError) throw invoiceError;

    // Mark orders as processed
    const { error: updateError } = await supabase
      .from('shopify_order_fulfillment')
      .update({ processed_for_invoice: true, invoice_id: invoice.id })
      .in('shopify_order_id', calculation.orderIds)
      .eq('user_id', calculation.userId);

    if (updateError) throw updateError;

    // Log generation
    await supabase.from('invoice_generation_logs').insert({
      user_id: calculation.userId,
      invoice_id: invoice.id,
      status: 'success',
      line_items_count: calculation.lineItemsCount,
      total_amount: calculation.totalAmount,
      orders_processed: calculation.orderIds.length,
    });

    return invoice.id;
  } catch (error) {
    // Log failure
    await supabase.from('invoice_generation_logs').insert({
      user_id: calculation.userId,
      status: 'failed',
      error_message: error.message,
      line_items_count: calculation.lineItemsCount,
      total_amount: calculation.totalAmount,
      orders_processed: calculation.orderIds.length,
    });

    throw error;
  }
}

export async function getUserInvoiceSettings(userId: string) {
  const { data, error } = await supabase
    .from('invoice_generation_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  return (
    data || {
      auto_generate_enabled: true,
      generation_frequency: 'daily',
      minimum_amount: 0,
      user_timezone: 'UTC',
    }
  );
}

export async function shouldGenerateInvoice(userId: string): Promise<boolean> {
  try {
    const settings = await getUserInvoiceSettings(userId);

    if (!settings.auto_generate_enabled) return false;

    const calculation = await calculatePendingInvoice(userId);
    if (!calculation) return false;

    if (calculation.totalAmount < settings.minimum_amount) return false;

    return true;
  } catch (error) {
    console.error('Error checking if should generate invoice:', error);
    return false;
  }
}
