import { supabase } from './supabase';
import {
  getLearningPhaseRules,
  getBudgetScalingRules,
  isInLearningPhase,
  calculateSafeBudgetIncrease,
  FACEBOOK_CBO_RULES,
  FACEBOOK_ABO_RULES,
  FACEBOOK_ADVANTAGE_PLUS,
  TIKTOK_LEARNING_PHASE,
  TIKTOK_BUDGET_SCALING,
  GOOGLE_LEARNING_PHASE,
  GOOGLE_BUDGET_SCALING,
  type AdPlatform
} from './platformConstraints';
import {
  getCampaignLevelKnowledge,
  getLearningPhaseKnowledge,
  getBudgetScalingKnowledge,
} from './platformKnowledgeBase';

/**
 * Campaign Structure Intelligence Engine
 *
 * Analyzes campaign-level settings and their impact on performance:
 * - CBO vs ABO effectiveness
 * - Learning phase tracking and optimization
 * - Bidding strategy performance
 * - Budget scaling patterns and breakpoints
 * - Advantage Plus effectiveness
 * - Account health impact on performance
 */

// ============================================================================
// TYPES
// ============================================================================

export interface CampaignStructureData {
  campaign_id: string;
  campaign_name: string;
  is_cbo: boolean;
  is_advantage_plus: boolean;
  bidding_strategy: string | null;
  budget_type: string;
  daily_budget: number | null;
  lifetime_budget: number | null;
  learning_phase_status: string | null;
  platform_created_at: string | null;
  last_significant_edit_at: string | null;
}

export interface CampaignPerformanceData {
  spend: number;
  revenue: number;
  profit: number;
  roas: number;
  cpa: number;
  conversions: number;
  clicks: number;
  impressions: number;
}

export interface CBOAnalysis {
  totalCBOCampaigns: number;
  totalABOCampaigns: number;
  cboAverageRoas: number;
  aboAverageRoas: number;
  cboTotalSpend: number;
  aboTotalSpend: number;
  cboTotalProfit: number;
  aboTotalProfit: number;
  recommendation: 'cbo' | 'abo' | 'mixed';
  confidenceScore: number;
  reasoning: string;
  accountStage: 'testing' | 'scaling' | 'mature';
}

export interface LearningPhaseAnalysis {
  campaignsInLearning: number;
  campaignsLearningLimited: number;
  campaignsExitedLearning: number;
  averageDaysToExit: number;
  averageConversionsToExit: number;
  performanceImpact: {
    roasInLearning: number;
    roasPostLearning: number;
    improvement: number;
  };
  recommendations: string[];
}

export interface BiddingStrategyAnalysis {
  strategies: Array<{
    strategy: string;
    campaignCount: number;
    avgRoas: number;
    avgCpa: number;
    totalSpend: number;
    totalProfit: number;
  }>;
  bestStrategy: string;
  reasoning: string;
}

export interface BudgetScalingAnalysis {
  historicalScales: Array<{
    campaign_id: string;
    campaign_name: string;
    date: string;
    oldBudget: number;
    newBudget: number;
    percentChange: number;
    roasBefore: number;
    roasAfter: number;
    impactType: 'positive' | 'negative' | 'neutral';
  }>;
  breakpoints: Array<{
    budgetThreshold: number;
    roasDeclinePercent: number;
    sampleSize: number;
  }>;
  safeScalingPercent: number;
  recommendation: string;
}

export interface AdvantagePlusAnalysis {
  hasAdvantagePlus: boolean;
  advantagePlusRoas: number;
  manualCampaignRoas: number;
  advantagePlusProfit: number;
  manualCampaignProfit: number;
  recommendation: 'advantage_plus' | 'manual' | 'test_both';
  reasoning: string;
}

export interface AccountHealthImpact {
  accountStatus: string;
  feedbackScore: number | null;
  rejectionCount: number;
  paymentFailures: number;
  riskLevel: string;
  performanceCorrelation: {
    hasImpact: boolean;
    roasDecline: number | null;
    reasoning: string;
  };
}

