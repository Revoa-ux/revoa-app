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
  relevanceScore: number;
}

interface OrderContext {
  status?: string;
  fulfillment_status?: string;
  financial_status?: string;
  has_tracking?: boolean;
  is_delivered?: boolean;
}

export class FlowTemplateRecommendationService {
  async getRecommendedTemplatesForFlowCompletion(
    flowCategory: string,
    flowState: FlowState,
    orderContext?: OrderContext
  ): Promise<TemplateRecommendation[]> {
    try {
      const { data: templates, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      if (!templates) return [];

      const scoredTemplates = templates.map(template => ({
        ...template,
        description: template.description || template.name,
        relevanceScore: this.calculateRelevanceScore(
          template,
          flowCategory,
          flowState,
          orderContext
        )
      }))
      .filter(t => t.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

      return scoredTemplates.slice(0, 3);
    } catch (error) {
      console.error('Error getting template recommendations:', error);
      return [];
    }
  }

  private calculateRelevanceScore(
    template: any,
    flowCategory: string,
    flowState: FlowState,
    orderContext?: OrderContext
  ): number {
    let score = 0;

    // Extract key scenario data from flow state
    const shippingIssueType = flowState.shipping_issue_type?.response;
    const damageType = flowState.damage_assessment?.response;
    const returnReason = flowState.return_reason?.response;

    // Match by flow category (highest priority)
    if (this.matchesFlowCategory(template.category, flowCategory, shippingIssueType, damageType)) {
      score += 100;
    }

    // Match by specific scenario
    if (shippingIssueType) {
      score += this.matchShippingScenario(template, shippingIssueType);
    }

    if (damageType) {
      score += this.matchDamageScenario(template, damageType);
    }

    // Match by order status hints
    if (orderContext) {
      score += this.matchOrderStatus(template, orderContext);
    }

    // Boost frequently used templates slightly
    if (template.usage_count > 10) {
      score += 5;
    }

    // Use sort_order as tiebreaker (lower = higher priority)
    score -= (template.sort_order || 999) * 0.1;

    return score;
  }

  private matchesFlowCategory(
    templateCategory: string,
    flowCategory: string,
    shippingIssueType?: string,
    damageType?: string
  ): boolean {
    // Direct category match
    if (templateCategory === flowCategory) return true;

    // Shipping flow special handling
    if (flowCategory === 'shipping') {
      if (shippingIssueType === 'not_updating' && templateCategory === 'order_status') return true;
      if (shippingIssueType === 'delayed' && templateCategory === 'shipping') return true;
      if (shippingIssueType === 'lost' && templateCategory === 'delivery_exception') return true;
      if (shippingIssueType === 'delivery_failed' && templateCategory === 'delivery_exception') return true;
    }

    // Damage flow handling
    if (flowCategory === 'damage') {
      if (templateCategory === 'damaged' || templateCategory === 'defective' || templateCategory === 'quality') {
        return true;
      }
    }

    return false;
  }

  private matchShippingScenario(template: any, issueType: string): number {
    const badges = template.badges || [];
    const category = template.category;

    switch (issueType) {
      case 'not_updating':
        if (badges.includes('Shipped') || badges.includes('Follow Up')) return 50;
        if (category === 'order_status') return 30;
        break;

      case 'delayed':
        if (badges.includes('Shipped') || badges.includes('Follow Up')) return 50;
        if (template.name.toLowerCase().includes('delay')) return 40;
        break;

      case 'lost':
        if (category === 'delivery_exception') return 50;
        if (template.name.toLowerCase().includes('lost')) return 40;
        if (badges.includes('Delivery Exception')) return 30;
        break;

      case 'delivery_failed':
        if (badges.includes('Delivery Exception')) return 50;
        if (category === 'delivery_exception') return 40;
        if (template.name.toLowerCase().includes('failed') ||
            template.name.toLowerCase().includes('exception')) return 30;
        break;
    }

    return 0;
  }

  private matchDamageScenario(template: any, damageType: string): number {
    const category = template.category;
    const badges = template.badges || [];

    if (damageType === 'physical_damage' && category === 'damaged') return 50;
    if (damageType === 'not_working' && category === 'defective') return 50;
    if (damageType === 'quality_issue' && category === 'quality') return 50;
    if (badges.includes('Warranty Issue')) return 30;
    if (badges.includes('Need Reason')) return 20;

    return 0;
  }

  private matchOrderStatus(template: any, orderContext: OrderContext): number {
    const hints = template.order_status_hints || [];
    let score = 0;

    if (orderContext.status === 'pending' && hints.includes('pending')) score += 20;
    if (orderContext.status === 'pending' && hints.includes('not_shipped')) score += 20;
    if (orderContext.fulfillment_status === 'fulfilled' && hints.includes('shipped')) score += 20;
    if (orderContext.fulfillment_status === 'fulfilled' && hints.includes('in_transit')) score += 15;
    if (orderContext.is_delivered && hints.includes('delivered')) score += 25;

    return score;
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
        relevanceScore: 100
      }));
    } catch (error) {
      console.error('Error fetching templates by IDs:', error);
      return [];
    }
  }
}

export const flowTemplateRecommendation = new FlowTemplateRecommendationService();
