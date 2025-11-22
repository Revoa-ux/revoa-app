import { supabase } from './supabase';
import { getCombinedDashboardMetrics } from './dashboardMetrics';
import { getCalculatorMetrics } from './shopify/api';

export type TemplateType = 'executive' | 'marketing' | 'inventory' | 'financial' | 'custom';
export type CardCategory = 'overview' | 'revenue' | 'expenses' | 'inventory' | 'ads' | 'financial' | 'balance';
export type CardSize = 'small' | 'medium' | 'large';

export interface MetricCardMetadata {
  id: string;
  category: CardCategory;
  title: string;
  description: string;
  icon: string;
  default_size: CardSize;
  data_sources: string[];
  calculation_type: string;
  available_in_templates: TemplateType[];
  default_visibility: boolean;
  sort_order: number;
}

export interface CardPosition {
  index: number;
}

export interface UserAnalyticsPreferences {
  id: string;
  user_id: string;
  active_template: TemplateType;
  visible_cards: string[];
  card_positions: Record<string, CardPosition>;
  is_editing: boolean;
  custom_layout: any[];
  created_at: string;
  updated_at: string;
}

export interface MetricCardData {
  id: string;
  title: string;
  mainValue: string | number;
  change: string;
  changeType: 'positive' | 'negative' | 'critical';
  dataPoint1: { label: string; value: string | number };
  dataPoint2: { label: string; value: string | number };
  icon: string;
  category: CardCategory;
}

// Fetch all available metric card definitions
export async function getAllMetricCards(): Promise<MetricCardMetadata[]> {
  const { data, error } = await supabase
    .from('metric_cards_metadata')
    .select('*')
    .order('category')
    .order('sort_order');

  if (error) {
    console.error('Error fetching metric cards:', error);
    throw error;
  }

  return data || [];
}

// Fetch metric cards for a specific template
export async function getTemplateMetricCards(template: TemplateType): Promise<MetricCardMetadata[]> {
  // Fetch all cards and filter on client side since JSONB array contains is tricky
  const { data, error } = await supabase
    .from('metric_cards_metadata')
    .select('*')
    .eq('default_visibility', true)
    .order('sort_order');

  if (error) {
    console.error('Error fetching template metric cards:', error);
    throw error;
  }

  // Filter cards that include this template
  const filtered = (data || []).filter(card =>
    card.available_in_templates &&
    Array.isArray(card.available_in_templates) &&
    card.available_in_templates.includes(template)
  );

  return filtered;
}

// Fetch user's analytics preferences
export async function getUserAnalyticsPreferences(userId: string): Promise<UserAnalyticsPreferences | null> {
  const { data, error } = await supabase
    .from('user_analytics_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user analytics preferences:', error);
    throw error;
  }

  return data;
}

// Initialize preferences for a new user with default template
export async function initializeUserAnalyticsPreferences(
  userId: string,
  template: TemplateType = 'executive'
): Promise<UserAnalyticsPreferences> {
  // Get default cards for the template
  const cards = await getTemplateMetricCards(template);
  const visibleCards = cards.map(card => card.id);

  const { data, error } = await supabase
    .from('user_analytics_preferences')
    .insert({
      user_id: userId,
      active_template: template,
      visible_cards: visibleCards,
      card_positions: {},
      is_editing: false
    })
    .select()
    .single();

  if (error) {
    console.error('Error initializing user analytics preferences:', error);
    throw error;
  }

  return data;
}

// Update user's analytics preferences
export async function updateUserAnalyticsPreferences(
  userId: string,
  updates: Partial<Omit<UserAnalyticsPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<UserAnalyticsPreferences> {
  const { data, error} = await supabase
    .from('user_analytics_preferences')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user analytics preferences:', error);
    throw error;
  }

  return data;
}

// Switch to a different template
export async function switchTemplate(
  userId: string,
  template: TemplateType
): Promise<UserAnalyticsPreferences> {
  const cards = await getTemplateMetricCards(template);
  const visibleCards = cards.map(card => card.id);

  return updateUserAnalyticsPreferences(userId, {
    active_template: template,
    visible_cards: visibleCards,
    card_positions: {} // Reset positions when switching templates
  });
}

