import { supabase } from './supabase';
import type { FlowState } from '../types/conversationalFlows';

interface TemplateRecommendation {
  id: string;
  name: string;
  description: string;
  category: string;
  badges: string[];
  subject_line: string;
  body_plain: string;
}

interface OrderContext {
  status?: string;
  fulfillment_status?: string;
  financial_status?: string;
  has_tracking?: boolean;
  is_delivered?: boolean;
}

interface FlowStateKey {
  shipping_issue_type?: string;
  not_updating_duration?: string;
  delayed_customer_intent?: string;
  lost_package_status?: string;
  failed_specific_reason?: string;
  damage_assessment?: string;
  return_reason?: string;
}

export class FlowTemplateRecommendationService {
  private templateMappings: Record<string, string> = {
    'shipping:not_updating:less_than_7': '5b0af7b3-3103-4683-a3a2-e7544f3d95ee', // Order Status: Shipped
    'shipping:not_updating:7_plus_days': '5dd91fc3-cb2d-48cc-8f4f-b80d874a918d', // Order Status Follow-Up
    'shipping:not_updating:delivered_2_plus': 'd8e5dfe7-0057-4254-b211-3a4ad941b61a', // Delivery Status: 2+ Days Not Located

    'shipping:delayed:just_update': '5dd91fc3-cb2d-48cc-8f4f-b80d874a918d', // Order Status Follow-Up
    'shipping:delayed:wants_refund': '5dd91fc3-cb2d-48cc-8f4f-b80d874a918d', // Order Status Follow-Up

    'shipping:lost:no_updates_14': '5dd91fc3-cb2d-48cc-8f4f-b80d874a918d', // Order Status Follow-Up
    'shipping:lost:returned': 'f7ab35da-e245-407a-b63c-08a049afadac', // Delivery Exception: Package Being Returned
    'shipping:lost:delivered_not_received': '48c75f44-c1f9-41e5-8df6-fffb44009439', // Delivery Status: Delivered Not Received

    'shipping:delivery_failed:not_home': 'f7ab35da-e245-407a-b63c-08a049afadac', // Delivery Exception: Package Being Returned
    'shipping:delivery_failed:invalid_address': 'd843b0e6-b02b-4425-b7a4-7ae851c36e6c', // Invalid Address Exception
    'shipping:delivery_failed:no_access': 'f7ab35da-e245-407a-b63c-08a049afadac', // Delivery Exception: Package Being Returned
    'shipping:delivery_failed:no_such_number': 'f7ab35da-e245-407a-b63c-08a049afadac', // Delivery Exception: Package Being Returned
    'shipping:delivery_failed:payment_hold': '0783c1c0-58f2-4479-ae5d-4c24c03efea7', // Carrier Payment Hold
  };

  async getRecommendedTemplatesForFlowCompletion(
    flowCategory: string,
    flowState: FlowState,
    orderContext?: OrderContext
  ): Promise<TemplateRecommendation[]> {
    try {
      console.log('[TemplateRecommendation] Getting single best template for:', {
        flowCategory,
        flowState,
        orderContext
      });

      const templateId = this.getSingleBestTemplate(flowCategory, flowState);

      if (!templateId) {
        console.log('[TemplateRecommendation] No direct mapping found, using fallback');
        return this.getFallbackTemplate(flowCategory);
      }

      console.log('[TemplateRecommendation] Mapped template ID:', templateId);

      const { data: template, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (!template) {
        console.log('[TemplateRecommendation] Template not found, using fallback');
        return this.getFallbackTemplate(flowCategory);
      }

      return [{
        ...template,
        description: template.description || template.name,
      }];
    } catch (error) {
      console.error('[TemplateRecommendation] Error getting template recommendation:', error);
      return this.getFallbackTemplate(flowCategory);
    }
  }

  private getSingleBestTemplate(flowCategory: string, flowState: FlowState): string | null {
    const stateKey = this.buildStateKey(flowCategory, flowState);
    console.log('[TemplateRecommendation] State key:', stateKey);

    const templateId = this.templateMappings[stateKey];
    return templateId || null;
  }

  private buildStateKey(flowCategory: string, flowState: FlowState): string {
    const parts: string[] = [flowCategory];

    if (flowCategory === 'shipping') {
      const issueType = flowState.shipping_issue_type?.response;
      if (!issueType) return '';

      parts.push(issueType);

      if (issueType === 'not_updating') {
        const duration = flowState.not_updating_duration?.response;
        if (duration) parts.push(duration);
      } else if (issueType === 'delayed') {
        const intent = flowState.delayed_customer_intent?.response;
        if (intent) parts.push(intent);
      } else if (issueType === 'lost') {
        const status = flowState.lost_package_status?.response;
        if (status) parts.push(status);
      } else if (issueType === 'delivery_failed') {
        const reason = flowState.failed_specific_reason?.response;
        if (reason) parts.push(reason);
      }
    } else if (flowCategory === 'damage') {
      const damageType = flowState.damage_assessment?.response;
      if (damageType) parts.push(damageType);
    } else if (flowCategory === 'return') {
      const returnReason = flowState.return_reason?.response;
      if (returnReason) parts.push(returnReason);
    }

    return parts.join(':');
  }

  private async getFallbackTemplate(flowCategory: string): Promise<TemplateRecommendation[]> {
    const fallbackCategories: Record<string, string> = {
      'shipping': 'order_status',
      'damage': 'damaged',
      'return': 'return',
      'refund': 'refund',
      'replacement': 'defective',
      'defective': 'defective',
      'cancel_modify': 'cancel',
      'missing_items': 'refund',
      'wrong_item': 'return',
      'pre_ship_inventory': 'order_status',
      'pre_ship_quality': 'quality',
      'pre_ship_supplier_delay': 'order_status',
      'pre_ship_variant_mismatch': 'order_status',
    };

    const category = fallbackCategories[flowCategory] || 'order_status';

    try {
      const { data: templates, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(1);

      if (error) throw error;

      return (templates || []).map(t => ({
        ...t,
        description: t.description || t.name,
      }));
    } catch (error) {
      console.error('[TemplateRecommendation] Error getting fallback template:', error);
      return [];
    }
  }

  async getTemplatesByIds(templateIds: string[]): Promise<TemplateRecommendation[]> {
    try {
      const { data: templates, error } = await supabase
        .from('email_templates')
        .select('*')
        .in('id', templateIds)
        .eq('is_active', true);

      if (error) throw error;

      return (templates || []).map(t => ({
        ...t,
        description: t.description || t.name,
      }));
    } catch (error) {
      console.error('Error fetching templates by IDs:', error);
      return [];
    }
  }
}

export const flowTemplateRecommendation = new FlowTemplateRecommendationService();