export interface CampaignStructureInsights {
  userId: string;
  adAccountId: string;
  platform: AdPlatform;
  analyzedAt: string;
  cboAnalysis: CBOAnalysis;
  learningPhaseAnalysis: LearningPhaseAnalysis;
  biddingStrategyAnalysis: BiddingStrategyAnalysis;
  budgetScalingAnalysis: BudgetScalingAnalysis;
  advantagePlusAnalysis: AdvantagePlusAnalysis;
  accountHealthImpact: AccountHealthImpact;
  overallRecommendations: string[];
}

// ============================================================================
// CAMPAIGN STRUCTURE INTELLIGENCE ENGINE
// ============================================================================

export class CampaignStructureIntelligenceEngine {
  private userId: string;
  private adAccountId?: string;
  private platform: AdPlatform;

  constructor(userId: string, adAccountId?: string, platform: AdPlatform = 'facebook') {
    this.userId = userId;
    this.adAccountId = adAccountId;
    this.platform = platform;
  }

  /**
   * Analyze CBO vs ABO performance for this account
   * Now platform-aware: Facebook uses CBO, TikTok uses Campaign Budget, Google uses Shared Budgets
   */
  async analyzeCBOvsABO(): Promise<CBOAnalysis> {
    if (!this.adAccountId) {
      throw new Error('Ad account ID is required for CBO/ABO analysis');
    }

    const { data: campaigns, error } = await supabase
      .from('ad_campaigns')
      .select(`
        id,
        name,
        is_cbo,
        daily_budget,
        lifetime_budget
      `)
      .eq('ad_account_id', this.adAccountId);

    if (error || !campaigns) {
      throw new Error(`Failed to fetch campaigns: ${error?.message}`);
    }

    const campaignIds = campaigns.map(c => c.id);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const { data: snapshots } = await supabase
      .from('performance_snapshots')
      .select('*')
      .in('entity_id', campaignIds)
      .eq('entity_type', 'campaign')
      .gte('snapshot_date', sixtyDaysAgo.toISOString().split('T')[0]);

    const cboStats = { spend: 0, revenue: 0, profit: 0, count: 0 };
    const aboStats = { spend: 0, revenue: 0, profit: 0, count: 0 };

    campaigns.forEach(campaign => {
      const campaignSnapshots = snapshots?.filter(s => s.entity_id === campaign.id) || [];
      const totalSpend = campaignSnapshots.reduce((sum, s) => sum + Number(s.spend), 0);
      const totalRevenue = campaignSnapshots.reduce((sum, s) => sum + Number(s.conversion_value), 0);
      const totalProfit = totalRevenue - totalSpend;

      if (campaign.is_cbo) {
        cboStats.spend += totalSpend;
        cboStats.revenue += totalRevenue;
        cboStats.profit += totalProfit;
        cboStats.count++;
      } else {
        aboStats.spend += totalSpend;
        aboStats.revenue += totalRevenue;
        aboStats.profit += totalProfit;
        aboStats.count++;
      }
    });

    const cboRoas = cboStats.spend > 0 ? cboStats.revenue / cboStats.spend : 0;
    const aboRoas = aboStats.spend > 0 ? aboStats.revenue / aboStats.spend : 0;

    let recommendation: 'cbo' | 'abo' | 'mixed' = 'mixed';
    let reasoning = '';
    let confidenceScore = 50;
    let accountStage: 'testing' | 'scaling' | 'mature' = 'testing';

    const totalSpend = cboStats.spend + aboStats.spend;
    const platformKnowledge = getCampaignLevelKnowledge(this.platform);
    const budgetOptInfo = platformKnowledge.budgetOptimization;

    const cboTerminology = this.getPlatformBudgetTerminology();

    if (totalSpend < 5000) {
      accountStage = 'testing';
      recommendation = 'abo';
      reasoning = this.getTestingPhaseReasoning(cboTerminology);
      confidenceScore = 75;
    } else if (totalSpend < 30000) {
      accountStage = 'scaling';
      if (cboRoas > aboRoas * 1.15 && cboStats.count >= 2) {
        recommendation = 'cbo';
        reasoning = `${cboTerminology.cboName} is outperforming ${cboTerminology.aboName} by ${((cboRoas / aboRoas - 1) * 100).toFixed(1)}% for your ${cboTerminology.platformName} account. ${this.getScalingRecommendation()}`;
        confidenceScore = 80;
      } else if (aboRoas > cboRoas * 1.15) {
        recommendation = 'abo';
        reasoning = `${cboTerminology.aboName} is outperforming ${cboTerminology.cboName} by ${((aboRoas / cboRoas - 1) * 100).toFixed(1)}%. Your account benefits from manual control.`;
        confidenceScore = 75;
      } else {
        recommendation = budgetOptInfo.cbo.isUniversalDefault ? 'cbo' : 'mixed';
        reasoning = this.getMixedRecommendation(cboTerminology);
        confidenceScore = 60;
      }
    } else {
      accountStage = 'mature';
      recommendation = 'cbo';
      reasoning = this.getMatureAccountReasoning(cboTerminology);
      confidenceScore = 85;
    }

    return {
      totalCBOCampaigns: cboStats.count,
      totalABOCampaigns: aboStats.count,
      cboAverageRoas: cboRoas,
      aboAverageRoas: aboRoas,
      cboTotalSpend: cboStats.spend,
      aboTotalSpend: aboStats.spend,
      cboTotalProfit: cboStats.profit,
      aboTotalProfit: aboStats.profit,
      recommendation,
      confidenceScore,
      reasoning,
      accountStage
    };
  }

