import { supabase } from './supabase';

export type ConversionSource = 'revoa_pixel' | 'utm_attribution' | 'platform_pixel' | 'none';

export interface ResolvedConversionData {
  conversions: number;
  conversionValue: number;
  conversionRate: number;
  totalCogs: number;
  source: ConversionSource;
  hasData: boolean;
  linkedProductCount?: number;
}

export interface AdConversionResult {
  adId: string;
  data: ResolvedConversionData;
}

async function getRevoaPixelConversions(
  userId: string,
  adIds: string[],
  startDate: string,
  endDate: string
): Promise<Map<string, ResolvedConversionData>> {
  const result = new Map<string, ResolvedConversionData>();

  try {
    const { data: pixelPurchases, error } = await supabase
      .from('pixel_events')
      .select(`
        id,
        event_data,
        utm_term,
        utm_campaign,
        utm_content,
        fbclid,
        gclid,
        ttclid
      `)
      .eq('user_id', userId)
      .eq('event_name', 'Purchase')
      .gte('event_time', startDate)
      .lte('event_time', endDate);

    if (error || !pixelPurchases || pixelPurchases.length === 0) {
      return result;
    }

    const { data: ads } = await supabase
      .from('ads')
      .select('id, platform_ad_id, name')
      .in('id', adIds);

    if (!ads) return result;

    const adMap = new Map(ads.map(ad => [ad.id, ad]));

    for (const purchase of pixelPurchases) {
      const utmTerm = purchase.utm_term;
      const utmContent = purchase.utm_content;

      if (!utmTerm && !utmContent) continue;

      for (const [adId, ad] of adMap) {
        const platformId = ad.platform_ad_id;
        const adName = ad.name?.toLowerCase() || '';

        const isMatch =
          (utmTerm && (platformId === utmTerm || adName.includes(utmTerm.toLowerCase()))) ||
          (utmContent && (platformId === utmContent || adName.includes(utmContent.toLowerCase())));

        if (isMatch) {
          const existing = result.get(adId) || {
            conversions: 0,
            conversionValue: 0,
            conversionRate: 0,
            totalCogs: 0,
            source: 'revoa_pixel' as ConversionSource,
            hasData: false,
          };

          const orderValue = parseFloat(purchase.event_data?.total_price || '0');

          existing.conversions += 1;
          existing.conversionValue += orderValue;
          existing.hasData = true;

          result.set(adId, existing);
        }
      }
    }
  } catch (err) {
    console.error('[ConversionResolver] Error fetching Revoa pixel data:', err);
  }

  return result;
}

async function getUtmAttributionConversions(
  userId: string,
  accountIds: string[],
  startDate: string,
  endDate: string
): Promise<Map<string, ResolvedConversionData>> {
  const result = new Map<string, ResolvedConversionData>();

  try {
    const { data: conversions, error } = await supabase
      .from('ad_conversions')
      .select(`
        id,
        ad_id,
        conversion_value,
        converted_at,
        ads!inner (
          ad_account_id
        ),
        shopify_orders!inner (
          shopify_order_id,
          total_price
        )
      `)
      .in('ads.ad_account_id', accountIds)
      .gte('converted_at', startDate)
      .lte('converted_at', endDate);

    if (error) {
      console.error('[ConversionResolver] Error fetching UTM attribution data:', error);
      return result;
    }

    if (!conversions) {
      return result;
    }

    const shopifyOrderIds = conversions
      .map((c: any) => c.shopify_orders?.shopify_order_id)
      .filter(Boolean);

    let cogsMap = new Map<string, number>();

    if (shopifyOrderIds.length > 0) {
      const { data: lineItems } = await supabase
        .from('order_line_items')
        .select('shopify_order_id, quantity, unit_cost')
        .in('shopify_order_id', shopifyOrderIds);

      if (lineItems) {
        for (const item of lineItems) {
          const orderId = item.shopify_order_id;
          const unitCost = Number(item.unit_cost) || 0;
          const qty = item.quantity || 1;
          const existing = cogsMap.get(orderId) || 0;
          cogsMap.set(orderId, existing + (unitCost * qty));
        }
      }
    }

    for (const conversion of conversions) {
      const adId = conversion.ad_id;
      if (!adId) continue;

      const existing = result.get(adId) || {
        conversions: 0,
        conversionValue: 0,
        conversionRate: 0,
        totalCogs: 0,
        source: 'utm_attribution' as ConversionSource,
        hasData: false,
      };

      const orderId = (conversion as any).shopify_orders?.shopify_order_id;
      const orderCogs = cogsMap.get(orderId) || 0;

      existing.conversions += 1;
      existing.conversionValue += conversion.conversion_value || 0;
      existing.totalCogs += orderCogs;
      existing.hasData = true;

      result.set(adId, existing);
    }
  } catch (err) {
    console.error('[ConversionResolver] Error fetching UTM attribution data:', err);
  }

  return result;
}

