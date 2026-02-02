import { supabase } from './supabase';
import { preShipmentIssueService } from './preShipmentIssueService';
import { invoiceService } from './invoiceService';
import type { Database } from '../types/database';

type PreShipmentIssue = Database['public']['Tables']['pre_shipment_issues']['Row'];
type PreShipmentResolution = Database['public']['Tables']['pre_shipment_resolutions']['Row'];

export interface SubstitutionCalculation {
  originalPrice: number;
  originalCost: number;
  substitutePrice: number;
  substituteCost: number;
  priceAdjustment: number;
  costAdjustment: number;
  customerRefund: number;
  invoiceAdjustment: number;
}

export interface ResolutionProposal {
  resolutionType: PreShipmentResolution['resolution_type'];
  description: string;
  substituteSku?: string;
  substituteProductName?: string;
  substitutePriceDetails?: SubstitutionCalculation;
  refundAmount?: number;
  requiresCustomerApproval: boolean;
  estimatedResolutionTime?: string;
  alternatives?: ResolutionProposal[];
}

export const issueResolutionService = {
  /**
   * Calculate substitution pricing and adjustments
   */
  calculateSubstitution(
    originalPrice: number,
    originalCost: number,
    originalShipping: number,
    substitutePrice: number,
    substituteCost: number,
    substituteShipping: number,
    quantity: number = 1
  ): SubstitutionCalculation {
    const originalTotal = (originalPrice + originalShipping) * quantity;
    const originalCostTotal = (originalCost + originalShipping) * quantity;
    const substituteTotal = (substitutePrice + substituteShipping) * quantity;
    const substituteCostTotal = (substituteCost + substituteShipping) * quantity;

    const priceAdjustment = substitutePrice - originalPrice;
    const costAdjustment = substituteCost - originalCost;
    const shippingAdjustment = substituteShipping - originalShipping;

    // If substitute is cheaper, customer gets refund
    // If substitute is more expensive, we need customer approval
    const customerRefund = Math.max(0, originalTotal - substituteTotal);

    // Invoice adjustment is based on cost difference
    const invoiceAdjustment = substituteCostTotal - originalCostTotal;

    return {
      originalPrice,
      originalCost,
      substitutePrice,
      substituteCost,
      priceAdjustment: priceAdjustment * quantity,
      costAdjustment: costAdjustment * quantity,
      customerRefund,
      invoiceAdjustment,
    };
  },

  /**
   * Propose resolution options for an issue
   */
  async proposeResolutions(issueId: string): Promise<ResolutionProposal[]> {
    const issue = await preShipmentIssueService.getIssueById(issueId);
    const proposals: ResolutionProposal[] = [];

    switch (issue.issue_type) {
      case 'inventory_shortage':
      case 'out_of_stock':
        proposals.push({
          resolutionType: 'substitution',
          description: 'Substitute with a similar product',
          requiresCustomerApproval: true,
          estimatedResolutionTime: '1-2 business days',
        });
        proposals.push({
          resolutionType: 'refund',
          description: 'Full refund for unavailable items',
          refundAmount: (issue.original_unit_price || 0) * issue.affected_quantity,
          requiresCustomerApproval: false,
          estimatedResolutionTime: '3-5 business days',
        });
        proposals.push({
          resolutionType: 'delay',
          description: 'Wait for restocking',
          requiresCustomerApproval: true,
          estimatedResolutionTime: '7-14 business days',
        });
        break;

      case 'quality_issue':
      case 'damage_detected':
        proposals.push({
          resolutionType: 'substitution',
          description: 'Replace with a new unit',
          requiresCustomerApproval: false,
          estimatedResolutionTime: '2-3 business days',
        });
        proposals.push({
          resolutionType: 'refund',
          description: 'Full refund for defective items',
          refundAmount: (issue.original_unit_price || 0) * issue.affected_quantity,
          requiresCustomerApproval: false,
          estimatedResolutionTime: '3-5 business days',
        });
        break;

      case 'supplier_delay':
        proposals.push({
          resolutionType: 'delay',
          description: 'Proceed with delayed shipment',
          requiresCustomerApproval: true,
          estimatedResolutionTime: issue.metadata?.estimated_delay || 'Unknown',
        });
        proposals.push({
          resolutionType: 'substitution',
          description: 'Substitute with in-stock alternative',
          requiresCustomerApproval: true,
          estimatedResolutionTime: '1-2 business days',
        });
        proposals.push({
          resolutionType: 'cancellation',
          description: 'Cancel order and issue full refund',
          refundAmount: (issue.original_unit_price || 0) * issue.affected_quantity,
          requiresCustomerApproval: false,
          estimatedResolutionTime: 'Immediate',
        });
        break;

      case 'variant_mismatch':
      case 'pricing_error':
        proposals.push({
          resolutionType: 'manual_resolution',
          description: 'Admin will manually resolve this issue',
          requiresCustomerApproval: true,
          estimatedResolutionTime: '1 business day',
        });
        break;

      default:
        proposals.push({
          resolutionType: 'manual_resolution',
          description: 'Contact customer service for resolution',
          requiresCustomerApproval: true,
          estimatedResolutionTime: '1-2 business days',
        });
    }

    return proposals;
  },

  /**
   * Execute a substitution resolution
   */
  async executeSubstitution(
    issueId: string,
    substituteSku: string,
    substituteProductName: string,
    substituteUnitPrice: number,
    substituteUnitCost: number,
    adminId: string,
    adminNotes?: string
  ): Promise<PreShipmentResolution> {
    const issue = await preShipmentIssueService.getIssueById(issueId);

    // Calculate pricing adjustments
    const originalPrice = issue.original_unit_price || 0;
    const originalCost = issue.original_unit_cost || 0;
    const calculation = this.calculateSubstitution(
      originalPrice,
      originalCost,
      0, // Original shipping
      substituteUnitPrice,
      substituteUnitCost,
      0, // Substitute shipping (would come from quote system)
      issue.affected_quantity
    );

    // Find related invoice if exists
    let invoiceId: string | undefined;
    if (issue.order_id) {
      const { data: invoice } = await supabase
        .from('invoices')
        .select('id')
        .contains('shopify_order_ids', [issue.order_id])
        .maybeSingle();

      invoiceId = invoice?.id;
    }

    // Find related quote if exists
    let quoteId: string | undefined;
    if (issue.original_sku) {
      const { data: quote } = await supabase
        .from('product_quotes')
        .select('id')
        .eq('user_id', issue.user_id)
        .eq('status', 'accepted')
        .maybeSingle();

      quoteId = quote?.id;
    }

    // Create resolution
    const resolution = await preShipmentIssueService.createResolution({
      issueId,
      resolutionType: 'substitution',
      substituteSku,
      substituteProductName,
      substituteUnitPrice,
      substituteUnitCost,
      priceAdjustment: calculation.priceAdjustment,
      costAdjustment: calculation.costAdjustment,
      shippingAdjustment: 0,
      refundAmount: calculation.customerRefund,
      invoiceId,
      quoteId,
      adminNotes,
      resolvedById: adminId,
    });

    // If there's a customer refund, we need customer notification
    if (calculation.customerRefund > 0) {
      await preShipmentIssueService.sendIssueNotification(issueId, 'customer');
    }

    return resolution;
  },

  /**
   * Execute a refund resolution
   */
  async executeRefund(
    issueId: string,
    refundAmount: number,
    adminId: string,
    reason?: string
  ): Promise<PreShipmentResolution> {
    const issue = await preShipmentIssueService.getIssueById(issueId);

    // Find related invoice
    let invoiceId: string | undefined;
    if (issue.order_id) {
      const { data: invoice } = await supabase
        .from('invoices')
        .select('id')
        .contains('shopify_order_ids', [issue.order_id])
        .maybeSingle();

      invoiceId = invoice?.id;
    }

    // Create resolution
    const resolution = await preShipmentIssueService.createResolution({
      issueId,
      resolutionType: 'refund',
      refundAmount,
      priceAdjustment: -refundAmount,
      costAdjustment: -(issue.original_unit_cost || 0) * issue.affected_quantity,
      invoiceId,
      adminNotes: reason,
      resolvedById: adminId,
    });

    // Notify customer
    await preShipmentIssueService.sendIssueNotification(issueId, 'customer');

    return resolution;
  },

  /**
   * Execute a cancellation resolution
   */
  async executeCancellation(
    issueId: string,
    adminId: string,
    reason?: string
  ): Promise<PreShipmentResolution> {
    const issue = await preShipmentIssueService.getIssueById(issueId);

    const refundAmount = (issue.original_unit_price || 0) * issue.affected_quantity;
    const costAmount = (issue.original_unit_cost || 0) * issue.affected_quantity;

    // Find related invoice
    let invoiceId: string | undefined;
    if (issue.order_id) {
      const { data: invoice } = await supabase
        .from('invoices')
        .select('id')
        .contains('shopify_order_ids', [issue.order_id])
        .maybeSingle();

      invoiceId = invoice?.id;
    }

    // Create resolution
    const resolution = await preShipmentIssueService.createResolution({
      issueId,
      resolutionType: 'cancellation',
      refundAmount,
      priceAdjustment: -refundAmount,
      costAdjustment: -costAmount,
      invoiceId,
      adminNotes: reason,
      resolvedById: adminId,
    });

    // Update order line item status if applicable
    if (issue.line_item_id) {
      await supabase
        .from('order_line_items')
        .update({ issue_status: 'cancelled' })
        .eq('id', issue.line_item_id);
    }

    // Notify customer
    await preShipmentIssueService.sendIssueNotification(issueId, 'customer');

    return resolution;
  },

  /**
   * Execute a delay acceptance resolution
   */
  async executeDelayAcceptance(
    issueId: string,
    newEstimatedDate: string,
    adminId: string
  ): Promise<PreShipmentResolution> {
    const issue = await preShipmentIssueService.getIssueById(issueId);

    // Create resolution
    const resolution = await preShipmentIssueService.createResolution({
      issueId,
      resolutionType: 'delay',
      adminNotes: `New estimated ship date: ${newEstimatedDate}`,
      internalNotes: JSON.stringify({ new_estimated_date: newEstimatedDate }),
      resolvedById: adminId,
    });

    // Update issue metadata
    await supabase
      .from('pre_shipment_issues')
      .update({
        metadata: {
          ...issue.metadata,
          new_estimated_ship_date: newEstimatedDate,
        },
      })
      .eq('id', issueId);

    // Notify customer
    await preShipmentIssueService.sendIssueNotification(issueId, 'customer');

    return resolution;
  },

  /**
   * Get suggested substitutes for a product
   */
  async getSuggestedSubstitutes(issueId: string): Promise<any[]> {
    const issue = await preShipmentIssueService.getIssueById(issueId);

    // This would query the product catalog for similar items
    // For now, return empty array as placeholder
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('approval_status', 'approved')
      .limit(5);

    return products || [];
  },

  /**
   * Calculate impact on invoice for a resolution
   */
  async calculateInvoiceImpact(resolutionId: string): Promise<{
    originalAmount: number;
    adjustedAmount: number;
    difference: number;
    breakdown: any;
  }> {
    const { data: resolution } = await supabase
      .from('pre_shipment_resolutions')
      .select(`
        *,
        issue:pre_shipment_issues (*)
      `)
      .eq('id', resolutionId)
      .single();

    if (!resolution || !resolution.invoice_id) {
      return {
        originalAmount: 0,
        adjustedAmount: 0,
        difference: 0,
        breakdown: {},
      };
    }

    const invoice = await invoiceService.getInvoiceById(resolution.invoice_id);
    if (!invoice) {
      return {
        originalAmount: 0,
        adjustedAmount: 0,
        difference: 0,
        breakdown: {},
      };
    }

    const originalAmount = invoice.amount;
    const totalAdjustment = resolution.total_adjustment || 0;
    const adjustedAmount = originalAmount + totalAdjustment;

    return {
      originalAmount,
      adjustedAmount,
      difference: totalAdjustment,
      breakdown: {
        price_adjustment: resolution.price_adjustment,
        cost_adjustment: resolution.cost_adjustment,
        shipping_adjustment: resolution.shipping_adjustment,
        refund_amount: resolution.refund_amount,
      },
    };
  },

  /**
   * Bulk resolve issues with same resolution
   */
  async bulkResolve(
    issueIds: string[],
    resolutionType: PreShipmentResolution['resolution_type'],
    adminId: string,
    notes?: string
  ): Promise<PreShipmentResolution[]> {
    const resolutions: PreShipmentResolution[] = [];

    for (const issueId of issueIds) {
      const resolution = await preShipmentIssueService.createResolution({
        issueId,
        resolutionType,
        adminNotes: notes,
        resolvedById: adminId,
      });

      resolutions.push(resolution);
    }

    return resolutions;
  },

  /**
   * Get resolution history for a user
   */
  async getResolutionHistory(
    userId: string,
    limit = 50
  ): Promise<Array<PreShipmentResolution & { issue: PreShipmentIssue }>> {
    const { data, error } = await supabase
      .from('pre_shipment_resolutions')
      .select(`
        *,
        issue:pre_shipment_issues (*)
      `)
      .eq('issue.user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  },

  /**
   * Check if resolution requires customer approval
   */
  requiresCustomerApproval(
    resolutionType: PreShipmentResolution['resolution_type'],
    priceImpact: number
  ): boolean {
    // Refunds and cancellations don't require approval
    if (resolutionType === 'refund' || resolutionType === 'cancellation') {
      return false;
    }

    // Substitutions require approval if price increases
    if (resolutionType === 'substitution' && priceImpact > 0) {
      return true;
    }

    // Delays always require approval
    if (resolutionType === 'delay') {
      return true;
    }

    // Partial fulfillment requires approval
    if (resolutionType === 'partial_fulfillment') {
      return true;
    }

    // Manual resolutions typically require approval
    if (resolutionType === 'manual_resolution') {
      return true;
    }

    return false;
  },
};