// Toggle card visibility
export async function toggleCardVisibility(
  userId: string,
  cardId: string,
  visible: boolean
): Promise<UserAnalyticsPreferences> {
  const prefs = await getUserAnalyticsPreferences(userId);
  if (!prefs) {
    throw new Error('User preferences not found');
  }

  const visibleCards = visible
    ? [...prefs.visible_cards, cardId]
    : prefs.visible_cards.filter(id => id !== cardId);

  return updateUserAnalyticsPreferences(userId, {
    visible_cards: visibleCards
  });
}

// Update card positions
export async function updateCardPositions(
  userId: string,
  positions: Record<string, CardPosition>
): Promise<UserAnalyticsPreferences> {
  return updateUserAnalyticsPreferences(userId, {
    card_positions: positions
  });
}

// Compute metric card data from API responses
export async function computeMetricCardData(
  cardIds: string[],
  startDate: string,
  endDate: string
): Promise<Record<string, MetricCardData>> {
  // Fetch combined metrics
  const combined = await getCombinedDashboardMetrics(startDate, endDate);

  // Fetch calculator metrics for additional financial data
  const calculatorMetrics = await getCalculatorMetrics('7d');

  const cardData: Record<string, MetricCardData> = {};

  cardIds.forEach(cardId => {
    switch (cardId) {
      case 'profit':
        cardData[cardId] = {
          id: cardId,
          title: 'Profit',
          mainValue: `$${combined.computed.profit.toFixed(2)}`,
          change: `${combined.computed.profitMargin.toFixed(1)}%`,
          changeType: combined.computed.profit >= 0 ? 'positive' : 'negative',
          dataPoint1: {
            label: 'Margin',
            value: `${combined.computed.profitMargin.toFixed(1)}%`
          },
          dataPoint2: {
            label: 'ROAS',
            value: combined.facebook.totalSpend > 0 ? `${combined.computed.roas.toFixed(2)}x` : '0.00x'
          },
          icon: 'TrendingUp',
          category: 'overview'
        };
        break;

      case 'revenue':
        cardData[cardId] = {
          id: cardId,
          title: 'Total Revenue',
          mainValue: `$${combined.shopify.totalRevenue.toFixed(2)}`,
          change: '12.5%',
          changeType: 'positive',
          dataPoint1: {
            label: 'MRR',
            value: `$${(combined.shopify.monthlyRecurringRevenue / 1000).toFixed(2)}k`
          },
          dataPoint2: {
            label: 'ARR',
            value: `$${(combined.shopify.annualRecurringRevenue / 1000).toFixed(2)}k`
          },
          icon: 'BarChart3',
          category: 'overview'
        };
        break;

      case 'orders':
        cardData[cardId] = {
          id: cardId,
          title: 'Total Orders',
          mainValue: combined.shopify.totalOrders,
          change: '8.1%',
          changeType: 'positive',
          dataPoint1: {
            label: 'New Today',
            value: combined.shopify.newCustomersToday
          },
          dataPoint2: {
            label: 'Active',
            value: `${((combined.shopify.activeCustomers / combined.shopify.totalCustomers) * 100).toFixed(2)}%`
          },
          icon: 'Package',
          category: 'overview'
        };
        break;

      case 'aov':
        cardData[cardId] = {
          id: cardId,
          title: 'Average Order Value',
          mainValue: `$${combined.shopify.averageOrderValue.toFixed(2)}`,
          change: '5.6%',
          changeType: 'positive',
          dataPoint1: {
            label: 'Avg Cost',
            value: `$${(combined.shopify.costOfGoodsSold / combined.shopify.totalOrders).toFixed(2)}`
          },
          dataPoint2: {
            label: 'Profit per Order',
            value: `$${((combined.shopify.totalRevenue - combined.shopify.costOfGoodsSold) / combined.shopify.totalOrders).toFixed(2)}`
          },
          icon: 'DollarSign',
          category: 'overview'
        };
        break;

      case 'cogs':
        cardData[cardId] = {
          id: cardId,
          title: 'Cost of Goods Sold',
          mainValue: `$${combined.shopify.costOfGoodsSold.toFixed(2)}`,
          change: '6.2%',
          changeType: 'negative',
          dataPoint1: {
            label: 'Per Unit',
            value: combined.shopify.totalOrders > 0
              ? `$${(combined.shopify.costOfGoodsSold / combined.shopify.totalOrders).toFixed(2)}`
              : '$0.00'
          },
          dataPoint2: {
            label: 'Shipping Costs',
            value: `$${combined.shopify.shippingCosts.toFixed(2)}`
          },
          icon: 'ShoppingCart',
          category: 'expenses'
        };
        break;

      case 'ad_costs':
        cardData[cardId] = {
          id: cardId,
          title: 'Ad Spend',
          mainValue: `$${combined.facebook.totalSpend.toFixed(2)}`,
          change: '0.0%',
          changeType: 'negative',
          dataPoint1: {
            label: 'ROAS',
            value: combined.facebook.totalSpend > 0 ? `${combined.computed.roas.toFixed(2)}x` : '0.00x'
          },
          dataPoint2: {
            label: 'CPA',
            value: combined.shopify.totalOrders > 0 && combined.facebook.totalSpend > 0
              ? `$${(combined.facebook.totalSpend / combined.shopify.totalOrders).toFixed(2)}`
              : '$0.00'
          },
          icon: 'CreditCard',
          category: 'expenses'
        };
        break;

      case 'returns':
        cardData[cardId] = {
          id: cardId,
          title: 'Returns',
          mainValue: `$${combined.shopify.returnAmount.toFixed(2)}`,
          change: `${combined.shopify.returnRate.toFixed(1)}%`,
          changeType: 'negative',
          dataPoint1: {
            label: 'Return Rate',
            value: `${combined.shopify.returnRate.toFixed(2)}%`
          },
          dataPoint2: {
            label: 'Net Revenue',
            value: `$${(combined.shopify.totalRevenue - combined.shopify.returnAmount).toFixed(2)}`
          },
          icon: 'RotateCcw',
          category: 'revenue'
        };
        break;

      case 'transaction_fees':
        cardData[cardId] = {
          id: cardId,
          title: 'Transaction Fees',
          mainValue: `$${combined.shopify.transactionFees.toFixed(2)}`,
          change: '2.1%',
          changeType: 'negative',
          dataPoint1: {
            label: 'Shopify Fees',
            value: `$${(combined.shopify.transactionFees * 0.8).toFixed(2)}`
          },
          dataPoint2: {
            label: 'App Fees',
            value: `$${(combined.shopify.transactionFees * 0.2).toFixed(2)}`
          },
          icon: 'Receipt',
          category: 'expenses'
        };
        break;

      case 'roas':
        cardData[cardId] = {
          id: cardId,
          title: 'ROAS',
          mainValue: combined.facebook.totalSpend > 0 ? `${combined.computed.roas.toFixed(2)}x` : '0.00x',
          change: combined.computed.roas >= 2.5 ? '12.5%' : '-5.2%',
          changeType: combined.computed.roas >= 2.5 ? 'positive' : 'negative',
          dataPoint1: {
            label: 'Ad Spend',
            value: `$${combined.facebook.totalSpend.toFixed(2)}`
          },
          dataPoint2: {
            label: 'Revenue',
            value: `$${combined.shopify.totalRevenue.toFixed(2)}`
          },
          icon: 'TrendingUp',
          category: 'ads'
        };
        break;

      case 'cpa':
        const cpa = combined.shopify.totalOrders > 0 && combined.facebook.totalSpend > 0
          ? combined.facebook.totalSpend / combined.shopify.totalOrders
          : 0;
        cardData[cardId] = {
          id: cardId,
          title: 'Cost Per Acquisition',
          mainValue: `$${cpa.toFixed(2)}`,
          change: '8.3%',
          changeType: 'negative',
          dataPoint1: {
            label: 'Ad Spend',
            value: `$${combined.facebook.totalSpend.toFixed(2)}`
          },
          dataPoint2: {
            label: 'Orders',
            value: combined.shopify.totalOrders
          },
          icon: 'Target',
          category: 'ads'
        };
        break;

      case 'net_revenue':
        const netRevenue = combined.shopify.totalRevenue - combined.shopify.returnAmount;
        cardData[cardId] = {
          id: cardId,
          title: 'Net Revenue',
          mainValue: `$${netRevenue.toFixed(2)}`,
          change: '10.2%',
          changeType: 'positive',
          dataPoint1: {
            label: 'Gross Revenue',
            value: `$${combined.shopify.totalRevenue.toFixed(2)}`
          },
          dataPoint2: {
            label: 'Returns',
            value: `$${combined.shopify.returnAmount.toFixed(2)}`
          },
          icon: 'BarChart3',
          category: 'revenue'
        };
        break;

      case 'number_of_orders':
        cardData[cardId] = {
          id: cardId,
          title: 'Number of Orders',
          mainValue: combined.shopify.totalOrders,
          change: '7.8%',
          changeType: 'positive',
          dataPoint1: {
            label: 'AOV',
            value: `$${combined.shopify.averageOrderValue.toFixed(2)}`
          },
          dataPoint2: {
            label: 'Revenue',
            value: `$${combined.shopify.totalRevenue.toFixed(2)}`
          },
          icon: 'ShoppingCart',
          category: 'revenue'
        };
        break;

      case 'refunds':
        cardData[cardId] = {
          id: cardId,
          title: 'Refunds',
          mainValue: `$${combined.shopify.refunds.toFixed(2)}`,
          change: `${((combined.shopify.refunds / combined.shopify.totalRevenue) * 100).toFixed(1)}%`,
          changeType: 'negative',
          dataPoint1: {
            label: 'Refund Rate',
            value: `${((combined.shopify.refunds / combined.shopify.totalRevenue) * 100).toFixed(2)}%`
          },
          dataPoint2: {
            label: 'Total Revenue',
            value: `$${combined.shopify.totalRevenue.toFixed(2)}`
          },
          icon: 'RotateCcw',
          category: 'expenses'
        };
        break;

      case 'chargebacks':
        cardData[cardId] = {
          id: cardId,
          title: 'Chargebacks',
          mainValue: `$${combined.shopify.chargebacks.toFixed(2)}`,
          change: combined.shopify.chargebacks > 100 ? '15.2%' : '0.5%',
          changeType: combined.shopify.chargebacks > 100 ? 'critical' : 'negative',
          dataPoint1: {
            label: 'Rate',
            value: `${((combined.shopify.chargebacks / combined.shopify.totalRevenue) * 100).toFixed(2)}%`
          },
          dataPoint2: {
            label: 'Orders',
            value: combined.shopify.totalOrders
          },
          icon: 'AlertTriangle',
          category: 'expenses'
        };
        break;

      case 'inventory_status':
        cardData[cardId] = {
          id: cardId,
          title: 'Inventory Status',
          mainValue: combined.shopify.totalProducts,
          change: '4.2%',
          changeType: 'positive',
          dataPoint1: {
            label: 'Value',
            value: `$${combined.shopify.inventoryValue.toFixed(2)}`
          },
          dataPoint2: {
            label: 'In Stock',
            value: combined.shopify.totalProducts
          },
          icon: 'Package',
          category: 'inventory'
        };
        break;

      case 'fulfill':
        cardData[cardId] = {
          id: cardId,
          title: 'Orders to Fulfill',
          mainValue: Math.floor(combined.shopify.totalOrders * 0.15),
          change: '6.5%',
          changeType: 'negative',
          dataPoint1: {
            label: 'Total Orders',
            value: combined.shopify.totalOrders
          },
          dataPoint2: {
            label: 'Fulfilled',
            value: Math.floor(combined.shopify.totalOrders * 0.85)
          },
          icon: 'Clock',
          category: 'inventory'
        };
        break;

      case 'order_metrics':
        cardData[cardId] = {
          id: cardId,
          title: 'Order Metrics',
          mainValue: combined.shopify.totalOrders,
          change: '9.1%',
          changeType: 'positive',
          dataPoint1: {
            label: 'Units Sold',
            value: Math.floor(combined.shopify.totalOrders * 1.8)
          },
          dataPoint2: {
            label: 'AOV',
            value: `$${combined.shopify.averageOrderValue.toFixed(2)}`
          },
          icon: 'ShoppingCart',
          category: 'inventory'
        };
        break;

      case 'time_metrics':
        cardData[cardId] = {
          id: cardId,
          title: 'Time Metrics',
          mainValue: '2.3 days',
          change: '12.0%',
          changeType: 'positive',
          dataPoint1: {
            label: 'Avg Fulfillment',
            value: '1.8 days'
          },
          dataPoint2: {
            label: 'Avg Delivery',
            value: '4.2 days'
          },
          icon: 'Clock',
          category: 'inventory'
        };
        break;

      case 'financial_metrics':
        const grossProfit = combined.shopify.totalRevenue - combined.shopify.costOfGoodsSold;
        const margin = (grossProfit / combined.shopify.totalRevenue) * 100;
        cardData[cardId] = {
          id: cardId,
          title: 'Financial Metrics',
          mainValue: `$${grossProfit.toFixed(2)}`,
          change: `${margin.toFixed(1)}%`,
          changeType: margin >= 30 ? 'positive' : 'negative',
          dataPoint1: {
            label: 'Gross Margin',
            value: `${margin.toFixed(1)}%`
          },
          dataPoint2: {
            label: 'COGS',
            value: `$${combined.shopify.costOfGoodsSold.toFixed(2)}`
          },
          icon: 'DollarSign',
          category: 'inventory'
        };
        break;

      case 'avg_order_value':
        cardData[cardId] = {
          id: cardId,
          title: 'Avg Order Value',
          mainValue: `$${combined.shopify.averageOrderValue.toFixed(2)}`,
          change: '6.3%',
          changeType: 'positive',
          dataPoint1: {
            label: 'Orders',
            value: combined.shopify.totalOrders
          },
          dataPoint2: {
            label: 'Revenue',
            value: `$${combined.shopify.totalRevenue.toFixed(2)}`
          },
          icon: 'DollarSign',
          category: 'financial'
        };
        break;

      case 'aov_net_refunds':
        const aovNetRefunds = (combined.shopify.totalRevenue - combined.shopify.refunds) / combined.shopify.totalOrders;
        cardData[cardId] = {
          id: cardId,
          title: 'AOV (Net Refunds)',
          mainValue: `$${aovNetRefunds.toFixed(2)}`,
          change: '5.8%',
          changeType: 'positive',
          dataPoint1: {
            label: 'Refunds',
            value: `$${combined.shopify.refunds.toFixed(2)}`
          },
          dataPoint2: {
            label: 'Net AOV',
            value: `$${aovNetRefunds.toFixed(2)}`
          },
          icon: 'DollarSign',
          category: 'financial'
        };
        break;

      case 'clv':
        const avgPurchasesPerCustomer = combined.shopify.totalOrders / combined.shopify.totalCustomers;
        const clv = combined.shopify.averageOrderValue * avgPurchasesPerCustomer * 3;
        cardData[cardId] = {
          id: cardId,
          title: 'Customer Lifetime Value',
          mainValue: `$${clv.toFixed(2)}`,
          change: '18.5%',
          changeType: 'positive',
          dataPoint1: {
            label: 'AOV',
            value: `$${combined.shopify.averageOrderValue.toFixed(2)}`
          },
          dataPoint2: {
            label: 'Purchases',
            value: avgPurchasesPerCustomer.toFixed(1)
          },
          icon: 'TrendingUp',
          category: 'financial'
        };
        break;

      case 'purchase_frequency':
        const purchaseFreq = combined.shopify.totalOrders / combined.shopify.totalCustomers;
        cardData[cardId] = {
          id: cardId,
          title: 'Purchase Frequency',
          mainValue: purchaseFreq.toFixed(2),
          change: '8.7%',
          changeType: 'positive',
          dataPoint1: {
            label: 'Orders',
            value: combined.shopify.totalOrders
          },
          dataPoint2: {
            label: 'Customers',
            value: combined.shopify.totalCustomers
          },
          icon: 'RefreshCw',
          category: 'financial'
        };
        break;

      case 'ad_cost_per_order':
        const adCostPerOrder = combined.facebook.totalSpend > 0 && combined.shopify.totalOrders > 0
          ? combined.facebook.totalSpend / combined.shopify.totalOrders
          : 0;
        cardData[cardId] = {
          id: cardId,
          title: 'Ad Cost Per Order',
          mainValue: `$${adCostPerOrder.toFixed(2)}`,
          change: '4.2%',
          changeType: 'negative',
          dataPoint1: {
            label: 'Ad Spend',
            value: `$${combined.facebook.totalSpend.toFixed(2)}`
          },
          dataPoint2: {
            label: 'Orders',
            value: combined.shopify.totalOrders
          },
          icon: 'CreditCard',
          category: 'financial'
        };
        break;

      case 'roas_refunds_included':
        const refundAdjustedRevenue = combined.shopify.totalRevenue - combined.shopify.refunds;
        const roasWithRefunds = combined.facebook.totalSpend > 0
          ? refundAdjustedRevenue / combined.facebook.totalSpend
          : 0;
        cardData[cardId] = {
          id: cardId,
          title: 'ROAS (Refunds Included)',
          mainValue: `${roasWithRefunds.toFixed(2)}x`,
          change: roasWithRefunds >= 2.5 ? '10.5%' : '-7.2%',
          changeType: roasWithRefunds >= 2.5 ? 'positive' : 'negative',
          dataPoint1: {
            label: 'Net Revenue',
            value: `$${refundAdjustedRevenue.toFixed(2)}`
          },
          dataPoint2: {
            label: 'Ad Spend',
            value: `$${combined.facebook.totalSpend.toFixed(2)}`
          },
          icon: 'TrendingUp',
          category: 'financial'
        };
        break;

      case 'break_even_roas':
        const totalCosts = combined.shopify.costOfGoodsSold + combined.shopify.transactionFees + combined.shopify.shippingCosts;
        const breakEvenRoas = totalCosts > 0
          ? combined.shopify.totalRevenue / totalCosts
          : 0;
        cardData[cardId] = {
          id: cardId,
          title: 'Break-even ROAS',
          mainValue: `${breakEvenRoas.toFixed(2)}x`,
          change: '0.0%',
          changeType: 'positive',
          dataPoint1: {
            label: 'Total Costs',
            value: `$${totalCosts.toFixed(2)}`
          },
          dataPoint2: {
            label: 'Target ROAS',
            value: `${(breakEvenRoas * 1.2).toFixed(2)}x`
          },
          icon: 'Target',
          category: 'financial'
        };
        break;

      case 'cac':
        const newCustomersEstimate = Math.floor(combined.shopify.newCustomersToday * 30);
        const cac = combined.facebook.totalSpend > 0 && newCustomersEstimate > 0
          ? combined.facebook.totalSpend / newCustomersEstimate
          : 0;
        cardData[cardId] = {
          id: cardId,
          title: 'Customer Acquisition Cost',
          mainValue: `$${cac.toFixed(2)}`,
          change: '11.2%',
          changeType: 'negative',
          dataPoint1: {
            label: 'Ad Spend',
            value: `$${combined.facebook.totalSpend.toFixed(2)}`
          },
          dataPoint2: {
            label: 'New Customers',
            value: newCustomersEstimate
          },
          icon: 'UserPlus',
          category: 'financial'
        };
        break;

      case 'avg_cogs':
        const avgCogs = combined.shopify.totalOrders > 0
          ? combined.shopify.costOfGoodsSold / combined.shopify.totalOrders
          : 0;
        cardData[cardId] = {
          id: cardId,
          title: 'Average COGS',
          mainValue: `$${avgCogs.toFixed(2)}`,
          change: '3.8%',
          changeType: 'negative',
          dataPoint1: {
            label: 'Total COGS',
            value: `$${combined.shopify.costOfGoodsSold.toFixed(2)}`
          },
          dataPoint2: {
            label: 'Orders',
            value: combined.shopify.totalOrders
          },
          icon: 'ShoppingCart',
          category: 'financial'
        };
        break;

      case 'gross_margin_percent':
        const grossMarginPercent = combined.shopify.totalRevenue > 0
          ? ((combined.shopify.totalRevenue - combined.shopify.costOfGoodsSold) / combined.shopify.totalRevenue) * 100
          : 0;
        cardData[cardId] = {
          id: cardId,
          title: 'Gross Margin %',
          mainValue: `${grossMarginPercent.toFixed(1)}%`,
          change: '2.3%',
          changeType: grossMarginPercent >= 30 ? 'positive' : 'negative',
          dataPoint1: {
            label: 'Revenue',
            value: `$${combined.shopify.totalRevenue.toFixed(2)}`
          },
          dataPoint2: {
            label: 'COGS',
            value: `$${combined.shopify.costOfGoodsSold.toFixed(2)}`
          },
          icon: 'Percent',
          category: 'financial'
        };
        break;

      case 'profit_margin_percent':
        cardData[cardId] = {
          id: cardId,
          title: 'Profit Margin %',
          mainValue: `${combined.computed.profitMargin.toFixed(1)}%`,
          change: '4.5%',
          changeType: combined.computed.profitMargin >= 20 ? 'positive' : 'negative',
          dataPoint1: {
            label: 'Profit',
            value: `$${combined.computed.profit.toFixed(2)}`
          },
          dataPoint2: {
            label: 'Revenue',
            value: `$${combined.shopify.totalRevenue.toFixed(2)}`
          },
          icon: 'Percent',
          category: 'financial'
        };
        break;

      case 'return_rate':
        cardData[cardId] = {
          id: cardId,
          title: 'Return Rate',
          mainValue: `${combined.shopify.returnRate.toFixed(1)}%`,
          change: combined.shopify.returnRate <= 5 ? '2.1%' : '8.5%',
          changeType: combined.shopify.returnRate <= 5 ? 'positive' : 'critical',
          dataPoint1: {
            label: 'Returns',
            value: `$${combined.shopify.returnAmount.toFixed(2)}`
          },
          dataPoint2: {
            label: 'Orders',
            value: combined.shopify.totalOrders
          },
          icon: 'RotateCcw',
          category: 'financial'
        };
        break;

      case 'balance':
        cardData[cardId] = {
          id: cardId,
          title: 'Current Balance',
          mainValue: '$0.00',
          change: '0.0%',
          changeType: 'positive',
          dataPoint1: {
            label: 'Pending',
            value: '$0.00'
          },
          dataPoint2: {
            label: 'Available',
            value: '$0.00'
          },
          icon: 'Wallet',
          category: 'balance'
        };
        break;

      case 'projected':
        const projectedOrders = Math.floor(combined.shopify.totalOrders * 1.15);
        cardData[cardId] = {
          id: cardId,
          title: 'Projected Orders',
          mainValue: projectedOrders,
          change: '15.0%',
          changeType: 'positive',
          dataPoint1: {
            label: 'Current',
            value: combined.shopify.totalOrders
          },
          dataPoint2: {
            label: 'Growth',
            value: '+15%'
          },
          icon: 'Calendar',
          category: 'balance'
        };
        break;

      default:
        // Default empty card for unknown IDs
        cardData[cardId] = {
          id: cardId,
          title: 'Unknown Metric',
          mainValue: '$0.00',
          change: '0.0%',
          changeType: 'positive',
          dataPoint1: { label: 'N/A', value: '0' },
          dataPoint2: { label: 'N/A', value: '0' },
          icon: 'HelpCircle',
          category: 'overview'
        };
    }
  });

  return cardData;
}

// Get cards organized by category
export function organizeCardsByCategory(cards: MetricCardMetadata[]): Record<CardCategory, MetricCardMetadata[]> {
  const organized: Record<string, MetricCardMetadata[]> = {
    overview: [],
    revenue: [],
    expenses: [],
    inventory: [],
    ads: [],
    financial: [],
    balance: []
  };

  cards.forEach(card => {
    if (!organized[card.category]) {
      organized[card.category] = [];
    }
    organized[card.category].push(card);
  });

  return organized as Record<CardCategory, MetricCardMetadata[]>;
}
