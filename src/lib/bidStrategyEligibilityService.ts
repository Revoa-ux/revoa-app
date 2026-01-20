import { supabase } from './supabase';

export type BidStrategyType = 'highest_volume' | 'cost_per_result_goal' | 'roas_goal' | 'maximize_conversion_value';

export interface BidStrategyEligibility {
  type: BidStrategyType;
  eligible: boolean;
  reason?: string;
  suggestedValue?: number;
  daysUntilEligible?: number;
  requirements: {
    met: boolean;
    details: string;
    current?: number;
    required?: number;
  }[];
}

export interface ConversionEventData {
  conversions: number;
  distinctValues: number;
  averageValue: number;
  minValue: number;
  maxValue: number;
}

/**
 * Service to check eligibility for different Meta bid strategies
 * Based on Meta's documented requirements
 */
export class BidStrategyEligibilityService {
  private userId: string;
  private platform: 'facebook' | 'google' | 'tiktok';
  private campaignId?: string;
  private adSetId?: string;

  constructor(userId: string, platform: 'facebook' | 'google' | 'tiktok' = 'facebook', entityId?: string, entityType?: 'campaign' | 'ad_set') {
    this.userId = userId;
    this.platform = platform;

    if (entityType === 'campaign') {
      this.campaignId = entityId;
    } else if (entityType === 'ad_set') {
      this.adSetId = entityId;
    }
  }

  /**
   * Check all bid strategies and return eligibility for each
   */
  async checkAllEligibility(): Promise<BidStrategyEligibility[]> {
    if (this.platform !== 'facebook') {
      // For now, only Meta/Facebook has complex eligibility rules
      return this.getDefaultEligibility();
    }

    const [
      highestVolume,
      costPerResult,
      roasGoal,
      maxValue
    ] = await Promise.all([
      this.checkHighestVolume(),
      this.checkCostPerResultGoal(),
      this.checkRoasGoal(),
      this.checkMaximizeConversionValue()
    ]);

    return [highestVolume, costPerResult, roasGoal, maxValue];
  }

  /**
   * Highest Volume - Always available
   */
  private async checkHighestVolume(): Promise<BidStrategyEligibility> {
    return {
      type: 'highest_volume',
      eligible: true,
      requirements: [{
        met: true,
        details: 'Always available - Meta\'s default bid strategy'
      }]
    };
  }

  /**
   * Cost Per Result Goal - Requires performance history
   */
  private async checkCostPerResultGoal(): Promise<BidStrategyEligibility> {
    const performanceData = await this.getPerformanceData();

    if (!performanceData) {
      return {
        type: 'cost_per_result_goal',
        eligible: false,
        reason: 'No performance data available',
        requirements: [{
          met: false,
          details: 'Requires at least 7 days of active data with 20+ conversions'
        }]
      };
    }

    const { daysActive, conversions, cpa, isProfitable } = performanceData;

    const requirements = [
      {
        met: daysActive >= 7,
        details: `Active for ${daysActive}/7 days minimum`,
        current: daysActive,
        required: 7
      },
      {
        met: conversions >= 20,
        details: `${conversions}/20 conversions minimum`,
        current: conversions,
        required: 20
      },
      {
        met: isProfitable,
        details: isProfitable ? 'Campaign is profitable' : 'Campaign must be profitable'
      }
    ];

    const allMet = requirements.every(r => r.met);

    return {
      type: 'cost_per_result_goal',
      eligible: allMet,
      suggestedValue: allMet ? Math.round(cpa * 100) / 100 : undefined,
      reason: allMet ? `Set cost cap at $${(Math.round(cpa * 100) / 100).toFixed(2)} (current CPA)` : 'Requirements not met',
      daysUntilEligible: daysActive < 7 ? 7 - daysActive : undefined,
      requirements
    };
  }

