import { supabase } from './supabase';
import type { Database } from '../types/database';

type PreShipmentIssue = Database['public']['Tables']['pre_shipment_issues']['Row'];
type PreShipmentResolution = Database['public']['Tables']['pre_shipment_resolutions']['Row'];
type IssueNotification = Database['public']['Tables']['issue_notifications']['Row'];
type AutomatedIssueRule = Database['public']['Tables']['automated_issue_rules']['Row'];

export interface IssueWithDetails extends PreShipmentIssue {
  order?: {
    order_number: string;
    customer_email: string;
    total_price: number;
  };
  line_item?: {
    product_name: string;
    variant_name: string;
    quantity: number;
    unit_price: number;
  };
  resolution?: PreShipmentResolution;
  chat_thread?: {
    id: string;
    subject: string;
  };
}

export interface CreateIssueParams {
  userId: string;
  orderId?: string;
  lineItemId?: string;
  issueType: PreShipmentIssue['issue_type'];
  severity: PreShipmentIssue['severity'];
  description: string;
  affectedQuantity?: number;
  originalSku?: string;
  originalProductName?: string;
  originalUnitPrice?: number;
  originalUnitCost?: number;
  metadata?: any;
  detectedBy?: string;
  detectedByAdminId?: string;
}

export interface CreateResolutionParams {
  issueId: string;
  resolutionType: PreShipmentResolution['resolution_type'];
  substituteSku?: string;
  substituteProductName?: string;
  substituteLineItemId?: string;
  substituteUnitPrice?: number;
  substituteUnitCost?: number;
  priceAdjustment?: number;
  costAdjustment?: number;
  shippingAdjustment?: number;
  refundAmount?: number;
  invoiceId?: string;
  quoteId?: string;
  adminNotes?: string;
  internalNotes?: string;
  resolvedById: string;
  autoResolved?: boolean;
}

export interface IssueFilters {
  userId?: string;
  orderId?: string;
  status?: PreShipmentIssue['status'] | 'all';
  issueType?: PreShipmentIssue['issue_type'];
  severity?: PreShipmentIssue['severity'];
  dateFrom?: string;
  dateTo?: string;
  hasUnresolvedOnly?: boolean;
}

export interface IssueStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  unresolved: number;
  resolved: number;
  by_type: Record<string, number>;
  avg_resolution_time_hours: number;
}

