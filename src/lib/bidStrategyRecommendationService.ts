import { supabase } from './supabase';
import {
  BID_STRATEGY_GUIDANCE,
  PERFORMANCE_GOAL_GUIDANCE,
  generateDuplicationRecommendation,
  type DuplicationRecommendation,
} from './recommendedBaselineConfig';
import { getCampaignLevelKnowledge, getAdSetLevelKnowledge } from './platformKnowledgeBase';
import type { AdPlatform } from './recommendedBaselineConfig';
import type { CreateRexSuggestionParams } from '@/types/rex';

export interface CampaignPerformanceData {
  id: string;
  platformId: string;
  name: string;
  platform: AdPlatform;
  bidStrategy: string;
  performanceGoal: string;
  dailyBudget: number;
  spend: number;
  revenue: number;
  profit: number;
  roas: number;
  cpa: number;
  conversions: number;
  daysActive: number;
  isNetProfitable: boolean;
  isConsistentlyProfitable: boolean;
  learningPhaseStatus: string;
  aovVariance?: number;
}

export interface BidStrategyRecommendation {
  type: 'roas_goal' | 'cost_per_result_goal' | 'max_value';
  priority: number;
  confidence: number;
  sourceCampaign: CampaignPerformanceData;
  recommendation: DuplicationRecommendation;
  rexSuggestion: CreateRexSuggestionParams;
}

export class BidStrategyRecommendationService {
  private userId: string;
  private platform: AdPlatform;

  constructor(userId: string, platform: AdPlatform = 'facebook') {
    this.userId = userId;
    this.platform = platform;
  }

  async analyzeForBidStrategyRecommendations(): Promise<BidStrategyRecommendation[]> {
    const recommendations: BidStrategyRecommendation[] = [];

    try {
      const campaigns = await this.getProfitableCampaigns();

      for (const campaign of campaigns) {
        if (campaign.bidStrategy === 'highest_volume' ||
            campaign.bidStrategy === 'LOWEST_COST_WITHOUT_CAP') {

          const roasRec = this.checkForRoasGoalOpportunity(campaign);
          if (roasRec) recommendations.push(roasRec);

          const cprRec = this.checkForCostPerResultOpportunity(campaign);
          if (cprRec) recommendations.push(cprRec);
        }

        if (campaign.performanceGoal === 'max_conversions' ||
            campaign.performanceGoal === 'OFFSITE_CONVERSIONS') {
          const maxValueRec = await this.checkForMaxValueOpportunity(campaign);
          if (maxValueRec) recommendations.push(maxValueRec);
        }
      }

      return recommendations.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      console.error('[BidStrategyRecommendationService] Error analyzing campaigns:', error);
      return [];
    }
  }

  private checkForRoasGoalOpportunity(campaign: CampaignPerformanceData): BidStrategyRecommendation | null {
    if (!campaign.isConsistentlyProfitable) return null;
    if (campaign.daysActive < 7) return null;
    if (campaign.conversions < 20) return null;
    if (campaign.roas < 1.5) return null;

    const duplicationRec = generateDuplicationRecommendation('roas_goal', {
      id: campaign.id,
      name: campaign.name,
      roas: campaign.roas,
      cpa: campaign.cpa,
      spend: campaign.spend,
      conversions: campaign.conversions,
      daysActive: campaign.daysActive,
      isNetProfitable: campaign.isNetProfitable,
    });

    if (!duplicationRec) return null;

    const guidance = BID_STRATEGY_GUIDANCE.roas_goal;

    return {
      type: 'roas_goal',
      priority: 85,
      confidence: Math.min(90, 70 + (campaign.daysActive * 2)),
      sourceCampaign: campaign,
      recommendation: duplicationRec,
      rexSuggestion: {
        user_id: this.userId,
        entity_type: 'campaign',
        entity_id: campaign.id,
        entity_name: campaign.name,
        platform: campaign.platform,
        platform_entity_id: campaign.platformId,
        suggestion_type: 'bid_strategy_test',
        priority_score: 85,
        confidence_score: Math.min(90, 70 + (campaign.daysActive * 2)),
        title: 'Test ROAS Goal Bid Strategy',
        message: duplicationRec.reasoning,
        reasoning: {
          triggeredBy: ['consistent_profitability', 'highest_volume_success', 'duplication_opportunity'],
          metrics: {
            current_roas: campaign.roas,
            current_cpa: campaign.cpa,
            days_active: campaign.daysActive,
            conversions: campaign.conversions,
            recommended_roas_floor: campaign.roas,
          },
          analysis: guidance.settingGuidance,
          riskLevel: 'medium',
          actionSteps: duplicationRec.actionSteps,
        },
        estimated_impact: {
          expectedROAS: campaign.roas,
          timeframe: '7-14 days',
          reasoning: 'ROAS Goal protects efficiency during scaling while allowing algorithm to find more volume',
        },
      },
    };
  }

