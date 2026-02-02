import { supabase } from './supabase';

/**
 * Full Funnel Analysis Service
 *
 * Tracks the complete customer journey from impression to purchase:
 * Impression → Click → PageView → AddToCart → InitiateCheckout → Purchase
 *
 * Identifies where drop-offs occur to pinpoint friction points.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface FunnelStage {
  stage: 'impression' | 'click' | 'page_view' | 'add_to_cart' | 'initiate_checkout' | 'purchase';
  count: number;
  rate: number; // Conversion rate from previous stage
  dropOffCount: number;
  dropOffRate: number;
}

export interface AdFunnelAnalysis {
  adId: string;
  adName: string;
  platform: string;
  dateRange: { start: string; end: string };
  funnelStages: FunnelStage[];
  biggestDropOff: {
    stage: string;
    dropOffRate: number;
    lostOpportunities: number;
  };
  overallConversionRate: number;
  recommendations: string[];
}

export interface DeviceFunnelComparison {
  mobile: AdFunnelAnalysis;
  desktop: AdFunnelAnalysis;
  tablet: AdFunnelAnalysis;
  recommendation: string;
}

export interface LandingPageFunnelAnalysis {
  landingPage: string;
  pageViews: number;
  addToCarts: number;
  checkouts: number;
  purchases: number;
  pageViewToAtcRate: number;
  atcToCheckoutRate: number;
  checkoutToPurchaseRate: number;
  biggestIssue: string;
  recommendation: string;
}

export interface TimeToConversionAnalysis {
  adId: string;
  averageTimeToConversion: number; // in minutes
  medianTimeToConversion: number;
  distribution: {
    immediate: number; // < 5 min
    quick: number; // 5-30 min
    moderate: number; // 30min - 24hr
    delayed: number; // > 24hr
  };
  insight: string;
}

// ============================================================================
// FULL FUNNEL ANALYSIS SERVICE
// ============================================================================

export class FullFunnelAnalysisService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Analyze complete funnel for a specific ad
   */
  async analyzeAdFunnel(adId: string, startDate: string, endDate: string): Promise<AdFunnelAnalysis> {
    // Get ad details
    const { data: ad } = await supabase
      .from('ads')
      .select('id, name, ad_account_id')
      .eq('id', adId)
      .maybeSingle();

    if (!ad) {
      throw new Error('Ad not found');
    }

    // Get platform from ad_accounts separately
    const { data: adAccount } = await supabase
      .from('ad_accounts')
      .select('platform')
      .eq('id', ad.ad_account_id)
      .maybeSingle();

    const platform = adAccount?.platform || 'facebook';

    // Get funnel metrics from database
    const { data: funnelData } = await supabase
      .from('funnel_metrics')
      .select('*')
      .eq('ad_id', adId)
      .gte('date_start', startDate)
      .lte('date_end', endDate)
      .order('date_start', { ascending: false })
      .limit(1);

    let impressions = 0;
    let clicks = 0;
    let pageViews = 0;
    let addToCarts = 0;
    let initiateCheckouts = 0;
    let purchases = 0;

    if (funnelData && funnelData.length > 0) {
      const data = funnelData[0];
      impressions = data.impressions;
      clicks = data.clicks;
      pageViews = data.page_views;
      addToCarts = data.add_to_carts;
      initiateCheckouts = data.initiate_checkouts;
      purchases = data.purchases;
    } else {
      // Fallback: calculate from raw data
      const { data: metrics } = await supabase
        .from('ad_metrics')
        .select('impressions, clicks, conversions')
        .eq('entity_id', adId)
        .eq('entity_type', 'ad')
        .gte('date', startDate)
        .lte('date', endDate);

      if (metrics) {
        impressions = metrics.reduce((sum, m) => sum + m.impressions, 0);
        clicks = metrics.reduce((sum, m) => sum + m.clicks, 0);
        purchases = metrics.reduce((sum, m) => sum + m.conversions, 0);
      }

      // Get event data
      const { data: events } = await supabase
        .from('conversion_events')
        .select('event_name')
        .eq('user_id', this.userId)
        .gte('event_time', startDate)
        .lte('event_time', endDate);

      if (events) {
        pageViews = events.filter(e => e.event_name === 'ViewContent').length;
        addToCarts = events.filter(e => e.event_name === 'AddToCart').length;
        initiateCheckouts = events.filter(e => e.event_name === 'InitiateCheckout').length;
      }
    }

    // Calculate conversion rates and drop-offs
    const funnelStages: FunnelStage[] = [
      {
        stage: 'impression',
        count: impressions,
        rate: 100,
        dropOffCount: 0,
        dropOffRate: 0
      },
      {
        stage: 'click',
        count: clicks,
        rate: impressions > 0 ? (clicks / impressions) * 100 : 0,
        dropOffCount: impressions - clicks,
        dropOffRate: impressions > 0 ? ((impressions - clicks) / impressions) * 100 : 0
      },
      {
        stage: 'page_view',
        count: pageViews,
        rate: clicks > 0 ? (pageViews / clicks) * 100 : 0,
        dropOffCount: clicks - pageViews,
        dropOffRate: clicks > 0 ? ((clicks - pageViews) / clicks) * 100 : 0
      },
      {
        stage: 'add_to_cart',
        count: addToCarts,
        rate: pageViews > 0 ? (addToCarts / pageViews) * 100 : 0,
        dropOffCount: pageViews - addToCarts,
        dropOffRate: pageViews > 0 ? ((pageViews - addToCarts) / pageViews) * 100 : 0
      },
      {
        stage: 'initiate_checkout',
        count: initiateCheckouts,
        rate: addToCarts > 0 ? (initiateCheckouts / addToCarts) * 100 : 0,
        dropOffCount: addToCarts - initiateCheckouts,
        dropOffRate: addToCarts > 0 ? ((addToCarts - initiateCheckouts) / addToCarts) * 100 : 0
      },
      {
        stage: 'purchase',
        count: purchases,
        rate: initiateCheckouts > 0 ? (purchases / initiateCheckouts) * 100 : 0,
        dropOffCount: initiateCheckouts - purchases,
        dropOffRate: initiateCheckouts > 0 ? ((initiateCheckouts - purchases) / initiateCheckouts) * 100 : 0
      }
    ];

    // Identify biggest drop-off
    const dropOffs = funnelStages.slice(1).map(stage => ({
      stage: stage.stage,
      dropOffRate: stage.dropOffRate,
      lostOpportunities: stage.dropOffCount
    }));

    const biggestDropOff = dropOffs.reduce((max, current) =>
      current.dropOffRate > max.dropOffRate ? current : max
    , dropOffs[0]);

    // Generate recommendations
    const recommendations: string[] = [];

    if (biggestDropOff.stage === 'click' && biggestDropOff.dropOffRate > 20) {
      recommendations.push('High drop-off after click suggests broken tracking or slow landing page load times. Check pixel installation and page speed.');
    }

    if (biggestDropOff.stage === 'page_view' && biggestDropOff.dropOffRate > 70) {
      recommendations.push('Very high bounce rate on landing page. Your ad messaging may not match the landing page, or the page has usability issues.');
    }

    if (biggestDropOff.stage === 'add_to_cart' && biggestDropOff.dropOffRate > 60) {
      recommendations.push('Low Add to Cart rate suggests product page issues: unclear value prop, high prices, poor images, or missing trust signals.');
    }

    if (biggestDropOff.stage === 'initiate_checkout' && biggestDropOff.dropOffRate > 50) {
      recommendations.push('Cart abandonment is high. Check for unexpected shipping costs, complicated cart UI, or missing payment options.');
    }

    if (biggestDropOff.stage === 'purchase' && biggestDropOff.dropOffRate > 40) {
      recommendations.push('Checkout abandonment is high. Simplify checkout, offer guest checkout, add trust badges, and review payment method options.');
    }

    const overallConversionRate = clicks > 0 ? (purchases / clicks) * 100 : 0;

    if (overallConversionRate < 1) {
      recommendations.push('Overall conversion rate is below 1%. This indicates fundamental issues with either ad targeting, offer, or landing page.');
    } else if (overallConversionRate > 5) {
      recommendations.push('Excellent conversion rate! This ad is performing well. Consider scaling budget.');
    }

    return {
      adId,
      adName: ad.name,
      platform: (ad.ad_accounts as any)?.platform || 'facebook',
      dateRange: { start: startDate, end: endDate },
      funnelStages,
      biggestDropOff,
      overallConversionRate,
      recommendations
    };
  }

  /**
   * Compare funnel performance across devices
   */
  async compareDeviceFunnels(adId: string, startDate: string, endDate: string): Promise<DeviceFunnelComparison> {
    // Get conversions by device type
    const { data: conversions } = await supabase
      .from('enriched_conversions')
      .select('device_type, ad_id')
      .eq('user_id', this.userId)
      .eq('ad_id', adId)
      .gte('ordered_at', startDate)
      .lte('ordered_at', endDate);

    const deviceStats = {
      mobile: { purchases: 0 },
      desktop: { purchases: 0 },
      tablet: { purchases: 0 }
    };

    conversions?.forEach(conv => {
      const device = conv.device_type || 'desktop';
      if (device in deviceStats) {
        deviceStats[device as keyof typeof deviceStats].purchases++;
      }
    });

    // For simplicity, create basic funnel analyses
    // In production, you'd fetch device-specific event data
    const mobileFunnel = await this.analyzeAdFunnel(adId, startDate, endDate);
    const desktopFunnel = { ...mobileFunnel };
    const tabletFunnel = { ...mobileFunnel };

    let recommendation = 'Device performance is balanced.';

    const totalPurchases = deviceStats.mobile.purchases + deviceStats.desktop.purchases + deviceStats.tablet.purchases;
    const mobilePercent = totalPurchases > 0 ? (deviceStats.mobile.purchases / totalPurchases) * 100 : 0;
    const desktopPercent = totalPurchases > 0 ? (deviceStats.desktop.purchases / totalPurchases) * 100 : 0;

    if (mobilePercent > 70) {
      recommendation = 'Mobile dominates conversions. Ensure your landing page is mobile-optimized and consider mobile-specific ads.';
    } else if (desktopPercent > 70) {
      recommendation = 'Desktop dominates conversions. Your product may benefit from desktop shopping experience. Consider desktop placement bids.';
    } else if (mobilePercent > 40 && mobilePercent < 60) {
      recommendation = 'Balanced mobile/desktop performance. Test device-specific messaging and landing pages.';
    }

    return {
      mobile: mobileFunnel,
      desktop: desktopFunnel,
      tablet: tabletFunnel,
      recommendation
    };
  }

  /**
   * Analyze landing page funnel performance
   */
  async analyzeLandingPageFunnels(startDate: string, endDate: string): Promise<LandingPageFunnelAnalysis[]> {
    const { data: conversions } = await supabase
      .from('enriched_conversions')
      .select('landing_page, ad_id')
      .eq('user_id', this.userId)
      .gte('ordered_at', startDate)
      .lte('ordered_at', endDate);

    const { data: events } = await supabase
      .from('conversion_events')
      .select('event_name, event_data')
      .eq('user_id', this.userId)
      .gte('event_time', startDate)
      .lte('event_time', endDate);

    const pageStats: Record<string, {
      pageViews: number;
      addToCarts: number;
      checkouts: number;
      purchases: number;
    }> = {};

    // Track page views
    events?.filter(e => e.event_name === 'ViewContent').forEach((event: any) => {
      const page = event.event_data?.url || 'Unknown';
      if (!pageStats[page]) {
        pageStats[page] = { pageViews: 0, addToCarts: 0, checkouts: 0, purchases: 0 };
      }
      pageStats[page].pageViews++;
    });

    // Track ATC
    events?.filter(e => e.event_name === 'AddToCart').forEach((event: any) => {
      const page = event.event_data?.url || 'Unknown';
      if (pageStats[page]) {
        pageStats[page].addToCarts++;
      }
    });

    // Track checkouts
    events?.filter(e => e.event_name === 'InitiateCheckout').forEach((event: any) => {
      const page = event.event_data?.url || 'Unknown';
      if (pageStats[page]) {
        pageStats[page].checkouts++;
      }
    });

    // Track purchases
    conversions?.forEach(conv => {
      const page = conv.landing_page || 'Unknown';
      if (pageStats[page]) {
        pageStats[page].purchases++;
      }
    });

    return Object.entries(pageStats)
      .map(([landingPage, stats]) => {
        const pageViewToAtcRate = stats.pageViews > 0 ? (stats.addToCarts / stats.pageViews) * 100 : 0;
        const atcToCheckoutRate = stats.addToCarts > 0 ? (stats.checkouts / stats.addToCarts) * 100 : 0;
        const checkoutToPurchaseRate = stats.checkouts > 0 ? (stats.purchases / stats.checkouts) * 100 : 0;

        let biggestIssue = '';
        let recommendation = '';

        if (pageViewToAtcRate < 10) {
          biggestIssue = 'Very low page view to ATC rate';
          recommendation = 'Product page needs improvement: better images, clearer value prop, stronger CTAs, or lower price.';
        } else if (atcToCheckoutRate < 50) {
          biggestIssue = 'High cart abandonment';
          recommendation = 'Review cart page: hidden shipping costs, complicated UI, or missing trust signals may be causing abandonment.';
        } else if (checkoutToPurchaseRate < 60) {
          biggestIssue = 'High checkout abandonment';
          recommendation = 'Simplify checkout process: offer guest checkout, add payment options, reduce form fields, add security badges.';
        } else {
          biggestIssue = 'No major issues detected';
          recommendation = 'Landing page funnel is performing well. Continue monitoring.';
        }

        return {
          landingPage,
          pageViews: stats.pageViews,
          addToCarts: stats.addToCarts,
          checkouts: stats.checkouts,
          purchases: stats.purchases,
          pageViewToAtcRate,
          atcToCheckoutRate,
          checkoutToPurchaseRate,
          biggestIssue,
          recommendation
        };
      })
      .filter(p => p.pageViews > 10)
      .sort((a, b) => b.purchases - a.purchases);
  }

  /**
   * Analyze time to conversion patterns
   */
  async analyzeTimeToConversion(adId: string, startDate: string, endDate: string): Promise<TimeToConversionAnalysis> {
    const { data: conversions } = await supabase
      .from('enriched_conversions')
      .select('time_to_conversion, click_timestamp, conversion_timestamp')
      .eq('user_id', this.userId)
      .eq('ad_id', adId)
      .gte('ordered_at', startDate)
      .lte('ordered_at', endDate)
      .not('time_to_conversion', 'is', null);

    if (!conversions || conversions.length === 0) {
      return {
        adId,
        averageTimeToConversion: 0,
        medianTimeToConversion: 0,
        distribution: { immediate: 0, quick: 0, moderate: 0, delayed: 0 },
        insight: 'No time-to-conversion data available.'
      };
    }

    // Extract time in minutes
    const times: number[] = [];
    conversions.forEach(conv => {
      if (conv.time_to_conversion) {
        // Parse PostgreSQL interval to minutes
        const match = conv.time_to_conversion.toString().match(/(\d+):(\d+):(\d+)/);
        if (match) {
          const hours = parseInt(match[1]);
          const minutes = parseInt(match[2]);
          times.push(hours * 60 + minutes);
        }
      }
    });

    if (times.length === 0) {
      return {
        adId,
        averageTimeToConversion: 0,
        medianTimeToConversion: 0,
        distribution: { immediate: 0, quick: 0, moderate: 0, delayed: 0 },
        insight: 'Could not parse time-to-conversion data.'
      };
    }

    const averageTime = times.reduce((sum, t) => sum + t, 0) / times.length;
    const sortedTimes = [...times].sort((a, b) => a - b);
    const medianTime = sortedTimes[Math.floor(sortedTimes.length / 2)];

    const distribution = {
      immediate: times.filter(t => t < 5).length,
      quick: times.filter(t => t >= 5 && t < 30).length,
      moderate: times.filter(t => t >= 30 && t < 1440).length, // 24 hours
      delayed: times.filter(t => t >= 1440).length
    };

    let insight = '';
    if (averageTime < 10) {
      insight = 'Very fast conversions (< 10 min). Your ad and offer are compelling with low friction. This is excellent.';
    } else if (averageTime < 60) {
      insight = 'Quick conversions (< 1 hour). Customers are motivated but may be comparing options. Good performance.';
    } else if (averageTime < 1440) {
      insight = 'Moderate time to conversion (< 24 hours). Customers need time to decide. Consider retargeting and email sequences.';
    } else {
      insight = 'Long conversion window (> 24 hours). High-consideration product. Multi-touch attribution and nurture sequences are critical.';
    }

    return {
      adId,
      averageTimeToConversion: averageTime,
      medianTimeToConversion: medianTime,
      distribution,
      insight
    };
  }

  /**
   * Calculate and store funnel metrics for an ad
   */
  async calculateAndStoreFunnelMetrics(adId: string, dateStart: string, dateEnd: string): Promise<void> {
    const funnelAnalysis = await this.analyzeAdFunnel(adId, dateStart, dateEnd);

    const impressions = funnelAnalysis.funnelStages.find(s => s.stage === 'impression')?.count || 0;
    const clicks = funnelAnalysis.funnelStages.find(s => s.stage === 'click')?.count || 0;
    const pageViews = funnelAnalysis.funnelStages.find(s => s.stage === 'page_view')?.count || 0;
    const addToCarts = funnelAnalysis.funnelStages.find(s => s.stage === 'add_to_cart')?.count || 0;
    const initiateCheckouts = funnelAnalysis.funnelStages.find(s => s.stage === 'initiate_checkout')?.count || 0;
    const purchases = funnelAnalysis.funnelStages.find(s => s.stage === 'purchase')?.count || 0;

    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const clickToPageViewRate = clicks > 0 ? (pageViews / clicks) * 100 : 0;
    const pageViewToAtcRate = pageViews > 0 ? (addToCarts / pageViews) * 100 : 0;
    const atcToCheckoutRate = addToCarts > 0 ? (initiateCheckouts / addToCarts) * 100 : 0;
    const checkoutToPurchaseRate = initiateCheckouts > 0 ? (purchases / initiateCheckouts) * 100 : 0;
    const overallConversionRate = clicks > 0 ? (purchases / clicks) * 100 : 0;

    // Get ad account ID
    const { data: ad } = await supabase
      .from('ads')
      .select('ad_account_id')
      .eq('id', adId)
      .single();

    if (!ad) return;

    await supabase
      .from('funnel_metrics')
      .upsert({
        user_id: this.userId,
        ad_id: adId,
        ad_account_id: ad.ad_account_id,
        date_start: dateStart,
        date_end: dateEnd,
        impressions,
        clicks,
        page_views: pageViews,
        add_to_carts: addToCarts,
        initiate_checkouts: initiateCheckouts,
        purchases,
        ctr,
        click_to_page_view_rate: clickToPageViewRate,
        page_view_to_atc_rate: pageViewToAtcRate,
        atc_to_checkout_rate: atcToCheckoutRate,
        checkout_to_purchase_rate: checkoutToPurchaseRate,
        overall_conversion_rate: overallConversionRate,
        biggest_dropoff_stage: funnelAnalysis.biggestDropOff.stage,
        biggest_dropoff_rate: funnelAnalysis.biggestDropOff.dropOffRate
      }, {
        onConflict: 'ad_id,date_start,date_end'
      });
  }
}
