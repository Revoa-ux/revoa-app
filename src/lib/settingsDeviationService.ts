import { supabase } from './supabase';
import {
  SHOPIFY_ECOMMERCE_BASELINE,
  getDeviationSeverity,
  getRecommendedValue,
  getReasoning,
} from './recommendedBaselineConfig';
import {
  getCampaignLevelKnowledge,
  getAdSetLevelKnowledge,
} from './platformKnowledgeBase';
import type { AdPlatform } from './recommendedBaselineConfig';

export interface SettingsDeviation {
  id?: string;
  entityType: 'campaign' | 'ad_set';
  entityId: string;
  entityName: string;
  platform: AdPlatform;
  settingName: string;
  currentValue: string | null;
  recommendedValue: string;
  severity: 'informational' | 'warning' | 'critical';
  reasoning: string;
  performanceCorrelation?: {
    hasImpact: boolean;
    roasBefore?: number;
    roasAfter?: number;
    notes?: string;
  };
  isActive: boolean;
  detectedAt: string;
}

export interface DeviationSummary {
  totalDeviations: number;
  criticalCount: number;
  warningCount: number;
  informationalCount: number;
  deviationsByType: Record<string, number>;
  topPriorityDeviations: SettingsDeviation[];
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface CampaignSettings {
  id: string;
  name: string;
  platform: string;
  objective?: string;
  isCbo?: boolean;
  bidStrategy?: string;
  budgetType?: 'daily' | 'lifetime';
  dailyBudget?: number;
  lifetimeBudget?: number;
  status: string;
  roas?: number;
  spend?: number;
  conversions?: number;
}

export interface AdSetSettings {
  id: string;
  name: string;
  campaignId: string;
  platform: string;
  conversionLocation?: string;
  conversionEvent?: string;
  performanceGoal?: string;
  attributionSetting?: string;
  learningPhaseStatus?: string;
  status: string;
  roas?: number;
  spend?: number;
  conversions?: number;
}

export class SettingsDeviationService {
  private userId: string;
  private platform: AdPlatform;

  constructor(userId: string, platform: AdPlatform = 'facebook') {
    this.userId = userId;
    this.platform = platform;
  }

  async detectCampaignDeviations(campaign: CampaignSettings): Promise<SettingsDeviation[]> {
    const deviations: SettingsDeviation[] = [];
    const baseline = SHOPIFY_ECOMMERCE_BASELINE;
    const hasPerformanceIssue = this.hasPerformanceIssue(campaign.roas, campaign.spend);

    if (campaign.objective && campaign.objective !== baseline.campaignLevel.objective) {
      deviations.push({
        entityType: 'campaign',
        entityId: campaign.id,
        entityName: campaign.name,
        platform: this.platform,
        settingName: 'objective',
        currentValue: campaign.objective,
        recommendedValue: baseline.campaignLevel.objective,
        severity: getDeviationSeverity('objective', campaign.objective, hasPerformanceIssue),
        reasoning: baseline.reasoning.campaignLevel.objective,
        performanceCorrelation: {
          hasImpact: hasPerformanceIssue,
          roasAfter: campaign.roas,
        },
        isActive: true,
        detectedAt: new Date().toISOString(),
      });
    }

    if (campaign.isCbo === false) {
      deviations.push({
        entityType: 'campaign',
        entityId: campaign.id,
        entityName: campaign.name,
        platform: this.platform,
        settingName: 'is_cbo',
        currentValue: 'false',
        recommendedValue: 'true',
        severity: getDeviationSeverity('is_cbo', false, hasPerformanceIssue),
        reasoning: baseline.reasoning.campaignLevel.isCBO,
        performanceCorrelation: {
          hasImpact: hasPerformanceIssue,
          roasAfter: campaign.roas,
        },
        isActive: true,
        detectedAt: new Date().toISOString(),
      });
    }

    if (campaign.budgetType === 'lifetime') {
      deviations.push({
        entityType: 'campaign',
        entityId: campaign.id,
        entityName: campaign.name,
        platform: this.platform,
        settingName: 'budget_type',
        currentValue: 'lifetime',
        recommendedValue: 'daily',
        severity: 'informational',
        reasoning: baseline.reasoning.campaignLevel.budgetType,
        isActive: true,
        detectedAt: new Date().toISOString(),
      });
    }

    return deviations;
  }

