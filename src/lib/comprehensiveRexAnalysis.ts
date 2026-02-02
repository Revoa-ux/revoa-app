import { supabase } from './supabase';
import type {
  RexEntityType,
  CreateRexSuggestionParams,
  RexSuggestionReasoning,
  RexRecommendedRule,
  RexEstimatedImpact
} from '@/types/rex';

/**
 * Comprehensive Rex Analysis Service
 *
 * This service performs REAL AI analysis by querying ALL available data:
 * - Demographics (age, gender breakdowns)
 * - Placements (device, platform, ad position)
 * - Geographic (country, region, city)
 * - Temporal (time of day, day of week)
 * - Customer behavior (new vs returning, LTV, purchase patterns)
 * - UTM parameters and attribution data
 * - Product performance and margin data
 * - Device and browser information
 *
 * Every insight is backed by actual data points, not guesses.
 */

export interface SegmentPerformance {
  segment: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  revenue: number;
  profit: number;
  roas: number;
  cpa: number;
  ctr: number;
  contribution: number; // % of total
  improvement: number; // vs average
}

export interface CustomerSegment {
  customerType: string; // new, returning, vip
  count: number;
  revenue: number;
  averageOrderValue: number;
  repeatRate: number;
  lifetimeValue: number;
  avgTimeToConversion: number; // hours
  cpa: number;
}

export interface ProductPerformance {
  productName: string;
  units: number;
  revenue: number;
  margin: number;
  marginPercentage: number;
  averageOrderValue: number;
}

export interface DeepAnalysisResult {
  // Raw data points analyzed
  dataPointsAnalyzed: number;
  dateRange: { start: string; end: string };

  // Segment breakdowns
  demographics: SegmentPerformance[];
  placements: SegmentPerformance[];
  geographic: SegmentPerformance[];
  temporal: SegmentPerformance[];

  // Customer insights
  customerSegments: CustomerSegment[];
  newVsReturning: {
    new: { count: number; revenue: number; cpa: number; aov: number };
    returning: { count: number; revenue: number; cpa: number; aov: number };
  };

  // Product data
  topProducts: ProductPerformance[];
  avgMarginPercentage: number;
  avgNetProfitPerOrder: number;

  // Attribution insights
  utmPatterns: Array<{
    utmSource: string;
    utmMedium: string;
    utmContent: string;
    conversions: number;
    roas: number;
  }>;

  // Device breakdown
  devicePerformance: Array<{
    deviceType: string;
    os: string;
    conversions: number;
    roas: number;
  }>;

  // Overall metrics
  totalSpend: number;
  totalRevenue: number;
  totalProfit: number;
  totalConversions: number;
  avgRoas: number;
  avgCpa: number;

  // Additional metrics for insight generation
  avgCtr: number;
  totalClicks: number;
  totalImpressions: number;
  frequency: number;
  daysRunning: number;
}