  /**
   * ROAS Goal - Requires strong performance history
   */
  private async checkRoasGoal(): Promise<BidStrategyEligibility> {
    const performanceData = await this.getPerformanceData();

    if (!performanceData) {
      return {
        type: 'roas_goal',
        eligible: false,
        reason: 'No performance data available',
        requirements: [{
          met: false,
          details: 'Requires at least 7 days of active data with 20+ conversions'
        }]
      };
    }

    const { daysActive, conversions, roas, isProfitable } = performanceData;

    const requirements = [
      {
        met: daysActive >= 7,
        details: `Active for ${daysActive}/7 days minimum`,
        current: daysActive,
        required: 7
      },
      {
        met: conversions >= 20,
        details: `${conversions}/20 conversions minimum`,
        current: conversions,
        required: 20
      },
      {
        met: roas >= 1.5,
        details: `ROAS of ${roas.toFixed(2)} (minimum 1.50 recommended)`,
        current: roas,
        required: 1.5
      },
      {
        met: isProfitable,
        details: isProfitable ? 'Campaign is profitable' : 'Campaign must be profitable'
      }
    ];

    const allMet = requirements.every(r => r.met);

    return {
      type: 'roas_goal',
      eligible: allMet,
      suggestedValue: allMet ? Math.round(roas * 100) / 100 : undefined,
      reason: allMet ? `Set ROAS goal at ${(Math.round(roas * 100) / 100).toFixed(2)}` : 'Requirements not met',
      daysUntilEligible: daysActive < 7 ? 7 - daysActive : undefined,
      requirements
    };
  }

  /**
   * Maximize Conversion Value - Meta's strict requirements
   */
  private async checkMaximizeConversionValue(): Promise<BidStrategyEligibility> {
    const conversionData = await this.getConversionEventData();

    if (!conversionData) {
      return {
        type: 'maximize_conversion_value',
        eligible: false,
        reason: 'No conversion data available',
        requirements: [{
          met: false,
          details: 'Requires conversion events with value tracking'
        }]
      };
    }

    // Meta requirements vary by event type
    const isPurchaseEvent = await this.isPurchaseConversionEvent();

    let conversionReq, valueReq;
    if (isPurchaseEvent) {
      // Purchase: 30+ conversions with 2+ distinct values in last 14 days (minimum)
      // Recommended: 100+ with 5+ distinct values
      conversionReq = { minimum: 30, recommended: 100 };
      valueReq = { minimum: 2, recommended: 5 };
    } else {
      // Other events: 100+ conversions with 5+ distinct values in last 14 days
      conversionReq = { minimum: 100, recommended: 100 };
      valueReq = { minimum: 5, recommended: 5 };
    }

    const meetsMinimum = conversionData.conversions >= conversionReq.minimum && conversionData.distinctValues >= valueReq.minimum;
    const meetsRecommended = conversionData.conversions >= conversionReq.recommended && conversionData.distinctValues >= valueReq.recommended;

    const requirements = [
      {
        met: conversionData.conversions >= conversionReq.minimum,
        details: isPurchaseEvent
          ? `${conversionData.conversions}/${conversionReq.minimum} purchase events (minimum) in last 14 days`
          : `${conversionData.conversions}/${conversionReq.minimum} conversion events (minimum) in last 14 days`,
        current: conversionData.conversions,
        required: conversionReq.minimum
      },
      {
        met: conversionData.distinctValues >= valueReq.minimum,
        details: `${conversionData.distinctValues}/${valueReq.minimum} distinct conversion values (minimum)`,
        current: conversionData.distinctValues,
        required: valueReq.minimum
      },
      {
        met: meetsRecommended,
        details: meetsRecommended
          ? '✓ Meets recommended thresholds for optimal performance'
          : `Recommended: ${conversionReq.recommended}+ conversions with ${valueReq.recommended}+ distinct values`
      }
    ];

    let reason = '';
    if (!meetsMinimum) {
      reason = 'Minimum requirements not met';
    } else if (!meetsRecommended) {
      reason = 'Eligible but below recommended thresholds - may see limited performance';
    } else {
      reason = 'Fully eligible - meets all recommended requirements';
    }

    return {
      type: 'maximize_conversion_value',
      eligible: meetsMinimum,
      reason,
      requirements
    };
  }

