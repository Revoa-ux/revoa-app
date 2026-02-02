import { supabase } from './supabase';
import {
  getLearningPhaseKnowledge,
  getBudgetScalingKnowledge,
  type AdPlatform
} from './platformKnowledgeBase';
import type { CreateRexSuggestionParams, RexSuggestionReasoning } from '@/types/rex';
import { RexRuleGenerator } from './rexRuleGenerator';

interface PlatformMetrics {
  platform: AdPlatform;
  totalSpend: number;
  totalRevenue: number;
  totalConversions: number;
  roas: number;
  cpa: number;
  activeAccounts: number;
  topPerformingCampaigns: Array<{
    id: string;
    name: string;
    roas: number;
    spend: number;
  }>;
}

interface CrossPlatformAnalysis {
  platforms: PlatformMetrics[];
  bestPerformingPlatform: AdPlatform | null;
  worstPerformingPlatform: AdPlatform | null;
  budgetReallocationOpportunity: {
    fromPlatform: AdPlatform;
    toPlatform: AdPlatform;
    suggestedAmount: number;
    expectedROASImprovement: number;
  } | null;
  insights: string[];
}

export class CrossPlatformComparisonService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async analyzeAllPlatforms(startDate: string, endDate: string): Promise<CrossPlatformAnalysis> {
    const platforms: AdPlatform[] = ['facebook', 'tiktok', 'google'];
    const platformMetrics: PlatformMetrics[] = [];

    for (const platform of platforms) {
      const metrics = await this.getPlatformMetrics(platform, startDate, endDate);
      if (metrics.activeAccounts > 0) {
        platformMetrics.push(metrics);
      }
    }

    const sortedByROAS = [...platformMetrics].sort((a, b) => b.roas - a.roas);
    const bestPlatform = sortedByROAS[0] || null;
    const worstPlatform = sortedByROAS[sortedByROAS.length - 1] || null;

    let budgetReallocationOpportunity = null;
    const insights: string[] = [];

    if (platformMetrics.length >= 2 && bestPlatform && worstPlatform && bestPlatform !== worstPlatform) {
      const roasDiff = bestPlatform.roas - worstPlatform.roas;

      if (roasDiff > 0.5 && worstPlatform.totalSpend > 500) {
        const suggestedReallocation = Math.min(worstPlatform.totalSpend * 0.3, 1000);

        budgetReallocationOpportunity = {
          fromPlatform: worstPlatform.platform,
          toPlatform: bestPlatform.platform,
          suggestedAmount: suggestedReallocation,
          expectedROASImprovement: roasDiff * 0.7
        };

        insights.push(
          `${this.getPlatformDisplayName(bestPlatform.platform)} is outperforming ${this.getPlatformDisplayName(worstPlatform.platform)} by ${(roasDiff * 100).toFixed(0)}% ROAS. Consider reallocating budget.`
        );
      }
    }

    if (platformMetrics.length > 0) {
      const totalSpend = platformMetrics.reduce((sum, p) => sum + p.totalSpend, 0);
      const avgROAS = platformMetrics.reduce((sum, p) => sum + p.roas * p.totalSpend, 0) / totalSpend;

      platformMetrics.forEach(p => {
        if (p.roas > avgROAS * 1.5) {
          insights.push(
            `${this.getPlatformDisplayName(p.platform)} is performing ${((p.roas / avgROAS - 1) * 100).toFixed(0)}% above your cross-platform average. Strong candidate for scaling.`
          );
        } else if (p.roas < avgROAS * 0.5 && p.totalSpend > 500) {
          insights.push(
            `${this.getPlatformDisplayName(p.platform)} is performing ${((1 - p.roas / avgROAS) * 100).toFixed(0)}% below average. Review targeting and creative strategy.`
          );
        }
      });

      this.addPlatformSpecificInsights(platformMetrics, insights);
    }

