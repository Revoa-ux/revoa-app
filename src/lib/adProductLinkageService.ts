import { supabase } from './supabase';

interface ProductMapping {
  shopifyProductId: string;
  shopifyVariantId?: string;
  productName?: string;
  variantName?: string;
  unitCogs?: number;
  sellingPrice?: number;
  cogsSource: 'variant_mapping' | 'order_average' | 'manual';
  confidence: number;
}

interface AdWithUrl {
  id: string;
  destination_url: string | null;
  ad_account_id: string;
}

export class AdProductLinkageService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async linkAdsToProducts(): Promise<{ linked: number; failed: number }> {
    const { data: ads, error } = await supabase
      .from('ads')
      .select('id, destination_url, ad_account_id')
      .not('destination_url', 'is', null)
      .order('created_at', { ascending: false });

    if (error || !ads) {
      console.error('[AdProductLinkage] Failed to fetch ads:', error);
      return { linked: 0, failed: 0 };
    }

    let linked = 0;
    let failed = 0;

    for (const ad of ads) {
      try {
        const mappings = await this.extractProductsFromUrl(ad.destination_url!);
        if (mappings.length > 0) {
          await this.saveMappings(ad.id, ad.ad_account_id, mappings);
          linked++;
        }
      } catch (err) {
        console.error(`[AdProductLinkage] Failed to process ad ${ad.id}:`, err);
        failed++;
      }
    }

