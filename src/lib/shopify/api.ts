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
  console.log('[Shopify API] Fetching via proxy:', endpoint);

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
      // Return default metrics if no Shopify connection
      return getDefaultMetrics();
    }

    // Fetch orders - We can get most data from orders without needing read_customers scope
    console.log('[Shopify API] Fetching orders...');
    const ordersResponse = await fetchFromShopify<{ orders: ShopifyOrder[] }>('/orders.json?status=any&limit=250');
    console.log('[Shopify API] Found', ordersResponse.orders.length, 'orders');

    // Fetch products
    console.log('[Shopify API] Fetching products...');
    const productsResponse = await fetchFromShopify<{ products: ShopifyProduct[] }>('/products.json?limit=250');
    console.log('[Shopify API] Found', productsResponse.products.length, 'products');

    // Calculate metrics from orders
    const orders = ordersResponse.orders;
    const products = productsResponse.products;

    // Get unique customers from orders (doesn't require read_customers scope)
    const uniqueCustomerEmails = new Set(
      orders.map(order => order.customer?.email).filter(Boolean)
    );
    const totalCustomers = uniqueCustomerEmails.size;

    // Total orders
    const totalOrders = orders.length;

    // Total revenue
    const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total_price), 0);

    // Average order value
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // New customers today (first-time buyers today)
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(order => order.created_at.startsWith(today));
    const newCustomersToday = new Set(
      todayOrders.map(order => order.customer?.email).filter(Boolean)
    ).size;

    // Active customers (ordered in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

    const activeCustomers = new Set(
      orders
        .filter(order => new Date(order.created_at) >= new Date(thirtyDaysAgoStr))
        .map(order => order.customer?.email)
        .filter(Boolean)
    ).size;

    // Monthly recurring revenue (simplified calculation)
    const lastThirtyDaysOrders = orders.filter(order =>
      new Date(order.created_at) >= new Date(thirtyDaysAgoStr)
    );
    const monthlyRecurringRevenue = lastThirtyDaysOrders.reduce((sum, order) =>
      sum + parseFloat(order.total_price), 0
    );

    // Annual recurring revenue (simplified)
    const annualRecurringRevenue = monthlyRecurringRevenue * 12;

    // Total products
    const totalProducts = products.length;

    // Inventory value (simplified)
    const inventoryValue = products.reduce((sum, product) => {
      return sum + product.variants.reduce((variantSum, variant) => {
        return variantSum + (parseFloat(variant.price) * variant.inventory_quantity);
      }, 0);
    }, 0);

    // Profit margin (simplified - assuming 30% margin)
    const profitMargin = 30;

    // Cost of goods sold (simplified)
    const costOfGoodsSold = totalRevenue * (1 - profitMargin / 100);

    // Shipping costs (simplified)
    const shippingCosts = orders.reduce((sum, order) =>
      sum + parseFloat(order.total_shipping_price || '0'), 0
    );

    // Transaction fees (simplified - assuming 2.9% + $0.30 per transaction)
    const transactionFees = orders.reduce((sum, order) =>
      sum + (parseFloat(order.total_price) * 0.029 + 0.30), 0
    );

    // Refunds (simplified)
    const refunds = orders
      .filter(order => order.financial_status === 'refunded')
      .reduce((sum, order) => sum + parseFloat(order.total_price), 0);

    // Chargebacks (simplified)
    const chargebacks = 0; // This data is not directly available from the API

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
      totalRevenue: totalRevenue.toFixed(2),
      averageOrderValue: averageOrderValue.toFixed(2)
    });

    return metrics;
  } catch (error) {
    console.error('[Shopify API] Error fetching Shopify metrics:', error);
    if (error instanceof Error) {
      console.error('[Shopify API] Error details:', error.message, error.stack);
    }
    // Return default metrics on error
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
      // Return default metrics if no Shopify connection
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
        // Custom timeframe would be handled separately
        break;
      default:
        startDate.setDate(startDate.getDate() - 7); // Default to 7 days
    }
    
    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();
    
    // Fetch orders within the date range
    const ordersResponse = await fetchFromShopify<{ orders: ShopifyOrder[] }>(
      `/orders.json?status=any&created_at_min=${startDateStr}&created_at_max=${endDateStr}&limit=250`
    );
    
    const orders = ordersResponse.orders;
    
    // Calculate metrics
    const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total_price), 0);
    const numberOfOrders = orders.length;
    const taxesCollected = orders.reduce((sum, order) => sum + parseFloat(order.total_tax), 0);
    const shippingRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total_shipping_price || '0'), 0);
    
    // Cost of goods sold (simplified - assuming 30% margin)
    const grossMarginPercent = 30;
    const costOfGoodsSold = totalRevenue * (1 - grossMarginPercent / 100);
    
    // Transaction fees (simplified - assuming 2.9% + $0.30 per transaction)
    const transactionFees = orders.reduce((sum, order) => 
      sum + (parseFloat(order.total_price) * 0.029 + 0.30), 0
    );
    
    // Refunds
    const refunds = orders
      .filter(order => order.financial_status === 'refunded')
      .reduce((sum, order) => sum + parseFloat(order.total_price), 0);
    
    // Chargebacks (simplified)
    const chargebacks = 0;
    
    // Average order value
    const averageOrderValue = numberOfOrders > 0 ? totalRevenue / numberOfOrders : 0;
    
    // Average order value net refunds
    const netRevenue = totalRevenue - refunds;
    const averageOrderValueNetRefunds = numberOfOrders > 0 ? netRevenue / numberOfOrders : 0;
    
    // Customer lifetime value (simplified)
    const customerLifetimeValue = averageOrderValue * 2.5; // Assuming average customer makes 2.5 purchases
    
    // Purchase frequency (simplified)
    const purchaseFrequency = 45; // Average days between purchases
    
    // Ad cost per order (simplified)
    const adCostPerOrder = 15; // Assuming $15 per order
    
    // ROAS (Return on Ad Spend)
    const adSpend = numberOfOrders * adCostPerOrder;
    const roasRefundsIncluded = adSpend > 0 ? netRevenue / adSpend : 0;
    
    // Break-even ROAS
    const breakEvenRoas = 1.5; // Simplified
    
    // Customer acquisition cost
    const customerAcquisitionCost = adCostPerOrder * 1.2; // Simplified
    
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
    // Return default metrics on error
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