import { supabase } from './supabase';

export interface ShippingRate {
  id: string;
  product_id?: string;
  variant_id?: string;
  sku: string;
  country_code: string;
  shipping_cost: number;
  currency: string;
  created_by_admin_id: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateShippingRateParams {
  productId?: string;
  variantId?: string;
  sku: string;
  countryCode: string;
  shippingCost: number;
  notes?: string;
}

export async function createShippingRate(
  params: CreateShippingRateParams
): Promise<ShippingRate> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('shipping_rates_by_country')
    .insert({
      product_id: params.productId,
      variant_id: params.variantId,
      sku: params.sku,
      country_code: params.countryCode.toUpperCase(),
      shipping_cost: params.shippingCost,
      currency: 'USD',
      created_by_admin_id: user.id,
      notes: params.notes,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateShippingRate(
  id: string,
  updates: {
    shippingCost?: number;
    notes?: string;
  }
): Promise<ShippingRate> {
  const { data, error } = await supabase
    .from('shipping_rates_by_country')
    .update({
      shipping_cost: updates.shippingCost,
      notes: updates.notes,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteShippingRate(id: string): Promise<void> {
  const { error } = await supabase.from('shipping_rates_by_country').delete().eq('id', id);

  if (error) {
    throw error;
  }
}

export async function getAllShippingRates(): Promise<ShippingRate[]> {
  const { data, error } = await supabase
    .from('shipping_rates_by_country')
    .select('*')
    .order('sku', { ascending: true })
    .order('country_code', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getShippingRatesBySku(sku: string): Promise<ShippingRate[]> {
  const { data, error } = await supabase
    .from('shipping_rates_by_country')
    .select('*')
    .eq('sku', sku)
    .order('country_code', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getShippingCostForOrder(
  variantId: string,
  countryCode: string
): Promise<number> {
  const { data, error } = await supabase
    .from('shipping_rates_by_country')
    .select('shipping_cost')
    .eq('variant_id', variantId)
    .eq('country_code', countryCode.toUpperCase())
    .single();

  if (error || !data) {
    // Return default $5 if not found
    return 5.0;
  }

  return data.shipping_cost;
}

export interface BulkShippingRateImport {
  sku: string;
  country_code: string;
  shipping_cost: number;
  notes?: string;
}

export async function bulkImportShippingRates(
  rates: BulkShippingRateImport[]
): Promise<{ success: number; errors: string[] }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const errors: string[] = [];
  let success = 0;

  for (const rate of rates) {
    try {
      // Find variant by SKU
      const { data: variant } = await supabase
        .from('product_variants')
        .select('id, product_id')
        .eq('sku', rate.sku)
        .single();

      if (!variant) {
        errors.push(`SKU not found: ${rate.sku}`);
        continue;
      }

      // Upsert shipping rate
      const { error } = await supabase
        .from('shipping_rates_by_country')
        .upsert(
          {
            product_id: variant.product_id,
            variant_id: variant.id,
            sku: rate.sku,
            country_code: rate.country_code.toUpperCase(),
            shipping_cost: rate.shipping_cost,
            currency: 'USD',
            created_by_admin_id: user.id,
            notes: rate.notes,
          },
          {
            onConflict: 'variant_id,country_code',
          }
        );

      if (error) {
        errors.push(`Error for ${rate.sku} (${rate.country_code}): ${error.message}`);
      } else {
        success++;
      }
    } catch (err: any) {
      errors.push(`Error processing ${rate.sku}: ${err.message}`);
    }
  }

  return { success, errors };
}

// Common country codes for quick access
export const COMMON_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'MX', name: 'Mexico' },
  { code: 'BR', name: 'Brazil' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'IN', name: 'India' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'BE', name: 'Belgium' },
  { code: 'CH', name: 'Switzerland' },
];