export class ComprehensiveRexAnalysis {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Perform deep analysis on an ad entity
   */
  async analyzeEntity(
    entityType: RexEntityType,
    entityId: string,
    platformId: string,
    dateRangeDays: number = 30
  ): Promise<DeepAnalysisResult> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRangeDays);

    const dateRange = {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };

    // Fetch ALL data in parallel
    // Note: Breakdown tables use platform_ad_id, while enriched_conversions also uses it
    const [
      demographics,
      placements,
      geographic,
      temporal,
      conversions,
      customerLifetime,
      entityMetrics
    ] = await Promise.all([
      this.fetchDemographics(platformId, dateRange),
      this.fetchPlacements(platformId, dateRange),
      this.fetchGeographic(platformId, dateRange),
      this.fetchTemporal(platformId, dateRange),
      this.fetchEnrichedConversions(platformId, dateRange),
      this.fetchCustomerLifetimeData(platformId, dateRange),
      this.fetchEntityMetrics(entityId, entityType, dateRange)
    ]);

    // Calculate total data points
    const dataPointsAnalyzed =
      demographics.length +
      placements.length +
      geographic.length +
      temporal.length +
      conversions.length +
      customerLifetime.length;

    // Process demographics
    const demographicsProcessed = this.processDemographics(demographics);

    // Process placements
    const placementsProcessed = this.processPlacements(placements);

    // Process geographic
    const geographicProcessed = this.processGeographic(geographic);

    // Process temporal
    const temporalProcessed = this.processTemporal(temporal);

    // Process customer segments
    const customerSegments = this.processCustomerSegments(conversions, customerLifetime);

    // Process new vs returning
    const newVsReturning = this.processNewVsReturning(conversions);

    // Process products
    const topProducts = this.processProducts(conversions);

    // Calculate margins
    const { avgMarginPercentage, avgNetProfitPerOrder } = this.calculateMargins(conversions);

    // Process UTM patterns
    const utmPatterns = this.processUTMPatterns(conversions);

    // Process device performance
    const devicePerformance = this.processDevicePerformance(conversions);

    // Calculate overall metrics
    const totalSpend = conversions.reduce((sum, c) => sum + (Number(c.ad_spend) || 0), 0);
    const totalRevenue = conversions.reduce((sum, c) => sum + Number(c.order_value), 0);
    const totalProfit = conversions.reduce((sum, c) => sum + Number(c.net_margin), 0);
    const totalConversions = conversions.length;
    const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0;

    // Calculate CTR and other metrics from entity metrics
    // Note: avgCtr is returned as percentage (e.g., 7.6 for 7.6%) to match display format
    const totalImpressions = entityMetrics.reduce((sum, m) => sum + (m.impressions || 0), 0);
    const totalClicks = entityMetrics.reduce((sum, m) => sum + (m.clicks || 0), 0);
    const totalReach = entityMetrics.reduce((sum, m) => sum + (m.reach || 0), 0);
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const frequency = totalReach > 0 ? totalImpressions / totalReach : 0;
    const daysRunning = entityMetrics.length;

    return {
      dataPointsAnalyzed,
      dateRange,
      demographics: demographicsProcessed,
      placements: placementsProcessed,
      geographic: geographicProcessed,
      temporal: temporalProcessed,
      customerSegments,
      newVsReturning,
      topProducts,
      avgMarginPercentage,
      avgNetProfitPerOrder,
      utmPatterns,
      devicePerformance,
      totalSpend,
      totalRevenue,
      totalProfit,
      totalConversions,
      avgRoas,
      avgCpa,
      avgCtr,
      totalClicks,
      totalImpressions,
      frequency,
      daysRunning
    };
  }

  private async fetchEntityMetrics(
    entityId: string,
    entityType: RexEntityType,
    dateRange: { start: string; end: string }
  ) {
    const { data, error } = await supabase
      .from('ad_metrics')
      .select('impressions, clicks, reach, spend, date')
      .eq('entity_id', entityId)
      .eq('entity_type', entityType)
      .gte('date', dateRange.start)
      .lte('date', dateRange.end)
      .order('date', { ascending: true });

    if (error) {
      console.error('[RexAnalysis] Error fetching entity metrics:', error);
      return [];
    }

    return data || [];
  }

  private async fetchDemographics(platformAdId: string, dateRange: { start: string; end: string }) {
    const { data, error } = await supabase
      .from('ad_insights_demographics')
      .select('*')
      .eq('platform_ad_id', platformAdId)
      .eq('user_id', this.userId)
      .gte('date', dateRange.start)
      .lte('date', dateRange.end);

    if (error) {
      console.error('[RexAnalysis] Error fetching demographics:', error);
      return [];
    }

    return data || [];
  }

  private async fetchPlacements(platformAdId: string, dateRange: { start: string; end: string }) {
    const { data, error } = await supabase
      .from('ad_insights_placements')
      .select('*')
      .eq('platform_ad_id', platformAdId)
      .eq('user_id', this.userId)
      .gte('date', dateRange.start)
      .lte('date', dateRange.end);

    if (error) {
      console.error('[RexAnalysis] Error fetching placements:', error);
      return [];
    }

    return data || [];
  }

  private async fetchGeographic(platformAdId: string, dateRange: { start: string; end: string }) {
    const { data, error } = await supabase
      .from('ad_insights_geographic')
      .select('*')
      .eq('platform_ad_id', platformAdId)
      .eq('user_id', this.userId)
      .gte('date', dateRange.start)
      .lte('date', dateRange.end);

    if (error) {
      console.error('[RexAnalysis] Error fetching geographic:', error);
      return [];
    }

    return data || [];
  }

  private async fetchTemporal(platformAdId: string, dateRange: { start: string; end: string }) {
    const { data, error } = await supabase
      .from('ad_insights_temporal')
      .select('*')
      .eq('platform_ad_id', platformAdId)
      .eq('user_id', this.userId)
      .gte('date', dateRange.start)
      .lte('date', dateRange.end);

    if (error) {
      console.error('[RexAnalysis] Error fetching temporal:', error);
      return [];
    }

    return data || [];
  }

  private async fetchEnrichedConversions(platformAdId: string, dateRange: { start: string; end: string }) {
    const { data, error } = await supabase
      .from('enriched_conversions')
      .select('*')
      .eq('platform_ad_id', platformAdId)
      .eq('user_id', this.userId)
      .gte('ordered_at', dateRange.start)
      .lte('ordered_at', dateRange.end);

    if (error) {
      console.error('[RexAnalysis] Error fetching conversions:', error);
      return [];
    }

    return data || [];
  }

  private async fetchCustomerLifetimeData(platformAdId: string, dateRange: { start: string; end: string }) {
    // Fetch customer lifetime data for customers who first converted through this ad
    // Note: We need to join with enriched_conversions to get customers from this ad
    const { data, error } = await supabase
      .from('customer_lifetime_tracking')
      .select('*')
      .eq('user_id', this.userId);

    if (error) {
      console.error('[RexAnalysis] Error fetching customer lifetime:', error);
      return [];
    }

    // Filter customers who came from this ad via enriched_conversions
    if (!data || data.length === 0) return [];

    const { data: conversions } = await supabase
      .from('enriched_conversions')
      .select('customer_email')
      .eq('platform_ad_id', platformAdId)
      .eq('user_id', this.userId)
      .eq('is_first_purchase', true);

    if (!conversions || conversions.length === 0) return [];

    const customerEmails = new Set(conversions.map(c => c.customer_email).filter(Boolean));
    return data.filter(customer => customerEmails.has(customer.customer_email));
  }

  private processDemographics(data: any[]): SegmentPerformance[] {
    const segments: Record<string, any> = {};

    data.forEach(row => {
      const key = `${row.age_range} ${row.gender}`;
      if (!segments[key]) {
        segments[key] = {
          segment: key,
          impressions: 0,
          clicks: 0,
          spend: 0,
          conversions: 0,
          revenue: 0,
          profit: 0
        };
      }

      segments[key].impressions += Number(row.impressions) || 0;
      segments[key].clicks += Number(row.clicks) || 0;
      segments[key].spend += Number(row.spend) || 0;
      segments[key].conversions += Number(row.conversions) || 0;
      segments[key].revenue += Number(row.revenue) || 0;
      segments[key].profit += Number(row.profit) || 0;
    });

    const totalRevenue = Object.values(segments).reduce((sum, s) => sum + s.revenue, 0);

    return Object.values(segments)
      .map(s => ({
        ...s,
        roas: s.spend > 0 ? s.revenue / s.spend : 0,
        cpa: s.conversions > 0 ? s.spend / s.conversions : 0,
        ctr: s.impressions > 0 ? (s.clicks / s.impressions) * 100 : 0,
        contribution: totalRevenue > 0 ? (s.revenue / totalRevenue) * 100 : 0,
        improvement: 0 // Calculate vs average later
      }))
      .sort((a, b) => b.roas - a.roas);
  }

  private processPlacements(data: any[]): SegmentPerformance[] {
    const segments: Record<string, any> = {};

    data.forEach(row => {
      const key = `${row.publisher_platform || ''} ${row.placement_type} (${row.device_type})`;
      if (!segments[key]) {
        segments[key] = {
          segment: key,
          impressions: 0,
          clicks: 0,
          spend: 0,
          conversions: 0,
          revenue: 0,
          profit: 0
        };
      }

      segments[key].impressions += Number(row.impressions) || 0;
      segments[key].clicks += Number(row.clicks) || 0;
      segments[key].spend += Number(row.spend) || 0;
      segments[key].conversions += Number(row.conversions) || 0;
      segments[key].revenue += Number(row.revenue) || 0;
      segments[key].profit += Number(row.profit) || 0;
    });

    const totalRevenue = Object.values(segments).reduce((sum, s) => sum + s.revenue, 0);

    return Object.values(segments)
      .map(s => ({
        ...s,
        roas: s.spend > 0 ? s.revenue / s.spend : 0,
        cpa: s.conversions > 0 ? s.spend / s.conversions : 0,
        ctr: s.impressions > 0 ? (s.clicks / s.impressions) * 100 : 0,
        contribution: totalRevenue > 0 ? (s.revenue / totalRevenue) * 100 : 0,
        improvement: 0
      }))
      .sort((a, b) => b.roas - a.roas);
  }

  private processGeographic(data: any[]): SegmentPerformance[] {
    const segments: Record<string, any> = {};

    data.forEach(row => {
      const key = row.city ? `${row.city}, ${row.region || row.country_name}` : row.country_name;
      if (!segments[key]) {
        segments[key] = {
          segment: key,
          impressions: 0,
          clicks: 0,
          spend: 0,
          conversions: 0,
          revenue: 0,
          profit: 0
        };
      }

      segments[key].impressions += Number(row.impressions) || 0;
      segments[key].clicks += Number(row.clicks) || 0;
      segments[key].spend += Number(row.spend) || 0;
      segments[key].conversions += Number(row.conversions) || 0;
      segments[key].revenue += Number(row.revenue) || 0;
      segments[key].profit += Number(row.profit) || 0;
    });

    const totalRevenue = Object.values(segments).reduce((sum, s) => sum + s.revenue, 0);

    return Object.values(segments)
      .map(s => ({
        ...s,
        roas: s.spend > 0 ? s.revenue / s.spend : 0,
        cpa: s.conversions > 0 ? s.spend / s.conversions : 0,
        ctr: s.impressions > 0 ? (s.clicks / s.impressions) * 100 : 0,
        contribution: totalRevenue > 0 ? (s.revenue / totalRevenue) * 100 : 0,
        improvement: 0
      }))
      .sort((a, b) => b.roas - a.roas);
  }

  private processTemporal(data: any[]): SegmentPerformance[] {
    const segments: Record<string, any> = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    data.forEach(row => {
      const dayName = dayNames[row.day_of_week];
      const hourRange = `${row.hour_of_day}:00-${row.hour_of_day + 1}:00`;
      const key = `${dayName} ${hourRange}`;

      if (!segments[key]) {
        segments[key] = {
          segment: key,
          impressions: 0,
          clicks: 0,
          spend: 0,
          conversions: 0,
          revenue: 0,
          profit: 0
        };
      }

      segments[key].impressions += Number(row.impressions) || 0;
      segments[key].clicks += Number(row.clicks) || 0;
      segments[key].spend += Number(row.spend) || 0;
      segments[key].conversions += Number(row.conversions) || 0;
      segments[key].revenue += Number(row.revenue) || 0;
      segments[key].profit += Number(row.profit) || 0;
    });

    const totalRevenue = Object.values(segments).reduce((sum, s) => sum + s.revenue, 0);

    return Object.values(segments)
      .map(s => ({
        ...s,
        roas: s.spend > 0 ? s.revenue / s.spend : 0,
        cpa: s.conversions > 0 ? s.spend / s.conversions : 0,
        ctr: s.impressions > 0 ? (s.clicks / s.impressions) * 100 : 0,
        contribution: totalRevenue > 0 ? (s.revenue / totalRevenue) * 100 : 0,
        improvement: 0
      }))
      .sort((a, b) => b.roas - a.roas);
  }

  private processCustomerSegments(conversions: any[], lifetimeData: any[]): CustomerSegment[] {
    const segments: Record<string, any> = {};

    conversions.forEach(conv => {
      const type = conv.customer_type || (conv.is_first_purchase ? 'new' : 'returning');
      if (!segments[type]) {
        segments[type] = {
          customerType: type,
          count: 0,
          revenue: 0,
          totalOrders: 0,
          totalLTV: 0,
          totalTimeToConversion: 0,
          totalSpend: 0
        };
      }

      segments[type].count += 1;
      segments[type].revenue += Number(conv.order_value) || 0;
      segments[type].totalLTV += Number(conv.customer_lifetime_value) || Number(conv.order_value) || 0;
      segments[type].totalSpend += Number(conv.ad_spend) || 0;

      if (conv.time_to_conversion) {
        const match = conv.time_to_conversion.match(/(\d+)\s*hours?/);
        if (match) {
          segments[type].totalTimeToConversion += parseInt(match[1]);
        }
      }
    });

    return Object.values(segments).map(s => ({
      customerType: s.customerType,
      count: s.count,
      revenue: s.revenue,
      averageOrderValue: s.count > 0 ? s.revenue / s.count : 0,
      repeatRate: 0, // Calculate from lifetime data
      lifetimeValue: s.count > 0 ? s.totalLTV / s.count : 0,
      avgTimeToConversion: s.count > 0 ? s.totalTimeToConversion / s.count : 0,
      cpa: s.count > 0 ? s.totalSpend / s.count : 0
    }));
  }

  private processNewVsReturning(conversions: any[]) {
    const newCustomers = conversions.filter(c => c.is_first_purchase);
    const returningCustomers = conversions.filter(c => !c.is_first_purchase);

    return {
      new: {
        count: newCustomers.length,
        revenue: newCustomers.reduce((sum, c) => sum + Number(c.order_value), 0),
        cpa: newCustomers.length > 0
          ? newCustomers.reduce((sum, c) => sum + (Number(c.ad_spend) || 0), 0) / newCustomers.length
          : 0,
        aov: newCustomers.length > 0
          ? newCustomers.reduce((sum, c) => sum + Number(c.order_value), 0) / newCustomers.length
          : 0
      },
      returning: {
        count: returningCustomers.length,
        revenue: returningCustomers.reduce((sum, c) => sum + Number(c.order_value), 0),
        cpa: returningCustomers.length > 0
          ? returningCustomers.reduce((sum, c) => sum + (Number(c.ad_spend) || 0), 0) / returningCustomers.length
          : 0,
        aov: returningCustomers.length > 0
          ? returningCustomers.reduce((sum, c) => sum + Number(c.order_value), 0) / returningCustomers.length
          : 0
      }
    };
  }

  private processProducts(conversions: any[]): ProductPerformance[] {
    const products: Record<string, any> = {};

    conversions.forEach(conv => {
      if (conv.product_names && Array.isArray(conv.product_names)) {
        conv.product_names.forEach((name: string, idx: number) => {
          if (!products[name]) {
            products[name] = {
              productName: name,
              units: 0,
              revenue: 0,
              totalCost: 0,
              totalOrders: 0
            };
          }

          products[name].units += 1;
          const productRevenue = Number(conv.order_value) / conv.product_names.length;
          products[name].revenue += productRevenue;

          if (conv.product_costs && conv.product_costs[idx]) {
            products[name].totalCost += Number(conv.product_costs[idx]);
          }

          products[name].totalOrders += 1;
        });
      }
    });

    return Object.values(products)
      .map(p => ({
        productName: p.productName,
        units: p.units,
        revenue: p.revenue,
        margin: p.revenue - p.totalCost,
        marginPercentage: p.revenue > 0 ? ((p.revenue - p.totalCost) / p.revenue) * 100 : 0,
        averageOrderValue: p.totalOrders > 0 ? p.revenue / p.totalOrders : 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }

  private calculateMargins(conversions: any[]) {
    const totalMargin = conversions.reduce((sum, c) => sum + (Number(c.margin_percentage) || 0), 0);
    const totalNetProfit = conversions.reduce((sum, c) => sum + (Number(c.net_margin) || 0), 0);

    return {
      avgMarginPercentage: conversions.length > 0 ? totalMargin / conversions.length : 0,
      avgNetProfitPerOrder: conversions.length > 0 ? totalNetProfit / conversions.length : 0
    };
  }

  private processUTMPatterns(conversions: any[]) {
    const patterns: Record<string, any> = {};

    conversions.forEach(conv => {
      const key = `${conv.utm_source || 'unknown'}|${conv.utm_medium || 'unknown'}|${conv.utm_content || 'unknown'}`;
      if (!patterns[key]) {
        const [source, medium, content] = key.split('|');
        patterns[key] = {
          utmSource: source,
          utmMedium: medium,
          utmContent: content,
          conversions: 0,
          revenue: 0,
          spend: 0
        };
      }

      patterns[key].conversions += 1;
      patterns[key].revenue += Number(conv.order_value) || 0;
      patterns[key].spend += Number(conv.ad_spend) || 0;
    });

    return Object.values(patterns)
      .map(p => ({
        ...p,
        roas: p.spend > 0 ? p.revenue / p.spend : 0
      }))
      .sort((a, b) => b.roas - a.roas)
      .slice(0, 5);
  }

  private processDevicePerformance(conversions: any[]) {
    const devices: Record<string, any> = {};

    conversions.forEach(conv => {
      const key = `${conv.device_type || 'unknown'}|${conv.operating_system || 'unknown'}`;
      if (!devices[key]) {
        const [deviceType, os] = key.split('|');
        devices[key] = {
          deviceType,
          os,
          conversions: 0,
          revenue: 0,
          spend: 0
        };
      }

      devices[key].conversions += 1;
      devices[key].revenue += Number(conv.order_value) || 0;
      devices[key].spend += Number(conv.ad_spend) || 0;
    });

    return Object.values(devices)
      .map(d => ({
        ...d,
        roas: d.spend > 0 ? d.revenue / d.spend : 0
      }))
      .sort((a, b) => b.roas - a.roas);
  }
}

export const comprehensiveRexAnalysis = (userId: string) => new ComprehensiveRexAnalysis(userId);