  private getPlatformBudgetTerminology(): { platformName: string; cboName: string; aboName: string } {
    switch (this.platform) {
      case 'facebook':
        return {
          platformName: 'Meta',
          cboName: 'Campaign Budget Optimization (CBO)',
          aboName: 'Ad Set Budget Optimization (ABO)'
        };
      case 'tiktok':
        return {
          platformName: 'TikTok',
          cboName: 'Campaign Budget Optimization',
          aboName: 'Ad Group Budget'
        };
      case 'google':
        return {
          platformName: 'Google Ads',
          cboName: 'Shared Budgets',
          aboName: 'Individual Campaign Budgets'
        };
      default:
        return {
          platformName: 'Ad Platform',
          cboName: 'Automated Budget',
          aboName: 'Manual Budget'
        };
    }
  }

  private getTestingPhaseReasoning(terminology: { platformName: string; cboName: string; aboName: string }): string {
    switch (this.platform) {
      case 'facebook':
        return `Your Meta account is in testing phase (< $5k spent). ${terminology.aboName} provides better control for testing audiences and finding winners. Meta recommends CBO only after you have proven winners.`;
      case 'tiktok':
        return `Your TikTok account is in testing phase (< $5k spent). ${terminology.aboName} gives you precise control over spend per ad group. TikTok's algorithm needs clear winners before CBO can optimize effectively.`;
      case 'google':
        return `Your Google Ads account is in testing phase (< $5k spent). Use ${terminology.aboName} to control spend per campaign while testing. Shared Budgets work best once you have campaigns with similar goals and proven performance.`;
      default:
        return 'Your account is in testing phase. Manual budget control is recommended.';
    }
  }

  private getScalingRecommendation(): string {
    switch (this.platform) {
      case 'facebook':
        return 'Trust the algorithm and let Meta distribute budget to top performers.';
      case 'tiktok':
        return 'TikTok CBO can distribute budget to your best-performing ad groups automatically.';
      case 'google':
        return 'Consider using Shared Budgets to let Google optimize across similar campaigns.';
      default:
        return 'Automated budget distribution can improve efficiency.';
    }
  }

