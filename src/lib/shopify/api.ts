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
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      console.error('No authenticated user found');
      return null;
    }

    // Use .maybeSingle() instead of .single() to avoid the error when no rows are returned
    const { data: installation, error } = await supabase
      .from('shopify_installations')
      .select('store_url, access_token')
      .eq('user_id', session.user.id)
      .eq('status', 'installed')
      .maybeSingle();

    if (error) {
      console.error('Error fetching Shopify installation:', error);
      return null;
    }

    if (!installation) {
      console.log('No Shopify installation found for user');
      return null;
    }

    return {
      accessToken: installation.access_token,
      shop: installation.store_url
    };
  } catch (error) {
    console.error('Error getting Shopify access token:', error);
    return null;
  }
}

// Fetch data from Shopify Admin API
export const fetchFromShopify = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const auth = await getShopifyAccessToken();
  
  if (!auth) {
    throw new Error('No Shopify access token available');
  }

  const { accessToken, shop } = auth;
  
  const url = `https://${shop}/admin/api/${SHOPIFY_CONFIG.API_VERSION}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Shopify API error (${response.status}): ${errorText}`);
  }

  return response.json();
};

// Get dashboard metrics
export const getDashboardMetrics = async (): Promise<ShopifyMetrics> => {
  try {
    // Check if we have a Shopify connection first
    const auth = await getShopifyAccessToken();
    if (!auth) {
      // Return default metrics if no Shopify connection
      return getDefaultMetrics();
    }
    
    // Fetch customers
    const customersResponse = await fetchFromShopify<{ customers: ShopifyCustomer[] }>('/customers.json?limit=250');
    
    // Fetch orders
    const ordersResponse = await fetchFromShopify<{ orders: ShopifyOrder[] }>('/orders.json?status=any&limit=250');
    
    // Fetch products
    const productsResponse = await fetchFromShopify<{ products: ShopifyProduct[] }>('/products.json?limit=250');

    // Calculate metrics
    const customers = customersResponse.customers;
    const orders = ordersResponse.orders;
    const products = productsResponse.products;

    // Total customers
    const totalCustomers = customers.length;
    
    // Total orders
    const totalOrders = orders.length;
    
    // Total revenue
    const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total_price), 0);
    
    // Average order value
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // New customers today
    const today = new Date().toISOString().split('T')[0];
    const newCustomersToday = customers.filter(customer => 
      customer.created_at.startsWith(today)
    ).length;
    
    // Active customers (ordered in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();
    
    const activeCustomers = new Set(
      orders
        .filter(order => new Date(order.created_at) >= new Date(thirtyDaysAgoStr))
        .map(order => order.customer?.id)
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
    
    return {
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
  } catch (error) {
    console.error('Error fetching Shopify metrics:', error);
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