async function getLinkedProductCounts(
  userId: string,
  adIds: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();

  if (adIds.length === 0) return result;

  try {
    const { data: mappings, error } = await supabase
      .from('ad_product_mappings')
      .select('ad_id, shopify_product_id')
      .eq('user_id', userId)
      .in('ad_id', adIds);

    if (error || !mappings) {
      console.error('[ConversionResolver] Error fetching product mappings:', error);
      return result;
    }

    const productsByAd = new Map<string, Set<string>>();
    for (const mapping of mappings) {
      if (!productsByAd.has(mapping.ad_id)) {
        productsByAd.set(mapping.ad_id, new Set());
      }
      productsByAd.get(mapping.ad_id)!.add(mapping.shopify_product_id);
    }

    for (const [adId, products] of productsByAd) {
      result.set(adId, products.size);
    }

    console.log('[ConversionResolver] Linked product counts:', result.size, 'ads have mappings');
  } catch (err) {
    console.error('[ConversionResolver] Error getting linked product counts:', err);
  }

  return result;
}

async function getPlatformPixelConversions(
  adIds: string[],
  startDate: string,
  endDate: string
): Promise<Map<string, ResolvedConversionData>> {
  const result = new Map<string, ResolvedConversionData>();

  try {
    const BATCH_SIZE = 100;

    for (let i = 0; i < adIds.length; i += BATCH_SIZE) {
      const batch = adIds.slice(i, i + BATCH_SIZE);

      const { data: metrics, error } = await supabase
        .from('ad_metrics')
        .select('entity_id, conversions, conversion_value')
        .eq('entity_type', 'ad')
        .in('entity_id', batch)
        .gte('date', startDate)
        .lte('date', endDate);

      if (error || !metrics) continue;

      for (const metric of metrics) {
        const adId = metric.entity_id;
        const existing = result.get(adId) || {
          conversions: 0,
          conversionValue: 0,
          conversionRate: 0,
          totalCogs: 0,
          source: 'platform_pixel' as ConversionSource,
          hasData: false,
        };

        existing.conversions += metric.conversions || 0;
        existing.conversionValue += metric.conversion_value || 0;
        existing.hasData = (metric.conversions || 0) > 0 || (metric.conversion_value || 0) > 0;

        result.set(adId, existing);
      }
    }
  } catch (err) {
    console.error('[ConversionResolver] Error fetching platform pixel data:', err);
  }

  return result;
}

export async function resolveConversionValues(
  userId: string,
  accountIds: string[],
  adIds: string[],
  startDate: string,
  endDate: string
): Promise<Map<string, ResolvedConversionData>> {
  console.log('[ConversionResolver] Resolving conversions for', adIds.length, 'ads');
  console.log('[ConversionResolver] Date range:', startDate, 'to', endDate);

  const [revoaData, utmData, platformData, linkedProductCounts] = await Promise.all([
    getRevoaPixelConversions(userId, adIds, startDate, endDate),
    getUtmAttributionConversions(userId, accountIds, startDate, endDate),
    getPlatformPixelConversions(adIds, startDate, endDate),
    getLinkedProductCounts(userId, adIds),
  ]);

  console.log('[ConversionResolver] Data sources found:');
  console.log('  - Revoa Pixel:', revoaData.size, 'ads');
  console.log('  - UTM Attribution:', utmData.size, 'ads');
  console.log('  - Platform Pixel:', platformData.size, 'ads');
  console.log('  - Linked Products:', linkedProductCounts.size, 'ads with mappings');

  const result = new Map<string, ResolvedConversionData>();

  for (const adId of adIds) {
    const linkedCount = linkedProductCounts.get(adId);

    const revoa = revoaData.get(adId);
    if (revoa && revoa.hasData) {
      result.set(adId, { ...revoa, linkedProductCount: linkedCount });
      continue;
    }

    const utm = utmData.get(adId);
    if (utm && utm.hasData) {
      result.set(adId, { ...utm, linkedProductCount: linkedCount });
      continue;
    }

    const platform = platformData.get(adId);
    if (platform && platform.hasData) {
      result.set(adId, { ...platform, linkedProductCount: linkedCount });
      continue;
    }

    result.set(adId, {
      conversions: 0,
      conversionValue: 0,
      conversionRate: 0,
      totalCogs: 0,
      source: 'none',
      hasData: false,
      linkedProductCount: linkedCount,
    });
  }

  const sourceBreakdown = {
    revoa_pixel: 0,
    utm_attribution: 0,
    platform_pixel: 0,
    none: 0,
  };

  for (const [, data] of result) {
    sourceBreakdown[data.source]++;
  }

  console.log('[ConversionResolver] Final source distribution:');
  console.log('  - Revoa Pixel (best):', sourceBreakdown.revoa_pixel);
  console.log('  - UTM Attribution:', sourceBreakdown.utm_attribution);
  console.log('  - Platform Pixel:', sourceBreakdown.platform_pixel);
  console.log('  - No data:', sourceBreakdown.none);

  return result;
}

export function getSourceLabel(source: ConversionSource): string {
  switch (source) {
    case 'revoa_pixel':
      return 'Revoa Pixel';
    case 'utm_attribution':
      return 'UTM Tracking';
    case 'platform_pixel':
      return 'Platform Pixel';
    default:
      return 'No Data';
  }
}

export function getSourceDescription(source: ConversionSource): string {
  switch (source) {
    case 'revoa_pixel':
      return 'First-party tracking via Revoa pixel - most accurate';
    case 'utm_attribution':
      return 'Attributed via UTM parameters or click IDs';
    case 'platform_pixel':
      return 'Reported by Facebook/Google/TikTok pixel';
    default:
      return 'No conversion data available';
  }
}
