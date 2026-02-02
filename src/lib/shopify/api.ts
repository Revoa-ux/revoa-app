import { supabase } from '../supabase';
import { SHOPIFY_CONFIG } from '../config';
import * as GraphQL from './graphql';
import { getActiveShopifyInstallation } from './status';

// Types for Shopify API responses
export interface ShopifyCustomer {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  orders_count: number;
  total_spent: string;
  created_at: string;
}

export interface ShopifyOrder {
  id: string;
  name: string;
  order_number: number;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  total_shipping_price: string;
  financial_status: string;
  fulfillment_status: string;
  created_at: string;
  line_items: Array<{
    id: string;
    title: string;
    price: string;
    quantity: number;
    sku: string;
    product_id: string;
    variant_id: string;
  }>;
  customer: {
    id: string;
    email: string;
  };
}

export interface ShopifyProduct {
  id: string;
  title: string;
  vendor: string;
  product_type: string;
  created_at: string;
  updated_at: string;
  published_at: string;
  variants: Array<{
    id: string;
    title: string;
    price: string;
    sku: string;
    inventory_quantity: number;
    inventory_management: string;
  }>;
  images: Array<{
    id: string;
    src: string;
  }>;
}

export interface ShopifyMetrics {
  totalCustomers: number;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  newCustomersToday: number;
  activeCustomers: number;
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  totalProducts: number;
  inventoryValue: number;
  profitMargin: number;
  costOfGoodsSold: number;
  shippingCosts: number;
  transactionFees: number;
  refunds: number;
  chargebacks: number;
  returnAmount: number;
  returnRate: number;
}

export interface ShopifyCalculatorMetrics {
  totalRevenue: number;
  numberOfOrders: number;
  taxesCollected: number;
  shippingRevenue: number;
  costOfGoodsSold: number;
  transactionFees: number;
  refunds: number;
  chargebacks: number;
  averageOrderValue: number;
  averageOrderValueNetRefunds: number;
  customerLifetimeValue: number;
  purchaseFrequency: number;
  adCostPerOrder: number;
  roasRefundsIncluded: number;
  breakEvenRoas: number;
  customerAcquisitionCost: number;
  averageCogs: number;
  grossMarginPercent: number;
  profitMarginPercent: number;
  returnAmount: number;
  returnRate: number;
  netRevenue: number;
}

// Get Shopify access token from Supabase
export const getShopifyAccessToken = async (): Promise<{ accessToken: string; shop: string } | null> => {
  try {
    console.log('[Shopify API] Getting session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('[Shopify API] Session error:', sessionError);
      return null;
    }

    if (!session?.user) {
      console.warn('[Shopify API] No authenticated user found');
      return null;
    }

    console.log('[Shopify API] Fetching installation for user:', session.user.id);
    console.log('[Shopify API] User email:', session.user.email);

    // Use unified helper to get active installation (includes uninstalled_at check)
    const installation = await getActiveShopifyInstallation(session.user.id);

    if (!installation) {
      console.warn('[Shopify API] No active Shopify installation found for user. Please connect your Shopify store.');
      console.log('[Shopify API] Query was: user_id =', session.user.id, ', status = installed, uninstalled_at IS NULL');
      return null;
    }

    // Fetch access token separately (security-sensitive field)
    const { data: installWithToken, error } = await supabase
      .from('shopify_installations')
      .select('access_token')
      .eq('id', installation.id)
      .single();

    if (error || !installWithToken) {
      console.error('[Shopify API] Error fetching access token:', error);
      return null;
    }

    const fullInstallation = {
      ...installation,
      access_token: installWithToken.access_token
    };

    console.log('[Shopify API] Found installation for store:', installation.store_url);

    return {
      accessToken: fullInstallation.access_token,
      shop: fullInstallation.store_url
    };
  } catch (error) {
    console.error('[Shopify API] Error getting Shopify access token:', error);
    return null;
  }
}

