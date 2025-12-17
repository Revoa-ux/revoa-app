import { supabase } from './supabase';
import { getOrderWarrantyStatus, getFlowWarrantyContext, formatWarrantyStatus, getCoverageDescription } from './warrantyService';
import type { FlowWarrantyContext, OrderWarrantyStatus } from './warrantyService';

export interface OrderLineItemInfo {
  id: string;
  productName: string;
  variantTitle?: string;
  quantity: number;
  price: string;
  productId?: string;
  variantId?: string;
  quoteId?: string;
}

export interface OrderInfo {
  id: string;
  orderNumber: string;
  orderDate: Date;
  customerName: string;
  customerEmail: string;
  totalPrice: string;
  lineItems: OrderLineItemInfo[];
  warrantyStatus?: OrderWarrantyStatus;
}

export interface FlowContextData {
  hasOrder: boolean;
  order?: OrderInfo;
  warranty?: FlowWarrantyContext;
  selectedLineItem?: OrderLineItemInfo;
  dynamicContent: Record<string, string>;
}

export class FlowContextService {
  /**
   * Load complete order context for a thread
   */
  async loadOrderContext(threadId: string): Promise<FlowContextData> {
    try {
      // Get thread with order info
      const { data: thread, error: threadError } = await supabase
        .from('chat_threads')
        .select('order_id, line_item_id, user_id')
        .eq('id', threadId)
        .maybeSingle();

      if (threadError) throw threadError;
      if (!thread?.order_id) {
        return {
          hasOrder: false,
          dynamicContent: {},
        };
      }

      // Load order details
      const { data: order, error: orderError } = await supabase
        .from('shopify_orders')
        .select(`
          id,
          order_number,
          order_date,
          customer_first_name,
          customer_last_name,
          customer_email,
          total_price
        `)
        .eq('id', thread.order_id)
        .maybeSingle();

      if (orderError) throw orderError;
      if (!order) {
        return {
          hasOrder: false,
          dynamicContent: {},
        };
      }

      // Load line items
      const { data: lineItems, error: lineItemsError } = await supabase
        .from('shopify_order_line_items')
        .select(`
          id,
          product_name,
          variant_title,
          quantity,
          price,
          product_id,
          variant_id,
          quote_id
        `)
        .eq('order_id', order.id);

      if (lineItemsError) throw lineItemsError;

      const orderInfo: OrderInfo = {
        id: order.id,
        orderNumber: order.order_number,
        orderDate: new Date(order.order_date),
        customerName: `${order.customer_first_name || ''} ${order.customer_last_name || ''}`.trim(),
        customerEmail: order.customer_email,
        totalPrice: order.total_price,
        lineItems: (lineItems || []).map(item => ({
          id: item.id,
          productName: item.product_name,
          variantTitle: item.variant_title || undefined,
          quantity: item.quantity,
          price: item.price,
          productId: item.product_id || undefined,
          variantId: item.variant_id || undefined,
          quoteId: item.quote_id || undefined,
        })),
      };

      // Load warranty status
      const warrantyStatus = await getOrderWarrantyStatus(order.id);
      if (warrantyStatus) {
        orderInfo.warrantyStatus = warrantyStatus;
      }

      // Load warranty context
      const warranty = await getFlowWarrantyContext(order.id);

      // Find selected line item
      const selectedLineItem = thread.line_item_id
        ? orderInfo.lineItems.find(item => item.id === thread.line_item_id)
        : undefined;

      // Generate dynamic content
      const dynamicContent = this.generateDynamicContent(orderInfo, warranty, selectedLineItem);

      return {
        hasOrder: true,
        order: orderInfo,
        warranty,
        selectedLineItem,
        dynamicContent,
      };
    } catch (error) {
      console.error('Error loading flow context:', error);
      return {
        hasOrder: false,
        dynamicContent: {},
      };
    }
  }

  /**
   * Generate dynamic content blocks for flows
   */
  private generateDynamicContent(
    order: OrderInfo,
    warranty: FlowWarrantyContext,
    selectedLineItem?: OrderLineItemInfo
  ): Record<string, string> {
    const content: Record<string, string> = {};

    // Warranty display content
    if (warranty.hasOrder && order.warrantyStatus) {
      const warrantyDisplay = this.formatWarrantyDisplay(order.warrantyStatus, selectedLineItem);
      content['product_warranty'] = warrantyDisplay;
    } else {
      content['product_warranty'] = '⚠️ **No Warranty Information Available**\n\nCannot find warranty details for this order.';
    }

    // Order summary
    content['order_summary'] = this.formatOrderSummary(order, selectedLineItem);

    return content;
  }