  async detectAdSetDeviations(adSet: AdSetSettings): Promise<SettingsDeviation[]> {
    const deviations: SettingsDeviation[] = [];
    const baseline = SHOPIFY_ECOMMERCE_BASELINE;
    const hasPerformanceIssue = this.hasPerformanceIssue(adSet.roas, adSet.spend);

    if (adSet.conversionLocation &&
        adSet.conversionLocation.toLowerCase() !== baseline.adSetLevel.conversionLocation) {
      deviations.push({
        entityType: 'ad_set',
        entityId: adSet.id,
        entityName: adSet.name,
        platform: this.platform,
        settingName: 'conversion_location',
        currentValue: adSet.conversionLocation,
        recommendedValue: baseline.adSetLevel.conversionLocation,
        severity: getDeviationSeverity('conversion_location', adSet.conversionLocation, hasPerformanceIssue),
        reasoning: baseline.reasoning.adSetLevel.conversionLocation,
        performanceCorrelation: {
          hasImpact: hasPerformanceIssue,
          roasAfter: adSet.roas,
        },
        isActive: true,
        detectedAt: new Date().toISOString(),
      });
    }

    if (adSet.conversionEvent &&
        adSet.conversionEvent.toLowerCase() !== baseline.adSetLevel.conversionEvent) {
      const currentEvent = adSet.conversionEvent.toLowerCase();
      const eventKnowledge = getAdSetLevelKnowledge(this.platform).conversionEvents
        .find(e => e.metaApiName.toLowerCase() === currentEvent || e.event.toLowerCase() === currentEvent);

      let reasoning = baseline.reasoning.adSetLevel.conversionEvent;
      if (eventKnowledge) {
        reasoning += ` Current event "${eventKnowledge.event}" is at the ${eventKnowledge.funnelPosition} of the funnel. ${eventKnowledge.whenToAvoid.join('. ')}`;
      }

      deviations.push({
        entityType: 'ad_set',
        entityId: adSet.id,
        entityName: adSet.name,
        platform: this.platform,
        settingName: 'conversion_event',
        currentValue: adSet.conversionEvent,
        recommendedValue: baseline.adSetLevel.conversionEvent,
        severity: getDeviationSeverity('conversion_event', adSet.conversionEvent, hasPerformanceIssue),
        reasoning,
        performanceCorrelation: {
          hasImpact: hasPerformanceIssue,
          roasAfter: adSet.roas,
        },
        isActive: true,
        detectedAt: new Date().toISOString(),
      });
    }

    return deviations;
  }

  async detectAllDeviations(): Promise<SettingsDeviation[]> {
    const allDeviations: SettingsDeviation[] = [];

    try {
      const { data: accounts } = await supabase
        .from('ad_accounts')
        .select('id, platform_account_id')
        .eq('user_id', this.userId)
        .eq('platform', this.platform);

      if (!accounts || accounts.length === 0) {
        return [];
      }

      const accountIds = accounts.map(a => a.id);

      const { data: campaigns } = await supabase
        .from('ad_campaigns')
        .select(`
          id,
          name,
          objective,
          is_cbo,
          bid_strategy,
          daily_budget,
          lifetime_budget,
          status
        `)
        .in('ad_account_id', accountIds)
        .eq('status', 'ACTIVE');

      if (campaigns) {
        for (const campaign of campaigns) {
          const metrics = await this.getCampaignMetrics(campaign.id);
          const campaignSettings: CampaignSettings = {
            id: campaign.id,
            name: campaign.name,
            platform: this.platform,
            objective: campaign.objective,
            isCbo: campaign.is_cbo,
            bidStrategy: campaign.bid_strategy,
            budgetType: campaign.lifetime_budget ? 'lifetime' : 'daily',
            dailyBudget: campaign.daily_budget,
            lifetimeBudget: campaign.lifetime_budget,
            status: campaign.status,
            roas: metrics?.roas,
            spend: metrics?.spend,
            conversions: metrics?.conversions,
          };

          const deviations = await this.detectCampaignDeviations(campaignSettings);
          allDeviations.push(...deviations);
        }
      }

      const { data: adSets } = await supabase
        .from('ad_sets')
        .select(`
          id,
          name,
          campaign_id,
          conversion_location,
          conversion_event,
          performance_goal,
          attribution_setting,
          learning_phase_status,
          status
        `)
        .eq('status', 'ACTIVE');

      if (adSets) {
        for (const adSet of adSets) {
          const metrics = await this.getAdSetMetrics(adSet.id);
          const adSetSettings: AdSetSettings = {
            id: adSet.id,
            name: adSet.name,
            campaignId: adSet.campaign_id,
            platform: this.platform,
            conversionLocation: adSet.conversion_location,
            conversionEvent: adSet.conversion_event,
            performanceGoal: adSet.performance_goal,
            attributionSetting: adSet.attribution_setting,
            learningPhaseStatus: adSet.learning_phase_status,
            status: adSet.status,
            roas: metrics?.roas,
            spend: metrics?.spend,
            conversions: metrics?.conversions,
          };

          const deviations = await this.detectAdSetDeviations(adSetSettings);
          allDeviations.push(...deviations);
        }
      }

      return allDeviations;
    } catch (error) {
      console.error('[SettingsDeviationService] Error detecting deviations:', error);
      return [];
    }
  }

