import { supabase } from './supabase';
import type {
  RexSuggestion,
  RexSuggestionWithPerformance,
  RexSuggestionPerformance,
  RexSuggestionInteraction,
  RexSuggestionStatus,
  CreateRexSuggestionParams,
  RexAnalytics,
  RexEntityType
} from '@/types/rex';

export class RexSuggestionService {
  async getSuggestions(userId: string, status?: RexSuggestionStatus): Promise<RexSuggestion[]> {
    try {
      let query = supabase
        .from('rex_suggestions')
        .select('*')
        .eq('user_id', userId)
        .order('priority_score', { ascending: false })
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data as RexSuggestion[];
    } catch (error) {
      console.error('[RexSuggestion] Error fetching suggestions:', error);
      throw error;
    }
  }

  async getSuggestionsForEntity(
    userId: string,
    entityType: RexEntityType,
    entityId: string
  ): Promise<RexSuggestionWithPerformance[]> {
    try {
      const { data, error } = await supabase
        .from('rex_suggestions')
        .select(`
          *,
          performance:rex_suggestion_performance(*)
        `)
        .eq('user_id', userId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(item => ({
        ...item,
        performance: item.performance?.[0] || undefined
      })) as RexSuggestionWithPerformance[];
    } catch (error) {
      console.error('[RexSuggestion] Error fetching entity suggestions:', error);
      throw error;
    }
  }

  async getSuggestion(suggestionId: string): Promise<RexSuggestionWithPerformance | null> {
    try {
      const { data, error } = await supabase
        .from('rex_suggestions')
        .select(`
          *,
          performance:rex_suggestion_performance(*)
        `)
        .eq('id', suggestionId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        ...data,
        performance: data.performance?.[0] || undefined
      } as RexSuggestionWithPerformance;
    } catch (error) {
      console.error('[RexSuggestion] Error fetching suggestion:', error);
      throw error;
    }
  }

  async createSuggestion(params: CreateRexSuggestionParams): Promise<RexSuggestion> {
    try {
      const { data, error } = await supabase
        .from('rex_suggestions')
        .insert([params])
        .select()
        .single();

      if (error) throw error;

      return data as RexSuggestion;
    } catch (error) {
      console.error('[RexSuggestion] Error creating suggestion:', error);
      throw error;
    }
  }

  async updateStatus(
    suggestionId: string,
    status: RexSuggestionStatus,
    additionalData?: Partial<RexSuggestion>
  ): Promise<void> {
    try {
      const updateData: any = { status, ...additionalData };

      switch (status) {
        case 'viewed':
          updateData.viewed_at = new Date().toISOString();
          break;
        case 'accepted':
          updateData.accepted_at = new Date().toISOString();
          break;
        case 'applied':
          updateData.applied_at = new Date().toISOString();
          break;
        case 'dismissed':
          updateData.dismissed_at = new Date().toISOString();
          break;
        case 'expired':
          updateData.expired_at = new Date().toISOString();
          break;
        case 'completed':
          updateData.completed_at = new Date().toISOString();
          break;
      }

      const { error } = await supabase
        .from('rex_suggestions')
        .update(updateData)
        .eq('id', suggestionId);

      if (error) throw error;
    } catch (error) {
      console.error('[RexSuggestion] Error updating status:', error);
      throw error;
    }
  }

  async linkToAutomationRule(suggestionId: string, ruleId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('rex_suggestions')
        .update({
          automation_rule_id: ruleId,
          status: 'applied',
          applied_at: new Date().toISOString()
        })
        .eq('id', suggestionId);

      if (error) throw error;
    } catch (error) {
      console.error('[RexSuggestion] Error linking rule:', error);
      throw error;
    }
  }