  /**
   * Format warranty display for the flow
   */
  private formatWarrantyDisplay(warrantyStatus: OrderWarrantyStatus, selectedLineItem?: OrderLineItemInfo): string {
    if (!selectedLineItem) {
      // Show all items
      const lines = ['**📋 ORDER WARRANTY STATUS**\n'];

      warrantyStatus.items.forEach(item => {
        const status = formatWarrantyStatus(item.warranty);
        const coverage = getCoverageDescription(item.warranty);

        lines.push(`**${item.productName}**${item.variantTitle ? ` - ${item.variantTitle}` : ''}`);
        lines.push(`• Status: ${status.badge.text} ${status.message}`);
        lines.push(`• Coverage: ${coverage}`);
        lines.push('');
      });

      return lines.join('\n');
    }

    // Show specific item warranty
    const item = warrantyStatus.items.find(i =>
      i.productName === selectedLineItem.productName &&
      i.variantTitle === selectedLineItem.variantTitle
    );

    if (!item) {
      return '⚠️ **No Warranty Information**\n\nCannot find warranty details for the selected product.';
    }

    const status = formatWarrantyStatus(item.warranty);
    const coverage = getCoverageDescription(item.warranty);

    return `**📦 PRODUCT WARRANTY STATUS**

**Product:** ${item.productName}${item.variantTitle ? ` - ${item.variantTitle}` : ''}

**Status:** ${status.badge.text}
${status.message}

**Coverage:** ${coverage}

**What This Means:**
${this.getWarrantyGuidance(item.warranty.status, item.warranty.coversDamagedItems)}`;
  }

  /**
   * Get guidance text based on warranty status
   */
  private getWarrantyGuidance(status: string, coversDamaged: boolean): string {
    if (status === 'active' && coversDamaged) {
      return '✅ Manufacturing defects are covered - approve free replacements immediately.';
    }
    if (status === 'active' && !coversDamaged) {
      return '⚠️ Warranty is active but damage coverage depends on warranty terms.';
    }
    if (status === 'expired' && coversDamaged) {
      return '⏰ Warranty expired but factory may still cover manufacturing defects - forward for review.';
    }
    return '❌ Warranty expired - forward to factory for goodwill consideration.';
  }

  /**
   * Format order summary
   */
  private formatOrderSummary(order: OrderInfo, selectedLineItem?: OrderLineItemInfo): string {
    const lines = [
      `**📦 Order ${order.orderNumber}**`,
      `• Customer: ${order.customerName}`,
      `• Email: ${order.customerEmail}`,
      `• Date: ${order.orderDate.toLocaleDateString()}`,
    ];

    if (selectedLineItem) {
      lines.push('');
      lines.push('**Selected Product:**');
      lines.push(`• ${selectedLineItem.productName}`);
      if (selectedLineItem.variantTitle) {
        lines.push(`• Variant: ${selectedLineItem.variantTitle}`);
      }
      lines.push(`• Quantity: ${selectedLineItem.quantity}`);
    } else {
      lines.push('');
      lines.push('**Items:**');
      order.lineItems.forEach(item => {
        lines.push(`• ${item.productName}${item.variantTitle ? ` (${item.variantTitle})` : ''} x${item.quantity}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Get dynamic content for a specific node
   */
  async getNodeContent(threadId: string, nodeId: string, defaultContent: string): Promise<string> {
    const context = await this.loadOrderContext(threadId);

    // Check if this node has dynamic content
    if (context.dynamicContent[nodeId]) {
      return context.dynamicContent[nodeId];
    }

    return defaultContent;
  }

  /**
   * Check if line item is selected for thread
   */
  async hasLineItemSelection(threadId: string): Promise<boolean> {
    const { data: thread } = await supabase
      .from('chat_threads')
      .select('line_item_id')
      .eq('id', threadId)
      .maybeSingle();

    return !!thread?.line_item_id;
  }

  /**
   * Get suggested templates based on context
   */
  getSuggestedTemplates(warranty: FlowWarrantyContext, damageType: string): string[] {
    const templates: string[] = [];

    if (warranty.orderWarrantyStatus === 'active' && damageType === 'manufacturing_defect') {
      templates.push('damage_replacement_approved', 'replacement_shipment');
    } else if (warranty.orderWarrantyStatus === 'expired' && damageType === 'manufacturing_defect') {
      templates.push('damage_factory_review', 'awaiting_decision');
    } else if (damageType === 'customer_caused') {
      templates.push('damage_not_covered', 'goodwill_offer');
    } else if (damageType === 'shipping_damage') {
      templates.push('damage_replacement_approved', 'replacement_shipment');
    }

    return templates;
  }
}

export const flowContextService = new FlowContextService();
