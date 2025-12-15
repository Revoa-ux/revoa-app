import { supabase } from './supabase';
import type { Quote, QuoteVariant } from '@/types/quotes';
import { createNotification } from './notificationService';

// Helper function to get all super admin user IDs
const getSuperAdminIds = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('is_super_admin', true);

  if (error) {
    console.error('Error fetching super admin IDs:', error);
    return [];
  }

  return data?.map(admin => admin.id) || [];
};

export type QuoteSource = 'onboarding' | 'dashboard' | 'landing_page';
export type QuotePlatform = 'aliexpress' | 'amazon' | '1688' | 'alibaba' | 'other';

export interface CreateQuoteOptions {
  productUrl: string;
  productName: string;
  platform: QuotePlatform;
  source?: QuoteSource;
  sourceShopifyProductId?: string;
  batchId?: string;
}

// Create a new quote request
export const createQuoteRequest = async (data: CreateQuoteOptions): Promise<Quote> => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const insertData: Record<string, unknown> = {
    user_id: user.id,
    product_url: data.productUrl,
    product_name: data.productName,
    platform: data.platform,
    status: 'quote_pending',
  };

  if (data.source) {
    insertData.source = data.source;
  }
  if (data.sourceShopifyProductId) {
    insertData.source_shopify_product_id = data.sourceShopifyProductId;
  }
  if (data.batchId) {
    insertData.batch_id = data.batchId;
  }

  const { data: quote, error } = await supabase
    .from('product_quotes')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating quote:', error);
    throw error;
  }

  return mapDbQuoteToQuote(quote);
};

export interface ShopifyProductForQuote {
  id: string;
  title: string;
  handle?: string;
  featuredImage?: { url: string };
  variants?: {
    edges: Array<{
      node: {
        price: string;
      };
    }>;
  };
}

// Create bulk quote requests for multiple Shopify products
export const createBulkQuoteRequests = async (
  products: ShopifyProductForQuote[],
  shopDomain: string,
  source: QuoteSource = 'onboarding'
): Promise<{ created: number; failed: number; batchId: string }> => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const batchId = crypto.randomUUID();
  let created = 0;
  let failed = 0;

  const quoteInserts = products.map((product) => {
    const productUrl = product.handle
      ? `https://${shopDomain}/products/${product.handle}`
      : `https://${shopDomain}/admin/products/${product.id.split('/').pop()}`;

    return {
      user_id: user.id,
      product_url: productUrl,
      product_name: product.title,
      platform: 'other' as const,
      status: 'quote_pending',
      source,
      source_shopify_product_id: product.id,
      batch_id: batchId,
    };
  });

  const { data: quotes, error } = await supabase
    .from('product_quotes')
    .insert(quoteInserts)
    .select();

  if (error) {
    console.error('Error creating bulk quotes:', error);
    throw error;
  }

  created = quotes?.length || 0;
  failed = products.length - created;

  if (created > 0) {
    try {
      const adminIds = await getSuperAdminIds();
      const notificationPromises = adminIds.map(adminId =>
        createNotification({
          userId: adminId,
          type: 'new_quote_batch',
          actionType: 'general',
          title: 'New Quote Batch Received',
          message: `${created} product${created > 1 ? 's' : ''} submitted for quoting from ${source}`,
          actionRequired: true,
          linkTo: '/admin/quotes',
          referenceId: batchId,
        })
      );
      await Promise.all(notificationPromises);
    } catch (notifError) {
      console.error('Error creating batch notification:', notifError);
    }
  }

  return { created, failed, batchId };
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
    .neq('status', 'cancelled')  // Exclude cancelled quotes
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

  // Notify all super admins about the accepted quote
  try {
    const adminIds = await getSuperAdminIds();
    const notificationPromises = adminIds.map(adminId =>
      createNotification({
        userId: adminId,
        type: 'quote_accepted',
        actionType: 'general',
        title: 'Quote Accepted',
        message: `A user has accepted a quote for "${quote.product_name || 'a product'}"`,
        actionRequired: false,
        linkTo: '/admin/quotes',
        referenceId: quoteId,
      })
    );
    await Promise.all(notificationPromises);
  } catch (notifError) {
    console.error('Error creating accept notifications:', notifError);
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

// Delete a quote (soft delete - sets status to cancelled)
export const deleteQuote = async (quoteId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get the quote details first for the notification
  const { data: quoteData } = await supabase
    .from('product_quotes')
    .select('product_name, status')
    .eq('id', quoteId)
    .single();

  const { error } = await supabase
    .from('product_quotes')
    .update({ status: 'cancelled' })
    .eq('id', quoteId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error cancelling quote:', error);
    throw error;
  }

  // Notify all super admins about the cancelled/declined quote
  try {
    const adminIds = await getSuperAdminIds();
    const wasQuoted = quoteData?.status === 'quoted' || quoteData?.status === 'pending_reacceptance';
    const actionText = wasQuoted ? 'declined' : 'cancelled';

    const notificationPromises = adminIds.map(adminId =>
      createNotification({
        userId: adminId,
        type: `quote_${actionText}`,
        actionType: 'general',
        title: `Quote ${wasQuoted ? 'Declined' : 'Cancelled'}`,
        message: `A user has ${actionText} a quote for "${quoteData?.product_name || 'a product'}"`,
        actionRequired: false,
        linkTo: '/admin/quotes',
        referenceId: quoteId,
      })
    );
    await Promise.all(notificationPromises);
  } catch (notifError) {
    console.error('Error creating cancel/decline notifications:', notifError);
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