  private getMixedRecommendation(terminology: { platformName: string; cboName: string; aboName: string }): string {
    switch (this.platform) {
      case 'facebook':
        return `Use ${terminology.aboName} for testing new audiences, ${terminology.cboName} for scaling proven winners. Your Meta account shows no clear preference - both strategies perform similarly.`;
      case 'tiktok':
        return `Use ${terminology.aboName} when testing specific ad groups with equal budget. Switch to ${terminology.cboName} once you have 2-3 proven winners in a campaign.`;
      case 'google':
        return `Use ${terminology.aboName} for different campaign objectives. Consider ${terminology.cboName} (Shared Budgets) when campaigns have similar goals and you want Google to optimize allocation.`;
      default:
        return 'A mixed approach works best for your account.';
    }
  }

  private getMatureAccountReasoning(terminology: { platformName: string; cboName: string; aboName: string }): string {
    switch (this.platform) {
      case 'facebook':
        return `Mature Meta accounts (>$30k spend) typically benefit from ${terminology.cboName}. Focus energy on creative and offer optimization while Meta handles budget allocation.`;
      case 'tiktok':
        return `With significant spend history, TikTok's ${terminology.cboName} can effectively distribute budget based on real-time performance. Focus on creative refresh (every 2-3 weeks on TikTok) while automation handles budget.`;
      case 'google':
        return `Mature Google Ads accounts benefit from ${terminology.cboName} (Shared Budgets) and Portfolio Bid Strategies. These allow Google to share learnings and optimize across campaigns.`;
      default:
        return 'Mature accounts benefit from automated budget optimization.';
    }
  }

  /**
   * Analyze learning phase effectiveness and patterns
   */
  async analyzeLearningPhase(): Promise<LearningPhaseAnalysis> {
    const { data: campaigns } = await supabase
      .from('ad_campaigns')
      .select(`
        id,
        name,
        learning_phase_status,
        platform_created_at,
        last_significant_edit_at
      `)
      .eq('ad_account_id', this.adAccountId);

    if (!campaigns) {
      throw new Error('Failed to fetch campaigns');
    }

    let inLearning = 0;
    let learningLimited = 0;
    let exited = 0;
    const daysToExit: number[] = [];
    const conversionsToExit: number[] = [];

    // Get performance data for learning phase analysis
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: snapshots } = await supabase
      .from('performance_snapshots')
      .select('*')
      .eq('ad_account_id', this.adAccountId)
      .eq('entity_type', 'campaign')
      .gte('snapshot_date', thirtyDaysAgo.toISOString().split('T')[0]);

    let roasInLearning = 0;
    let roasPostLearning = 0;
    let learningCount = 0;
    let postLearningCount = 0;

