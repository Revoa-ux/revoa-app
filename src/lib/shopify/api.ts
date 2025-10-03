import { supabase } from '../supabase';
import { SHOPIFY_CONFIG } from '../config';

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

    // Use .maybeSingle() instead of .single() to avoid the error when no rows are returned
    const { data: installation, error } = await supabase
      .from('shopify_installations')
      .select('store_url, access_token, status')
      .eq('user_id', session.user.id)
      .eq('status', 'installed')
      .maybeSingle();

    if (error) {
      console.error('[Shopify API] Error fetching Shopify installation:', error);
      return null;
    }

    if (!installation) {
      console.warn('[Shopify API] No Shopify installation found for user. Please connect your Shopify store.');
      console.log('[Shopify API] Query was: user_id =', session.user.id, ', status = installed');

      // Debug: Let's see what's actually in the table
      const { data: allInstalls, error: debugError } = await supabase
        .from('shopify_installations')
        .select('user_id, store_url, status')
        .limit(10);

      if (!debugError && allInstalls) {
        console.log('[Shopify API] All installations in DB:', allInstalls);
      }

      return null;
    }

    console.log('[Shopify API] Found installation for store:', installation.store_url);

    return {
      accessToken: installation.access_token,
      shop: installation.store_url
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
export const getDashboardMetrics = async (): Promise<ShopifyMetrics> => {
  try {
    console.log('[Shopify API] Starting to fetch dashboard metrics...');

    // Check if we have a Shopify connection first
    const auth = await getShopifyAccessToken();
    if (!auth) {
      console.warn('[Shopify API] No Shopify connection found, returning default metrics');
      return getDefaultMetrics();
    }

    // Use count endpoints that DON'T require protected customer data access
    console.log('[Shopify API] Fetching order count...');
    const ordersCountResponse = await fetchFromShopify<{ count: number }>('/orders/count.json?status=any');
    const totalOrders = ordersCountResponse.count;
    console.log('[Shopify API] Total orders:', totalOrders);

    console.log('[Shopify API] Fetching product count...');
    const productsCountResponse = await fetchFromShopify<{ count: number }>('/products/count.json');
    const totalProducts = productsCountResponse.count;
    console.log('[Shopify API] Total products:', totalProducts);

    // Fetch products for inventory calculation
    console.log('[Shopify API] Fetching products for inventory...');
    const productsResponse = await fetchFromShopify<{ products: ShopifyProduct[] }>('/products.json?limit=250');
    const products = productsResponse.products;
    console.log('[Shopify API] Found', products.length, 'products');

    // Calculate inventory value
    const inventoryValue = products.reduce((sum, product) => {
      return sum + product.variants.reduce((variantSum, variant) => {
        return variantSum + (parseFloat(variant.price) * variant.inventory_quantity);
      }, 0);
    }, 0);

    // Estimated metrics based on order count (using industry averages)
    // Note: Customer count estimated from orders (typically 0.7-0.8 ratio)
    const totalCustomers = Math.round(totalOrders * 0.75); // Estimate customers as 75% of orders
    const averageOrderValue = 75; // Industry average
    const totalRevenue = totalOrders * averageOrderValue;
    const profitMargin = 30;
    const costOfGoodsSold = totalRevenue * (1 - profitMargin / 100);

    // Estimate 10% of customers ordered in last 30 days
    const activeCustomers = Math.round(totalCustomers * 0.1);

    // Estimate monthly revenue as total revenue / months in business (assume 12 months)
    const monthlyRecurringRevenue = totalRevenue / 12;
    const annualRecurringRevenue = totalRevenue;

    // New customers today (estimate 1% of total)
    const newCustomersToday = Math.round(totalCustomers * 0.01);

    // Shipping costs (estimate 10% of revenue)
    const shippingCosts = totalRevenue * 0.1;

    // Transaction fees (2.9% + $0.30 per transaction)
    const transactionFees = totalOrders * 0.30 + totalRevenue * 0.029;

    // Refunds (estimate 2% of orders)
    const refunds = totalRevenue * 0.02;

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
      chargebacks
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
    }
    return getDefaultMetrics();
  }
};

// Get default metrics when no Shopify connection is available
const getDefaultMetrics = (): ShopifyMetrics => {
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
    chargebacks: 0
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

    // Use count endpoint for orders in date range
    const ordersCountResponse = await fetchFromShopify<{ count: number }>(
      `/orders/count.json?status=any&created_at_min=${startDateStr}&created_at_max=${endDateStr}`
    );
    const numberOfOrders = ordersCountResponse.count;

    // Estimated metrics based on order count (using industry averages)
    const averageOrderValue = 75;
    const totalRevenue = numberOfOrders * averageOrderValue;
    const taxesCollected = totalRevenue * 0.08; // Estimate 8% tax
    const shippingRevenue = totalRevenue * 0.1; // Estimate 10% shipping

    // Cost of goods sold (30% margin)
    const grossMarginPercent = 30;
    const costOfGoodsSold = totalRevenue * (1 - grossMarginPercent / 100);

    // Transaction fees (2.9% + $0.30 per transaction)
    const transactionFees = numberOfOrders * 0.30 + totalRevenue * 0.029;

    // Refunds (estimate 2%)
    const refunds = totalRevenue * 0.02;
    const chargebacks = 0;

    // Average order value net refunds
    const netRevenue = totalRevenue - refunds;
    const averageOrderValueNetRefunds = numberOfOrders > 0 ? netRevenue / numberOfOrders : 0;

    // Customer lifetime value (simplified)
    const customerLifetimeValue = averageOrderValue * 2.5;

    // Purchase frequency
    const purchaseFrequency = 45;

    // Ad cost per order
    const adCostPerOrder = 15;

    // ROAS
    const adSpend = numberOfOrders * adCostPerOrder;
    const roasRefundsIncluded = adSpend > 0 ? netRevenue / adSpend : 0;

    // Break-even ROAS
    const breakEvenRoas = 1.5;

    // Customer acquisition cost
    const customerAcquisitionCost = adCostPerOrder * 1.2;

    // Average COGS
    const averageCogs = numberOfOrders > 0 ? costOfGoodsSold / numberOfOrders : 0;

    // Gross margin percent
    const calculatedGrossMarginPercent = totalRevenue > 0 ? ((totalRevenue - costOfGoodsSold) / totalRevenue) * 100 : 0;

    // Profit margin percent
    const totalCosts = costOfGoodsSold + transactionFees + adSpend;
    const calculatedProfitMarginPercent = totalRevenue > 0 ? ((totalRevenue - totalCosts) / totalRevenue) * 100 : 0;

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
      grossMarginPercent: calculatedGrossMarginPercent,
      profitMarginPercent: calculatedProfitMarginPercent
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
    profitMarginPercent: 0
  };
};

// Create a product in Shopify
export const createShopifyProduct = async (productData: {
  title: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  variants?: Array<{
    price: string;
    compare_at_price?: string;
    sku?: string;
    inventory_quantity?: number;
  }>;
  images?: Array<{
    src: string;
  }>;
}): Promise<ShopifyProduct> => {
  console.log('[Shopify API] Creating product:', productData.title);

  // Use the proxy endpoint to create the product
  const response = await fetchFromShopify<{ product: ShopifyProduct }>('/products.json', {
    method: 'POST',
    body: JSON.stringify({ product: productData }),
  });

  console.log('[Shopify API] Product created successfully:', response.product.id);
  return response.product;
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