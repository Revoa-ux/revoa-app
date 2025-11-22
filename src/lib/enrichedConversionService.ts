import { supabase } from './supabase';

export interface EnrichedConversionData {
  orderId: string;
  adId: string;
  orderValue: number;
  cogs: number;
  margin: number;
  customerEmail: string;
  customerType: 'new' | 'returning';
  device: string;
  shippingCountry: string;
  shippingRegion?: string;
  shippingCity?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  fbclid?: string;
  gclid?: string;
  ttclid?: string;
  conversionTime: string;
}

export class EnrichedConversionService {
  async enrichConversion(data: EnrichedConversionData): Promise<void> {
    try {
      const { data: existingCustomer, error: customerError } = await supabase
        .from('shopify_orders')
        .select('id')
        .eq('customer_email', data.customerEmail)
        .order('ordered_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      const isFirstPurchase = !existingCustomer;

      const { data: customerLifetime, error: lifetimeError } = await supabase
        .from('shopify_orders')
        .select('total_price')
        .eq('customer_email', data.customerEmail);

      const lifetimeValue = customerLifetime?.reduce((sum, order) => sum + parseFloat(order.total_price), 0) || 0;
      const purchaseCount = customerLifetime?.length || 0;

      const { error } = await supabase.from('enriched_conversions').upsert({
        order_id: data.orderId,
        ad_id: data.adId,
        conversion_value: data.orderValue,
        cogs: data.cogs,
        profit_margin: data.margin,
        customer_email: data.customerEmail,
        is_new_customer: isFirstPurchase,
        customer_lifetime_value: lifetimeValue,
        customer_purchase_count: purchaseCount,
        device_type: data.device,
        geo_country: data.shippingCountry,
        geo_region: data.shippingRegion,
        geo_city: data.shippingCity,
        utm_source: data.utmSource,
        utm_medium: data.utmMedium,
        utm_campaign: data.utmCampaign,
        utm_term: data.utmTerm,
        utm_content: data.utmContent,
        fbclid: data.fbclid,
        gclid: data.gclid,
        ttclid: data.ttclid,
        converted_at: data.conversionTime,
      }, { onConflict: 'order_id' });

      if (error) {
        console.error('[EnrichedConversion] Error storing enriched conversion:', error);
        throw error;
      }

      console.log('[EnrichedConversion] Successfully stored enriched conversion for order:', data.orderId);
    } catch (error) {
      console.error('[EnrichedConversion] Error in enrichConversion:', error);
      throw error;
    }
  }

  async getConversionsByAd(adId: string, startDate: string, endDate: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('enriched_conversions')
      .select('*')
      .eq('ad_id', adId)
      .gte('converted_at', startDate)
      .lte('converted_at', endDate)
      .order('converted_at', { ascending: false });

    if (error) {
      console.error('[EnrichedConversion] Error fetching conversions:', error);
      throw error;
    }

    return data || [];
  }

  async getNewVsReturningCustomers(adId: string, startDate: string, endDate: string) {
    const conversions = await this.getConversionsByAd(adId, startDate, endDate);

    const newCustomers = conversions.filter(c => c.is_new_customer);
    const returningCustomers = conversions.filter(c => !c.is_new_customer);

    return {
      newCustomers: {
        count: newCustomers.length,
        totalValue: newCustomers.reduce((sum, c) => sum + c.conversion_value, 0),
        averageValue: newCustomers.length > 0
          ? newCustomers.reduce((sum, c) => sum + c.conversion_value, 0) / newCustomers.length
          : 0,
      },
      returningCustomers: {
        count: returningCustomers.length,
        totalValue: returningCustomers.reduce((sum, c) => sum + c.conversion_value, 0),
        averageValue: returningCustomers.length > 0
          ? returningCustomers.reduce((sum, c) => sum + c.conversion_value, 0) / returningCustomers.length
          : 0,
      },
      ratio: newCustomers.length / (conversions.length || 1),
    };
  }

  async getConversionsByDevice(adId: string, startDate: string, endDate: string) {
    const conversions = await this.getConversionsByAd(adId, startDate, endDate);

    const byDevice: Record<string, { count: number; value: number; conversions: number }> = {};

    conversions.forEach(c => {
      const device = c.device_type || 'unknown';
      if (!byDevice[device]) {
        byDevice[device] = { count: 0, value: 0, conversions: 0 };
      }
      byDevice[device].count++;
      byDevice[device].value += c.conversion_value;
      byDevice[device].conversions++;
    });

    return Object.entries(byDevice).map(([device, stats]) => ({
      device,
      conversions: stats.conversions,
      revenue: stats.value,
      averageOrderValue: stats.value / stats.conversions,
    }));
  }

  async getConversionsByGeography(adId: string, startDate: string, endDate: string) {
    const conversions = await this.getConversionsByAd(adId, startDate, endDate);

    const byGeo: Record<string, { count: number; value: number; conversions: number }> = {};

    conversions.forEach(c => {
      const geoKey = `${c.geo_country}-${c.geo_region || 'Unknown'}`;
      if (!byGeo[geoKey]) {
        byGeo[geoKey] = { count: 0, value: 0, conversions: 0 };
      }
      byGeo[geoKey].count++;
      byGeo[geoKey].value += c.conversion_value;
      byGeo[geoKey].conversions++;
    });

    return Object.entries(byGeo).map(([geo, stats]) => {
      const [country, region] = geo.split('-');
      return {
        country,
        region,
        conversions: stats.conversions,
        revenue: stats.value,
        averageOrderValue: stats.value / stats.conversions,
      };
    });
  }

  async getHighValueCustomerSegments(adId: string, startDate: string, endDate: string) {
    const conversions = await this.getConversionsByAd(adId, startDate, endDate);

    const avgLTV = conversions.reduce((sum, c) => sum + (c.customer_lifetime_value || 0), 0) / conversions.length;

    const highValueCustomers = conversions.filter(c => c.customer_lifetime_value > avgLTV * 1.5);

    return {
      averageLTV: avgLTV,
      highValueCount: highValueCustomers.length,
      highValuePercentage: (highValueCustomers.length / conversions.length) * 100,
      totalHighValueRevenue: highValueCustomers.reduce((sum, c) => sum + c.conversion_value, 0),
    };
  }
}

export const enrichedConversionService = new EnrichedConversionService();