  /**
   * Get performance data for the entity
   */
  private async getPerformanceData(): Promise<{
    daysActive: number;
    conversions: number;
    cpa: number;
    roas: number;
    isProfitable: boolean;
  } | null> {
    try {
      let entityId = this.campaignId || this.adSetId;
      let entityType = this.campaignId ? 'campaign' : 'ad_set';

      if (!entityId) {
        // Get all user campaigns if no specific entity
        const { data: accounts } = await supabase
          .from('ad_accounts')
          .select('id')
          .eq('user_id', this.userId)
          .eq('platform', this.platform);

        if (!accounts || accounts.length === 0) return null;

        // Aggregate across all campaigns
        entityId = accounts[0].id;
        entityType = 'campaign';
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: metrics } = await supabase
        .from('ad_metrics')
        .select('date, spend, conversion_value, conversions')
        .eq('entity_id', entityId)
        .eq('entity_type', entityType)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (!metrics || metrics.length === 0) return null;

      const totalSpend = metrics.reduce((sum, m) => sum + (m.spend || 0), 0);
      const totalRevenue = metrics.reduce((sum, m) => sum + (m.conversion_value || 0), 0);
      const totalConversions = metrics.reduce((sum, m) => sum + (m.conversions || 0), 0);

      const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
      const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
      const profit = totalRevenue - totalSpend - (totalRevenue * 0.35); // Estimate COGS

      return {
        daysActive: metrics.length,
        conversions: totalConversions,
        cpa,
        roas,
        isProfitable: profit > 0
      };
    } catch (error) {
      console.error('[BidStrategyEligibilityService] Error getting performance data:', error);
      return null;
    }
  }

  /**
   * Get conversion event data for last 14 days
   */
  private async getConversionEventData(): Promise<ConversionEventData | null> {
    try {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      let query = supabase
        .from('ad_metrics')
        .select('date, conversion_value, conversions')
        .gte('date', fourteenDaysAgo.toISOString().split('T')[0])
        .gt('conversions', 0);

      if (this.campaignId) {
        query = query.eq('entity_id', this.campaignId).eq('entity_type', 'campaign');
      } else if (this.adSetId) {
        query = query.eq('entity_id', this.adSetId).eq('entity_type', 'ad_set');
      } else {
        // All user campaigns
        const { data: accounts } = await supabase
          .from('ad_accounts')
          .select('id')
          .eq('user_id', this.userId)
          .eq('platform', this.platform);

        if (!accounts || accounts.length === 0) return null;

        // This is a simplification - would need to join through campaigns
        return null;
      }

      const { data: metrics } = await query;

      if (!metrics || metrics.length === 0) return null;

      const values = metrics
        .map(m => m.conversion_value || 0)
        .filter(v => v > 0);

      const distinctValues = new Set(values).size;
      const totalConversions = metrics.reduce((sum, m) => sum + (m.conversions || 0), 0);
      const averageValue = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;

      return {
        conversions: totalConversions,
        distinctValues,
        averageValue,
        minValue: values.length > 0 ? Math.min(...values) : 0,
        maxValue: values.length > 0 ? Math.max(...values) : 0
      };
    } catch (error) {
      console.error('[BidStrategyEligibilityService] Error getting conversion data:', error);
      return null;
    }
  }

  /**
   * Check if the conversion event is a purchase event
   */
  private async isPurchaseConversionEvent(): Promise<boolean> {
    try {
      if (!this.campaignId && !this.adSetId) return true; // Default to purchase

      const entityId = this.campaignId || this.adSetId;
      const entityType = this.campaignId ? 'ad_campaigns' : 'ad_sets';

      const { data } = await supabase
        .from(entityType)
        .select('conversion_event, metadata')
        .eq('id', entityId)
        .single();

      if (!data) return true;

      // Check if it's a purchase event
      const conversionEvent = data.conversion_event || data.metadata?.conversion_event;
      return conversionEvent === 'PURCHASE' || conversionEvent === 'Purchase';
    } catch (error) {
      return true; // Default to purchase if we can't determine
    }
  }

  /**
   * Get default eligibility for non-Facebook platforms
   */
  private getDefaultEligibility(): BidStrategyEligibility[] {
    return [
      {
        type: 'highest_volume',
        eligible: true,
        requirements: [{ met: true, details: 'Default strategy - always available' }]
      },
      {
        type: 'cost_per_result_goal',
        eligible: false,
        reason: 'Platform-specific eligibility not yet implemented',
        requirements: [{ met: false, details: 'Check platform documentation' }]
      },
      {
        type: 'roas_goal',
        eligible: false,
        reason: 'Platform-specific eligibility not yet implemented',
        requirements: [{ met: false, details: 'Check platform documentation' }]
      },
      {
        type: 'maximize_conversion_value',
        eligible: false,
        reason: 'Platform-specific eligibility not yet implemented',
        requirements: [{ met: false, details: 'Check platform documentation' }]
      }
    ];
  }
}

export function createBidStrategyEligibilityService(
  userId: string,
  platform: 'facebook' | 'google' | 'tiktok' = 'facebook',
  entityId?: string,
  entityType?: 'campaign' | 'ad_set'
) {
  return new BidStrategyEligibilityService(userId, platform, entityId, entityType);
}
