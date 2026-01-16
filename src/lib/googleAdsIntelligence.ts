import { supabase } from './supabase';
import {
  GOOGLE_ADS_BID_ADJUSTMENT_KNOWLEDGE,
  getDeviceBidGuidance,
  getAudienceTypeGuidance,
} from './platformKnowledgeBase';

export interface GoogleAdsBidAdjustmentSuggestion {
  suggestionType:
    | 'increase_device_bid'
    | 'decrease_device_bid'
    | 'exclude_device'
    | 'increase_location_bid'
    | 'decrease_location_bid'
    | 'exclude_location'
    | 'increase_audience_bid'
    | 'decrease_audience_bid'
    | 'exclude_audience'
    | 'increase_schedule_bid'
    | 'decrease_schedule_bid'
    | 'pause_keyword'
    | 'increase_keyword_bid'
    | 'decrease_keyword_bid'
    | 'add_negative_keyword'
    | 'exclude_placement'
    | 'increase_age_bid'
    | 'decrease_age_bid'
    | 'increase_gender_bid'
    | 'decrease_gender_bid';
  entityType: 'campaign' | 'ad_group' | 'keyword' | 'placement' | 'audience';
  entityId: string;
  entityName: string;
  adjustmentType: 'device' | 'location' | 'audience' | 'ad_schedule' | 'demographic' | 'keyword' | 'placement';
  criterionId?: string;
  criterionName: string;
  currentValue: number;
  recommendedValue: number;
  reasoning: string;
  confidence: number;
  estimatedImpact: {
    metric: string;
    currentValue: number;
    projectedValue: number;
    changePercent: number;
  };
  supportingData: {
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
    conversionValue: number;
    roas: number;
    cpa: number;
    ctr: number;
  };
  priority: 'high' | 'medium' | 'low';
  platformKnowledge: string[];
}

export interface GoogleAdsIntelligenceResult {
  suggestions: GoogleAdsBidAdjustmentSuggestion[];
  analysisDate: string;
  dataRange: { startDate: string; endDate: string };
  totalEntitiesAnalyzed: number;
  optimizationOpportunities: number;
}

export class GoogleAdsIntelligenceService {
  private readonly MIN_IMPRESSIONS_FOR_ANALYSIS = 100;
  private readonly MIN_CLICKS_FOR_BID_ADJUSTMENT = 20;
  private readonly MIN_SPEND_FOR_ANALYSIS = 10;
  private readonly SIGNIFICANT_PERFORMANCE_DIFFERENCE = 0.2;