  private checkForCostPerResultOpportunity(campaign: CampaignPerformanceData): BidStrategyRecommendation | null {
    if (!campaign.isConsistentlyProfitable) return null;
    if (campaign.daysActive < 7) return null;
    if (campaign.conversions < 20) return null;
    if (campaign.profit <= 0) return null;

    const duplicationRec = generateDuplicationRecommendation('cost_per_result_goal', {
      id: campaign.id,
      name: campaign.name,
      roas: campaign.roas,
      cpa: campaign.cpa,
      spend: campaign.spend,
      conversions: campaign.conversions,
      daysActive: campaign.daysActive,
      isNetProfitable: campaign.isNetProfitable,
    });

    if (!duplicationRec) return null;

    const guidance = BID_STRATEGY_GUIDANCE.cost_per_result_goal;

    return {
      type: 'cost_per_result_goal',
      priority: 80,
      confidence: Math.min(88, 68 + (campaign.daysActive * 2)),
      sourceCampaign: campaign,
      recommendation: duplicationRec,
      rexSuggestion: {
        user_id: this.userId,
        entity_type: 'campaign',
        entity_id: campaign.id,
        entity_name: campaign.name,
        platform: campaign.platform,
        platform_entity_id: campaign.platformId,
        suggestion_type: 'bid_strategy_test',
        priority_score: 80,
        confidence_score: Math.min(88, 68 + (campaign.daysActive * 2)),
        title: 'Test Cost Per Result Goal Strategy',
        message: duplicationRec.reasoning,
        reasoning: {
          triggeredBy: ['consistent_profitability', 'positive_net_profit', 'duplication_opportunity'],
          metrics: {
            current_roas: campaign.roas,
            current_cpa: campaign.cpa,
            current_profit: campaign.profit,
            days_active: campaign.daysActive,
            conversions: campaign.conversions,
            recommended_cost_cap: campaign.cpa,
          },
          analysis: guidance.settingGuidance,
          riskLevel: 'medium',
          actionSteps: duplicationRec.actionSteps,
        },
        estimated_impact: {
          expectedCPA: campaign.cpa,
          timeframe: '7-14 days',
          reasoning: 'Cost cap protects your CPA ceiling while scaling budget',
        },
      },
    };
  }

  private async checkForMaxValueOpportunity(campaign: CampaignPerformanceData): Promise<BidStrategyRecommendation | null> {
    if (!campaign.isConsistentlyProfitable) return null;
    if (campaign.daysActive < 7) return null;
    if (campaign.conversions < 15) return null;

    const hasAovVariance = await this.checkAovVariance();
    if (!hasAovVariance && campaign.aovVariance === undefined) return null;

    const duplicationRec = generateDuplicationRecommendation('max_value', {
      id: campaign.id,
      name: campaign.name,
      roas: campaign.roas,
      cpa: campaign.cpa,
      spend: campaign.spend,
      conversions: campaign.conversions,
      daysActive: campaign.daysActive,
      isNetProfitable: campaign.isNetProfitable,
    });

    if (!duplicationRec) return null;

    const guidance = PERFORMANCE_GOAL_GUIDANCE.max_value;

    return {
      type: 'max_value',
      priority: 75,
      confidence: hasAovVariance ? 82 : 70,
      sourceCampaign: campaign,
      recommendation: duplicationRec,
      rexSuggestion: {
        user_id: this.userId,
        entity_type: 'campaign',
        entity_id: campaign.id,
        entity_name: campaign.name,
        platform: campaign.platform,
        platform_entity_id: campaign.platformId,
        suggestion_type: 'performance_goal_test',
        priority_score: 75,
        confidence_score: hasAovVariance ? 82 : 70,
        title: 'Test Maximize Conversion Value',
        message: duplicationRec.reasoning,
        reasoning: {
          triggeredBy: hasAovVariance
            ? ['aov_variance_detected', 'max_conversions_profitable', 'duplication_opportunity']
            : ['max_conversions_profitable', 'duplication_opportunity'],
          metrics: {
            current_roas: campaign.roas,
            current_conversions: campaign.conversions,
            days_active: campaign.daysActive,
            aov_variance_detected: hasAovVariance,
          },
          analysis: guidance.whenToUse.join('. '),
          riskLevel: 'low',
          actionSteps: duplicationRec.actionSteps,
        },
        estimated_impact: {
          timeframe: '7-14 days',
          reasoning: 'Max Value can increase AOV by prioritizing higher-value purchases',
        },
      },
    };
  }