    campaigns.forEach(campaign => {
      const status = campaign.learning_phase_status?.toLowerCase() || '';

      if (status.includes('learning') && !status.includes('limited')) {
        inLearning++;

        // Calculate ROAS for campaigns in learning
        const campaignSnapshots = snapshots?.filter(
          s => s.entity_id === campaign.id && s.learning_phase_status?.includes('learning')
        ) || [];

        const spend = campaignSnapshots.reduce((sum, s) => sum + Number(s.spend), 0);
        const revenue = campaignSnapshots.reduce((sum, s) => sum + Number(s.conversion_value), 0);

        if (spend > 0) {
          roasInLearning += revenue / spend;
          learningCount++;
        }
      } else if (status.includes('limited')) {
        learningLimited++;
      } else if (status === 'active' || status === 'graduated') {
        exited++;

        // Calculate ROAS for campaigns post-learning
        const campaignSnapshots = snapshots?.filter(
          s => s.entity_id === campaign.id && !s.learning_phase_status?.includes('learning')
        ) || [];

        const spend = campaignSnapshots.reduce((sum, s) => sum + Number(s.spend), 0);
        const revenue = campaignSnapshots.reduce((sum, s) => sum + Number(s.conversion_value), 0);

        if (spend > 0) {
          roasPostLearning += revenue / spend;
          postLearningCount++;
        }

        // Calculate days to exit
        if (campaign.platform_created_at) {
          const createdDate = new Date(campaign.platform_created_at);
          const exitDate = campaign.last_significant_edit_at
            ? new Date(campaign.last_significant_edit_at)
            : new Date();
          const days = Math.floor((exitDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
          if (days > 0 && days < 30) {
            daysToExit.push(days);
          }
        }
      }
    });

    const avgDaysToExit = daysToExit.length > 0
      ? daysToExit.reduce((sum, d) => sum + d, 0) / daysToExit.length
      : 7;

    const avgRoasInLearning = learningCount > 0 ? roasInLearning / learningCount : 0;
    const avgRoasPostLearning = postLearningCount > 0 ? roasPostLearning / postLearningCount : 0;
    const improvement = avgRoasPostLearning > 0
      ? ((avgRoasPostLearning - avgRoasInLearning) / avgRoasInLearning) * 100
      : 0;

    const recommendations: string[] = [];

    if (learningLimited > inLearning) {
      recommendations.push(
        'You have more Learning Limited campaigns than active learning. Increase budgets or consolidate into fewer ad sets to achieve 50 conversions/week.'
      );
    }

    if (inLearning > exited * 0.5) {
      recommendations.push(
        'Too many campaigns stuck in learning phase. Focus budget on fewer, proven campaigns to exit learning faster.'
      );
    }

    if (avgDaysToExit > 10) {
      recommendations.push(
        `Your campaigns take ${avgDaysToExit.toFixed(1)} days on average to exit learning. Increase initial budgets to accelerate learning.`
      );
    }

    const learningRules = getLearningPhaseRules(this.platform);
    if (learningRules) {
      recommendations.push(
        `Remember: ${this.platform} requires ${learningRules.conversionsRequired} conversions in ${learningRules.timeWindowDays} days to exit learning phase.`
      );
    }

    return {
      campaignsInLearning: inLearning,
      campaignsLearningLimited: learningLimited,
      campaignsExitedLearning: exited,
      averageDaysToExit: avgDaysToExit,
      averageConversionsToExit: 50, // Platform standard
      performanceImpact: {
        roasInLearning: avgRoasInLearning,
        roasPostLearning: avgRoasPostLearning,
        improvement
      },
      recommendations
    };
  }

  /**
   * Analyze bidding strategy effectiveness
   */
  async analyzeBiddingStrategies(): Promise<BiddingStrategyAnalysis> {
    const { data: campaigns } = await supabase
      .from('ad_campaigns')
      .select('id, bidding_strategy')
      .eq('ad_account_id', this.adAccountId);

    if (!campaigns || campaigns.length === 0) {
      return {
        strategies: [],
        bestStrategy: 'lowest_cost',
        reasoning: 'No data available. Lowest Cost is recommended for most accounts.'
      };
    }

    // Get performance by bidding strategy
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const { data: snapshots } = await supabase
      .from('performance_snapshots')
      .select('*')
      .eq('ad_account_id', this.adAccountId)
      .eq('entity_type', 'campaign')
      .gte('snapshot_date', sixtyDaysAgo.toISOString().split('T')[0]);

    const strategyStats: Record<string, {
      count: number;
      spend: number;
      revenue: number;
      conversions: number;
    }> = {};

    campaigns.forEach(campaign => {
      const strategy = campaign.bidding_strategy || 'lowest_cost';
      const campaignSnapshots = snapshots?.filter(s => s.entity_id === campaign.id) || [];

      if (!strategyStats[strategy]) {
        strategyStats[strategy] = { count: 0, spend: 0, revenue: 0, conversions: 0 };
      }

      strategyStats[strategy].count++;
      strategyStats[strategy].spend += campaignSnapshots.reduce((sum, s) => sum + Number(s.spend), 0);
      strategyStats[strategy].revenue += campaignSnapshots.reduce((sum, s) => sum + Number(s.conversion_value), 0);
      strategyStats[strategy].conversions += campaignSnapshots.reduce((sum, s) => sum + Number(s.conversions), 0);
    });

    const strategies = Object.entries(strategyStats).map(([strategy, stats]) => ({
      strategy,
      campaignCount: stats.count,
      avgRoas: stats.spend > 0 ? stats.revenue / stats.spend : 0,
      avgCpa: stats.conversions > 0 ? stats.spend / stats.conversions : 0,
      totalSpend: stats.spend,
      totalProfit: stats.revenue - stats.spend
    }));

    strategies.sort((a, b) => b.avgRoas - a.avgRoas);

    const bestStrategy = strategies[0]?.strategy || 'lowest_cost';
    const reasoning = strategies.length > 0
      ? `${bestStrategy} is delivering ${strategies[0].avgRoas.toFixed(2)}x ROAS across ${strategies[0].campaignCount} campaigns.`
      : 'Start with Lowest Cost bidding strategy for most campaigns.';

    return {
      strategies,
      bestStrategy,
      reasoning
    };
  }

  /**
   * Analyze historical budget scaling patterns
   */
  async analyzeBudgetScaling(): Promise<BudgetScalingAnalysis> {
    const { data: history } = await supabase
      .from('campaign_settings_history')
      .select('*')
      .eq('user_id', this.userId)
      .eq('change_type', 'budget_change')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!history || history.length === 0) {
      const defaultRules = getBudgetScalingRules(this.platform);
      return {
        historicalScales: [],
        breakpoints: [],
        safeScalingPercent: defaultRules?.recommendedIncreasePercent || 20,
        recommendation: `No scaling history yet. Start with ${defaultRules?.recommendedIncreasePercent || 20}% budget increases every ${defaultRules ? Math.ceil(defaultRules.timeWindowHours / 24) : 3} days.`
      };
    }

    const historicalScales = history.map(h => {
      const oldBudget = parseFloat(h.old_value || '0');
      const newBudget = parseFloat(h.new_value || '0');
      const percentChange = oldBudget > 0 ? ((newBudget - oldBudget) / oldBudget) * 100 : 0;
      const roasBefore = h.roas_before || 0;
      const roasAfter = h.roas_after || 0;
      const roasChange = roasBefore > 0 ? ((roasAfter - roasBefore) / roasBefore) * 100 : 0;

      let impactType: 'positive' | 'negative' | 'neutral' = 'neutral';
      if (roasChange > 5) impactType = 'positive';
      else if (roasChange < -5) impactType = 'negative';

      return {
        campaign_id: h.campaign_id,
        campaign_name: '',
        date: h.created_at,
        oldBudget,
        newBudget,
        percentChange,
        roasBefore,
        roasAfter,
        impactType
      };
    });

    // Identify breakpoints where performance declined
    const breakpoints: Array<{ budgetThreshold: number; roasDeclinePercent: number; sampleSize: number }> = [];
    const budgetRanges = [100, 200, 500, 1000, 2000, 5000];

    budgetRanges.forEach(threshold => {
      const scalesAboveThreshold = historicalScales.filter(
        s => s.newBudget >= threshold && s.impactType === 'negative'
      );

      if (scalesAboveThreshold.length >= 2) {
        const avgDecline = scalesAboveThreshold.reduce((sum, s) => {
          const decline = s.roasBefore > 0 ? ((s.roasBefore - s.roasAfter) / s.roasBefore) * 100 : 0;
          return sum + decline;
        }, 0) / scalesAboveThreshold.length;

        breakpoints.push({
          budgetThreshold: threshold,
          roasDeclinePercent: avgDecline,
          sampleSize: scalesAboveThreshold.length
        });
      }
    });

    // Calculate safe scaling percent based on history
    const successfulScales = historicalScales.filter(s => s.impactType !== 'negative');
    const safeScalingPercent = successfulScales.length > 0
      ? successfulScales.reduce((sum, s) => sum + Math.abs(s.percentChange), 0) / successfulScales.length
      : 20;

    let recommendation = `Based on your history, scale budgets by ${Math.round(safeScalingPercent)}% every 3-4 days for best results.`;

    if (breakpoints.length > 0) {
      const lowestBreakpoint = breakpoints[0];
      recommendation += ` Watch for performance drops around $${lowestBreakpoint.budgetThreshold} daily budget.`;
    }

    return {
      historicalScales: historicalScales.slice(0, 20),
      breakpoints,
      safeScalingPercent: Math.round(safeScalingPercent),
      recommendation
    };
  }

