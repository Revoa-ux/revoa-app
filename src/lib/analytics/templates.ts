export interface AnalyticsTemplate {
  id: string;
  name: string;
  description: string;
  metricIds: string[];
}

export const ANALYTICS_TEMPLATES: Record<string, AnalyticsTemplate> = {
  executive: {
    id: 'executive',
    name: 'Executive Overview',
    description: 'High-level profit, revenue, and key performance metrics',
    metricIds: [
      'profit',
      'totalRevenue',
      'avgOrderValue',
      'totalAdSpend',
      'totalOrders',
      'roas',
      'profitMargin',
      'balance'
    ]
  },
  marketing: {
    id: 'marketing',
    name: 'Marketing Performance',
    description: 'Ad spend, ROAS, attribution, and conversion metrics',
    metricIds: [
      'totalAdSpend',
      'roas',
      'cac',
      'conversionRate',
      'totalRevenue',
      'totalOrders',
      'avgOrderValue',
      'clv'
    ]
  },
  inventory: {
    id: 'inventory',
    name: 'Inventory Management',
    description: 'Stock levels, fulfillment times, and inventory-specific metrics',
    metricIds: [
      'inStock',
      'avgFulfillmentTime',
      'totalOrders',
      'cogs',
      'totalRevenue',
      'returns'
    ]
  },
  financial: {
    id: 'financial',
    name: 'Financial Deep Dive',
    description: 'Revenue breakdown, expenses, margins, and profitability',
    metricIds: [
      'totalRevenue',
      'netRevenue',
      'profit',
      'profitMargin',
      'cogs',
      'transactionFees',
      'refunds',
      'totalAdSpend',
      'balance'
    ]
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    description: 'Your personalized metric layout',
    metricIds: []
  }
};

export function getTemplate(id: string): AnalyticsTemplate | undefined {
  return ANALYTICS_TEMPLATES[id];
}

export function getAllTemplates(): AnalyticsTemplate[] {
  return Object.values(ANALYTICS_TEMPLATES).filter(t => t.id !== 'custom');
}