  async storeDeviations(deviations: SettingsDeviation[]): Promise<void> {
    if (deviations.length === 0) return;

    try {
      const records = deviations.map(d => ({
        user_id: this.userId,
        entity_type: d.entityType,
        entity_id: d.entityId,
        entity_name: d.entityName,
        platform: d.platform,
        setting_name: d.settingName,
        current_value: d.currentValue,
        recommended_value: d.recommendedValue,
        severity: d.severity,
        is_active: d.isActive,
        performance_impact_detected: d.performanceCorrelation?.hasImpact || false,
        roas_after_deviation: d.performanceCorrelation?.roasAfter,
        performance_correlation_notes: d.performanceCorrelation?.notes,
        detected_at: d.detectedAt,
      }));

      for (const record of records) {
        await supabase
          .from('campaign_baseline_deviations')
          .upsert(record, {
            onConflict: 'entity_type,entity_id,setting_name',
            ignoreDuplicates: false,
          });
      }
    } catch (error) {
      console.error('[SettingsDeviationService] Error storing deviations:', error);
    }
  }

  async getDeviationSummary(): Promise<DeviationSummary> {
    const deviations = await this.detectAllDeviations();

    const criticalCount = deviations.filter(d => d.severity === 'critical').length;
    const warningCount = deviations.filter(d => d.severity === 'warning').length;
    const informationalCount = deviations.filter(d => d.severity === 'informational').length;

    const deviationsByType: Record<string, number> = {};
    deviations.forEach(d => {
      deviationsByType[d.settingName] = (deviationsByType[d.settingName] || 0) + 1;
    });

    const topPriorityDeviations = deviations
      .filter(d => d.severity === 'critical' || d.severity === 'warning')
      .slice(0, 5);

    let overallRiskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (criticalCount > 0) {
      overallRiskLevel = 'critical';
    } else if (warningCount > 2) {
      overallRiskLevel = 'high';
    } else if (warningCount > 0) {
      overallRiskLevel = 'medium';
    }

    return {
      totalDeviations: deviations.length,
      criticalCount,
      warningCount,
      informationalCount,
      deviationsByType,
      topPriorityDeviations,
      overallRiskLevel,
    };
  }

  private hasPerformanceIssue(roas?: number, spend?: number): boolean {
    if (!roas || !spend) return false;
    if (spend < 50) return false;

    return roas < 1.5;
  }

  private async getCampaignMetrics(campaignId: string): Promise<{ roas: number; spend: number; conversions: number } | null> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data } = await supabase
        .from('ad_metrics')
        .select('spend, conversion_value, conversions')
        .eq('entity_id', campaignId)
        .eq('entity_type', 'campaign')
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

      if (!data || data.length === 0) return null;

      const totalSpend = data.reduce((sum, m) => sum + (m.spend || 0), 0);
      const totalValue = data.reduce((sum, m) => sum + (m.conversion_value || 0), 0);
      const totalConversions = data.reduce((sum, m) => sum + (m.conversions || 0), 0);

      return {
        roas: totalSpend > 0 ? totalValue / totalSpend : 0,
        spend: totalSpend,
        conversions: totalConversions,
      };
    } catch (error) {
      return null;
    }
  }

  private async getAdSetMetrics(adSetId: string): Promise<{ roas: number; spend: number; conversions: number } | null> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data } = await supabase
        .from('ad_metrics')
        .select('spend, conversion_value, conversions')
        .eq('entity_id', adSetId)
        .eq('entity_type', 'ad_set')
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

      if (!data || data.length === 0) return null;

      const totalSpend = data.reduce((sum, m) => sum + (m.spend || 0), 0);
      const totalValue = data.reduce((sum, m) => sum + (m.conversion_value || 0), 0);
      const totalConversions = data.reduce((sum, m) => sum + (m.conversions || 0), 0);

      return {
        roas: totalSpend > 0 ? totalValue / totalSpend : 0,
        spend: totalSpend,
        conversions: totalConversions,
      };
    } catch (error) {
      return null;
    }
  }
}

export function createSettingsDeviationService(userId: string, platform: AdPlatform = 'facebook') {
  return new SettingsDeviationService(userId, platform);
}