  /**
   * Analyze Advantage Plus vs manual campaigns
   */
  async analyzeAdvantagePlus(): Promise<AdvantagePlusAnalysis> {
    const { data: campaigns } = await supabase
      .from('ad_campaigns')
      .select('id, is_advantage_plus')
      .eq('ad_account_id', this.adAccountId);

    if (!campaigns) {
      return {
        hasAdvantagePlus: false,
        advantagePlusRoas: 0,
        manualCampaignRoas: 0,
        advantagePlusProfit: 0,
        manualCampaignProfit: 0,
        recommendation: 'test_both',
        reasoning: 'No campaign data available.'
      };
    }

    const advantagePlusCampaigns = campaigns.filter(c => c.is_advantage_plus);
    const hasAdvantagePlus = advantagePlusCampaigns.length > 0;

    if (!hasAdvantagePlus) {
      return {
        hasAdvantagePlus: false,
        advantagePlusRoas: 0,
        manualCampaignRoas: 0,
        advantagePlusProfit: 0,
        manualCampaignProfit: 0,
        recommendation: 'test_both',
        reasoning: 'You haven\'t tested Advantage+ yet. Consider testing with a proven offer that has strong pixel data.'
      };
    }

    // Get performance comparison
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const { data: snapshots } = await supabase
      .from('performance_snapshots')
      .select('*')
      .eq('ad_account_id', this.adAccountId)
      .eq('entity_type', 'campaign')
      .gte('snapshot_date', sixtyDaysAgo.toISOString().split('T')[0]);

    let advantageStats = { spend: 0, revenue: 0 };
    let manualStats = { spend: 0, revenue: 0 };

    campaigns.forEach(campaign => {
      const campaignSnapshots = snapshots?.filter(s => s.entity_id === campaign.id) || [];
      const spend = campaignSnapshots.reduce((sum, s) => sum + Number(s.spend), 0);
      const revenue = campaignSnapshots.reduce((sum, s) => sum + Number(s.conversion_value), 0);

      if (campaign.is_advantage_plus) {
        advantageStats.spend += spend;
        advantageStats.revenue += revenue;
      } else {
        manualStats.spend += spend;
        manualStats.revenue += revenue;
      }
    });

    const advantageRoas = advantageStats.spend > 0 ? advantageStats.revenue / advantageStats.spend : 0;
    const manualRoas = manualStats.spend > 0 ? manualStats.revenue / manualStats.spend : 0;
    const advantageProfit = advantageStats.revenue - advantageStats.spend;
    const manualProfit = manualStats.revenue - manualStats.spend;

    let recommendation: 'advantage_plus' | 'manual' | 'test_both' = 'test_both';
    let reasoning = '';

    if (advantageRoas > manualRoas * 1.2 && advantageStats.spend > 1000) {
      recommendation = 'advantage_plus';
      reasoning = `Advantage+ is outperforming manual campaigns by ${((advantageRoas / manualRoas - 1) * 100).toFixed(1)}%. Your pixel data is strong enough for automation.`;
    } else if (manualRoas > advantageRoas * 1.2) {
      recommendation = 'manual';
      reasoning = `Manual campaigns are outperforming Advantage+ by ${((manualRoas / advantageRoas - 1) * 100).toFixed(1)}%. You may have niche targeting that works better manually.`;
    } else {
      recommendation = 'test_both';
      reasoning = 'Use Advantage+ for scaling proven offers, manual campaigns for testing and niche audiences.';
    }

    return {
      hasAdvantagePlus,
      advantagePlusRoas: advantageRoas,
      manualCampaignRoas: manualRoas,
      advantagePlusProfit: advantageProfit,
      manualCampaignProfit: manualProfit,
      recommendation,
      reasoning
    };
  }