  async logInteraction(
    suggestionId: string,
    userId: string,
    interactionType: RexSuggestionInteraction['interaction_type'],
    interactionData?: Record<string, any>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('rex_suggestion_interactions')
        .insert([{
          suggestion_id: suggestionId,
          user_id: userId,
          interaction_type: interactionType,
          interaction_data: interactionData
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('[RexSuggestion] Error logging interaction:', error);
      throw error;
    }
  }

  async createPerformanceBaseline(
    suggestionId: string,
    metrics: {
      spend: number;
      revenue: number;
      profit: number;
      roas: number;
      conversions: number;
      cpa: number;
      impressions: number;
      clicks: number;
      ctr: number;
      periodStart: Date;
      periodEnd: Date;
    }
  ): Promise<RexSuggestionPerformance> {
    try {
      const { data, error } = await supabase
        .from('rex_suggestion_performance')
        .insert([{
          suggestion_id: suggestionId,
          baseline_spend: metrics.spend,
          baseline_revenue: metrics.revenue,
          baseline_profit: metrics.profit,
          baseline_roas: metrics.roas,
          baseline_conversions: metrics.conversions,
          baseline_cpa: metrics.cpa,
          baseline_impressions: metrics.impressions,
          baseline_clicks: metrics.clicks,
          baseline_ctr: metrics.ctr,
          baseline_period_start: metrics.periodStart.toISOString(),
          baseline_period_end: metrics.periodEnd.toISOString(),
          current_spend: metrics.spend,
          current_revenue: metrics.revenue,
          current_profit: metrics.profit,
          current_roas: metrics.roas,
          current_conversions: metrics.conversions,
          current_cpa: metrics.cpa,
          current_impressions: metrics.impressions,
          current_clicks: metrics.clicks,
          current_ctr: metrics.ctr,
          current_period_start: metrics.periodStart.toISOString(),
          current_period_end: metrics.periodEnd.toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      return data as RexSuggestionPerformance;
    } catch (error) {
      console.error('[RexSuggestion] Error creating performance baseline:', error);
      throw error;
    }
  }

  async getPerformance(suggestionId: string): Promise<RexSuggestionPerformance | null> {
    try {
      const { data, error } = await supabase
        .from('rex_suggestion_performance')
        .select('*')
        .eq('suggestion_id', suggestionId)
        .maybeSingle();

      if (error) throw error;

      return data as RexSuggestionPerformance | null;
    } catch (error) {
      console.error('[RexSuggestion] Error fetching performance:', error);
      throw error;
    }
  }

  async expireOldSuggestions(): Promise<number> {
    try {
      const { error } = await supabase.rpc('expire_old_rex_suggestions');

      if (error) throw error;

      const { count } = await supabase
        .from('rex_suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'expired')
        .gte('expired_at', new Date(Date.now() - 60000).toISOString());

      return count || 0;
    } catch (error) {
      console.error('[RexSuggestion] Error expiring suggestions:', error);
      throw error;
    }
  }

  async dismissSuggestion(suggestionId: string, userId: string, reason?: string): Promise<void> {
    try {
      await this.updateStatus(suggestionId, 'dismissed');
      await this.logInteraction(suggestionId, userId, 'dismissed', { reason });
    } catch (error) {
      console.error('[RexSuggestion] Error dismissing suggestion:', error);
      throw error;
    }
  }

  async acceptSuggestion(suggestionId: string, userId: string): Promise<void> {
    try {
      await this.updateStatus(suggestionId, 'accepted');
      await this.logInteraction(suggestionId, userId, 'accepted');
    } catch (error) {
      console.error('[RexSuggestion] Error accepting suggestion:', error);
      throw error;
    }
  }

  async markAsViewed(suggestionId: string, userId: string): Promise<void> {
    try {
      const suggestion = await this.getSuggestion(suggestionId);
      if (suggestion && suggestion.status === 'pending') {
        await this.updateStatus(suggestionId, 'viewed');
        await this.logInteraction(suggestionId, userId, 'viewed');
      }
    } catch (error) {
      console.error('[RexSuggestion] Error marking as viewed:', error);
      throw error;
    }
  }
}

export const rexSuggestionService = new RexSuggestionService();
