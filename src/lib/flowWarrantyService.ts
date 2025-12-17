import { supabase } from './supabase';
import { getWarrantyInfo, formatWarrantyStatus, getCoverageDescription } from './warrantyService';
import type { WarrantyInfo } from './warrantyService';

/**
 * Get warranty info for a specific product in an order thread
 * If thread has line_item_id, use that specific product
 * Otherwise, if order has multiple products, return null (need product selection first)
 * If order has single product, use that product
 */
export async function getThreadProductWarranty(threadId: string): Promise<{
  warranty: WarrantyInfo;
  productName: string;
  variantTitle?: string;
  needsProductSelection: boolean;
  availableProducts?: Array<{ id: string; name: string; variant?: string }>;
} | null> {
  try {
    // Get thread info
    const { data: thread, error: threadError } = await supabase
      .from('chat_threads')
      .select('order_id, line_item_id')
      .eq('id', threadId)
      .maybeSingle();

    if (threadError) throw threadError;
    if (!thread || !thread.order_id) return null;

    // Get order date
    const { data: order, error: orderError } = await supabase
      .from('shopify_orders')
      .select('order_date, delivered_at')
      .eq('id', thread.order_id)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) return null;

    // Use delivered date if available, otherwise order date
    const effectiveDate = new Date(order.delivered_at || order.order_date);

    // Get all line items for this order
    const { data: lineItems, error: lineItemsError } = await supabase
      .from('order_line_items')
      .select(`
        id,
        product_name,
        variant_name,
        product_quotes (
          warranty_days,
          covers_damaged_items,
          covers_lost_items,
          covers_late_shipment
        )
      `)
      .eq('shopify_order_id', thread.order_id);

    if (lineItemsError) throw lineItemsError;
    if (!lineItems || lineItems.length === 0) return null;

    // If thread has specific line item, use that
    if (thread.line_item_id) {
      const specificItem = lineItems.find(item => item.id === thread.line_item_id);
      if (!specificItem) return null;

      const quote = Array.isArray(specificItem.product_quotes)
        ? specificItem.product_quotes[0]
        : specificItem.product_quotes;

      const warranty = getWarrantyInfo(
        effectiveDate,
        quote?.warranty_days || 0,
        quote?.covers_damaged_items || false,
        quote?.covers_lost_items || false,
        quote?.covers_late_shipment || false
      );

      return {
        warranty,
        productName: specificItem.product_name,
        variantTitle: specificItem.variant_name || undefined,
        needsProductSelection: false,
      };
    }

    // If order has multiple products, need product selection
    if (lineItems.length > 1) {
      return {
        warranty: getWarrantyInfo(effectiveDate, 0), // placeholder
        productName: '',
        needsProductSelection: true,
        availableProducts: lineItems.map(item => ({
          id: item.id,
          name: item.product_name,
          variant: item.variant_name || undefined,
        })),
      };
    }

    // Single product - use it
    const item = lineItems[0];
    const quote = Array.isArray(item.product_quotes)
      ? item.product_quotes[0]
      : item.product_quotes;

    const warranty = getWarrantyInfo(
      effectiveDate,
      quote?.warranty_days || 0,
      quote?.covers_damaged_items || false,
      quote?.covers_lost_items || false,
      quote?.covers_late_shipment || false
    );

    return {
      warranty,
      productName: item.product_name,
      variantTitle: item.variant_name || undefined,
      needsProductSelection: false,
    };
  } catch (error) {
    console.error('Error fetching thread product warranty:', error);
    return null;
  }
}

/**
 * Format warranty data for display in conversational flows
 */
export function formatWarrantyForFlow(warranty: WarrantyInfo): string {
  const status = formatWarrantyStatus(warranty);
  const coverage = getCoverageDescription(warranty);

  let statusBadge = '';
  switch (status.badge.color) {
    case 'green':
      statusBadge = '✅ ACTIVE';
      break;
    case 'yellow':
      statusBadge = '⚠️ EXPIRING SOON';
      break;
    case 'red':
      statusBadge = '❌ EXPIRED';
      break;
    default:
      statusBadge = '⚪ NO WARRANTY';
  }

  return `📋 **Warranty Status**: ${statusBadge}
⏰ **Coverage Period**: ${status.message}
🛡️ **Covers**: ${coverage}`;
}

/**
 * Set the line item ID for a thread (when user selects product)
 */
export async function setThreadLineItem(threadId: string, lineItemId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('chat_threads')
      .update({ line_item_id: lineItemId })
      .eq('id', threadId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error setting thread line item:', error);
    return false;
  }
}
