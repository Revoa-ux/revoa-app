import {
  TrendingUp,
  BarChart3,
  DollarSign,
  CreditCard,
  ShoppingCart,
  Package,
  Clock,
  Wallet,
  Receipt,
  RefreshCw,
  Target,
  TrendingDown,
  Percent,
  Users,
  LucideIcon
} from 'lucide-react';

export type MetricCategory = 'revenue' | 'expenses' | 'performance' | 'inventory' | 'marketing';

export interface MetricDefinition {
  id: string;
  title: string;
  icon: LucideIcon;
  category: MetricCategory;
  description: string;
  format: (value: number) => string;
  changeType: 'positive' | 'negative' | 'neutral';
}

export const METRICS_REGISTRY: Record<string, MetricDefinition> = {
  profit: {
    id: 'profit',
    title: 'Profit',
    icon: TrendingUp,
    category: 'revenue',
    description: 'Total profit after all expenses',
    format: (value) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    changeType: 'positive'
  },
  totalRevenue: {
    id: 'totalRevenue',
    title: 'Total Revenue',
    icon: BarChart3,
    category: 'revenue',
    description: 'Total revenue from all orders',
    format: (value) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    changeType: 'positive'
  },
  netRevenue: {
    id: 'netRevenue',
    title: 'Net Revenue',
    icon: DollarSign,
    category: 'revenue',
    description: 'Revenue after returns and refunds',
    format: (value) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    changeType: 'positive'
  },
  avgOrderValue: {
    id: 'avgOrderValue',
    title: 'Avg Order Value',
    icon: ShoppingCart,
    category: 'performance',
    description: 'Average value per order',
    format: (value) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    changeType: 'positive'
  },
  totalOrders: {
    id: 'totalOrders',
    title: 'Total Orders',
    icon: Receipt,
    category: 'performance',
    description: 'Total number of orders',
    format: (value) => value.toLocaleString(),
    changeType: 'positive'
  },
  totalAdSpend: {
    id: 'totalAdSpend',
    title: 'Total Ad Spend',
    icon: CreditCard,
    category: 'expenses',
    description: 'Total advertising spend',
    format: (value) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    changeType: 'negative'
  },
  cogs: {
    id: 'cogs',
    title: 'COGS',
    icon: Package,
    category: 'expenses',
    description: 'Cost of goods sold',
    format: (value) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    changeType: 'negative'
  },
  transactionFees: {
    id: 'transactionFees',
    title: 'Transaction Fees',
    icon: CreditCard,
    category: 'expenses',
    description: 'Payment processing fees',
    format: (value) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    changeType: 'negative'
  },
  returns: {
    id: 'returns',
    title: 'Returns',
    icon: RefreshCw,
    category: 'expenses',
    description: 'Value of returned orders',
    format: (value) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    changeType: 'negative'
  },
  refunds: {
    id: 'refunds',
    title: 'Refunds',
    icon: TrendingDown,
    category: 'expenses',
    description: 'Total refund amount',
    format: (value) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    changeType: 'negative'
  },
  roas: {
    id: 'roas',
    title: 'ROAS',
    icon: Target,
    category: 'marketing',
    description: 'Return on ad spend',
    format: (value) => `${value.toFixed(2)}x`,
    changeType: 'positive'
  },
  conversionRate: {
    id: 'conversionRate',
    title: 'Conversion Rate',
    icon: Percent,
    category: 'marketing',
    description: 'Percentage of visitors who convert',
    format: (value) => `${value.toFixed(2)}%`,
    changeType: 'positive'
  },
  cac: {
    id: 'cac',
    title: 'CAC',
    icon: Users,
    category: 'marketing',
    description: 'Customer acquisition cost',
    format: (value) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    changeType: 'negative'
  },
  clv: {
    id: 'clv',
    title: 'CLV',
    icon: TrendingUp,
    category: 'performance',
    description: 'Customer lifetime value',
    format: (value) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    changeType: 'positive'
  },
  inStock: {
    id: 'inStock',
    title: 'Items in Stock',
    icon: Package,
    category: 'inventory',
    description: 'Total items in stock',
    format: (value) => value.toLocaleString(),
    changeType: 'neutral'
  },
  avgFulfillmentTime: {
    id: 'avgFulfillmentTime',
    title: 'Avg Fulfillment Time',
    icon: Clock,
    category: 'inventory',
    description: 'Average order fulfillment time',
    format: (value) => `${value.toFixed(1)}h`,
    changeType: 'negative'
  },
  profitMargin: {
    id: 'profitMargin',
    title: 'Profit Margin',
    icon: Percent,
    category: 'performance',
    description: 'Profit as percentage of revenue',
    format: (value) => `${value.toFixed(1)}%`,
    changeType: 'positive'
  },
  balance: {
    id: 'balance',
    title: 'Balance',
    icon: Wallet,
    category: 'revenue',
    description: 'Current account balance',
    format: (value) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    changeType: 'positive'
  }
};

export const METRIC_CATEGORIES: Record<MetricCategory, { label: string; color: string }> = {
  revenue: { label: 'Revenue', color: 'text-green-600 dark:text-green-400' },
  expenses: { label: 'Expenses', color: 'text-red-600 dark:text-red-400' },
  performance: { label: 'Performance', color: 'text-blue-600 dark:text-blue-400' },
  inventory: { label: 'Inventory', color: 'text-purple-600 dark:text-purple-400' },
  marketing: { label: 'Marketing', color: 'text-orange-600 dark:text-orange-400' }
};

export function getMetricsByCategory(category: MetricCategory): MetricDefinition[] {
  return Object.values(METRICS_REGISTRY).filter(metric => metric.category === category);
}

export function getMetricDefinition(id: string): MetricDefinition | undefined {
  return METRICS_REGISTRY[id];
}