  private async getProfitableCampaigns(): Promise<CampaignPerformanceData[]> {
    const campaigns: CampaignPerformanceData[] = [];

    try {
      const { data: accounts } = await supabase
        .from('ad_accounts')
        .select('id, platform_account_id')
        .eq('user_id', this.userId)
        .eq('platform', this.platform);

      if (!accounts || accounts.length === 0) return [];

      const accountIds = accounts.map(a => a.id);

      const { data: campaignData } = await supabase
        .from('ad_campaigns')
        .select(`
          id,
          platform_campaign_id,
          name,
          bid_strategy,
          is_cbo,
          daily_budget,
          status,
          created_at
        `)
        .in('ad_account_id', accountIds)
        .eq('status', 'ACTIVE');

      if (!campaignData) return [];

      for (const campaign of campaignData) {
        const metrics = await this.getCampaignMetricsWithHistory(campaign.id, campaign.platform_campaign_id);

        if (metrics) {
          const daysActive = Math.floor(
            (Date.now() - new Date(campaign.created_at).getTime()) / (1000 * 60 * 60 * 24)
          );

          const isNetProfitable = metrics.profit > 0;
          const isConsistentlyProfitable = metrics.profitableDays >= Math.min(7, daysActive);

          campaigns.push({
            id: campaign.id,
            platformId: campaign.platform_campaign_id,
            name: campaign.name,
            platform: this.platform,
            bidStrategy: campaign.bid_strategy || 'highest_volume',
            performanceGoal: 'max_conversions',
            dailyBudget: campaign.daily_budget || 0,
            spend: metrics.spend,
            revenue: metrics.revenue,
            profit: metrics.profit,
            roas: metrics.roas,
            cpa: metrics.cpa,
            conversions: metrics.conversions,
            daysActive,
            isNetProfitable,
            isConsistentlyProfitable,
            learningPhaseStatus: 'ACTIVE',
          });
        }
      }

      return campaigns.filter(c => c.isConsistentlyProfitable && c.daysActive >= 7);
    } catch (error) {
      console.error('[BidStrategyRecommendationService] Error getting campaigns:', error);
      return [];
    }
  }

  private async getCampaignMetricsWithHistory(campaignId: string, platformId: string): Promise<{
    spend: number;
    revenue: number;
    profit: number;
    roas: number;
    cpa: number;
    conversions: number;
    profitableDays: number;
  } | null> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: metrics } = await supabase
        .from('ad_metrics')
        .select('date, spend, conversion_value, conversions')
        .or(`entity_id.eq.${campaignId},entity_id.eq.${platformId}`)
        .eq('entity_type', 'campaign')
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (!metrics || metrics.length === 0) return null;

      const totalSpend = metrics.reduce((sum, m) => sum + (m.spend || 0), 0);
      const totalRevenue = metrics.reduce((sum, m) => sum + (m.conversion_value || 0), 0);
      const totalConversions = metrics.reduce((sum, m) => sum + (m.conversions || 0), 0);

      const estimatedCogs = totalRevenue * 0.35;
      const profit = totalRevenue - totalSpend - estimatedCogs;

      let profitableDays = 0;
      for (const m of metrics) {
        const dayRevenue = m.conversion_value || 0;
        const daySpend = m.spend || 0;
        const dayCogs = dayRevenue * 0.35;
        if (dayRevenue - daySpend - dayCogs > 0) {
          profitableDays++;
        }
      }

      return {
        spend: totalSpend,
        revenue: totalRevenue,
        profit,
        roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
        cpa: totalConversions > 0 ? totalSpend / totalConversions : 0,
        conversions: totalConversions,
        profitableDays,
      };
    } catch (error) {
      return null;
    }
  }

  private async checkAovVariance(): Promise<boolean> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: orders } = await supabase
        .from('shopify_orders')
        .select('total_price')
        .eq('user_id', this.userId)
        .gte('ordered_at', thirtyDaysAgo.toISOString());

      if (!orders || orders.length < 10) return false;

      const prices = orders.map(o => parseFloat(o.total_price || '0')).filter(p => p > 0);
      if (prices.length < 10) return false;

      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

      const variance = prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = (stdDev / avgPrice) * 100;

      return (maxPrice / minPrice > 3) || (coefficientOfVariation > 50);
    } catch (error) {
      return false;
    }
  }
}

export function createBidStrategyRecommendationService(userId: string, platform: AdPlatform = 'facebook') {
  return new BidStrategyRecommendationService(userId, platform);
}