    return {
      platforms: platformMetrics,
      bestPerformingPlatform: bestPlatform?.platform || null,
      worstPerformingPlatform: worstPlatform?.platform || null,
      budgetReallocationOpportunity,
      insights
    };
  }

  private addPlatformSpecificInsights(metrics: PlatformMetrics[], insights: string[]) {
    const facebook = metrics.find(m => m.platform === 'facebook');
    const tiktok = metrics.find(m => m.platform === 'tiktok');
    const google = metrics.find(m => m.platform === 'google');

    if (facebook && tiktok) {
      if (tiktok.cpa < facebook.cpa * 0.7 && tiktok.totalConversions > 10) {
        insights.push(
          `TikTok is acquiring customers ${((1 - tiktok.cpa / facebook.cpa) * 100).toFixed(0)}% cheaper than Meta. TikTok often performs well for younger demographics and impulse purchases.`
        );
      }

      if (facebook.roas > tiktok.roas * 1.3 && facebook.totalConversions > 10) {
        insights.push(
          `Meta is generating ${((facebook.roas / tiktok.roas - 1) * 100).toFixed(0)}% better ROAS than TikTok. Meta's advanced pixel data may be driving better targeting.`
        );
      }
    }

    if (google && facebook) {
      if (google.cpa < facebook.cpa * 0.8 && google.totalConversions > 10) {
        insights.push(
          `Google Ads has ${((1 - google.cpa / facebook.cpa) * 100).toFixed(0)}% lower CPA than Meta. Search intent often converts at higher rates than social interruption.`
        );
      }
    }

    if (google && tiktok) {
      if (google.roas > tiktok.roas * 1.5 && google.totalConversions > 10) {
        insights.push(
          `Google Search captures high-intent users with ${((google.roas / tiktok.roas - 1) * 100).toFixed(0)}% better ROAS than TikTok. Consider TikTok for awareness and Google for conversion.`
        );
      }
    }
  }

  async generateCrossPlatformSuggestions(startDate: string, endDate: string): Promise<CreateRexSuggestionParams[]> {
    const analysis = await this.analyzeAllPlatforms(startDate, endDate);
    const suggestions: CreateRexSuggestionParams[] = [];

    if (analysis.budgetReallocationOpportunity) {
      const opp = analysis.budgetReallocationOpportunity;
      const fromName = this.getPlatformDisplayName(opp.fromPlatform);
      const toName = this.getPlatformDisplayName(opp.toPlatform);

      const reasoning: RexSuggestionReasoning = {
        triggeredBy: ['cross_platform_analysis', 'roas_comparison'],
        metrics: {
          fromPlatformROAS: analysis.platforms.find(p => p.platform === opp.fromPlatform)?.roas || 0,
          toPlatformROAS: analysis.platforms.find(p => p.platform === opp.toPlatform)?.roas || 0,
          suggestedReallocation: opp.suggestedAmount,
          expectedImprovement: opp.expectedROASImprovement
        },
        analysis: `${toName} is significantly outperforming ${fromName}. Reallocating budget could improve overall returns.`,
        riskLevel: 'medium',
        supportingData: {
          platforms: analysis.platforms.map(p => ({
            name: p.platform,
            roas: p.roas,
            spend: p.totalSpend
          })),
          insights: analysis.insights
        }
      };

      suggestions.push({
        user_id: this.userId,
        entity_type: 'ad_account',
        entity_id: 'cross-platform',
        entity_name: 'Cross-Platform Budget',
        platform: opp.toPlatform,
        suggestion_type: 'reallocate_budget',
        priority_score: 80,
        confidence_score: 75,
        title: `Reallocate Budget: ${fromName} to ${toName}`,
        message: `I noticed your ${toName} campaigns are generating ${((analysis.platforms.find(p => p.platform === opp.toPlatform)?.roas || 0) / (analysis.platforms.find(p => p.platform === opp.fromPlatform)?.roas || 1) * 100 - 100).toFixed(0)}% better ROAS than ${fromName}.\n\nConsider moving $${opp.suggestedAmount.toFixed(0)} from ${fromName} to ${toName}. Based on current performance, this could generate an additional $${(opp.suggestedAmount * opp.expectedROASImprovement).toFixed(0)} in revenue.\n\n${analysis.insights.join('\n\n')}`,
        reasoning,
        recommended_rule: RexRuleGenerator.generateRule({
          suggestionType: 'reallocate_budget',
          entityType: 'ad_account',
          entityName: 'Cross-Platform Budget',
          currentMetrics: {
            spend: analysis.platforms.find(p => p.platform === opp.fromPlatform)?.totalSpend || 0,
            revenue: analysis.platforms.find(p => p.platform === opp.fromPlatform)?.totalRevenue || 0,
            profit: 0,
            roas: analysis.platforms.find(p => p.platform === opp.fromPlatform)?.roas || 0,
            conversions: analysis.platforms.find(p => p.platform === opp.fromPlatform)?.totalConversions || 0,
            cpa: analysis.platforms.find(p => p.platform === opp.fromPlatform)?.cpa || 0,
            impressions: 0,
            clicks: 0,
            ctr: 0
          },
          platform: opp.toPlatform
        }),
        estimated_impact: {
          expectedRevenue: opp.suggestedAmount * opp.expectedROASImprovement,
          expectedProfit: opp.suggestedAmount * (opp.expectedROASImprovement - 1),
          timeframeDays: 30,
          confidence: 'medium',
          breakdown: `Moving budget from ${fromName} (${(analysis.platforms.find(p => p.platform === opp.fromPlatform)?.roas || 0).toFixed(2)}x ROAS) to ${toName} (${(analysis.platforms.find(p => p.platform === opp.toPlatform)?.roas || 0).toFixed(2)}x ROAS)`
        }
      });
    }

    const platformSpecificSuggestions = await this.generatePlatformSpecificSuggestions(analysis);
    suggestions.push(...platformSpecificSuggestions);

    return suggestions;
  }

  private async generatePlatformSpecificSuggestions(
    analysis: CrossPlatformAnalysis
  ): Promise<CreateRexSuggestionParams[]> {
    const suggestions: CreateRexSuggestionParams[] = [];

    for (const platformMetrics of analysis.platforms) {
      const learningKnowledge = getLearningPhaseKnowledge(platformMetrics.platform);
      const scalingKnowledge = getBudgetScalingKnowledge(platformMetrics.platform);

      if (platformMetrics.roas > 2 && platformMetrics.totalSpend > 500) {
        const scalingStrategy = scalingKnowledge.scalingStrategies[0];
        const maxScalePercent = scalingKnowledge.scalingStrategies[0]?.name.includes('Vertical')
          ? this.getMaxScalePercent(platformMetrics.platform)
          : 20;

        const reasoning: RexSuggestionReasoning = {
          triggeredBy: ['platform_specific_analysis', 'scaling_opportunity'],
          metrics: {
            roas: platformMetrics.roas,
            spend: platformMetrics.totalSpend,
            conversions: platformMetrics.totalConversions
          },
          analysis: `${this.getPlatformDisplayName(platformMetrics.platform)} is performing well. ${scalingStrategy?.name || 'Scaling'} opportunity detected.`,
          riskLevel: 'low',
          supportingData: {
            scalingRules: {
              maxPercent: maxScalePercent,
              timeWindow: this.getScalingTimeWindow(platformMetrics.platform),
              platformNotes: scalingStrategy?.risks || []
            }
          }
        };

        suggestions.push({
          user_id: this.userId,
          entity_type: 'ad_account',
          entity_id: platformMetrics.platform,
          entity_name: `${this.getPlatformDisplayName(platformMetrics.platform)} Account`,
          platform: platformMetrics.platform,
          suggestion_type: 'scale_high_performer',
          priority_score: 70,
          confidence_score: 80,
          title: `Scale ${this.getPlatformDisplayName(platformMetrics.platform)} Budget`,
          message: `Your ${this.getPlatformDisplayName(platformMetrics.platform)} campaigns are generating ${platformMetrics.roas.toFixed(2)}x ROAS.\n\n${this.getPlatformScalingGuidance(platformMetrics.platform, maxScalePercent)}`,
          reasoning,
          recommended_rule: RexRuleGenerator.generateRule({
            suggestionType: 'scale_high_performer',
            entityType: 'ad_account',
            entityName: `${this.getPlatformDisplayName(platformMetrics.platform)} Account`,
            currentMetrics: {
              spend: platformMetrics.totalSpend,
              revenue: platformMetrics.totalRevenue,
              profit: 0,
              roas: platformMetrics.roas,
              conversions: platformMetrics.totalConversions,
              cpa: platformMetrics.cpa,
              impressions: 0,
              clicks: 0,
              ctr: 0
            },
            platform: platformMetrics.platform
          }),
          estimated_impact: {
            expectedRevenue: platformMetrics.totalSpend * (maxScalePercent / 100) * platformMetrics.roas * 0.9,
            expectedProfit: platformMetrics.totalSpend * (maxScalePercent / 100) * (platformMetrics.roas * 0.9 - 1),
            timeframeDays: 14,
            confidence: 'medium',
            breakdown: `Based on ${this.getPlatformDisplayName(platformMetrics.platform)}'s scaling rules: ${maxScalePercent}% increase every ${this.getScalingTimeWindow(platformMetrics.platform)}`
          }
        });
      }
    }

    return suggestions;
  }

  private async getPlatformMetrics(platform: AdPlatform, startDate: string, endDate: string): Promise<PlatformMetrics> {
    const { data: accounts } = await supabase
      .from('ad_accounts')
      .select('id')
      .eq('user_id', this.userId)
      .eq('platform', platform)
      .eq('status', 'active');

    if (!accounts || accounts.length === 0) {
      return {
        platform,
        totalSpend: 0,
        totalRevenue: 0,
        totalConversions: 0,
        roas: 0,
        cpa: 0,
        activeAccounts: 0,
        topPerformingCampaigns: []
      };
    }

    const accountIds = accounts.map(a => a.id);

    const { data: campaigns } = await supabase
      .from('ad_campaigns')
      .select('id, name')
      .in('ad_account_id', accountIds);

    if (!campaigns || campaigns.length === 0) {
      return {
        platform,
        totalSpend: 0,
        totalRevenue: 0,
        totalConversions: 0,
        roas: 0,
        cpa: 0,
        activeAccounts: accounts.length,
        topPerformingCampaigns: []
      };
    }

    const campaignIds = campaigns.map(c => c.id);

    const { data: metrics } = await supabase
      .from('campaign_metrics')
      .select('campaign_id, spend, conversion_value, conversions')
      .in('campaign_id', campaignIds)
      .gte('date', startDate)
      .lte('date', endDate);

    if (!metrics || metrics.length === 0) {
      return {
        platform,
        totalSpend: 0,
        totalRevenue: 0,
        totalConversions: 0,
        roas: 0,
        cpa: 0,
        activeAccounts: accounts.length,
        topPerformingCampaigns: []
      };
    }

    const campaignPerformance: Record<string, { spend: number; revenue: number; conversions: number }> = {};

    metrics.forEach(m => {
      if (!campaignPerformance[m.campaign_id]) {
        campaignPerformance[m.campaign_id] = { spend: 0, revenue: 0, conversions: 0 };
      }
      campaignPerformance[m.campaign_id].spend += m.spend || 0;
      campaignPerformance[m.campaign_id].revenue += m.conversion_value || 0;
      campaignPerformance[m.campaign_id].conversions += m.conversions || 0;
    });

    const totalSpend = Object.values(campaignPerformance).reduce((sum, c) => sum + c.spend, 0);
    const totalRevenue = Object.values(campaignPerformance).reduce((sum, c) => sum + c.revenue, 0);
    const totalConversions = Object.values(campaignPerformance).reduce((sum, c) => sum + c.conversions, 0);

    const topPerformingCampaigns = Object.entries(campaignPerformance)
      .map(([id, perf]) => ({
        id,
        name: campaigns.find(c => c.id === id)?.name || 'Unknown',
        roas: perf.spend > 0 ? perf.revenue / perf.spend : 0,
        spend: perf.spend
      }))
      .filter(c => c.spend > 50)
      .sort((a, b) => b.roas - a.roas)
      .slice(0, 5);

    return {
      platform,
      totalSpend,
      totalRevenue,
      totalConversions,
      roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
      cpa: totalConversions > 0 ? totalSpend / totalConversions : 0,
      activeAccounts: accounts.length,
      topPerformingCampaigns
    };
  }

  private getPlatformDisplayName(platform: AdPlatform): string {
    switch (platform) {
      case 'facebook': return 'Meta';
      case 'tiktok': return 'TikTok';
      case 'google': return 'Google Ads';
      default: return platform;
    }
  }

  private getMaxScalePercent(platform: AdPlatform): number {
    switch (platform) {
      case 'facebook': return 20;
      case 'tiktok': return 20;
      case 'google': return 30;
      default: return 20;
    }
  }

  private getScalingTimeWindow(platform: AdPlatform): string {
    switch (platform) {
      case 'facebook': return '72 hours';
      case 'tiktok': return '24 hours';
      case 'google': return '7 days';
      default: return '72 hours';
    }
  }

  private getPlatformScalingGuidance(platform: AdPlatform, maxPercent: number): string {
    switch (platform) {
      case 'facebook':
        return `Meta allows up to ${maxPercent}% budget increases every 72 hours without resetting learning phase. Scale gradually in ${maxPercent}% increments every 3-4 days.`;
      case 'tiktok':
        return `TikTok allows ${maxPercent}% budget increases every 24 hours - faster than Meta. However, TikTok's algorithm is more sensitive to changes. Creative fatigue also happens 2-3x faster on TikTok, so plan for fresh creative every 2-3 weeks.`;
      case 'google':
        return `Google Ads is the most forgiving platform for budget changes. You can increase up to ${maxPercent}% weekly without disrupting Smart Bidding. Consider using Portfolio Bid Strategies to share learning across campaigns as you scale.`;
      default:
        return `Scale budget by ${maxPercent}% incrementally to maintain performance.`;
    }
  }
}

export const crossPlatformComparisonService = new CrossPlatformComparisonService('');
