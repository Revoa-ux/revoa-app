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
    'shipping:not_updating:less_than_7': 'order_status_shipped',
    'shipping:not_updating:7_plus_days': '5dd91fc3-cb2d-48cc-8f4f-b80d874a918d',
    'shipping:not_updating:delivered_2_plus': 'delivery_status_2_plus_days',

    'shipping:delayed:just_update': '5dd91fc3-cb2d-48cc-8f4f-b80d874a918d',
    'shipping:delayed:wants_refund': 'shipping_complaint',

    'shipping:lost:no_updates_14': 'lost_package_protocol',
    'shipping:lost:returned': 'package_returned_to_warehouse',
    'shipping:lost:delivered_not_received': 'delivery_status_delivered_not_received',

    'shipping:delivery_failed:not_home': 'delivery_exception_general',
    'shipping:delivery_failed:invalid_address': 'invalid_address_exception',
    'shipping:delivery_failed:no_access': 'no_access_exception',
    'shipping:delivery_failed:no_such_number': 'no_such_number_exception',
    'shipping:delivery_failed:payment_hold': 'carrier_payment_hold',
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
    };

    const category = fallbackCategories[flowCategory] || 'general';

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