  /**
   * Analyze account health impact on performance
   */
  async analyzeAccountHealth(): Promise<AccountHealthImpact> {
    const { data: health } = await supabase
      .from('ad_account_health')
      .select('*')
      .eq('ad_account_id', this.adAccountId)
      .single();

    if (!health) {
      return {
        accountStatus: 'active',
        feedbackScore: null,
        rejectionCount: 0,
        paymentFailures: 0,
        riskLevel: 'low',
        performanceCorrelation: {
          hasImpact: false,
          roasDecline: null,
          reasoning: 'Account health data not available.'
        }
      };
    }

    // Check if account issues correlate with performance drops
    let hasImpact = false;
    let roasDecline: number | null = null;
    let reasoning = 'Account health is good with no significant impact on performance.';

    if (health.feedback_score && health.feedback_score < 2.5) {
      hasImpact = true;
      reasoning = `Low feedback score (${health.feedback_score}/5) may be limiting ad delivery and increasing costs.`;
    }

    if (health.ad_rejections_count > 5) {
      hasImpact = true;
      reasoning = `${health.ad_rejections_count} ad rejections indicate policy compliance issues that can harm account standing.`;
    }

    if (health.payment_failures_count > 0) {
      hasImpact = true;
      reasoning = `Payment failures (${health.payment_failures_count}) can cause immediate campaign pausing and delivery issues.`;
    }

    if (health.account_status !== 'active') {
      hasImpact = true;
      reasoning = `Account status is ${health.account_status}. This severely impacts ad delivery and performance.`;
    }

    return {
      accountStatus: health.account_status,
      feedbackScore: health.feedback_score,
      rejectionCount: health.ad_rejections_count || 0,
      paymentFailures: health.payment_failures_count || 0,
      riskLevel: health.risk_level || 'low',
      performanceCorrelation: {
        hasImpact,
        roasDecline,
        reasoning
      }
    };
  }