    return { linked, failed };
  }

  async extractProductsFromUrl(url: string): Promise<ProductMapping[]> {
    const mappings: ProductMapping[] = [];

    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname;
      const pathname = parsedUrl.pathname;

      if (!hostname.includes('myshopify.com') && !this.isKnownShopifyDomain(hostname)) {
        const shopifyDomain = await this.resolveShopifyDomain(hostname);
        if (!shopifyDomain) {
          return [];
        }
      }

      const productHandle = this.extractProductHandle(pathname);
      if (productHandle) {
        const productInfo = await this.lookupProductByHandle(productHandle);
        if (productInfo) {
          const cogs = await this.lookupCogs(productInfo.shopifyProductId, productInfo.shopifyVariantId);
          mappings.push({
            ...productInfo,
            unitCogs: cogs?.unitCogs,
            sellingPrice: cogs?.sellingPrice,
            cogsSource: cogs?.source || 'order_average',
            confidence: cogs ? 0.95 : 0.70,
          });
        }
      }

      const variantId = parsedUrl.searchParams.get('variant');
      if (variantId && mappings.length > 0) {
        mappings[0].shopifyVariantId = variantId;
        const variantCogs = await this.lookupCogs(mappings[0].shopifyProductId, variantId);
        if (variantCogs) {
          mappings[0].unitCogs = variantCogs.unitCogs;
          mappings[0].sellingPrice = variantCogs.sellingPrice;
          mappings[0].cogsSource = variantCogs.source;
          mappings[0].confidence = 0.98;
        }
      }

    } catch (err) {
      console.error('[AdProductLinkage] URL parsing error:', err);
    }

    return mappings;
  }

  private extractProductHandle(pathname: string): string | null {
    const productMatch = pathname.match(/\/products\/([^\/\?]+)/);
    if (productMatch) {
      return productMatch[1];
    }

    const collectionsProductMatch = pathname.match(/\/collections\/[^\/]+\/products\/([^\/\?]+)/);
    if (collectionsProductMatch) {
      return collectionsProductMatch[1];
    }

    return null;
  }

  private async isKnownShopifyDomain(hostname: string): Promise<boolean> {
    const { data } = await supabase
      .from('shopify_installations')
      .select('shop_domain')
      .eq('user_id', this.userId)
      .maybeSingle();

    if (data?.shop_domain) {
      return hostname.includes(data.shop_domain.replace('.myshopify.com', ''));
    }
    return false;
  }

  private async resolveShopifyDomain(hostname: string): Promise<string | null> {
    const { data } = await supabase
      .from('shopify_installations')
      .select('shop_domain')
      .eq('user_id', this.userId)
      .maybeSingle();

    return data?.shop_domain || null;
  }

  private async lookupProductByHandle(handle: string): Promise<{ shopifyProductId: string; shopifyVariantId?: string; productName?: string } | null> {
    const { data: lineItems } = await supabase
      .from('order_line_items')
      .select('product_name, shopify_product_id:product_id')
      .eq('user_id', this.userId)
      .ilike('product_name', `%${handle.replace(/-/g, ' ')}%`)
      .limit(1);

    if (lineItems && lineItems.length > 0) {
      return {
        shopifyProductId: lineItems[0].shopify_product_id || handle,
        productName: lineItems[0].product_name,
      };
    }

    const { data: mappings } = await supabase
      .from('shopify_variant_mappings')
      .select('shopify_product_id, quote_variant_sku')
      .eq('user_id', this.userId)
      .limit(1);

    if (mappings && mappings.length > 0) {
      return {
        shopifyProductId: mappings[0].shopify_product_id,
      };
    }

    return {
      shopifyProductId: handle,
      productName: handle.replace(/-/g, ' '),
    };
  }

  private async lookupCogs(
    shopifyProductId: string,
    shopifyVariantId?: string
  ): Promise<{ unitCogs: number; sellingPrice?: number; source: 'variant_mapping' | 'order_average' } | null> {
    if (shopifyVariantId) {
      const { data: variantMapping } = await supabase
        .from('shopify_variant_mappings')
        .select('quote_unit_cost, selling_price')
        .eq('user_id', this.userId)
        .eq('shopify_variant_id', shopifyVariantId)
        .maybeSingle();

      if (variantMapping?.quote_unit_cost) {
        return {
          unitCogs: variantMapping.quote_unit_cost,
          sellingPrice: variantMapping.selling_price,
          source: 'variant_mapping',
        };
      }
    }

    const { data: orderCogs } = await supabase
      .from('order_line_items')
      .select('unit_cost')
      .eq('user_id', this.userId)
      .not('unit_cost', 'is', null)
      .gt('unit_cost', 0)
      .limit(50);

    if (orderCogs && orderCogs.length > 0) {
      const avgCogs = orderCogs.reduce((sum, item) => sum + (item.unit_cost || 0), 0) / orderCogs.length;
      return {
        unitCogs: avgCogs,
        source: 'order_average',
      };
    }

    return null;
  }

  private async saveMappings(adId: string, adAccountId: string, mappings: ProductMapping[]): Promise<void> {
    const records = mappings.map(m => ({
      user_id: this.userId,
      ad_id: adId,
      ad_account_id: adAccountId,
      shopify_product_id: m.shopifyProductId,
      shopify_variant_id: m.shopifyVariantId || null,
      product_name: m.productName || null,
      variant_name: m.variantName || null,
      unit_cogs: m.unitCogs || null,
      selling_price: m.sellingPrice || null,
      cogs_source: m.cogsSource,
      mapping_method: 'url_parse',
      confidence_score: m.confidence,
    }));

    const { error } = await supabase
      .from('ad_product_mappings')
      .upsert(records, {
        onConflict: 'ad_id,shopify_product_id,shopify_variant_id',
        ignoreDuplicates: false,
      });

    if (error) {
      console.error('[AdProductLinkage] Failed to save mappings:', error);
      throw error;
    }
  }

  async getAdCogs(adId: string): Promise<{ totalCogs: number; products: ProductMapping[] } | null> {
    const { data: mappings, error } = await supabase
      .from('ad_product_mappings')
      .select('*')
      .eq('ad_id', adId)
      .eq('user_id', this.userId);

    if (error || !mappings || mappings.length === 0) {
      return null;
    }

    const products: ProductMapping[] = mappings.map(m => ({
      shopifyProductId: m.shopify_product_id,
      shopifyVariantId: m.shopify_variant_id,
      productName: m.product_name,
      variantName: m.variant_name,
      unitCogs: m.unit_cogs,
      sellingPrice: m.selling_price,
      cogsSource: m.cogs_source,
      confidence: m.confidence_score,
    }));

    const avgCogs = products.reduce((sum, p) => sum + (p.unitCogs || 0), 0) / products.length;

    return {
      totalCogs: avgCogs,
      products,
    };
  }

  async calculateAdProfit(
    adId: string,
    revenue: number,
    spend: number,
    conversions: number
  ): Promise<{ profit: number; profitMargin: number; profitRoas: number; cogsPerConversion: number } | null> {
    const cogsData = await this.getAdCogs(adId);
    if (!cogsData || !cogsData.totalCogs) {
      return null;
    }

    const totalCogs = cogsData.totalCogs * conversions;
    const profit = revenue - spend - totalCogs;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const profitRoas = spend > 0 ? profit / spend : 0;

    return {
      profit,
      profitMargin,
      profitRoas,
      cogsPerConversion: cogsData.totalCogs,
    };
  }
}

export const createAdProductLinkageService = (userId: string) => new AdProductLinkageService(userId);
