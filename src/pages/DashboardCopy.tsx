import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3,
  DollarSign,
  RefreshCw,
  Clock,
  Package,
  TrendingUp,
  Wallet,
  Calendar,
  LayoutGrid,
  LineChart,
  ShoppingCart,
  CreditCard,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AdReportsTimeSelector, { TimeOption } from '../components/reports/AdReportsTimeSelector';
import { getDashboardMetrics, ShopifyMetrics } from '../lib/shopify/api';
import { DashboardSkeleton } from '../components/PageSkeletons';
import { toast } from 'sonner';  

type CardType = 
  | 'profit' 
  | 'revenue' 
  | 'orders' 
  | 'aov' 
  | 'cogs'
  | 'adCosts'
  | 'transactionFees'
  | 'fulfill' 
  | 'balance' 
  | 'projected';

type ViewType = 'card' | 'chart';

interface CardData {
  id: CardType;
  title: string;
  icon: React.ReactNode;
  mainValue: string | number;
  change: string;
  changeType: 'positive' | 'negative' | 'critical';
  dataPoint1: { label: string; value: string | number };
  dataPoint2: { label: string; value: string | number };
  chartData: Array<{ date: string; value1: number; value2: number; value3: number }>;
  showInChartView?: boolean;
}

export default function DashboardCopy() {
  const [timeframe, setTimeframe] = useState<'1d' | '7d' | '30d' | 'custom'>('7d');
  const [selectedTime, setSelectedTime] = useState<TimeOption>('7d');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endDate: new Date()
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<CardType>('profit');
  const [viewType, setViewType] = useState<ViewType>('card');  
  const [shopifyMetrics, setShopifyMetrics] = useState<ShopifyMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const userFirstName = "John";

  const handleTimeChange = useCallback((time: TimeOption) => {
    setSelectedTime(time);
    
    switch (time) {
      case '24h':
        setTimeframe('1d');
        break;
      case '7d':
      case '14d':
        setTimeframe('7d');
        break;
      case '30d':
      case '60d':
      case '90d':
        setTimeframe('30d');
        break;
      case 'custom':
        setTimeframe('custom');
        break;
      default:
        setTimeframe('7d');
    }
  }, []);

  const handleDateRangeChange = (range: { startDate: Date; endDate: Date }) => {
    setDateRange(range);
  };

  const fetchShopifyData = async () => {
    try {
      console.log('[Dashboard] Starting data fetch...');
      setIsLoading(true);
      setError(null);

      const metrics = await getDashboardMetrics();
      console.log('[Dashboard] Received metrics:', metrics);
      setShopifyMetrics(metrics);

      // Check if we got real data or defaults
      if (metrics.totalOrders === 0 && metrics.totalRevenue === 0) {
        console.warn('[Dashboard] Received default/empty metrics. Store may not be connected or has no data.');
        toast.info('No store data found', {
          description: 'Connect your Shopify store or add some orders to see metrics'
        });
      } else {
        console.log('[Dashboard] Successfully loaded store data:', {
          orders: metrics.totalOrders,
          revenue: metrics.totalRevenue,
          customers: metrics.totalCustomers
        });
        toast.success('Store data loaded successfully');
      }
    } catch (error) {
      console.error('[Dashboard] Error fetching Shopify data:', error);
      setError('Failed to fetch data from your Shopify store');
      toast.error('Failed to fetch data from your Shopify store', {
        description: error instanceof Error ? error.message : 'Please check your connection'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShopifyData();
  }, [timeframe, selectedTime]);

  // Generate card data based on Shopify metrics
  const cardsData: CardData[] = [
    {
      id: 'profit',
      title: 'Profit',
      icon: <TrendingUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />,
      mainValue: shopifyMetrics ? `$${(shopifyMetrics.totalRevenue - shopifyMetrics.costOfGoodsSold).toFixed(2)}` : '$0.00',
      change: shopifyMetrics ? `${shopifyMetrics.profitMargin.toFixed(1)}%` : '0%',
      changeType: 'positive',
      dataPoint1: { 
        label: 'Profit Margin', 
        value: shopifyMetrics ? `${shopifyMetrics.profitMargin.toFixed(1)}%` : '0%' 
      },
      dataPoint2: { 
        label: 'Expenses', 
        value: shopifyMetrics ? `$${shopifyMetrics.costOfGoodsSold.toFixed(2)}` : '$0.00' 
      },
      chartData: [
        { date: '2024-03-01', value1: 4200, value2: 24.2, value3: 14200 },
        { date: '2024-03-02', value1: 4500, value2: 24.8, value3: 15100 },
        { date: '2024-03-03', value1: 4800, value2: 25.1, value3: 15900 },
        { date: '2024-03-04', value1: 5200, value2: 25.5, value3: 16800 },
        { date: '2024-03-05', value1: 5500, value2: 26.0, value3: 17500 },
        { date: '2024-03-06', value1: 5800, value2: 26.4, value3: 18200 },
        { date: '2024-03-07', value1: 5960, value2: 26.6, value3: 18727 }
      ],
      showInChartView: true
    },
    {
      id: 'revenue',
      title: 'Total Revenue',
      icon: <BarChart3 className="w-4 h-4 text-gray-600 dark:text-gray-400" />,
      mainValue: shopifyMetrics ? `$${shopifyMetrics.totalRevenue.toFixed(2)}` : '$0.00',
      change: '12.5%',
      changeType: 'positive',
      dataPoint1: { 
        label: 'MRR', 
        value: shopifyMetrics ? `$${(shopifyMetrics.monthlyRecurringRevenue / 1000).toFixed(1)}k` : '$0.0k' 
      },
      dataPoint2: { 
        label: 'ARR', 
        value: shopifyMetrics ? `$${(shopifyMetrics.annualRecurringRevenue / 1000).toFixed(1)}k` : '$0.0k' 
      },
      chartData: [
        { date: '2024-03-01', value1: 4500, value2: 3200, value3: 1300 },
        { date: '2024-03-02', value1: 4800, value2: 3400, value3: 1400 },
        { date: '2024-03-03', value1: 5200, value2: 3600, value3: 1600 },
        { date: '2024-03-04', value1: 5800, value2: 4000, value3: 1800 },
        { date: '2024-03-05', value1: 5600, value2: 3900, value3: 1700 },
        { date: '2024-03-06', value1: 4400, value2: 3100, value3: 1300 },
        { date: '2024-03-07', value1: 5600, value2: 3900, value3: 1700 }
      ],
      showInChartView: true
    },
    {
      id: 'orders',
      title: 'Total Orders',
      icon: <Package className="w-4 h-4 text-gray-600 dark:text-gray-400" />,
      mainValue: shopifyMetrics ? shopifyMetrics.totalOrders : 0,
      change: '8.1%',
      changeType: 'positive',
      dataPoint1: { 
        label: 'New Today', 
        value: shopifyMetrics ? shopifyMetrics.newCustomersToday : 0 
      },
      dataPoint2: { 
        label: 'Active', 
        value: shopifyMetrics ? `${((shopifyMetrics.activeCustomers / shopifyMetrics.totalCustomers) * 100).toFixed(1)}%` : '0%' 
      },
      chartData: [
        { date: '2024-03-01', value1: 90, value2: 280, value3: 2.8 },
        { date: '2024-03-02', value1: 95, value2: 290, value3: 2.9 },
        { date: '2024-03-03', value1: 100, value2: 310, value3: 3.0 },
        { date: '2024-03-04', value1: 110, value2: 340, value3: 3.1 },
        { date: '2024-03-05', value1: 115, value2: 350, value3: 3.2 },
        { date: '2024-03-06', value1: 105, value2: 330, value3: 3.2 },
        { date: '2024-03-07', value1: 113, value2: 360, value3: 3.3 }
      ],
      showInChartView: true
    },
    {
      id: 'aov',
      title: 'Average Order Value',
      icon: <DollarSign className="w-4 h-4 text-gray-600 dark:text-gray-400" />,
      mainValue: shopifyMetrics ? `$${shopifyMetrics.averageOrderValue.toFixed(2)}` : '$0.00',
      change: '5.6%',
      changeType: 'positive',
      dataPoint1: { 
        label: 'Avg Cost', 
        value: shopifyMetrics ? `$${(shopifyMetrics.costOfGoodsSold / shopifyMetrics.totalOrders).toFixed(2)}` : '$0.00' 
      },
      dataPoint2: { 
        label: 'Profit per Order', 
        value: shopifyMetrics ? `$${((shopifyMetrics.totalRevenue - shopifyMetrics.costOfGoodsSold) / shopifyMetrics.totalOrders).toFixed(2)}` : '$0.00' 
      },
      chartData: [
        { date: '2024-03-01', value1: 85.50, value2: 60.20, value3: 22.30 },
        { date: '2024-03-02', value1: 86.75, value2: 60.80, value3: 22.95 },
        { date: '2024-03-03', value1: 87.90, value2: 61.20, value3: 23.10 },
        { date: '2024-03-04', value1: 89.20, value2: 61.80, value3: 23.40 },
        { date: '2024-03-05', value1: 90.10, value2: 62.20, value3: 23.80 },
        { date: '2024-03-06', value1: 90.80, value2: 62.50, value3: 24.00 },
        { date: '2024-03-07', value1: 91.16, value2: 62.72, value3: 24.18 }
      ],
      showInChartView: true
    },
    {
      id: 'cogs',
      title: 'Cost of Goods Sold',
      icon: <ShoppingCart className="w-4 h-4 text-gray-600 dark:text-gray-400" />,
      mainValue: shopifyMetrics ? `$${shopifyMetrics.costOfGoodsSold.toFixed(2)}` : '$0.00',
      change: '6.2%',
      changeType: 'negative',
      dataPoint1: { 
        label: 'Per Unit', 
        value: shopifyMetrics && shopifyMetrics.totalOrders > 0 ? 
          `$${(shopifyMetrics.costOfGoodsSold / shopifyMetrics.totalOrders).toFixed(2)}` : '$0.00' 
      },
      dataPoint2: { 
        label: 'Shipping Costs', 
        value: shopifyMetrics ? `$${shopifyMetrics.shippingCosts.toFixed(2)}` : '$0.00' 
      },
      chartData: [
        { date: '2024-03-01', value1: 13200, value2: 38.50, value3: 3000 },
        { date: '2024-03-02', value1: 13400, value2: 38.75, value3: 3050 },
        { date: '2024-03-03', value1: 13600, value2: 39.00, value3: 3100 },
        { date: '2024-03-04', value1: 13800, value2: 39.25, value3: 3150 },
        { date: '2024-03-05', value1: 14000, value2: 39.40, value3: 3180 },
        { date: '2024-03-06', value1: 14100, value2: 39.50, value3: 3210 },
        { date: '2024-03-07', value1: 14250, value2: 39.58, value3: 3240 }
      ],
      showInChartView: true
    },
    {
      id: 'adCosts',
      title: 'Ad Costs',
      icon: <CreditCard className="w-4 h-4 text-gray-600 dark:text-gray-400" />,
      mainValue: '$5,840',
      change: '3.8%',
      changeType: 'negative',
      dataPoint1: { label: 'ROAS', value: '5.63x' },
      dataPoint2: { label: 'CPA', value: '$51.68' },
      chartData: [
        { date: '2024-03-01', value1: 5600, value2: 5.50, value3: 50.00 },
        { date: '2024-03-02', value1: 5650, value2: 5.52, value3: 50.25 },
        { date: '2024-03-03', value1: 5700, value2: 5.55, value3: 50.50 },
        { date: '2024-03-04', value1: 5750, value2: 5.58, value3: 50.75 },
        { date: '2024-03-05', value1: 5780, value2: 5.60, value3: 51.00 },
        { date: '2024-03-06', value1: 5810, value2: 5.62, value3: 51.40 },
        { date: '2024-03-07', value1: 5840, value2: 5.63, value3: 51.68 }
      ],
      showInChartView: true
    },
    {
      id: 'transactionFees',
      title: 'Transaction Fees',
      icon: <Receipt className="w-4 h-4 text-gray-600 dark:text-gray-400" />,
      mainValue: shopifyMetrics ? `$${shopifyMetrics.transactionFees.toFixed(2)}` : '$0.00',
      change: '2.1%',
      changeType: 'negative',
      dataPoint1: { label: 'Shopify Fees', value: shopifyMetrics ? `$${(shopifyMetrics.transactionFees * 0.8).toFixed(2)}` : '$0.00' },
      dataPoint2: { label: 'App Fees', value: shopifyMetrics ? `$${(shopifyMetrics.transactionFees * 0.2).toFixed(2)}` : '$0.00' },
      chartData: [
        { date: '2024-03-01', value1: 1200, value2: 950, value3: 250 },
        { date: '2024-03-02', value1: 1210, value2: 955, value3: 255 },
        { date: '2024-03-03', value1: 1220, value2: 960, value3: 260 },
        { date: '2024-03-04', value1: 1225, value2: 965, value3: 260 },
        { date: '2024-03-05', value1: 1230, value2: 970, value3: 260 },
        { date: '2024-03-06', value1: 1240, value2: 980, value3: 260 },
        { date: '2024-03-07', value1: 1245, value2: 985, value3: 260 }
      ],
      showInChartView: false
    },
    {
      id: 'fulfill',
      title: 'Orders to Fulfill',
      icon: <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />,
      mainValue: shopifyMetrics ? shopifyMetrics.totalOrders - (shopifyMetrics.totalOrders * 0.85) : 0,
      change: '79.4%',
      changeType: 'positive',
      dataPoint1: { 
        label: 'Completed', 
        value: shopifyMetrics ? `${Math.floor(shopifyMetrics.totalOrders * 0.85)} of ${shopifyMetrics.totalOrders}` : '0 of 0' 
      },
      dataPoint2: { 
        label: 'Fulfillment Rate', 
        value: '85.0%' 
      },
      chartData: [
        { date: '2024-03-01', value1: 45, value2: 75, value3: 62.5 },
        { date: '2024-03-02', value1: 42, value2: 80, value3: 65.6 },
        { date: '2024-03-03', value1: 38, value2: 85, value3: 69.1 },
        { date: '2024-03-04', value1: 35, value2: 90, value3: 72.0 },
        { date: '2024-03-05', value1: 30, value2: 95, value3: 76.0 },
        { date: '2024-03-06', value1: 28, value2: 100, value3: 78.1 },
        { date: '2024-03-07', value1: 24, value2: 106, value3: 81.2 }
      ],
      showInChartView: false
    },
    {
      id: 'balance',
      title: 'Current Balance',
      icon: <Wallet className="w-4 h-4 text-gray-600 dark:text-gray-400" />,
      mainValue: '$24,776',
      change: 'Critical',
      changeType: 'critical',
      dataPoint1: { label: 'Daily Order Value', value: '$4,547' },
      dataPoint2: { label: 'Days Remaining', value: '6.1' },
      chartData: [
        { date: '2024-03-01', value1: 30000, value2: 4200, value3: 7.1 },
        { date: '2024-03-02', value1: 29000, value2: 4300, value3: 6.9 },
        { date: '2024-03-03', value1: 28000, value2: 4350, value3: 6.7 },
        { date: '2024-03-04', value1: 27000, value2: 4400, value3: 6.5 },
        { date: '2024-03-05', value1: 26000, value2: 4450, value3: 6.3 },
        { date: '2024-03-06', value1: 25500, value2: 4500, value3: 6.2 },
        { date: '2024-03-07', value1: 24776, value2: 4547, value3: 6.1 }
      ],
      showInChartView: false
    },
    {
      id: 'projected',
      title: 'Projected Orders (7d)',
      icon: <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-400" />,
      mainValue: shopifyMetrics ? Math.floor(shopifyMetrics.totalOrders * 1.2) : 0,
      change: '4.1%',
      changeType: 'positive',
      dataPoint1: { 
        label: 'Avg Order Cost', 
        value: shopifyMetrics && shopifyMetrics.totalOrders > 0 ? 
          `$${(shopifyMetrics.costOfGoodsSold / shopifyMetrics.totalOrders).toFixed(2)}` : '$0.00' 
      },
      dataPoint2: { 
        label: 'Projected Costs', 
        value: shopifyMetrics ? 
          `$${(shopifyMetrics.costOfGoodsSold * 1.2).toFixed(2)}` : '$0.00' 
      },
      chartData: [
        { date: '2024-03-01', value1: 440, value2: 68, value3: 29920 },
        { date: '2024-03-02', value1: 445, value2: 69, value3: 30105 },
        { date: '2024-03-03', value1: 450, value2: 70, value3: 30240 },
        { date: '2024-03-04', value1: 455, value2: 70.5, value3: 30492 },
        { date: '2024-03-05', value1: 460, value2: 71, value3: 30660 },
        { date: '2024-03-06', value1: 465, value2: 71.5, value3: 30847 },
        { date: '2024-03-07', value1: 468, value2: 72, value3: 31005 }
      ],
      showInChartView: false
    }
  ];

  const chartViewCards = cardsData.filter(card => card.showInChartView !== false);
  const selectedCardData = cardsData.find(c => c.id === selectedCard);

  const handleApplyDateRange = () => {
    fetchShopifyData();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
  };

  const dataPointLabels = {
    value1: selectedCard ? cardsData.find(c => c.id === selectedCard)?.title : '',
    value2: selectedCard ? cardsData.find(c => c.id === selectedCard)?.dataPoint1.label : '',
    value3: selectedCard ? cardsData.find(c => c.id === selectedCard)?.dataPoint2.label : ''
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md">
          <p className="text-base font-medium text-gray-900 dark:text-white mb-2">{formatDate(label)}</p>
          <div className="space-y-1">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-white">{dataPointLabels.value1}:</span>{' '}
              {payload[0].value}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-white">{dataPointLabels.value2}:</span>{' '}
              {payload[1].value}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-white">{dataPointLabels.value3}:</span>{' '}
              {payload[2].value}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderChangeIndicator = (change: string, changeType: 'positive' | 'negative' | 'critical') => {
    if (changeType === 'critical') {
      return (
        <div className="flex items-center text-red-500 dark:text-red-400 font-medium">
          <AlertTriangle className="w-4 h-4 mr-1" />
          {change}
        </div>
      );
    }
    
    const Icon = changeType === 'positive' ? ArrowUpRight : ArrowDownRight;
    return (
      <div className={`flex items-center text-sm ${
        changeType === 'positive' ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'
      }`}>
        <Icon className="w-4 h-4 mr-1" />
        {change}
      </div>
    );
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="max-w-[1050px] mx-auto">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button 
            onClick={fetchShopifyData}
            className="px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2 inline" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1050px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
          Hi {userFirstName}, welcome to Revoa👋
        </h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-1.5 h-1.5 rounded-full ${
              shopifyMetrics && (shopifyMetrics.totalOrders > 0 || shopifyMetrics.totalRevenue > 0)
                ? 'bg-green-500'
                : 'bg-gray-400'
            }`}></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {shopifyMetrics && (shopifyMetrics.totalOrders > 0 || shopifyMetrics.totalRevenue > 0)
                ? 'Shopify Connected'
                : 'No Shopify data'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isLoading ? 'Updating...' : 'Updated ' + new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button 
            className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2"
            onClick={handleApplyDateRange}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Refreshing...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </>
            )}
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewType('card')}
              className={`relative flex items-center px-3 py-1.5 rounded-lg text-sm transition-colors ${
                viewType === 'card' 
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm -my-[1px] py-[7px] -mx-[1px] px-[13px]' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4 mr-1.5" />
              Card View
            </button>
            <button
              onClick={() => setViewType('chart')}
              className={`relative flex items-center px-3 py-1.5 rounded-lg text-sm transition-colors ${
                viewType === 'chart' 
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm -my-[1px] py-[7px] -mx-[1px] px-[13px]' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <LineChart className="w-4 h-4 mr-1.5" />
              Chart View
            </button>
          </div>
          <AdReportsTimeSelector
            selectedTime={selectedTime}
            onTimeChange={handleTimeChange}
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            onApply={handleApplyDateRange}
          />
        </div>
      </div>

      {viewType === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cardsData.map((card) => (
            <div 
              key={card.id}
              onClick={() => setSelectedCard(card.id)}
              className="h-[180px] p-4 rounded-xl cursor-pointer transition-colors bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 flex flex-col"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                  {card.icon}
                </div>
                {renderChangeIndicator(card.change, card.changeType)}
              </div>
              <div className="flex-1 flex flex-col">
                <div>
                  <h3 className="text-xs text-gray-500 dark:text-gray-400">{card.title}</h3>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
                    {card.mainValue}
                  </p>
                </div>
                <div className="mt-auto space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{card.dataPoint1.label}</span>
                    <span className="text-xs font-medium text-gray-900 dark:text-white">{card.dataPoint1.value}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{card.dataPoint2.label}</span>
                    <span className="text-xs font-medium text-gray-900 dark:text-white">{card.dataPoint2.value}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-6 gap-2 p-4">
              {chartViewCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => setSelectedCard(card.id)}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    selectedCard === card.id
                      ? 'bg-gray-900 dark:bg-gray-700 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <span className="mr-1.5">{card.icon}</span>
                    <span className="truncate">{card.title}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            {selectedCard && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {cardsData.find(c => c.id === selectedCard)?.title}
                    </h3>
                    {renderChangeIndicator(
                      cardsData.find(c => c.id === selectedCard)?.change || '',
                      cardsData.find(c => c.id === selectedCard)?.changeType || 'positive'
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-[#F43F5E] mr-2"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{dataPointLabels.value1}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-[#E8795A] mr-2"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{dataPointLabels.value2}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-[#EC4899] mr-2"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{dataPointLabels.value3}</span>
                    </div>
                  </div>
                </div>

                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={cardsData.find(c => c.id === selectedCard)?.chartData}
                      margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                      <XAxis 
                        dataKey="date"
                        tickFormatter={formatDate}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                        tickFormatter={(value) => {
                          if (value >= 1000) {
                            return `${(value / 1000).toFixed(0)}k`;
                          }
                          return value.toString();
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="value1"
                        name={dataPointLabels.value1}
                        stroke="#F43F5E"
                        fill="#F43F5E"
                        fillOpacity={0.1}
                      />
                      <Area
                        type="monotone"
                        dataKey="value2"
                        name={dataPointLabels.value2}
                        stroke="#E8795A"
                        fill="#E8795A"
                        fillOpacity={0.1}
                      />
                      <Area
                        type="monotone"
                        dataKey="value3"
                        name={dataPointLabels.value3}
                        stroke="#EC4899"
                        fill="#EC4899"
                        fillOpacity={0.1}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}