  /**
   * Get complete campaign structure insights
   */
  async getCompleteInsights(): Promise<CampaignStructureInsights> {
    const [
      cboAnalysis,
      learningPhaseAnalysis,
      biddingStrategyAnalysis,
      budgetScalingAnalysis,
      advantagePlusAnalysis,
      accountHealthImpact
    ] = await Promise.all([
      this.analyzeCBOvsABO(),
      this.analyzeLearningPhase(),
      this.analyzeBiddingStrategies(),
      this.analyzeBudgetScaling(),
      this.analyzeAdvantagePlus(),
      this.analyzeAccountHealth()
    ]);

    const overallRecommendations: string[] = [];

    // Generate overall recommendations
    if (cboAnalysis.recommendation === 'cbo' && cboAnalysis.accountStage === 'scaling') {
      overallRecommendations.push('Transition to CBO for your scaling campaigns to leverage Meta\'s budget optimization.');
    }

    if (learningPhaseAnalysis.campaignsLearningLimited > 3) {
      overallRecommendations.push('Consolidate your Learning Limited campaigns into fewer ad sets with higher budgets.');
    }

    if (accountHealthImpact.performanceCorrelation.hasImpact) {
      overallRecommendations.push('Address account health issues immediately - they are directly impacting your performance.');
    }

    if (advantagePlusAnalysis.recommendation === 'advantage_plus') {
      overallRecommendations.push('Your account is ready for Advantage+ campaigns. They outperform your manual campaigns.');
    }

    return {
      userId: this.userId,
      adAccountId: this.adAccountId,
      platform: this.platform,
      analyzedAt: new Date().toISOString(),
      cboAnalysis,
      learningPhaseAnalysis,
      biddingStrategyAnalysis,
      budgetScalingAnalysis,
      advantagePlusAnalysis,
      accountHealthImpact,
      overallRecommendations
    };
  }
}
