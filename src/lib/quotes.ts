import { supabase } from './supabase';
import type { Quote, QuoteVariant } from '@/types/quotes';

// Create a new quote request
export const createQuoteRequest = async (data: {
  productUrl: string;
  productName: string;
  platform: 'aliexpress' | 'amazon' | 'other';
}): Promise<Quote> => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data: quote, error } = await supabase
    .from('product_quotes')
    .insert({
      user_id: user.id,
      product_url: data.productUrl,
      product_name: data.productName,
      platform: data.platform,
      status: 'quote_pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating quote:', error);
    throw error;
  }

  return mapDbQuoteToQuote(quote);
};

// Get all quotes for the current user
export const getUserQuotes = async (): Promise<Quote[]> => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data: quotes, error } = await supabase
    .from('product_quotes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching quotes:', error);
    throw error;
  }

  return quotes.map(mapDbQuoteToQuote);
};

// Get all quotes for admins
export const getAllQuotes = async (): Promise<Quote[]> => {
  const { data: quotes, error } = await supabase
    .from('product_quotes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all quotes:', error);
    throw error;
  }

  return quotes.map(mapDbQuoteToQuote);
};

export interface QuotePolicies {
  warrantyDays: number | null;
  coversLostItems: boolean;
  coversDamagedItems: boolean;
  coversLateDelivery: boolean;
  shopDomain?: string;
}

// Update quote with pricing
export const updateQuoteWithPricing = async (
  quoteId: string,
  variants: QuoteVariant[],
  expiresInDays: number = 7,
  policies?: QuotePolicies
): Promise<Quote> => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const updateData: any = {
    status: 'quoted',
    variants: variants,
    expires_at: expiresAt.toISOString(),
  };

  if (policies) {
    updateData.warranty_days = policies.warrantyDays;
    updateData.covers_lost_items = policies.coversLostItems;
    updateData.covers_damaged_items = policies.coversDamagedItems;
    updateData.covers_late_delivery = policies.coversLateDelivery;
    if (policies.shopDomain) {
      updateData.shop_domain = policies.shopDomain;
    }
  }

  const { data: quote, error } = await supabase
    .from('product_quotes')
    .update(updateData)
    .eq('id', quoteId)
    .select()
    .single();

  if (error) {
    console.error('Error updating quote:', error);
    throw error;
  }

  return mapDbQuoteToQuote(quote);
};

// Accept a quote
export const acceptQuote = async (quoteId: string): Promise<Quote> => {
  const { data: quote, error } = await supabase
    .from('product_quotes')
    .update({
      status: 'accepted',
    })
    .eq('id', quoteId)
    .select()
    .single();

  if (error) {
    console.error('Error accepting quote:', error);
    throw error;
  }

  return mapDbQuoteToQuote(quote);
};

// Reject a quote
export const rejectQuote = async (quoteId: string): Promise<Quote> => {
  const { data: quote, error } = await supabase
    .from('product_quotes')
    .update({
      status: 'rejected',
    })
    .eq('id', quoteId)
    .select()
    .single();

  if (error) {
    console.error('Error rejecting quote:', error);
    throw error;
  }

  return mapDbQuoteToQuote(quote);
};

// Update Shopify sync status
export const updateShopifySync = async (
  quoteId: string,
  shopifyProductId: string
): Promise<Quote> => {
  const { data: quote, error } = await supabase
    .from('product_quotes')
    .update({
      status: 'synced_with_shopify',
      shopify_product_id: shopifyProductId,
      shopify_status: 'synced',
    })
    .eq('id', quoteId)
    .select()
    .single();

  if (error) {
    console.error('Error updating Shopify sync:', error);
    throw error;
  }

  return mapDbQuoteToQuote(quote);
};

// Delete a quote
export const deleteQuote = async (quoteId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('product_quotes')
    .delete()
    .eq('id', quoteId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting quote:', error);
    throw error;
  }
};

// Helper function to map database quote to Quote type
function mapDbQuoteToQuote(dbQuote: any): Quote {
  const now = new Date();
  let expiresIn: number | undefined;

  if (dbQuote.expires_at) {
    const expiresAt = new Date(dbQuote.expires_at);
    const diffTime = expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    expiresIn = diffDays > 0 ? diffDays : undefined;

    // Auto-expire if past expiration date
    if (diffDays <= 0 && dbQuote.status === 'quoted') {
      supabase
        .from('product_quotes')
        .update({ status: 'expired' })
        .eq('id', dbQuote.id)
        .then(() => {});
    }
  }

  return {
    id: dbQuote.id,
    productUrl: dbQuote.product_url,
    platform: dbQuote.platform,
    productName: dbQuote.product_name,
    requestDate: new Date(dbQuote.created_at).toISOString().split('T')[0],
    status: dbQuote.status,
    variants: dbQuote.variants || undefined,
    expiresIn,
    shopifyConnected: !!dbQuote.shopify_product_id,
    shopifyProductId: dbQuote.shopify_product_id || undefined,
    shopifyStatus: dbQuote.shopify_status || undefined,
    shopDomain: dbQuote.shop_domain || undefined,
    warrantyDays: dbQuote.warranty_days !== null ? dbQuote.warranty_days : undefined,
    coversLostItems: dbQuote.covers_lost_items || false,
    coversDamagedItems: dbQuote.covers_damaged_items || false,
    coversLateDelivery: dbQuote.covers_late_delivery || false,
  };
}