  async analyzeAccountDimensions(
    userId: string,
    adAccountId: string,
    startDate: string,
    endDate: string
  ): Promise<GoogleAdsIntelligenceResult> {
    const suggestions: GoogleAdsBidAdjustmentSuggestion[] = [];

    const deviceSuggestions = await this.analyzeDevicePerformance(userId, adAccountId, startDate, endDate);
    suggestions.push(...deviceSuggestions);

    const locationSuggestions = await this.analyzeLocationPerformance(userId, adAccountId, startDate, endDate);
    suggestions.push(...locationSuggestions);

    const audienceSuggestions = await this.analyzeAudiencePerformance(userId, adAccountId, startDate, endDate);
    suggestions.push(...audienceSuggestions);

    const scheduleSuggestions = await this.analyzeAdSchedulePerformance(userId, adAccountId, startDate, endDate);
    suggestions.push(...scheduleSuggestions);

    const demographicSuggestions = await this.analyzeDemographicPerformance(userId, adAccountId, startDate, endDate);
    suggestions.push(...demographicSuggestions);

    const keywordSuggestions = await this.analyzeKeywordPerformance(userId, adAccountId, startDate, endDate);
    suggestions.push(...keywordSuggestions);

    suggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.confidence - a.confidence;
    });

    return {
      suggestions,
      analysisDate: new Date().toISOString(),
      dataRange: { startDate, endDate },
      totalEntitiesAnalyzed: suggestions.length,
      optimizationOpportunities: suggestions.filter(s => s.priority === 'high').length,
    };
  }

  private async analyzeDevicePerformance(
    userId: string,
    adAccountId: string,
    startDate: string,
    endDate: string
  ): Promise<GoogleAdsBidAdjustmentSuggestion[]> {
    const suggestions: GoogleAdsBidAdjustmentSuggestion[] = [];

    const { data: deviceMetrics, error } = await supabase
      .from('google_ads_device_metrics')
      .select(`
        *,
        ad_campaigns:entity_id(id, name, platform_campaign_id, daily_budget)
      `)
      .eq('user_id', userId)
      .eq('entity_type', 'campaign')
      .gte('date', startDate)
      .lte('date', endDate);

    if (error || !deviceMetrics || deviceMetrics.length === 0) {
      return suggestions;
    }

    const campaignDeviceData = new Map<string, Map<string, any>>();

    for (const metric of deviceMetrics) {
      const campaignId = metric.entity_id;
      if (!campaignDeviceData.has(campaignId)) {
        campaignDeviceData.set(campaignId, new Map());
      }

      const deviceMap = campaignDeviceData.get(campaignId)!;
      const device = metric.device;

      if (!deviceMap.has(device)) {
        deviceMap.set(device, {
          device,
          campaignId,
          campaignName: metric.ad_campaigns?.name || 'Unknown Campaign',
          platformCampaignId: metric.ad_campaigns?.platform_campaign_id,
          impressions: 0,
          clicks: 0,
          spend: 0,
          conversions: 0,
          conversionValue: 0,
          currentBidModifier: metric.bid_modifier || 0,
        });
      }

      const data = deviceMap.get(device)!;
      data.impressions += metric.impressions || 0;
      data.clicks += metric.clicks || 0;
      data.spend += metric.spend || 0;
      data.conversions += metric.conversions || 0;
      data.conversionValue += metric.conversion_value || 0;
    }

    for (const [campaignId, deviceMap] of campaignDeviceData) {
      const devices = Array.from(deviceMap.values());
      const totalSpend = devices.reduce((sum, d) => sum + d.spend, 0);
      const totalConversions = devices.reduce((sum, d) => sum + d.conversions, 0);
      const totalConversionValue = devices.reduce((sum, d) => sum + d.conversionValue, 0);

      if (totalSpend < this.MIN_SPEND_FOR_ANALYSIS) continue;

      const avgRoas = totalSpend > 0 ? totalConversionValue / totalSpend : 0;
      const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : Infinity;

      for (const device of devices) {
        if (device.impressions < this.MIN_IMPRESSIONS_FOR_ANALYSIS) continue;

        const deviceRoas = device.spend > 0 ? device.conversionValue / device.spend : 0;
        const deviceCpa = device.conversions > 0 ? device.spend / device.conversions : Infinity;
        const deviceCtr = device.impressions > 0 ? (device.clicks / device.impressions) * 100 : 0;

        const roasDiff = avgRoas > 0 ? (deviceRoas - avgRoas) / avgRoas : 0;
        const cpaDiff = avgCpa < Infinity && deviceCpa < Infinity ? (avgCpa - deviceCpa) / avgCpa : 0;

        const knowledge = getDeviceBidGuidance(device.device);

        if (roasDiff > this.SIGNIFICANT_PERFORMANCE_DIFFERENCE && device.conversions >= 3) {
          const recommendedIncrease = Math.min(Math.round(roasDiff * 50), 50);
          const newBidModifier = device.currentBidModifier + recommendedIncrease;

          if (newBidModifier <= 900) {
            suggestions.push({
              suggestionType: 'increase_device_bid',
              entityType: 'campaign',
              entityId: device.campaignId,
              entityName: device.campaignName,
              adjustmentType: 'device',
              criterionName: device.device,
              currentValue: device.currentBidModifier,
              recommendedValue: newBidModifier,
              reasoning: `${device.device} has ${Math.round(roasDiff * 100)}% higher ROAS (${deviceRoas.toFixed(2)}x) compared to campaign average (${avgRoas.toFixed(2)}x). Increasing bid will capture more of this high-performing traffic.`,
              confidence: Math.min(85, 60 + device.conversions * 2),
              estimatedImpact: {
                metric: 'ROAS',
                currentValue: deviceRoas,
                projectedValue: deviceRoas * 1.1,
                changePercent: 10,
              },
              supportingData: {
                impressions: device.impressions,
                clicks: device.clicks,
                spend: device.spend,
                conversions: device.conversions,
                conversionValue: device.conversionValue,
                roas: deviceRoas,
                cpa: deviceCpa,
                ctr: deviceCtr,
              },
              priority: roasDiff > 0.5 ? 'high' : 'medium',
              platformKnowledge: knowledge?.whenToIncrease || [],
            });
          }
        }

        if (roasDiff < -this.SIGNIFICANT_PERFORMANCE_DIFFERENCE && device.spend > 50) {
          const recommendedDecrease = Math.min(Math.round(Math.abs(roasDiff) * 50), 50);
          const newBidModifier = device.currentBidModifier - recommendedDecrease;

          if (newBidModifier >= -90) {
            suggestions.push({
              suggestionType: 'decrease_device_bid',
              entityType: 'campaign',
              entityId: device.campaignId,
              entityName: device.campaignName,
              adjustmentType: 'device',
              criterionName: device.device,
              currentValue: device.currentBidModifier,
              recommendedValue: newBidModifier,
              reasoning: `${device.device} has ${Math.round(Math.abs(roasDiff) * 100)}% lower ROAS (${deviceRoas.toFixed(2)}x) compared to campaign average (${avgRoas.toFixed(2)}x). Decreasing bid will reallocate budget to better performing devices.`,
              confidence: Math.min(80, 55 + device.clicks / 10),
              estimatedImpact: {
                metric: 'CPA',
                currentValue: deviceCpa,
                projectedValue: deviceCpa * 0.85,
                changePercent: -15,
              },
              supportingData: {
                impressions: device.impressions,
                clicks: device.clicks,
                spend: device.spend,
                conversions: device.conversions,
                conversionValue: device.conversionValue,
                roas: deviceRoas,
                cpa: deviceCpa,
                ctr: deviceCtr,
              },
              priority: device.spend > 100 && roasDiff < -0.5 ? 'high' : 'medium',
              platformKnowledge: knowledge?.whenToDecrease || [],
            });
          }
        }

        if (device.spend > 100 && device.conversions === 0 && device.device !== 'DESKTOP') {
          suggestions.push({
            suggestionType: 'exclude_device',
            entityType: 'campaign',
            entityId: device.campaignId,
            entityName: device.campaignName,
            adjustmentType: 'device',
            criterionName: device.device,
            currentValue: device.currentBidModifier,
            recommendedValue: -100,
            reasoning: `${device.device} has spent $${device.spend.toFixed(2)} with zero conversions. Consider excluding this device to prevent further wasted spend.`,
            confidence: 75,
            estimatedImpact: {
              metric: 'Spend Saved',
              currentValue: device.spend,
              projectedValue: 0,
              changePercent: -100,
            },
            supportingData: {
              impressions: device.impressions,
              clicks: device.clicks,
              spend: device.spend,
              conversions: 0,
              conversionValue: 0,
              roas: 0,
              cpa: Infinity,
              ctr: deviceCtr,
            },
            priority: device.spend > 200 ? 'high' : 'medium',
            platformKnowledge: knowledge?.whenToExclude || [],
          });
        }
      }
    }

    return suggestions;
  }

  private async analyzeLocationPerformance(
    userId: string,
    adAccountId: string,
    startDate: string,
    endDate: string
  ): Promise<GoogleAdsBidAdjustmentSuggestion[]> {
    const suggestions: GoogleAdsBidAdjustmentSuggestion[] = [];

    const { data: locations, error: locError } = await supabase
      .from('google_ads_locations')
      .select('*')
      .eq('user_id', userId)
      .eq('ad_account_id', adAccountId);

    if (locError || !locations || locations.length === 0) {
      return suggestions;
    }

    const locationIds = locations.map(l => l.id);

    const { data: metrics, error: metricError } = await supabase
      .from('google_ads_location_metrics')
      .select('*')
      .in('location_id', locationIds)
      .gte('date', startDate)
      .lte('date', endDate);

    if (metricError || !metrics || metrics.length === 0) {
      return suggestions;
    }

    const locationMetricsMap = new Map<string, any>();
    for (const metric of metrics) {
      if (!locationMetricsMap.has(metric.location_id)) {
        const location = locations.find(l => l.id === metric.location_id);
        locationMetricsMap.set(metric.location_id, {
          ...location,
          impressions: 0,
          clicks: 0,
          spend: 0,
          conversions: 0,
          conversionValue: 0,
        });
      }

      const data = locationMetricsMap.get(metric.location_id)!;
      data.impressions += metric.impressions || 0;
      data.clicks += metric.clicks || 0;
      data.spend += metric.spend || 0;
      data.conversions += metric.conversions || 0;
      data.conversionValue += metric.conversion_value || 0;
    }

    const allLocations = Array.from(locationMetricsMap.values());
    const totalSpend = allLocations.reduce((sum, l) => sum + l.spend, 0);
    const totalConversionValue = allLocations.reduce((sum, l) => sum + l.conversionValue, 0);
    const avgRoas = totalSpend > 0 ? totalConversionValue / totalSpend : 0;

    for (const location of allLocations) {
      if (location.impressions < this.MIN_IMPRESSIONS_FOR_ANALYSIS) continue;
      if (location.spend < this.MIN_SPEND_FOR_ANALYSIS) continue;

      const locationRoas = location.spend > 0 ? location.conversionValue / location.spend : 0;
      const locationCpa = location.conversions > 0 ? location.spend / location.conversions : Infinity;
      const roasDiff = avgRoas > 0 ? (locationRoas - avgRoas) / avgRoas : 0;

      if (roasDiff > this.SIGNIFICANT_PERFORMANCE_DIFFERENCE && location.conversions >= 2) {
        const recommendedIncrease = Math.min(Math.round(roasDiff * 40), 40);
        const newBidModifier = (location.bid_modifier || 0) + recommendedIncrease;

        suggestions.push({
          suggestionType: 'increase_location_bid',
          entityType: 'campaign',
          entityId: location.campaign_id,
          entityName: location.location_name,
          adjustmentType: 'location',
          criterionId: location.platform_location_id,
          criterionName: location.location_name,
          currentValue: location.bid_modifier || 0,
          recommendedValue: newBidModifier,
          reasoning: `${location.location_name} has ${Math.round(roasDiff * 100)}% higher ROAS than average. Increase bids to capture more traffic from this high-performing location.`,
          confidence: Math.min(80, 55 + location.conversions * 5),
          estimatedImpact: {
            metric: 'Conversions',
            currentValue: location.conversions,
            projectedValue: location.conversions * 1.15,
            changePercent: 15,
          },
          supportingData: {
            impressions: location.impressions,
            clicks: location.clicks,
            spend: location.spend,
            conversions: location.conversions,
            conversionValue: location.conversionValue,
            roas: locationRoas,
            cpa: locationCpa,
            ctr: location.impressions > 0 ? (location.clicks / location.impressions) * 100 : 0,
          },
          priority: roasDiff > 0.4 && location.conversions >= 5 ? 'high' : 'medium',
          platformKnowledge: GOOGLE_ADS_BID_ADJUSTMENT_KNOWLEDGE.locationBidAdjustments.bestPractices,
        });
      }

      if (location.spend > 50 && location.conversions === 0) {
        suggestions.push({
          suggestionType: 'exclude_location',
          entityType: 'campaign',
          entityId: location.campaign_id,
          entityName: location.location_name,
          adjustmentType: 'location',
          criterionId: location.platform_location_id,
          criterionName: location.location_name,
          currentValue: location.bid_modifier || 0,
          recommendedValue: -100,
          reasoning: `${location.location_name} has spent $${location.spend.toFixed(2)} with zero conversions. Consider excluding this location.`,
          confidence: 70,
          estimatedImpact: {
            metric: 'Spend Saved',
            currentValue: location.spend,
            projectedValue: 0,
            changePercent: -100,
          },
          supportingData: {
            impressions: location.impressions,
            clicks: location.clicks,
            spend: location.spend,
            conversions: 0,
            conversionValue: 0,
            roas: 0,
            cpa: Infinity,
            ctr: location.impressions > 0 ? (location.clicks / location.impressions) * 100 : 0,
          },
          priority: location.spend > 100 ? 'high' : 'medium',
          platformKnowledge: ['Exclude locations where you cannot service or ship to', 'Poor performing regions should be excluded'],
        });
      }
    }

    return suggestions;
  }

  private async analyzeAudiencePerformance(
    userId: string,
    adAccountId: string,
    startDate: string,
    endDate: string
  ): Promise<GoogleAdsBidAdjustmentSuggestion[]> {
    const suggestions: GoogleAdsBidAdjustmentSuggestion[] = [];

    const { data: audiences, error: audError } = await supabase
      .from('google_ads_audiences')
      .select('*')
      .eq('user_id', userId)
      .eq('ad_account_id', adAccountId);

    if (audError || !audiences || audiences.length === 0) {
      return suggestions;
    }

    const audienceIds = audiences.map(a => a.id);

    const { data: metrics, error: metricError } = await supabase
      .from('google_ads_audience_metrics')
      .select('*')
      .in('audience_id', audienceIds)
      .gte('date', startDate)
      .lte('date', endDate);

    if (metricError || !metrics || metrics.length === 0) {
      return suggestions;
    }

    const audienceMetricsMap = new Map<string, any>();
    for (const metric of metrics) {
      if (!audienceMetricsMap.has(metric.audience_id)) {
        const audience = audiences.find(a => a.id === metric.audience_id);
        audienceMetricsMap.set(metric.audience_id, {
          ...audience,
          impressions: 0,
          clicks: 0,
          spend: 0,
          conversions: 0,
          conversionValue: 0,
        });
      }

      const data = audienceMetricsMap.get(metric.audience_id)!;
      data.impressions += metric.impressions || 0;
      data.clicks += metric.clicks || 0;
      data.spend += metric.spend || 0;
      data.conversions += metric.conversions || 0;
      data.conversionValue += metric.conversion_value || 0;
    }

    const allAudiences = Array.from(audienceMetricsMap.values());
    const totalSpend = allAudiences.reduce((sum, a) => sum + a.spend, 0);
    const totalConversionValue = allAudiences.reduce((sum, a) => sum + a.conversionValue, 0);
    const avgRoas = totalSpend > 0 ? totalConversionValue / totalSpend : 0;

    for (const audience of allAudiences) {
      if (audience.impressions < this.MIN_IMPRESSIONS_FOR_ANALYSIS) continue;
      if (audience.spend < this.MIN_SPEND_FOR_ANALYSIS) continue;

      const audienceRoas = audience.spend > 0 ? audience.conversionValue / audience.spend : 0;
      const roasDiff = avgRoas > 0 ? (audienceRoas - avgRoas) / avgRoas : 0;

      const typeGuidance = getAudienceTypeGuidance(audience.audience_type);
      const typicalRange = typeGuidance?.typicalBidRange || { min: -20, max: 50 };

      if (roasDiff > this.SIGNIFICANT_PERFORMANCE_DIFFERENCE && audience.conversions >= 2) {
        const recommendedIncrease = Math.min(Math.round(roasDiff * 40), typicalRange.max);
        const newBidModifier = (audience.bid_modifier || 0) + recommendedIncrease;

        suggestions.push({
          suggestionType: 'increase_audience_bid',
          entityType: audience.entity_type === 'campaign' ? 'campaign' : 'ad_group',
          entityId: audience.entity_id,
          entityName: audience.audience_name,
          adjustmentType: 'audience',
          criterionId: audience.platform_audience_id,
          criterionName: audience.audience_name,
          currentValue: audience.bid_modifier || 0,
          recommendedValue: newBidModifier,
          reasoning: `${audience.audience_name} (${audience.audience_type}) has ${Math.round(roasDiff * 100)}% higher ROAS. This audience segment is highly valuable.`,
          confidence: Math.min(80, 55 + audience.conversions * 5),
          estimatedImpact: {
            metric: 'Conversion Value',
            currentValue: audience.conversionValue,
            projectedValue: audience.conversionValue * 1.2,
            changePercent: 20,
          },
          supportingData: {
            impressions: audience.impressions,
            clicks: audience.clicks,
            spend: audience.spend,
            conversions: audience.conversions,
            conversionValue: audience.conversionValue,
            roas: audienceRoas,
            cpa: audience.conversions > 0 ? audience.spend / audience.conversions : Infinity,
            ctr: audience.impressions > 0 ? (audience.clicks / audience.impressions) * 100 : 0,
          },
          priority: audience.audience_type === 'REMARKETING' && roasDiff > 0.3 ? 'high' : 'medium',
          platformKnowledge: typeGuidance?.bestFor || [],
        });
      }

      if (audience.spend > 75 && audience.conversions === 0 && !audience.is_excluded) {
        suggestions.push({
          suggestionType: 'exclude_audience',
          entityType: audience.entity_type === 'campaign' ? 'campaign' : 'ad_group',
          entityId: audience.entity_id,
          entityName: audience.audience_name,
          adjustmentType: 'audience',
          criterionId: audience.platform_audience_id,
          criterionName: audience.audience_name,
          currentValue: audience.bid_modifier || 0,
          recommendedValue: -100,
          reasoning: `${audience.audience_name} has spent $${audience.spend.toFixed(2)} with zero conversions. Consider excluding this audience or significantly reducing bids.`,
          confidence: 70,
          estimatedImpact: {
            metric: 'Spend Saved',
            currentValue: audience.spend,
            projectedValue: 0,
            changePercent: -100,
          },
          supportingData: {
            impressions: audience.impressions,
            clicks: audience.clicks,
            spend: audience.spend,
            conversions: 0,
            conversionValue: 0,
            roas: 0,
            cpa: Infinity,
            ctr: audience.impressions > 0 ? (audience.clicks / audience.impressions) * 100 : 0,
          },
          priority: audience.spend > 150 ? 'high' : 'medium',
          platformKnowledge: ['Exclude converted users from prospecting audiences', 'Test audience exclusions carefully'],
        });
      }
    }

    return suggestions;
  }

  private async analyzeAdSchedulePerformance(
    userId: string,
    adAccountId: string,
    startDate: string,
    endDate: string
  ): Promise<GoogleAdsBidAdjustmentSuggestion[]> {
    const suggestions: GoogleAdsBidAdjustmentSuggestion[] = [];

    const { data: hourlyMetrics, error } = await supabase
      .from('google_ads_hourly_metrics')
      .select(`
        *,
        ad_campaigns:campaign_id(id, name, platform_campaign_id)
      `)
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error || !hourlyMetrics || hourlyMetrics.length === 0) {
      return suggestions;
    }

    const campaignHourlyData = new Map<string, Map<number, any>>();

    for (const metric of hourlyMetrics) {
      const campaignId = metric.campaign_id;
      if (!campaignHourlyData.has(campaignId)) {
        campaignHourlyData.set(campaignId, new Map());
      }

      const hourMap = campaignHourlyData.get(campaignId)!;
      const hour = metric.hour;

      if (!hourMap.has(hour)) {
        hourMap.set(hour, {
          hour,
          campaignId,
          campaignName: metric.ad_campaigns?.name || 'Unknown Campaign',
          impressions: 0,
          clicks: 0,
          spend: 0,
          conversions: 0,
          conversionValue: 0,
        });
      }

      const data = hourMap.get(hour)!;
      data.impressions += metric.impressions || 0;
      data.clicks += metric.clicks || 0;
      data.spend += metric.spend || 0;
      data.conversions += metric.conversions || 0;
      data.conversionValue += metric.conversion_value || 0;
    }

    for (const [campaignId, hourMap] of campaignHourlyData) {
      const hours = Array.from(hourMap.values());
      const totalSpend = hours.reduce((sum, h) => sum + h.spend, 0);
      const totalConversionValue = hours.reduce((sum, h) => sum + h.conversionValue, 0);

      if (totalSpend < this.MIN_SPEND_FOR_ANALYSIS * 3) continue;

      const avgRoas = totalSpend > 0 ? totalConversionValue / totalSpend : 0;

      const peakHours: number[] = [];
      const offPeakHours: number[] = [];

      for (const hourData of hours) {
        if (hourData.spend < 5) continue;

        const hourRoas = hourData.spend > 0 ? hourData.conversionValue / hourData.spend : 0;
        const roasDiff = avgRoas > 0 ? (hourRoas - avgRoas) / avgRoas : 0;

        if (roasDiff > 0.3 && hourData.conversions >= 1) {
          peakHours.push(hourData.hour);
        } else if (roasDiff < -0.3 && hourData.spend > 10 && hourData.conversions === 0) {
          offPeakHours.push(hourData.hour);
        }
      }

      if (peakHours.length >= 3) {
        const campaignName = hours[0]?.campaignName || 'Campaign';
        const peakRanges = this.groupConsecutiveHours(peakHours);

        for (const range of peakRanges) {
          suggestions.push({
            suggestionType: 'increase_schedule_bid',
            entityType: 'campaign',
            entityId: campaignId,
            entityName: campaignName,
            adjustmentType: 'ad_schedule',
            criterionName: `Hours ${range.start}-${range.end}`,
            currentValue: 0,
            recommendedValue: 25,
            reasoning: `Peak performance hours identified (${range.start}:00-${range.end}:00). Consider increasing bids during these hours to maximize conversions.`,
            confidence: 70,
            estimatedImpact: {
              metric: 'Conversions',
              currentValue: 0,
              projectedValue: 0,
              changePercent: 15,
            },
            supportingData: {
              impressions: 0,
              clicks: 0,
              spend: 0,
              conversions: 0,
              conversionValue: 0,
              roas: avgRoas,
              cpa: 0,
              ctr: 0,
            },
            priority: 'medium',
            platformKnowledge: GOOGLE_ADS_BID_ADJUSTMENT_KNOWLEDGE.adScheduleBidAdjustments.bestPractices,
          });
        }
      }

      if (offPeakHours.length >= 3) {
        const campaignName = hours[0]?.campaignName || 'Campaign';
        const offPeakRanges = this.groupConsecutiveHours(offPeakHours);

        for (const range of offPeakRanges) {
          suggestions.push({
            suggestionType: 'decrease_schedule_bid',
            entityType: 'campaign',
            entityId: campaignId,
            entityName: campaignName,
            adjustmentType: 'ad_schedule',
            criterionName: `Hours ${range.start}-${range.end}`,
            currentValue: 0,
            recommendedValue: -30,
            reasoning: `Low performance hours identified (${range.start}:00-${range.end}:00). Consider decreasing bids during these hours to reduce wasted spend.`,
            confidence: 65,
            estimatedImpact: {
              metric: 'CPA',
              currentValue: 0,
              projectedValue: 0,
              changePercent: -20,
            },
            supportingData: {
              impressions: 0,
              clicks: 0,
              spend: 0,
              conversions: 0,
              conversionValue: 0,
              roas: avgRoas,
              cpa: 0,
              ctr: 0,
            },
            priority: 'medium',
            platformKnowledge: GOOGLE_ADS_BID_ADJUSTMENT_KNOWLEDGE.adScheduleBidAdjustments.bestPractices,
          });
        }
      }
    }

    return suggestions;
  }

  private async analyzeDemographicPerformance(
    userId: string,
    adAccountId: string,
    startDate: string,
    endDate: string
  ): Promise<GoogleAdsBidAdjustmentSuggestion[]> {
    const suggestions: GoogleAdsBidAdjustmentSuggestion[] = [];

    const { data: demoMetrics, error } = await supabase
      .from('google_ads_demographic_metrics')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error || !demoMetrics || demoMetrics.length === 0) {
      return suggestions;
    }

    const ageData = new Map<string, any>();
    const genderData = new Map<string, any>();

    for (const metric of demoMetrics) {
      if (metric.age_range) {
        if (!ageData.has(metric.age_range)) {
          ageData.set(metric.age_range, {
            ageRange: metric.age_range,
            impressions: 0,
            clicks: 0,
            spend: 0,
            conversions: 0,
            conversionValue: 0,
          });
        }
        const data = ageData.get(metric.age_range)!;
        data.impressions += metric.impressions || 0;
        data.clicks += metric.clicks || 0;
        data.spend += metric.spend || 0;
        data.conversions += metric.conversions || 0;
        data.conversionValue += metric.conversion_value || 0;
      }

      if (metric.gender) {
        if (!genderData.has(metric.gender)) {
          genderData.set(metric.gender, {
            gender: metric.gender,
            impressions: 0,
            clicks: 0,
            spend: 0,
            conversions: 0,
            conversionValue: 0,
          });
        }
        const data = genderData.get(metric.gender)!;
        data.impressions += metric.impressions || 0;
        data.clicks += metric.clicks || 0;
        data.spend += metric.spend || 0;
        data.conversions += metric.conversions || 0;
        data.conversionValue += metric.conversion_value || 0;
      }
    }

    const allAges = Array.from(ageData.values());
    const totalAgeSpend = allAges.reduce((sum, a) => sum + a.spend, 0);
    const totalAgeConversionValue = allAges.reduce((sum, a) => sum + a.conversionValue, 0);
    const avgAgeRoas = totalAgeSpend > 0 ? totalAgeConversionValue / totalAgeSpend : 0;

    for (const age of allAges) {
      if (age.spend < this.MIN_SPEND_FOR_ANALYSIS) continue;

      const ageRoas = age.spend > 0 ? age.conversionValue / age.spend : 0;
      const roasDiff = avgAgeRoas > 0 ? (ageRoas - avgAgeRoas) / avgAgeRoas : 0;

      if (roasDiff > 0.25 && age.conversions >= 2) {
        suggestions.push({
          suggestionType: 'increase_age_bid',
          entityType: 'campaign',
          entityId: '',
          entityName: `Age Range: ${age.ageRange}`,
          adjustmentType: 'demographic',
          criterionName: age.ageRange,
          currentValue: 0,
          recommendedValue: Math.min(Math.round(roasDiff * 30), 30),
          reasoning: `Age range ${age.ageRange} shows ${Math.round(roasDiff * 100)}% higher ROAS than average. Consider increasing bids for this demographic.`,
          confidence: Math.min(75, 50 + age.conversions * 5),
          estimatedImpact: {
            metric: 'ROAS',
            currentValue: ageRoas,
            projectedValue: ageRoas * 1.1,
            changePercent: 10,
          },
          supportingData: {
            impressions: age.impressions,
            clicks: age.clicks,
            spend: age.spend,
            conversions: age.conversions,
            conversionValue: age.conversionValue,
            roas: ageRoas,
            cpa: age.conversions > 0 ? age.spend / age.conversions : Infinity,
            ctr: age.impressions > 0 ? (age.clicks / age.impressions) * 100 : 0,
          },
          priority: roasDiff > 0.4 ? 'medium' : 'low',
          platformKnowledge: GOOGLE_ADS_BID_ADJUSTMENT_KNOWLEDGE.demographicBidAdjustments.bestPractices,
        });
      }
    }

    return suggestions;
  }

  private async analyzeKeywordPerformance(
    userId: string,
    adAccountId: string,
    startDate: string,
    endDate: string
  ): Promise<GoogleAdsBidAdjustmentSuggestion[]> {
    const suggestions: GoogleAdsBidAdjustmentSuggestion[] = [];

    const { data: keywords, error: kwError } = await supabase
      .from('google_ads_keywords')
      .select('*')
      .eq('user_id', userId)
      .eq('ad_account_id', adAccountId)
      .eq('is_negative', false);

    if (kwError || !keywords || keywords.length === 0) {
      return suggestions;
    }

    const keywordIds = keywords.map(k => k.id);

    const { data: metrics, error: metricError } = await supabase
      .from('google_ads_keyword_metrics')
      .select('*')
      .in('keyword_id', keywordIds)
      .gte('date', startDate)
      .lte('date', endDate);

    if (metricError || !metrics) {
      return suggestions;
    }

    const keywordMetricsMap = new Map<string, any>();
    for (const metric of metrics) {
      if (!keywordMetricsMap.has(metric.keyword_id)) {
        const keyword = keywords.find(k => k.id === metric.keyword_id);
        keywordMetricsMap.set(metric.keyword_id, {
          ...keyword,
          totalImpressions: 0,
          totalClicks: 0,
          totalSpend: 0,
          totalConversions: 0,
          totalConversionValue: 0,
        });
      }

      const data = keywordMetricsMap.get(metric.keyword_id)!;
      data.totalImpressions += metric.impressions || 0;
      data.totalClicks += metric.clicks || 0;
      data.totalSpend += metric.spend || 0;
      data.totalConversions += metric.conversions || 0;
      data.totalConversionValue += metric.conversion_value || 0;
    }

    for (const [keywordId, kw] of keywordMetricsMap) {
      const kwRoas = kw.totalSpend > 0 ? kw.totalConversionValue / kw.totalSpend : 0;
      const kwCpa = kw.totalConversions > 0 ? kw.totalSpend / kw.totalConversions : Infinity;

      if (kw.quality_score !== null && kw.quality_score <= 4 && kw.totalSpend > 50) {
        suggestions.push({
          suggestionType: 'pause_keyword',
          entityType: 'keyword',
          entityId: kw.id,
          entityName: kw.keyword_text,
          adjustmentType: 'keyword',
          criterionId: kw.platform_keyword_id,
          criterionName: kw.keyword_text,
          currentValue: kw.quality_score,
          recommendedValue: 0,
          reasoning: `Keyword "${kw.keyword_text}" has a low Quality Score of ${kw.quality_score}/10 and has spent $${kw.totalSpend.toFixed(2)}. Low Quality Score keywords typically have higher CPCs and lower ad positions.`,
          confidence: 75,
          estimatedImpact: {
            metric: 'Quality Score',
            currentValue: kw.quality_score,
            projectedValue: 0,
            changePercent: 0,
          },
          supportingData: {
            impressions: kw.totalImpressions,
            clicks: kw.totalClicks,
            spend: kw.totalSpend,
            conversions: kw.totalConversions,
            conversionValue: kw.totalConversionValue,
            roas: kwRoas,
            cpa: kwCpa,
            ctr: kw.totalImpressions > 0 ? (kw.totalClicks / kw.totalImpressions) * 100 : 0,
          },
          priority: kw.quality_score <= 3 ? 'high' : 'medium',
          platformKnowledge: GOOGLE_ADS_BID_ADJUSTMENT_KNOWLEDGE.keywordBidAdjustments.qualityScoreImpact.optimizationTips,
        });
      }

      if (kw.totalSpend > 100 && kw.totalConversions === 0) {
        suggestions.push({
          suggestionType: 'pause_keyword',
          entityType: 'keyword',
          entityId: kw.id,
          entityName: kw.keyword_text,
          adjustmentType: 'keyword',
          criterionId: kw.platform_keyword_id,
          criterionName: kw.keyword_text,
          currentValue: kw.status === 'ENABLED' ? 1 : 0,
          recommendedValue: 0,
          reasoning: `Keyword "${kw.keyword_text}" has spent $${kw.totalSpend.toFixed(2)} with zero conversions. Consider pausing or adding as negative.`,
          confidence: 80,
          estimatedImpact: {
            metric: 'Spend Saved',
            currentValue: kw.totalSpend,
            projectedValue: 0,
            changePercent: -100,
          },
          supportingData: {
            impressions: kw.totalImpressions,
            clicks: kw.totalClicks,
            spend: kw.totalSpend,
            conversions: 0,
            conversionValue: 0,
            roas: 0,
            cpa: Infinity,
            ctr: kw.totalImpressions > 0 ? (kw.totalClicks / kw.totalImpressions) * 100 : 0,
          },
          priority: kw.totalSpend > 200 ? 'high' : 'medium',
          platformKnowledge: ['Pause keywords with consistently low Quality Score and high CPA', 'Add negative keywords proactively'],
        });
      }
    }

    return suggestions;
  }

  private groupConsecutiveHours(hours: number[]): Array<{ start: number; end: number }> {
    if (hours.length === 0) return [];

    hours.sort((a, b) => a - b);
    const ranges: Array<{ start: number; end: number }> = [];

    let rangeStart = hours[0];
    let rangeEnd = hours[0];

    for (let i = 1; i < hours.length; i++) {
      if (hours[i] === rangeEnd + 1) {
        rangeEnd = hours[i];
      } else {
        ranges.push({ start: rangeStart, end: rangeEnd + 1 });
        rangeStart = hours[i];
        rangeEnd = hours[i];
      }
    }

    ranges.push({ start: rangeStart, end: rangeEnd + 1 });
    return ranges;
  }
}

export const googleAdsIntelligenceService = new GoogleAdsIntelligenceService();
