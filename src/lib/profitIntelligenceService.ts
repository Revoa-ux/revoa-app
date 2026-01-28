import { supabase } from './supabase';

/**
 * Profit Intelligence Service
 *
 * Integrates Shopify enriched conversions data to provide true profit analysis.
 * Calculates profit ROAS (not just revenue ROAS), analyzes product-level performance,
 * tracks customer lifetime value, and identifies margin opportunities.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ProfitMetrics {
  adId: string;
  adName: string;
  totalSpend: number;
  totalRevenue: number;
  totalCogs: number;
  totalProfit: number;
  revenueRoas: number;
  profitRoas: number;
  averageMarginPercent: number;
  conversions: number;
  profitPerConversion: number;
}

export interface ProductPerformance {
  productId: string;
  productName: string;
  unitsSold: number;
  revenue: number;
  cogs: number;
  profit: number;
  marginPercent: number;
  attributedAdIds: string[];
  bestPerformingAdId: string;
  bestPerformingAdName: string;
}

export interface CustomerTypeAnalysis {
  adId: string;
  newCustomers: {
    count: number;
    revenue: number;
    cogs: number;
    profit: number;
    avgOrderValue: number;
  };
  returningCustomers: {
    count: number;
    revenue: number;
    cogs: number;
    profit: number;
    avgOrderValue: number;
    avgLifetimeValue: number;
  };
  recommendation: string;
}

export interface MarginOpportunity {
  type: 'high_revenue_low_margin' | 'low_revenue_high_margin' | 'optimal';
  adId: string;
  adName: string;
  currentMetrics: ProfitMetrics;
  opportunity: string;
  potentialProfitIncrease: number;
  action: string;
}

export interface LandingPageProfitability {
  landingPage: string;
  visits: number;
  conversions: number;
  conversionRate: number;
  averageOrderValue: number;
  averageProfit: number;
  profitPerVisit: number;
  topPerformingAds: string[];
}

export interface ProfitIntelligenceReport {
  userId: string;
  dateRange: { start: string; end: string };
  overallMetrics: {
    totalSpend: number;
    totalRevenue: number;
    totalCogs: number;
    totalProfit: number;
    overallRevenueRoas: number;
    overallProfitRoas: number;
    averageMarginPercent: number;
  };
  adProfitMetrics: ProfitMetrics[];
  topProfitableAds: ProfitMetrics[];
  lowestMarginAds: ProfitMetrics[];
  productPerformance: ProductPerformance[];
  marginOpportunities: MarginOpportunity[];
  landingPageProfitability: LandingPageProfitability[];
  recommendations: string[];
}

// ============================================================================
// PROFIT INTELLIGENCE SERVICE
// ============================================================================

export class ProfitIntelligenceService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Calculate profit metrics for all ads in date range
   */
  async calculateAdProfitMetrics(startDate: string, endDate: string): Promise<ProfitMetrics[]> {
    // Get enriched conversions with COGS and profit data
    const { data: conversions, error } = await supabase
      .from('enriched_conversions')
      .select(`
        ad_id,
        order_value,
        total_cogs,
        net_margin,
        margin_percentage,
        ads!inner (
          id,
          name,
          platform_ad_id
        )
      `)
      .eq('user_id', this.userId)
      .gte('ordered_at', startDate)
      .lte('ordered_at', endDate)
      .not('ad_id', 'is', null);

    if (error || !conversions) {
      console.error('Error fetching conversions:', error);
      return [];
    }

    // Get ad spend for same period
    const { data: metrics } = await supabase
      .from('ad_metrics')
      .select('entity_id, spend')
      .eq('entity_type', 'ad')
      .gte('date', startDate)
      .lte('date', endDate);

    // Aggregate by ad
    const adStats: Record<string, {
      name: string;
      revenue: number;
      cogs: number;
      profit: number;
      conversions: number;
      spend: number;
    }> = {};

    conversions.forEach((conv: any) => {
      if (!conv.ad_id || !conv.ads) return;

      const adId = conv.ad_id;
      if (!adStats[adId]) {
        adStats[adId] = {
          name: conv.ads.name || 'Unknown',
          revenue: 0,
          cogs: 0,
          profit: 0,
          conversions: 0,
          spend: 0
        };
      }

      adStats[adId].revenue += Number(conv.order_value) || 0;
      adStats[adId].cogs += Number(conv.total_cogs) || 0;
      adStats[adId].profit += Number(conv.net_margin) || 0;
      adStats[adId].conversions++;
    });

    // Add spend data
    metrics?.forEach(metric => {
      if (adStats[metric.entity_id]) {
        adStats[metric.entity_id].spend += Number(metric.spend) || 0;
      }
    });

    // Calculate metrics
    return Object.entries(adStats).map(([adId, stats]) => {
      const revenueRoas = stats.spend > 0 ? stats.revenue / stats.spend : 0;
      const profitRoas = stats.spend > 0 ? stats.profit / stats.spend : 0;
      const marginPercent = stats.revenue > 0 ? (stats.profit / stats.revenue) * 100 : 0;
      const profitPerConversion = stats.conversions > 0 ? stats.profit / stats.conversions : 0;

      return {
        adId,
        adName: stats.name,
        totalSpend: stats.spend,
        totalRevenue: stats.revenue,
        totalCogs: stats.cogs,
        totalProfit: stats.profit,
        revenueRoas,
        profitRoas,
        averageMarginPercent: marginPercent,
        conversions: stats.conversions,
        profitPerConversion
      };
    }).filter(m => m.conversions > 0);
  }

  /**
   * Analyze product performance by attributed ads
   */
  async analyzeProductPerformance(startDate: string, endDate: string): Promise<ProductPerformance[]> {
    const { data: conversions } = await supabase
      .from('enriched_conversions')
      .select(`
        ad_id,
        product_ids,
        product_names,
        product_costs,
        order_value,
        total_cogs,
        net_margin,
        ads (
          id,
          name
        )
      `)
      .eq('user_id', this.userId)
      .gte('ordered_at', startDate)
      .lte('ordered_at', endDate)
      .not('ad_id', 'is', null);

    if (!conversions) return [];

    const productStats: Record<string, {
      name: string;
      units: number;
      revenue: number;
      cogs: number;
      profit: number;
      adIds: Set<string>;
      adPerformance: Record<string, { profit: number; name: string }>;
    }> = {};

    conversions.forEach((conv: any) => {
      if (!conv.product_ids || !Array.isArray(conv.product_ids)) return;

      conv.product_ids.forEach((productId: string, index: number) => {
        if (!productStats[productId]) {
          productStats[productId] = {
            name: conv.product_names?.[index] || 'Unknown Product',
            units: 0,
            revenue: 0,
            cogs: 0,
            profit: 0,
            adIds: new Set(),
            adPerformance: {}
          };
        }

        const productCogs = conv.product_costs?.[index] || 0;
        const productRevenue = Number(conv.order_value) / conv.product_ids.length; // Simple split
        const productProfit = productRevenue - productCogs;

        productStats[productId].units++;
        productStats[productId].revenue += productRevenue;
        productStats[productId].cogs += productCogs;
        productStats[productId].profit += productProfit;

        if (conv.ad_id) {
          productStats[productId].adIds.add(conv.ad_id);

          if (!productStats[productId].adPerformance[conv.ad_id]) {
            productStats[productId].adPerformance[conv.ad_id] = {
              profit: 0,
              name: conv.ads?.name || 'Unknown'
            };
          }
          productStats[productId].adPerformance[conv.ad_id].profit += productProfit;
        }
      });
    });

    return Object.entries(productStats).map(([productId, stats]) => {
      const marginPercent = stats.revenue > 0 ? (stats.profit / stats.revenue) * 100 : 0;

      // Find best performing ad for this product
      let bestAdId = '';
      let bestAdName = '';
      let bestProfit = 0;

      Object.entries(stats.adPerformance).forEach(([adId, perf]) => {
        if (perf.profit > bestProfit) {
          bestProfit = perf.profit;
          bestAdId = adId;
          bestAdName = perf.name;
        }
      });

      return {
        productId,
        productName: stats.name,
        unitsSold: stats.units,
        revenue: stats.revenue,
        cogs: stats.cogs,
        profit: stats.profit,
        marginPercent,
        attributedAdIds: Array.from(stats.adIds),
        bestPerformingAdId: bestAdId,
        bestPerformingAdName: bestAdName
      };
    }).sort((a, b) => b.profit - a.profit);
  }

  /**
   * Analyze new vs returning customer performance by ad
   */
  async analyzeCustomerTypes(adId: string, startDate: string, endDate: string): Promise<CustomerTypeAnalysis> {
    const { data: conversions } = await supabase
      .from('enriched_conversions')
      .select('*')
      .eq('user_id', this.userId)
      .eq('ad_id', adId)
      .gte('ordered_at', startDate)
      .lte('ordered_at', endDate);

    if (!conversions) {
      return {
        adId,
        newCustomers: { count: 0, revenue: 0, cogs: 0, profit: 0, avgOrderValue: 0 },
        returningCustomers: { count: 0, revenue: 0, cogs: 0, profit: 0, avgOrderValue: 0, avgLifetimeValue: 0 },
        recommendation: 'No data available'
      };
    }

    const newStats = { count: 0, revenue: 0, cogs: 0, profit: 0 };
    const returningStats = { count: 0, revenue: 0, cogs: 0, profit: 0, clvTotal: 0 };

    conversions.forEach(conv => {
      const revenue = Number(conv.order_value) || 0;
      const cogs = Number(conv.total_cogs) || 0;
      const profit = Number(conv.net_margin) || 0;

      if (conv.is_first_purchase) {
        newStats.count++;
        newStats.revenue += revenue;
        newStats.cogs += cogs;
        newStats.profit += profit;
      } else {
        returningStats.count++;
        returningStats.revenue += revenue;
        returningStats.cogs += cogs;
        returningStats.profit += profit;
        returningStats.clvTotal += Number(conv.customer_lifetime_value) || 0;
      }
    });

    const newAvgOrderValue = newStats.count > 0 ? newStats.revenue / newStats.count : 0;
    const returningAvgOrderValue = returningStats.count > 0 ? returningStats.revenue / returningStats.count : 0;
    const avgLifetimeValue = returningStats.count > 0 ? returningStats.clvTotal / returningStats.count : 0;

    let recommendation = '';
    if (returningStats.count > newStats.count * 2) {
      recommendation = 'This ad drives mostly repeat customers - excellent for LTV. Consider increasing budget.';
    } else if (newStats.count > returningStats.count * 3) {
      recommendation = 'This ad is strong for customer acquisition. Pair with retention campaigns.';
    } else {
      recommendation = 'Balanced acquisition and retention performance.';
    }

    return {
      adId,
      newCustomers: {
        count: newStats.count,
        revenue: newStats.revenue,
        cogs: newStats.cogs,
        profit: newStats.profit,
        avgOrderValue: newAvgOrderValue
      },
      returningCustomers: {
        count: returningStats.count,
        revenue: returningStats.revenue,
        cogs: returningStats.cogs,
        profit: returningStats.profit,
        avgOrderValue: returningAvgOrderValue,
        avgLifetimeValue
      },
      recommendation
    };
  }

  /**
   * Identify margin opportunities
   */
  async identifyMarginOpportunities(adProfitMetrics: ProfitMetrics[]): Promise<MarginOpportunity[]> {
    const opportunities: MarginOpportunity[] = [];

    adProfitMetrics.forEach(metrics => {
      // High revenue but low margin - promote higher margin products
      if (metrics.totalRevenue > 5000 && metrics.averageMarginPercent < 30) {
        opportunities.push({
          type: 'high_revenue_low_margin',
          adId: metrics.adId,
          adName: metrics.adName,
          currentMetrics: metrics,
          opportunity: `This ad generates $${metrics.totalRevenue.toFixed(2)} revenue but only ${metrics.averageMarginPercent.toFixed(1)}% margin.`,
          potentialProfitIncrease: metrics.totalRevenue * 0.15, // Potential if margin improves
          action: 'Consider promoting higher-margin products or increasing prices for products in this ad.'
        });
      }

      // Low revenue but high margin - scale this ad
      if (metrics.totalRevenue < 1000 && metrics.averageMarginPercent > 50 && metrics.profitRoas > 2) {
        opportunities.push({
          type: 'low_revenue_high_margin',
          adId: metrics.adId,
          adName: metrics.adName,
          currentMetrics: metrics,
          opportunity: `High ${metrics.averageMarginPercent.toFixed(1)}% margin with ${metrics.profitRoas.toFixed(2)}x profit ROAS.`,
          potentialProfitIncrease: metrics.totalProfit * 3, // Potential if scaled 3x
          action: 'Scale budget on this ad - excellent margin and ROAS indicate room for growth.'
        });
      }

      // Optimal performance
      if (metrics.profitRoas > 3 && metrics.averageMarginPercent > 40 && metrics.totalRevenue > 3000) {
        opportunities.push({
          type: 'optimal',
          adId: metrics.adId,
          adName: metrics.adName,
          currentMetrics: metrics,
          opportunity: `Winning ad: ${metrics.profitRoas.toFixed(2)}x profit ROAS, ${metrics.averageMarginPercent.toFixed(1)}% margin, $${metrics.totalRevenue.toFixed(2)} revenue.`,
          potentialProfitIncrease: 0,
          action: 'Protect and duplicate this winning ad. Monitor closely for any performance changes.'
        });
      }
    });

    return opportunities.sort((a, b) => b.potentialProfitIncrease - a.potentialProfitIncrease);
  }

  /**
   * Analyze landing page profitability
   */
  async analyzeLandingPageProfitability(startDate: string, endDate: string): Promise<LandingPageProfitability[]> {
    const { data: conversions } = await supabase
      .from('enriched_conversions')
      .select(`
        landing_page,
        order_value,
        net_margin,
        ad_id,
        ads (name)
      `)
      .eq('user_id', this.userId)
      .gte('ordered_at', startDate)
      .lte('ordered_at', endDate);

    const { data: events } = await supabase
      .from('conversion_events')
      .select('event_name, event_data')
      .eq('user_id', this.userId)
      .eq('event_name', 'ViewContent')
      .gte('event_time', startDate)
      .lte('event_time', endDate);

    if (!conversions) return [];

    const pageStats: Record<string, {
      visits: number;
      conversions: number;
      revenue: number;
      profit: number;
      adIds: Set<string>;
      adNames: Record<string, string>;
    }> = {};

    // Track page views
    events?.forEach((event: any) => {
      const landingPage = event.event_data?.url || 'Unknown';
      if (!pageStats[landingPage]) {
        pageStats[landingPage] = {
          visits: 0,
          conversions: 0,
          revenue: 0,
          profit: 0,
          adIds: new Set(),
          adNames: {}
        };
      }
      pageStats[landingPage].visits++;
    });

    // Track conversions
    conversions.forEach((conv: any) => {
      const landingPage = conv.landing_page || 'Unknown';
      if (!pageStats[landingPage]) {
        pageStats[landingPage] = {
          visits: 0,
          conversions: 0,
          revenue: 0,
          profit: 0,
          adIds: new Set(),
          adNames: {}
        };
      }

      pageStats[landingPage].conversions++;
      pageStats[landingPage].revenue += Number(conv.order_value) || 0;
      pageStats[landingPage].profit += Number(conv.net_margin) || 0;

      if (conv.ad_id) {
        pageStats[landingPage].adIds.add(conv.ad_id);
        if (conv.ads?.name) {
          pageStats[landingPage].adNames[conv.ad_id] = conv.ads.name;
        }
      }
    });

    return Object.entries(pageStats)
      .map(([landingPage, stats]) => {
        const conversionRate = stats.visits > 0 ? (stats.conversions / stats.visits) * 100 : 0;
        const avgOrderValue = stats.conversions > 0 ? stats.revenue / stats.conversions : 0;
        const avgProfit = stats.conversions > 0 ? stats.profit / stats.conversions : 0;
        const profitPerVisit = stats.visits > 0 ? stats.profit / stats.visits : 0;
        const topAds = Object.entries(stats.adNames).slice(0, 3).map(([id, name]) => name);

        return {
          landingPage,
          visits: stats.visits,
          conversions: stats.conversions,
          conversionRate,
          averageOrderValue: avgOrderValue,
          averageProfit: avgProfit,
          profitPerVisit,
          topPerformingAds: topAds
        };
      })
      .filter(p => p.conversions > 0)
      .sort((a, b) => b.profitPerVisit - a.profitPerVisit);
  }

  /**
   * Generate complete profit intelligence report
   */
  async generateReport(startDate: string, endDate: string): Promise<ProfitIntelligenceReport> {
    const adProfitMetrics = await this.calculateAdProfitMetrics(startDate, endDate);
    const productPerformance = await this.analyzeProductPerformance(startDate, endDate);
    const marginOpportunities = await this.identifyMarginOpportunities(adProfitMetrics);
    const landingPageProfitability = await this.analyzeLandingPageProfitability(startDate, endDate);

    // Calculate overall metrics
    const overallMetrics = {
      totalSpend: adProfitMetrics.reduce((sum, m) => sum + m.totalSpend, 0),
      totalRevenue: adProfitMetrics.reduce((sum, m) => sum + m.totalRevenue, 0),
      totalCogs: adProfitMetrics.reduce((sum, m) => sum + m.totalCogs, 0),
      totalProfit: adProfitMetrics.reduce((sum, m) => sum + m.totalProfit, 0),
      overallRevenueRoas: 0,
      overallProfitRoas: 0,
      averageMarginPercent: 0
    };

    overallMetrics.overallRevenueRoas = overallMetrics.totalSpend > 0
      ? overallMetrics.totalRevenue / overallMetrics.totalSpend
      : 0;

    overallMetrics.overallProfitRoas = overallMetrics.totalSpend > 0
      ? overallMetrics.totalProfit / overallMetrics.totalSpend
      : 0;

    overallMetrics.averageMarginPercent = overallMetrics.totalRevenue > 0
      ? (overallMetrics.totalProfit / overallMetrics.totalRevenue) * 100
      : 0;

    // Top and bottom performers
    const topProfitableAds = [...adProfitMetrics]
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .slice(0, 10);

    const lowestMarginAds = [...adProfitMetrics]
      .sort((a, b) => a.averageMarginPercent - b.averageMarginPercent)
      .filter(a => a.conversions >= 5)
      .slice(0, 5);

    // Generate recommendations
    const recommendations: string[] = [];

    if (overallMetrics.averageMarginPercent < 30) {
      recommendations.push('Your overall margin is below 30%. Focus on promoting higher-margin products or optimizing COGS.');
    }

    if (overallMetrics.overallProfitRoas < 1) {
      recommendations.push('Your profit ROAS is below 1.0 - you are losing money. Pause low-margin ads immediately.');
    }

    if (marginOpportunities.filter(o => o.type === 'high_revenue_low_margin').length > 0) {
      recommendations.push('You have high-revenue ads with low margins. Consider product mix optimization.');
    }

    if (topProfitableAds.length > 0 && topProfitableAds[0].profitRoas > 3) {
      recommendations.push(`Scale your top ad "${topProfitableAds[0].adName}" - it has ${topProfitableAds[0].profitRoas.toFixed(2)}x profit ROAS.`);
    }

    return {
      userId: this.userId,
      dateRange: { start: startDate, end: endDate },
      overallMetrics,
      adProfitMetrics,
      topProfitableAds,
      lowestMarginAds,
      productPerformance,
      marginOpportunities,
      landingPageProfitability,
      recommendations
    };
  }

  async getMappedCogsForAd(adId: string): Promise<{ unitCogs: number; source: string; confidence: number } | null> {
    const { data: mapping } = await supabase
      .from('ad_product_mappings')
      .select('unit_cogs, cogs_source, confidence_score')
      .eq('ad_id', adId)
      .eq('user_id', this.userId)
      .not('unit_cogs', 'is', null)
      .order('confidence_score', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (mapping?.unit_cogs) {
      return {
        unitCogs: mapping.unit_cogs,
        source: mapping.cogs_source || 'mapping',
        confidence: mapping.confidence_score || 0.7,
      };
    }

    return null;
  }

  async getAdProfitFromMapping(
    adId: string,
    revenue: number,
    spend: number,
    conversions: number
  ): Promise<{ profit: number; profitMargin: number; profitRoas: number; cogsSource: string } | null> {
    const cogsData = await this.getMappedCogsForAd(adId);
    if (!cogsData || conversions === 0) return null;

    const totalCogs = cogsData.unitCogs * conversions;
    const profit = revenue - spend - totalCogs;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const profitRoas = spend > 0 ? profit / spend : 0;

    return {
      profit,
      profitMargin,
      profitRoas,
      cogsSource: cogsData.source,
    };
  }

  async getAdsWithMappedCogs(
    startDate: string,
    endDate: string
  ): Promise<Array<{ adId: string; profit: number; profitMargin: number; profitRoas: number; cogs: number; cogsSource: string }>> {
    const { data: metrics } = await supabase
      .from('ad_metrics')
      .select('entity_id, spend, conversion_value, conversions')
      .eq('entity_type', 'ad')
      .gte('date', startDate)
      .lte('date', endDate);

    if (!metrics) return [];

    const adAggregates: Record<string, { spend: number; revenue: number; conversions: number }> = {};
    metrics.forEach(m => {
      if (!adAggregates[m.entity_id]) {
        adAggregates[m.entity_id] = { spend: 0, revenue: 0, conversions: 0 };
      }
      adAggregates[m.entity_id].spend += m.spend || 0;
      adAggregates[m.entity_id].revenue += m.conversion_value || 0;
      adAggregates[m.entity_id].conversions += m.conversions || 0;
    });

    const { data: mappings } = await supabase
      .from('ad_product_mappings')
      .select('ad_id, unit_cogs, confidence_score, cogs_source')
      .eq('user_id', this.userId)
      .not('unit_cogs', 'is', null);

    const cogsMap = new Map<string, { unitCogs: number; source: string }>();
    mappings?.forEach(m => {
      if (!cogsMap.has(m.ad_id) || m.confidence_score > (cogsMap.get(m.ad_id)?.unitCogs || 0)) {
        cogsMap.set(m.ad_id, { unitCogs: m.unit_cogs, source: m.cogs_source || 'mapping' });
      }
    });

    const results: Array<{ adId: string; profit: number; profitMargin: number; profitRoas: number; cogs: number; cogsSource: string }> = [];

    for (const [adId, agg] of Object.entries(adAggregates)) {
      const cogsData = cogsMap.get(adId);
      if (cogsData && agg.conversions > 0) {
        const totalCogs = cogsData.unitCogs * agg.conversions;
        const profit = agg.revenue - agg.spend - totalCogs;
        const profitMargin = agg.revenue > 0 ? (profit / agg.revenue) * 100 : 0;
        const profitRoas = agg.spend > 0 ? profit / agg.spend : 0;

        results.push({
          adId,
          profit,
          profitMargin,
          profitRoas,
          cogs: totalCogs,
          cogsSource: cogsData.source,
        });
      }
    }

    return results;
  }
}