export const preShipmentIssueService = {
  /**
   * Create a new pre-shipment issue
   */
  async createIssue(params: CreateIssueParams): Promise<IssueWithDetails> {
    const { data: issue, error } = await supabase
      .from('pre_shipment_issues')
      .insert({
        user_id: params.userId,
        order_id: params.orderId,
        line_item_id: params.lineItemId,
        issue_type: params.issueType,
        severity: params.severity,
        description: params.description,
        affected_quantity: params.affectedQuantity || 1,
        original_sku: params.originalSku,
        original_product_name: params.originalProductName,
        original_unit_price: params.originalUnitPrice,
        original_unit_cost: params.originalUnitCost,
        metadata: params.metadata || {},
        detected_by: params.detectedBy || 'system',
        detected_by_admin_id: params.detectedByAdminId,
      })
      .select()
      .single();

    if (error) throw error;

    // Check if there are automated rules that should be triggered
    await this.checkAutomatedRules(issue.id, issue.issue_type, issue.severity);

    return await this.getIssueById(issue.id);
  },

  /**
   * Get issue by ID with all related data
   */
  async getIssueById(issueId: string): Promise<IssueWithDetails> {
    const { data: issue, error } = await supabase
      .from('pre_shipment_issues')
      .select(`
        *,
        order:shopify_orders (
          order_number,
          customer_email,
          total_price
        ),
        line_item:order_line_items (
          product_name,
          variant_name,
          quantity,
          unit_price
        ),
        chat_thread:chat_threads (
          id,
          subject
        )
      `)
      .eq('id', issueId)
      .single();

    if (error) throw error;

    // Get resolution if exists
    const { data: resolution } = await supabase
      .from('pre_shipment_resolutions')
      .select('*')
      .eq('issue_id', issueId)
      .maybeSingle();

    return {
      ...issue,
      resolution: resolution || undefined,
    };
  },

  /**
   * Get all issues with filters
   */
  async getIssues(
    filters?: IssueFilters,
    page = 1,
    pageSize = 50
  ): Promise<{ data: IssueWithDetails[]; count: number }> {
    let query = supabase
      .from('pre_shipment_issues')
      .select(`
        *,
        order:shopify_orders (
          order_number,
          customer_email,
          total_price
        ),
        line_item:order_line_items (
          product_name,
          variant_name,
          quantity,
          unit_price
        ),
        chat_thread:chat_threads (
          id,
          subject
        )
      `, { count: 'exact' });

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.orderId) {
      query = query.eq('order_id', filters.orderId);
    }

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.issueType) {
      query = query.eq('issue_type', filters.issueType);
    }

    if (filters?.severity) {
      query = query.eq('severity', filters.severity);
    }

    if (filters?.dateFrom) {
      query = query.gte('detected_at', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('detected_at', filters.dateTo);
    }

    if (filters?.hasUnresolvedOnly) {
      query = query.in('status', ['detected', 'notified', 'pending_customer', 'pending_admin', 'in_progress']);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order('detected_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    // Fetch resolutions for all issues
    const issueIds = data?.map(i => i.id) || [];
    const { data: resolutions } = await supabase
      .from('pre_shipment_resolutions')
      .select('*')
      .in('issue_id', issueIds);

    const resolutionMap = new Map(resolutions?.map(r => [r.issue_id, r]));

    return {
      data: (data || []).map(issue => ({
        ...issue,
        resolution: resolutionMap.get(issue.id),
      })),
      count: count || 0,
    };
  },

  /**
   * Get issues for a specific order
   */
  async getOrderIssues(orderId: string): Promise<IssueWithDetails[]> {
    const { data, error } = await supabase
      .from('pre_shipment_issues')
      .select(`
        *,
        line_item:order_line_items (
          product_name,
          variant_name,
          quantity,
          unit_price
        )
      `)
      .eq('order_id', orderId)
      .order('detected_at', { ascending: false });

    if (error) throw error;

    // Fetch resolutions
    const issueIds = data?.map(i => i.id) || [];
    const { data: resolutions } = await supabase
      .from('pre_shipment_resolutions')
      .select('*')
      .in('issue_id', issueIds);

    const resolutionMap = new Map(resolutions?.map(r => [r.issue_id, r]));

    return (data || []).map(issue => ({
      ...issue,
      resolution: resolutionMap.get(issue.id),
    }));
  },

  /**
   * Update issue status
   */
  async updateIssueStatus(
    issueId: string,
    status: PreShipmentIssue['status'],
    adminId?: string
  ): Promise<void> {
    const updates: any = { status };

    if (status === 'resolved') {
      updates.resolved_at = new Date().toISOString();
    }

    if (status === 'notified') {
      updates.notified_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('pre_shipment_issues')
      .update(updates)
      .eq('id', issueId);

    if (error) throw error;
  },

  /**
   * Create a resolution for an issue
   */
  async createResolution(params: CreateResolutionParams): Promise<PreShipmentResolution> {
    // Calculate adjustments if substitution
    const priceAdjustment = params.priceAdjustment || 0;
    const costAdjustment = params.costAdjustment || 0;
    const shippingAdjustment = params.shippingAdjustment || 0;

    const { data: resolution, error } = await supabase
      .from('pre_shipment_resolutions')
      .insert({
        issue_id: params.issueId,
        resolution_type: params.resolutionType,
        substitute_sku: params.substituteSku,
        substitute_product_name: params.substituteProductName,
        substitute_line_item_id: params.substituteLineItemId,
        substitute_unit_price: params.substituteUnitPrice,
        substitute_unit_cost: params.substituteUnitCost,
        price_adjustment: priceAdjustment,
        cost_adjustment: costAdjustment,
        shipping_adjustment: shippingAdjustment,
        refund_amount: params.refundAmount || 0,
        invoice_adjusted: !!params.invoiceId,
        invoice_id: params.invoiceId,
        quote_adjusted: !!params.quoteId,
        quote_id: params.quoteId,
        admin_notes: params.adminNotes,
        internal_notes: params.internalNotes,
        resolved_by_id: params.resolvedById,
        auto_resolved: params.autoResolved || false,
      })
      .select()
      .single();

    if (error) throw error;

    // Update issue status to resolved
    await this.updateIssueStatus(params.issueId, 'resolved', params.resolvedById);

    return resolution;
  },

  /**
   * Approve a resolution (customer approval)
   */
  async approveResolution(resolutionId: string, userId: string, response?: any): Promise<void> {
    const { error } = await supabase
      .from('pre_shipment_resolutions')
      .update({
        customer_approved: true,
        customer_approved_at: new Date().toISOString(),
        customer_response: response || null,
      })
      .eq('id', resolutionId);

    if (error) throw error;
  },

  /**
   * Reject a resolution (customer rejection)
   */
  async rejectResolution(resolutionId: string, userId: string, reason?: string): Promise<void> {
    const { error } = await supabase
      .from('pre_shipment_resolutions')
      .update({
        customer_approved: false,
        customer_approved_at: new Date().toISOString(),
        customer_response: { rejected: true, reason },
      })
      .eq('id', resolutionId);

    if (error) throw error;

    // Get the issue and set it back to pending_admin
    const { data: resolution } = await supabase
      .from('pre_shipment_resolutions')
      .select('issue_id')
      .eq('id', resolutionId)
      .single();

    if (resolution) {
      await this.updateIssueStatus(resolution.issue_id, 'pending_admin');
    }
  },

  /**
   * Get issue statistics
   */
  async getIssueStats(userId?: string): Promise<IssueStats> {
    let query = supabase.from('pre_shipment_issues').select('*');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: issues, error } = await query;

    if (error) throw error;

    const stats: IssueStats = {
      total: issues?.length || 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      unresolved: 0,
      resolved: 0,
      by_type: {},
      avg_resolution_time_hours: 0,
    };

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    issues?.forEach(issue => {
      // Count by severity
      if (issue.severity === 'critical') stats.critical++;
      if (issue.severity === 'high') stats.high++;
      if (issue.severity === 'medium') stats.medium++;
      if (issue.severity === 'low') stats.low++;

      // Count by status
      if (issue.status === 'resolved') {
        stats.resolved++;

        // Calculate resolution time
        if (issue.resolved_at) {
          const detectedAt = new Date(issue.detected_at);
          const resolvedAt = new Date(issue.resolved_at);
          const hours = (resolvedAt.getTime() - detectedAt.getTime()) / (1000 * 60 * 60);
          totalResolutionTime += hours;
          resolvedCount++;
        }
      } else {
        stats.unresolved++;
      }

      // Count by type
      stats.by_type[issue.issue_type] = (stats.by_type[issue.issue_type] || 0) + 1;
    });

    if (resolvedCount > 0) {
      stats.avg_resolution_time_hours = Math.round(totalResolutionTime / resolvedCount);
    }

    return stats;
  },

  /**
   * Check and apply automated rules
   */
  async checkAutomatedRules(
    issueId: string,
    issueType: string,
    severity: string
  ): Promise<void> {
    const { data: rules, error } = await supabase
      .from('automated_issue_rules')
      .select('*')
      .eq('is_active', true)
      .eq('issue_type', issueType)
      .order('priority', { ascending: true });

    if (error || !rules || rules.length === 0) return;

    // Apply the first matching rule
    const rule = rules[0];

    // Handle different auto actions
    switch (rule.auto_action) {
      case 'notify_customer':
        await this.sendIssueNotification(issueId, 'customer');
        break;
      case 'notify_admin':
        await this.sendIssueNotification(issueId, 'admin');
        break;
      case 'start_flow':
        // Flow will be started by the chat system
        await this.updateIssueStatus(issueId, 'notified');
        break;
    }
  },

  /**
   * Send notification about an issue
   */
  async sendIssueNotification(
    issueId: string,
    recipientType: 'customer' | 'admin'
  ): Promise<void> {
    const issue = await this.getIssueById(issueId);

    const { error } = await supabase
      .from('issue_notifications')
      .insert({
        issue_id: issueId,
        notification_type: 'chat_message',
        recipient_id: recipientType === 'customer' ? issue.user_id : undefined,
        recipient_type: recipientType,
        subject: `Pre-Shipment Issue: ${issue.issue_type}`,
        content: {
          issue_type: issue.issue_type,
          severity: issue.severity,
          description: issue.description,
          order_number: issue.order?.order_number,
        },
      });

    if (error) throw error;

    // Update issue status
    await this.updateIssueStatus(issueId, 'notified');
  },

  /**
   * Get notifications for an issue
   */
  async getIssueNotifications(issueId: string): Promise<IssueNotification[]> {
    const { data, error } = await supabase
      .from('issue_notifications')
      .select('*')
      .eq('issue_id', issueId)
      .order('sent_at', { ascending: false });

    if (error) throw error;

    return data || [];
  },

  /**
   * Get all automated rules
   */
  async getAutomatedRules(): Promise<AutomatedIssueRule[]> {
    const { data, error } = await supabase
      .from('automated_issue_rules')
      .select('*')
      .order('priority', { ascending: true });

    if (error) throw error;

    return data || [];
  },

  /**
   * Detect issues for an order (called when order is created/updated)
   */
  async detectOrderIssues(orderId: string, userId: string): Promise<IssueWithDetails[]> {
    // This would be called by order webhooks to automatically detect issues
    // For now, this is a placeholder that would contain business logic for:
    // - Checking inventory levels
    // - Validating product availability
    // - Checking for quality flags
    // - Verifying shipping restrictions

    const detectedIssues: IssueWithDetails[] = [];

    // Example: Check line items for issues
    const { data: lineItems } = await supabase
      .from('order_line_items')
      .select('*')
      .eq('shopify_order_id', orderId);

    // Business logic would go here to detect actual issues

    return detectedIssues;
  },

  /**
   * Subscribe to issue changes
   */
  subscribeToIssueChanges(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`pre_shipment_issues:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pre_shipment_issues',
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();
  },
};