// Fetch data from Shopify Admin API via Edge Function proxy
export const fetchFromShopify = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  console.log('[Shopify API] Fetching via proxy:', endpoint, 'method:', options.method || 'GET');

  // Get current session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  // Build the edge function URL with endpoint as query param
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const url = `${supabaseUrl}/functions/v1/shopify-proxy?endpoint=${encodeURIComponent(endpoint)}`;

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Shopify API] Proxy error:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText
    });
    throw new Error(`Shopify API proxy error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  console.log('[Shopify API] Success:', endpoint, 'returned', Object.keys(data).length, 'keys');
  return data;
};

// Get dashboard metrics
export const getDashboardMetrics = async (startDate?: string, endDate?: string): Promise<ShopifyMetrics> => {
  try {
    console.log('[Shopify API] Starting to fetch dashboard metrics...');
    console.log('[Shopify API] Date range:', { startDate, endDate });

    // Check if we have a Shopify connection first
    const auth = await getShopifyAccessToken();
    if (!auth) {
      console.warn('[Shopify API] No Shopify connection found, returning default metrics');
      return getDefaultMetrics();
    }

    // Use GraphQL to get counts and product data
    console.log('[Shopify API] Fetching product count via GraphQL...');
    const totalProducts = await GraphQL.getProductsCount();
    console.log('[Shopify API] Total products:', totalProducts);

    // Fetch products for inventory calculation
    console.log('[Shopify API] Fetching products via GraphQL...');
    const products = await GraphQL.getProducts(250);
    console.log('[Shopify API] Found', products.length, 'products');

    // Fetch orders and filter client-side
    // Shopify's query syntax is unreliable, so we fetch recent orders and filter in JS
    console.log('[Shopify API] Fetching recent orders via GraphQL...');
    let allOrders = await GraphQL.getOrders(10000);
    console.log('[Shopify API] Fetched', allOrders.length, 'total orders');

    // Filter by date range if provided
    let orders;
    if (startDate && endDate) {
      const startTime = new Date(startDate).getTime();
      const endTime = new Date(endDate).getTime();
      console.log('[Shopify API] Filtering orders between:', startDate.split('T')[0], 'and', endDate.split('T')[0]);
      console.log('[Shopify API] Start timestamp:', startTime, 'End timestamp:', endTime);

      orders = allOrders.filter(order => {
        const orderTime = new Date(order.createdAt).getTime();
        const matches = orderTime >= startTime && orderTime <= endTime;
        if (!matches && allOrders.length < 5) {
          // Debug first few orders if filtering seems too strict
          console.log('[Shopify API] Order', order.name, 'created at', order.createdAt, '(', orderTime, ') - excluded');
        }
        return matches;
      });
      console.log('[Shopify API] Filtered to', orders.length, 'orders in date range');

      // If no orders in range, show sample of order dates
      if (orders.length === 0 && allOrders.length > 0) {
        console.warn('[Shopify API] WARNING: No orders in date range!');
        console.warn('[Shopify API] Sample of order dates:', allOrders.slice(0, 5).map(o => ({
          name: o.name,
          createdAt: o.createdAt,
          date: new Date(o.createdAt).toISOString().split('T')[0]
        })));
      }
    } else {
      console.log('[Shopify API] No date filter applied');
      orders = allOrders;
    }
    const totalOrders = orders.length;
    console.log('[Shopify API] Total orders fetched:', totalOrders);

    if (totalOrders >= 10000) {
      console.warn('[Shopify API] Hit 10,000 order limit. Store may have more orders than fetched.');
    }

    if (orders.length > 0) {
      console.log('[Shopify API] Sample order:', {
        id: orders[0].id,
        name: orders[0].name,
        totalPrice: orders[0].totalPriceSet.shopMoney.amount,
        createdAt: orders[0].createdAt
      });
    }

    // Calculate inventory value from GraphQL data
    const inventoryValue = products.reduce((sum, product) => {
      return sum + product.variants.edges.reduce((variantSum, variantEdge) => {
        const variant = variantEdge.node;
        return variantSum + (parseFloat(variant.price) * variant.inventoryQuantity);
      }, 0);
    }, 0);

    // Calculate real metrics from actual order data
    const totalRevenue = orders.reduce((sum, order) => {
      return sum + parseFloat(order.totalPriceSet.shopMoney.amount);
    }, 0);

    const totalTaxes = orders.reduce((sum, order) => {
      return sum + parseFloat(order.totalTaxSet.shopMoney.amount);
    }, 0);

    const totalShipping = orders.reduce((sum, order) => {
      return sum + parseFloat(order.totalShippingPriceSet.shopMoney.amount);
    }, 0);

    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Count unique customers
    const uniqueCustomers = new Set(
      orders.filter(o => o.customer?.id).map(o => o.customer!.id)
    );
    const totalCustomers = uniqueCustomers.size;

    // Calculate date ranges for customer activity
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Count active customers (ordered in last 30 days)
    const recentCustomers = new Set(
      orders
        .filter(o => o.customer?.id && new Date(o.createdAt) >= thirtyDaysAgo)
        .map(o => o.customer!.id)
    );
    const activeCustomers = recentCustomers.size;

    // Count new customers today
    const todaysCustomerIds = new Set(
      orders
        .filter(o => o.customer?.id && new Date(o.createdAt) >= today)
        .map(o => o.customer!.id)
    );
    const newCustomersToday = todaysCustomerIds.size;

    // Calculate revenue metrics
    const monthlyRecurringRevenue = totalRevenue / 12;
    const annualRecurringRevenue = totalRevenue;

    // Use actual shipping from orders
    const shippingCosts = totalShipping;

    // Transaction fees (2.9% + $0.30 per transaction for Shopify Payments)
    const transactionFees = totalOrders * 0.30 + totalRevenue * 0.029;

    const returnsSummary = await getReturnsSummary();
    const returnAmount = returnsSummary.totalReturnAmount;
    const returnRate = totalRevenue > 0 ? (returnAmount / totalRevenue) * 100 : 0;

    const { data: { user } } = await supabase.auth.getUser();
    let costOfGoodsSold = 0;
    if (user) {
      const { data: lineItems } = await supabase
        .from('order_line_items')
        .select(`
          unit_cost,
          quantity,
          shopify_orders!inner(user_id, ordered_at)
        `)
        .eq('shopify_orders.user_id', user.id)
        .gte('shopify_orders.ordered_at', startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .lte('shopify_orders.ordered_at', endDate || new Date().toISOString());

      if (lineItems) {
        costOfGoodsSold = lineItems.reduce((sum: number, item: any) => {
          const cost = (parseFloat(item.unit_cost) || 0) * (parseInt(item.quantity) || 1);
          return sum + cost;
        }, 0);
      }
    }

    const profitMargin = totalRevenue > 0 ? ((totalRevenue - costOfGoodsSold) / totalRevenue) * 100 : 0;
    const refunds = 0;
    const chargebacks = 0;

    const metrics = {
      totalCustomers,
      totalOrders,
      totalRevenue,
      averageOrderValue,
      newCustomersToday,
      activeCustomers,
      monthlyRecurringRevenue,
      annualRecurringRevenue,
      totalProducts,
      inventoryValue,
      profitMargin,
      costOfGoodsSold,
      shippingCosts,
      transactionFees,
      refunds,
      chargebacks,
      returnAmount,
      returnRate
    };

    console.log('[Shopify API] Metrics calculated:', {
      totalCustomers,
      totalOrders,
      totalProducts,
      estimatedRevenue: totalRevenue.toFixed(2),
      inventoryValue: inventoryValue.toFixed(2)
    });

    return metrics;
  } catch (error) {
    console.error('[Shopify API] Error fetching Shopify metrics:', error);
    if (error instanceof Error) {
      console.error('[Shopify API] Error details:', error.message, error.stack);

      // Show user-friendly error
      if (error.message.includes('No Shopify store connected')) {
        console.warn('[Shopify API] User needs to connect their Shopify store');
      } else if (error.message.includes('404')) {
        console.warn('[Shopify API] Shopify installation not found');
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        console.warn('[Shopify API] Authentication failed - may need to reconnect store');
      } else {
        console.error('[Shopify API] Unexpected error:', error.message);
      }
    }
    return getDefaultMetrics();
  }
};

// Get default metrics when no Shopify connection is available
export const getDefaultMetrics = (): ShopifyMetrics => {
  return {
    totalCustomers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    newCustomersToday: 0,
    activeCustomers: 0,
    monthlyRecurringRevenue: 0,
    annualRecurringRevenue: 0,
    totalProducts: 0,
    inventoryValue: 0,
    profitMargin: 0,
    costOfGoodsSold: 0,
    shippingCosts: 0,
    transactionFees: 0,
    refunds: 0,
    chargebacks: 0,
    returnAmount: 0,
    returnRate: 0
  };
};

// Get calculator metrics
export const getCalculatorMetrics = async (timeframe: string): Promise<ShopifyCalculatorMetrics> => {
  try {
    // Check if we have a Shopify connection first
    const auth = await getShopifyAccessToken();
    if (!auth) {
      return getDefaultCalculatorMetrics();
    }

    // Determine date range based on timeframe
    const endDate = new Date();
    const startDate = new Date();

    switch (timeframe) {
      case '1d':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case 'custom':
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();

    // Use GraphQL to fetch orders in date range
    // Shopify query format: created_at:>='2024-01-01' AND created_at:<='2024-12-31'
    const query = `created_at:>='${startDateStr}' AND created_at:<='${endDateStr}'`;
    console.log('[Calculator] Fetching orders with query:', query);
    console.log('[Calculator] Date range:', { start: startDateStr, end: endDateStr, timeframe });

    let orders;
    try {
      // Fetch up to 10,000 orders for the date range
      orders = await GraphQL.getOrders(10000, query);
    } catch (error) {
      console.error('[Calculator] Error with date query, trying without filter:', error);
      // If date query fails, try getting all orders (up to 10,000)
      orders = await GraphQL.getOrders(10000);
    }

    if (orders.length >= 10000) {
      console.warn('[Calculator] Hit 10,000 order limit. May be missing some orders from this period.');
    }

    const numberOfOrders = orders.length;
    console.log('[Calculator] Found', numberOfOrders, 'orders in timeframe:', timeframe);

    if (orders.length > 0) {
      console.log('[Calculator] Sample order:', {
        id: orders[0].id,
        name: orders[0].name,
        totalPrice: orders[0].totalPriceSet.shopMoney.amount,
        createdAt: orders[0].createdAt
      });
    }

    // Calculate real metrics from actual order data
    const totalRevenue = orders.reduce((sum, order) => {
      return sum + parseFloat(order.totalPriceSet.shopMoney.amount);
    }, 0);

    const taxesCollected = orders.reduce((sum, order) => {
      return sum + parseFloat(order.totalTaxSet.shopMoney.amount);
    }, 0);

    const shippingRevenue = orders.reduce((sum, order) => {
      return sum + parseFloat(order.totalShippingPriceSet.shopMoney.amount);
    }, 0);

    const averageOrderValue = numberOfOrders > 0 ? totalRevenue / numberOfOrders : 0;

    // Transaction fees (2.9% + $0.30 per transaction for Shopify Payments)
    const transactionFees = numberOfOrders * 0.30 + totalRevenue * 0.029;

    const returnsSummary = await getReturnsSummary();
    const returnAmount = returnsSummary.totalReturnAmount;
    const returnRate = totalRevenue > 0 ? (returnAmount / totalRevenue) * 100 : 0;
    const netRevenue = totalRevenue - returnAmount;

    // Set to 0 as we don't have this data from Shopify API
    const costOfGoodsSold = 0;
    const refunds = 0;
    const chargebacks = 0;
    const customerLifetimeValue = 0;
    const purchaseFrequency = 0;
    const adCostPerOrder = 0;
    const roasRefundsIncluded = 0;
    const breakEvenRoas = 0;
    const customerAcquisitionCost = 0;
    const averageCogs = 0;
    const grossMarginPercent = 0;
    const profitMarginPercent = 0;

    // Average order value net refunds
    const averageOrderValueNetRefunds = numberOfOrders > 0 ? netRevenue / numberOfOrders : 0;

    return {
      totalRevenue,
      numberOfOrders,
      taxesCollected,
      shippingRevenue,
      costOfGoodsSold,
      transactionFees,
      refunds,
      chargebacks,
      averageOrderValue,
      averageOrderValueNetRefunds,
      customerLifetimeValue,
      purchaseFrequency,
      adCostPerOrder,
      roasRefundsIncluded,
      breakEvenRoas,
      customerAcquisitionCost,
      averageCogs,
      grossMarginPercent,
      profitMarginPercent,
      returnAmount,
      returnRate,
      netRevenue
    };
  } catch (error) {
    console.error('Error fetching Shopify calculator metrics:', error);
    return getDefaultCalculatorMetrics();
  }
};

// Get default calculator metrics when no Shopify connection is available
const getDefaultCalculatorMetrics = (): ShopifyCalculatorMetrics => {
  return {
    totalRevenue: 0,
    numberOfOrders: 0,
    taxesCollected: 0,
    shippingRevenue: 0,
    costOfGoodsSold: 0,
    transactionFees: 0,
    refunds: 0,
    chargebacks: 0,
    averageOrderValue: 0,
    averageOrderValueNetRefunds: 0,
    customerLifetimeValue: 0,
    purchaseFrequency: 0,
    adCostPerOrder: 0,
    roasRefundsIncluded: 0,
    breakEvenRoas: 0,
    customerAcquisitionCost: 0,
    averageCogs: 0,
    grossMarginPercent: 0,
    profitMarginPercent: 0,
    returnAmount: 0,
    returnRate: 0,
    netRevenue: 0
  };
};

// Create a product in Shopify using GraphQL
// Helper function to convert GraphQL Product to REST format
const convertToRestProduct = (product: GraphQL.Product): ShopifyProduct => {
  return {
    id: product.id.replace('gid://shopify/Product/', ''),
    title: product.title,
    vendor: product.vendor || '',
    product_type: product.productType || '',
    created_at: product.createdAt || new Date().toISOString(),
    updated_at: product.updatedAt || new Date().toISOString(),
    published_at: product.publishedAt || new Date().toISOString(),
    variants: product.variants?.edges?.map(edge => ({
      id: edge.node.id.replace('gid://shopify/ProductVariant/', ''),
      title: edge.node.title || '',
      price: edge.node.price || '0.00',
      sku: edge.node.sku || '',
      inventory_quantity: edge.node.inventoryQuantity || 0,
      inventory_management: edge.node.inventoryManagement || '',
    })) || [],
    images: product.images?.edges?.map(edge => ({
      id: edge.node.id.replace('gid://shopify/ProductImage/', ''),
      src: edge.node.url,
    })) || [],
  };
};

export const createShopifyProduct = async (productData: {
  title: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  options?: Array<{
    name: string;
    values: string[];
  }>;
  variants?: Array<{
    price: string;
    compare_at_price?: string;
    sku?: string;
    inventory_quantity?: number;
    option1?: string;
    option2?: string;
    option3?: string;
  }>;
  images?: Array<{
    src: string;
  }>;
}): Promise<ShopifyProduct> => {
  // Convert REST-style input to GraphQL format
  const input: any = {
    title: productData.title,
    descriptionHtml: productData.body_html,
    vendor: productData.vendor,
    productType: productData.product_type,
    status: 'ACTIVE',
  };

  // Add product options if provided (for creating variants with options)
  // Note: When productOptions are provided, Shopify auto-creates variants
  // We'll update them with pricing after creation
  if (productData.options && productData.options.length > 0) {
    input.productOptions = productData.options.map(opt => ({
      name: opt.name,
      values: opt.values.map(val => ({ name: val }))
    }));
  }

  // Important: ProductInput doesn't support the variants field
  // Variants will be auto-created by Shopify based on productOptions
  const product = await GraphQL.createProduct(input);

  if (!product) {
    throw new Error('Product creation returned no data');
  }

  // If we have variants data and the product was created, update the variants with pricing
  if (productData.variants && productData.variants.length > 0 && product.id) {
    try {
      // Get all auto-created variants
      const allVariants = product.variants?.edges || [];

      // Update each variant with the corresponding pricing from our data
      for (let i = 0; i < Math.min(productData.variants.length, allVariants.length); i++) {
        const variantData = productData.variants[i];
        const shopifyVariant = allVariants[i].node;

        // Update this variant with pricing and SKU
        await GraphQL.updateProductVariant(shopifyVariant.id, {
          price: variantData.price,
          sku: variantData.sku,
          inventoryQuantity: variantData.inventory_quantity
        });
      }

      // Refetch the product to get updated variant data
      const updatedProducts = await GraphQL.getProducts(1);
      const updatedProduct = updatedProducts.find(p => p.id === product.id);
      if (updatedProduct) {
        return convertToRestProduct(updatedProduct);
      }
    } catch (variantError) {
      console.error('[Shopify] Error updating variants:', variantError);
      // Continue anyway, product was created
    }
  }

  // Convert GraphQL response to REST format for backward compatibility
  return convertToRestProduct(product);
};

// Debug utility to check Shopify connection status
export const checkShopifyConnection = async (): Promise<{
  isConnected: boolean;
  storeUrl?: string;
  hasAccessToken?: boolean;
  error?: string;
}> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return {
        isConnected: false,
        error: 'No authenticated user'
      };
    }

    const { data: installation, error } = await supabase
      .from('shopify_installations')
      .select('store_url, access_token, status, installed_at')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error) {
      return {
        isConnected: false,
        error: error.message
      };
    }

    if (!installation) {
      return {
        isConnected: false,
        error: 'No Shopify installation found'
      };
    }

    return {
      isConnected: installation.status === 'installed',
      storeUrl: installation.store_url,
      hasAccessToken: !!installation.access_token,
    };
  } catch (error) {
    return {
      isConnected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Sync returns from Shopify to Supabase
export const syncReturns = async (): Promise<{
  synced: number;
  error?: string;
}> => {
  try {
    console.log('[Shopify API] Starting returns sync...');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { synced: 0, error: 'Not authenticated' };
    }

    const auth = await getShopifyAccessToken();
    if (!auth) {
      return { synced: 0, error: 'No Shopify connection' };
    }

    const returns = await GraphQL.getReturns(1000);
    console.log('[Shopify API] Fetched', returns.length, 'returns from Shopify');

    let syncedCount = 0;

    for (const returnData of returns) {
      for (const refundEdge of returnData.refunds.edges) {
        const refund = refundEdge.node;
        const returnAmount = parseFloat(refund.totalRefundedSet.shopMoney.amount);

        const refundLineItems = refund.refundLineItems.edges.map(edge => ({
          quantity: edge.node.quantity,
          title: edge.node.lineItem.title,
          sku: edge.node.lineItem.sku,
          amount: edge.node.priceSet.shopMoney.amount,
        }));

        const { error } = await supabase
          .from('shopify_returns')
          .upsert({
            user_id: session.user.id,
            shopify_order_id: returnData.order.id,
            shopify_return_id: returnData.id + '-' + refund.id,
            return_amount: returnAmount,
            returned_at: refund.createdAt,
            refund_line_items: refundLineItems,
          }, {
            onConflict: 'shopify_return_id',
          });

        if (!error) {
          syncedCount++;
        } else {
          console.error('[Shopify API] Error syncing return:', error);
        }
      }
    }

    console.log('[Shopify API] Successfully synced', syncedCount, 'returns');
    return { synced: syncedCount };
  } catch (error) {
    console.error('[Shopify API] Error syncing returns:', error);
    return {
      synced: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Get returns summary from Supabase
export const getReturnsSummary = async (): Promise<{
  totalReturns: number;
  totalReturnAmount: number;
}> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { totalReturns: 0, totalReturnAmount: 0 };
    }

    const { data: returns, error } = await supabase
      .from('shopify_returns')
      .select('return_amount')
      .eq('user_id', session.user.id);

    if (error) {
      console.error('[Shopify API] Error fetching returns summary:', error);
      return { totalReturns: 0, totalReturnAmount: 0 };
    }

    const totalReturns = returns?.length || 0;
    const totalReturnAmount = returns?.reduce((sum, r) => sum + parseFloat(r.return_amount.toString()), 0) || 0;

    return { totalReturns, totalReturnAmount };
  } catch (error) {
    console.error('[Shopify API] Error getting returns summary:', error);
    return { totalReturns: 0, totalReturnAmount: 0 };
  }
};