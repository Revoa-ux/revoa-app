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
  const { data, error } = await supabase
    .from('metric_cards_metadata')
    .select('*')
    .contains('available_in_templates', [template])
    .eq('default_visibility', true)
    .order('sort_order');

  if (error) {
    console.error('Error fetching template metric cards:', error);
    throw error;
  }

  return data || [];
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

      // Add more card calculations as needed
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
