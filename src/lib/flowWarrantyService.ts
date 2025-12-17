import { supabase } from './supabase';
import { getWarrantyInfo, formatWarrantyStatus, getCoverageDescription } from './warrantyService';
import type { WarrantyInfo } from './warrantyService';
import { flowContextService } from './flowContextService';
import { flowDecisionEngine } from './flowDecisionEngine';

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

    // Get order date and shopify_order_id
    const { data: order, error: orderError } = await supabase
      .from('shopify_orders')
      .select('order_date, delivered_at, shopify_order_id')
      .eq('id', thread.order_id)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) return null;

    // Use delivered date if available, otherwise order date
    const effectiveDate = new Date(order.delivered_at || order.order_date);

    // Get all line items for this order using the Shopify order ID
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
      .eq('shopify_order_id', order.shopify_order_id);

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

/**
 * Get intelligent resolution guidance for a damage claim
 * This integrates warranty data with smart routing decisions
 */
export async function getDamageResolutionGuidance(threadId: string, damageType: string) {
  try {
    const context = await flowContextService.loadOrderContext(threadId);

    if (!context.hasOrder || !context.warranty) {
      return {
        canAutoRoute: false,
        recommendation: 'Unable to determine warranty status. Please verify order is linked to thread.',
        nextSteps: ['Link order to thread', 'Reload flow to check warranty'],
        confidence: 'low' as const,
      };
    }

    const decision = flowDecisionEngine.decideDamageResolution(damageType, context.warranty);
    const guidance = flowDecisionEngine.getResolutionGuidance(damageType, context.warranty);

    return {
      canAutoRoute: decision.shouldAutoRoute,
      targetNodeId: decision.targetNodeId,
      reasoning: decision.reasoning,
      confidence: decision.confidence,
      resolution: guidance.resolution,
      nextSteps: guidance.nextSteps,
      templateSuggestions: guidance.templateSuggestions,
      urgency: guidance.urgency,
    };
  } catch (error) {
    console.error('Error getting damage resolution guidance:', error);
    return {
      canAutoRoute: false,
      recommendation: 'Error loading resolution guidance',
      nextSteps: [],
      confidence: 'low' as const,
    };
  }
}

/**
 * Check if thread has necessary context for intelligent flows
 */
export async function validateFlowContext(threadId: string): Promise<{
  valid: boolean;
  issues: string[];
  warnings: string[];
}> {
  const issues: string[] = [];
  const warnings: string[] = [];

  try {
    const context = await flowContextService.loadOrderContext(threadId);

    if (!context.hasOrder) {
      issues.push('No order linked to thread');
    }

    if (context.hasOrder && !context.warranty) {
      warnings.push('Order has no warranty information');
    }

    if (context.hasOrder && context.order && context.order.lineItems.length > 1 && !context.selectedLineItem) {
      warnings.push('Order has multiple items but none selected');
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
    };
  } catch (error) {
    issues.push('Error loading flow context');
    return { valid: false, issues, warnings };
  }
}

/**
 * Get dynamic content for a flow node
 * This replaces placeholder content with real data from the order/warranty
 */
export async function getFlowNodeDynamicContent(
  threadId: string,
  nodeId: string,
  defaultContent: string
): Promise<string> {
  try {
    return await flowContextService.getNodeContent(threadId, nodeId, defaultContent);
  } catch (error) {
    console.error('Error getting dynamic node content:', error);
    return defaultContent;
  }
}

/**
 * Get email template suggestions based on damage type and warranty context
 */
export async function getEmailTemplateSuggestions(
  threadId: string,
  damageType: string
): Promise<Array<{
  templateId: string;
  reason: string;
  timing: 'immediate' | 'after_factory' | 'optional';
}>> {
  try {
    const context = await flowContextService.loadOrderContext(threadId);

    if (!context.hasOrder) {
      return [];
    }

    return flowDecisionEngine.getEmailSuggestions(context, damageType);
  } catch (error) {
    console.error('Error getting email template suggestions:', error);
    return [];
  }
}
