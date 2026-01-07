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

  /**
   * Update performance metrics and calculate improvement
   * Should be called 7 days after suggestion is applied
   */
  async updatePerformanceComparison(
    suggestionId: string,
    currentMetrics: {
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
      // Get existing performance record
      const performance = await this.getPerformance(suggestionId);

      if (!performance) {
        throw new Error('Performance baseline not found for suggestion');
      }

      // Calculate deltas
      const spendDelta = currentMetrics.spend - performance.baseline_spend;
      const revenueDelta = currentMetrics.revenue - performance.baseline_revenue;
      const profitDelta = currentMetrics.profit - performance.baseline_profit;
      const roasDelta = currentMetrics.roas - performance.baseline_roas;
      const conversionsDelta = currentMetrics.conversions - performance.baseline_conversions;
      const cpaDelta = currentMetrics.cpa - performance.baseline_cpa;
      const impressionsDelta = currentMetrics.impressions - performance.baseline_impressions;
      const clicksDelta = currentMetrics.clicks - performance.baseline_clicks;
      const ctrDelta = currentMetrics.ctr - performance.baseline_ctr;

      // Determine if performance is improving
      // Consider it improving if profit increased OR (revenue increased AND ROAS improved)
      const isImproving = profitDelta > 0 || (revenueDelta > 0 && roasDelta > 0);

      // Update performance record
      const { data, error } = await supabase
        .from('rex_suggestion_performance')
        .update({
          current_spend: currentMetrics.spend,
          current_revenue: currentMetrics.revenue,
          current_profit: currentMetrics.profit,
          current_roas: currentMetrics.roas,
          current_conversions: currentMetrics.conversions,
          current_cpa: currentMetrics.cpa,
          current_impressions: currentMetrics.impressions,
          current_clicks: currentMetrics.clicks,
          current_ctr: currentMetrics.ctr,
          current_period_start: currentMetrics.periodStart.toISOString(),
          current_period_end: currentMetrics.periodEnd.toISOString(),
          spend_delta: spendDelta,
          revenue_delta: revenueDelta,
          profit_delta: profitDelta,
          roas_delta: roasDelta,
          conversions_delta: conversionsDelta,
          cpa_delta: cpaDelta,
          impressions_delta: impressionsDelta,
          clicks_delta: clicksDelta,
          ctr_delta: ctrDelta,
          is_improving: isImproving,
          last_comparison_at: new Date().toISOString()
        })
        .eq('suggestion_id', suggestionId)
        .select()
        .single();

      if (error) throw error;

      console.log(`[RexSuggestion] Updated performance for suggestion ${suggestionId}. Improving: ${isImproving}, Profit Delta: $${profitDelta.toFixed(2)}`);

      return data as RexSuggestionPerformance;
    } catch (error) {
      console.error('[RexSuggestion] Error updating performance comparison:', error);
      throw error;
    }
  }

  /**
   * Automatically update performance for suggestions applied 7+ days ago
   */
  async updatePerformanceForAppliedSuggestions(userId: string): Promise<number> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Get suggestions that were applied 7+ days ago and haven't been compared recently
      const { data: suggestions, error } = await supabase
        .from('rex_suggestions')
        .select(`
          id,
          entity_id,
          entity_type,
          platform,
          applied_at,
          rex_suggestion_performance (
            id,
            last_comparison_at
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'applied')
        .lte('applied_at', sevenDaysAgo.toISOString())
        .or('rex_suggestion_performance.last_comparison_at.is.null,rex_suggestion_performance.last_comparison_at.lt.' + new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;
      if (!suggestions || suggestions.length === 0) return 0;

      let updatedCount = 0;

      for (const suggestion of suggestions) {
        try {
          // Fetch current metrics for this entity
          const endDate = new Date();
          const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

          const { data: metrics } = await supabase
            .from('ad_metrics')
            .select('*')
            .eq('user_id', userId)
            .gte('date', startDate.toISOString().split('T')[0])
            .lte('date', endDate.toISOString().split('T')[0]);

          if (!metrics || metrics.length === 0) continue;

          // Filter metrics for this entity
          const entityMetrics = metrics.filter((m: any) => {
            if (suggestion.entity_type === 'campaign') {
              return m.campaign_id === suggestion.entity_id;
            } else if (suggestion.entity_type === 'ad_set') {
              return m.ad_set_id === suggestion.entity_id;
            } else {
              return m.ad_id === suggestion.entity_id;
            }
          });

          if (entityMetrics.length === 0) continue;

          // Aggregate metrics
          const totalSpend = entityMetrics.reduce((sum: number, m: any) => sum + (m.spend || 0), 0);
          const totalRevenue = entityMetrics.reduce((sum: number, m: any) => sum + (m.revenue || 0), 0);
          const totalConversions = entityMetrics.reduce((sum: number, m: any) => sum + (m.conversions || 0), 0);
          const totalClicks = entityMetrics.reduce((sum: number, m: any) => sum + (m.clicks || 0), 0);
          const totalImpressions = entityMetrics.reduce((sum: number, m: any) => sum + (m.impressions || 0), 0);

          const currentMetrics = {
            spend: totalSpend,
            revenue: totalRevenue,
            profit: totalRevenue - totalSpend,
            roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
            conversions: totalConversions,
            cpa: totalConversions > 0 ? totalSpend / totalConversions : 0,
            impressions: totalImpressions,
            clicks: totalClicks,
            ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
            periodStart: startDate,
            periodEnd: endDate
          };

          await this.updatePerformanceComparison(suggestion.id, currentMetrics);
          updatedCount++;
        } catch (err) {
          console.error(`[RexSuggestion] Error updating performance for suggestion ${suggestion.id}:`, err);
        }
      }

      console.log(`[RexSuggestion] Updated performance for ${updatedCount} suggestions`);
      return updatedCount;
    } catch (error) {
      console.error('[RexSuggestion] Error updating performance for applied suggestions:', error);
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

  /**
   * Expire all pending and viewed suggestions for a user
   * Called before regenerating suggestions to ensure they match current data
   */
  async expireUserPendingSuggestions(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('expire_user_pending_suggestions', {
        p_user_id: userId
      });

      if (error) throw error;

      const count = data || 0;
      console.log(`[RexSuggestion] Expired ${count} pending/viewed suggestions for user ${userId}`);
      return count;
    } catch (error) {
      console.error('[RexSuggestion] Error expiring user pending suggestions:', error);
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
