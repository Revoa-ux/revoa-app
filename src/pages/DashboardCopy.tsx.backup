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
  AlertTriangle,
  X,
  Info,
  RotateCcw
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AdReportsTimeSelector, { TimeOption } from '../components/reports/AdReportsTimeSelector';
import { getDashboardMetrics, ShopifyMetrics } from '../lib/shopify/api';
import { DashboardSkeleton } from '../components/PageSkeletons';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { getCombinedDashboardMetrics, type CombinedMetrics } from '../lib/dashboardMetrics';
import { useConnectionStore } from '../lib/connectionStore';  

type CardType =
  | 'profit'
  | 'revenue'
  | 'orders'
  | 'aov'
  | 'cogs'
  | 'adCosts'
  | 'transactionFees'
  | 'returns'
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

  // Initialize date range for 7 days
  const initialEndDate = new Date();
  initialEndDate.setHours(23, 59, 59, 999);
  const initialStartDate = new Date(initialEndDate);
  initialStartDate.setDate(initialStartDate.getDate() - 7);
  initialStartDate.setHours(0, 0, 0, 0);

  const [dateRange, setDateRange] = useState({
    startDate: initialStartDate,
    endDate: initialEndDate
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<CardType>('profit');
  const [viewType, setViewType] = useState<ViewType>('card');
  const [shopifyMetrics, setShopifyMetrics] = useState<ShopifyMetrics | null>(null);
  const [combinedMetrics, setCombinedMetrics] = useState<CombinedMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [emptyStateDismissed, setEmptyStateDismissed] = useState(false);

  // Use centralized connection store
  const { shopify, facebook } = useConnectionStore();

  const handleTimeChange = useCallback((time: TimeOption) => {
    setSelectedTime(time);

    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (time) {
      case 'today':
        setTimeframe('1d');
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        setTimeframe('1d');
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '7d':
        setTimeframe('7d');
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '14d':
        setTimeframe('7d');
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 14);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '30d':
        setTimeframe('30d');
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '60d':
        setTimeframe('30d');
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 60);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '90d':
        setTimeframe('30d');
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 90);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'this_month':
        setTimeframe('30d');
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'last_month':
        setTimeframe('30d');
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'ytd':
        setTimeframe('30d');
        startDate = new Date(now.getFullYear(), 0, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        setTimeframe('custom');
        // Don't update date range for custom - user will set it manually
        return;
      default:
        setTimeframe('7d');
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
    }

    console.log('[Dashboard] Time changed to:', time, 'Range:', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);
    setDateRange({ startDate, endDate });
  }, []);

  const handleDateRangeChange = (range: { startDate: Date; endDate: Date }) => {
    setDateRange(range);
  };

  const fetchShopifyData = async () => {
    try {
      console.log('[Dashboard] Fetching metrics for:', dateRange.startDate.toISOString().split('T')[0], 'to', dateRange.endDate.toISOString().split('T')[0]);
      setIsLoading(true);
      setError(null);

      // Format dates as ISO strings for the API
      const startDateStr = dateRange.startDate.toISOString();
      const endDateStr = dateRange.endDate.toISOString();

      // Fetch combined metrics from Shopify + Facebook
      const combined = await getCombinedDashboardMetrics(startDateStr, endDateStr);

      setCombinedMetrics(combined);
      setShopifyMetrics(combined.shopify);

      // Check if we got real data or defaults
      if (combined.shopify.totalOrders === 0 && combined.shopify.totalRevenue === 0) {
        console.warn('[Dashboard] No orders/revenue yet. Store may be new or has no sales.');
      } else {
        console.log('[Dashboard] Successfully loaded data:', {
          orders: combined.shopify.totalOrders,
          revenue: combined.shopify.totalRevenue,
          adSpend: combined.facebook.totalSpend,
          profit: combined.computed.profit,
          roas: combined.computed.roas
        });
      }
    } catch (error) {
      console.error('[Dashboard] Error fetching dashboard data:', error);
      setError('Failed to fetch dashboard data. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShopifyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.startDate.getTime(), dateRange.endDate.getTime()]);

  // Load empty state dismissed preference
  useEffect(() => {
    const dismissed = localStorage.getItem('dashboard-empty-state-dismissed');
    if (dismissed === 'true') {
      setEmptyStateDismissed(true);
    }
  }, []);

  // Fetch user name from profile
  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('display_name, first_name, last_name')
            .eq('user_id', user.id)
            .maybeSingle();

          if (profile) {
            // Prefer first_name, fallback to splitting display_name
            if (profile.first_name) {
              setUserName(profile.first_name);
            } else if (profile.display_name) {
              const firstName = profile.display_name.split(' ')[0];
              setUserName(firstName);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user name:', error);
      }
    };

    fetchUserName();
  }, []);

  const handleDismissEmptyState = () => {
    localStorage.setItem('dashboard-empty-state-dismissed', 'true');
    setEmptyStateDismissed(true);
  };

  // Generate card data based on combined metrics (Shopify + Facebook)
  const cardsData: CardData[] = [
    {
      id: 'profit',
      title: 'Profit',
      icon: <TrendingUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />,
      mainValue: combinedMetrics ? `$${combinedMetrics.computed.profit.toFixed(2)}` : '$0.00',
      change: combinedMetrics ? `${combinedMetrics.computed.profitMargin.toFixed(1)}%` : '0%',
      changeType: combinedMetrics && combinedMetrics.computed.profit >= 0 ? 'positive' : 'negative',
      dataPoint1: {
        label: 'Margin',
        value: combinedMetrics ? `${combinedMetrics.computed.profitMargin.toFixed(1)}%` : '0%'
      },
      dataPoint2: {
        label: 'ROAS',
        value: combinedMetrics && combinedMetrics.facebook.totalSpend > 0 ? `${combinedMetrics.computed.roas.toFixed(2)}x` : '0.00x'
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
        value: shopifyMetrics ? `$${(shopifyMetrics.monthlyRecurringRevenue / 1000).toFixed(2)}k` : '$0.00k' 
      },
      dataPoint2: { 
        label: 'ARR', 
        value: shopifyMetrics ? `$${(shopifyMetrics.annualRecurringRevenue / 1000).toFixed(2)}k` : '$0.00k' 
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
        value: shopifyMetrics ? `${((shopifyMetrics.activeCustomers / shopifyMetrics.totalCustomers) * 100).toFixed(2)}%` : '0%' 
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
      title: 'Ad Spend',
      icon: <CreditCard className="w-4 h-4 text-gray-600 dark:text-gray-400" />,
      mainValue: combinedMetrics ? `$${combinedMetrics.facebook.totalSpend.toFixed(2)}` : '$0.00',
      change: facebook.isConnected ? '0.0%' : 'Not connected',
      changeType: facebook.isConnected ? 'negative' : 'critical',
      dataPoint1: { label: 'ROAS', value: combinedMetrics && combinedMetrics.facebook.totalSpend > 0 ? `${combinedMetrics.computed.roas.toFixed(2)}x` : '0.00x' },
      dataPoint2: { label: 'CPA', value: combinedMetrics && combinedMetrics.shopify.totalOrders > 0 && combinedMetrics.facebook.totalSpend > 0 ? `$${(combinedMetrics.facebook.totalSpend / combinedMetrics.shopify.totalOrders).toFixed(2)}` : '$0.00' },
      chartData: [
        { date: '2024-03-01', value1: 0, value2: 0, value3: 0 },
        { date: '2024-03-02', value1: 0, value2: 0, value3: 0 },
        { date: '2024-03-03', value1: 0, value2: 0, value3: 0 },
        { date: '2024-03-04', value1: 0, value2: 0, value3: 0 },
        { date: '2024-03-05', value1: 0, value2: 0, value3: 0 },
        { date: '2024-03-06', value1: 0, value2: 0, value3: 0 },
        { date: '2024-03-07', value1: 0, value2: 0, value3: 0 }
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
      id: 'returns',
      title: 'Returns',
      icon: <RotateCcw className="w-4 h-4 text-gray-600 dark:text-gray-400" />,
      mainValue: shopifyMetrics ? `$${shopifyMetrics.returnAmount.toFixed(2)}` : '$0.00',
      change: shopifyMetrics ? `${shopifyMetrics.returnRate.toFixed(1)}%` : '0.0%',
      changeType: 'negative',
      dataPoint1: {
        label: 'Return Rate',
        value: shopifyMetrics ? `${shopifyMetrics.returnRate.toFixed(2)}%` : '0.00%'
      },
      dataPoint2: {
        label: 'Net Revenue',
        value: shopifyMetrics ? `$${(shopifyMetrics.totalRevenue - shopifyMetrics.returnAmount).toFixed(2)}` : '$0.00'
      },
      chartData: [
        { date: '2024-03-01', value1: 150, value2: 3.3, value3: 4350 },
        { date: '2024-03-02', value1: 165, value2: 3.4, value3: 4635 },
        { date: '2024-03-03', value1: 180, value2: 3.5, value3: 5020 },
        { date: '2024-03-04', value1: 195, value2: 3.4, value3: 5605 },
        { date: '2024-03-05', value1: 210, value2: 3.8, value3: 5390 },
        { date: '2024-03-06', value1: 190, value2: 4.3, value3: 4210 },
        { date: '2024-03-07', value1: 220, value2: 3.9, value3: 5380 }
      ],
      showInChartView: true
    },
    {
      id: 'fulfill',
      title: 'Orders to Fulfill',
      icon: <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />,
      mainValue: shopifyMetrics ? (shopifyMetrics.totalOrders - (shopifyMetrics.totalOrders * 0.85)).toFixed(2) : '0.00',
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
      mainValue: '$0.00',
      change: '0.0%',
      changeType: 'negative',
      dataPoint1: { label: 'Daily Order Value', value: '$0.00' },
      dataPoint2: { label: 'Days Remaining', value: '0.0' },
      chartData: [
        { date: '2024-03-01', value1: 0, value2: 0, value3: 0 },
        { date: '2024-03-02', value1: 0, value2: 0, value3: 0 },
        { date: '2024-03-03', value1: 0, value2: 0, value3: 0 },
        { date: '2024-03-04', value1: 0, value2: 0, value3: 0 },
        { date: '2024-03-05', value1: 0, value2: 0, value3: 0 },
        { date: '2024-03-06', value1: 0, value2: 0, value3: 0 },
        { date: '2024-03-07', value1: 0, value2: 0, value3: 0 }
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
        <div className="flex items-center text-sm text-red-500 dark:text-red-400">
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
          Hi {userName || 'there'}, welcome to Revoa👋
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

      {/* Facebook Ads Sync Warning */}
      {facebook.isConnected && combinedMetrics && !combinedMetrics.facebook.hasData && !isLoading && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                Facebook Ads Data Not Synced
              </h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                Your Facebook Ads account is connected, but no campaign data has been synced yet. Click "Sync" in Settings to pull your ad spend data.
              </p>
              <a
                href="/settings"
                className="inline-flex items-center px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-600 text-white text-sm rounded-lg transition-colors"
              >
                Go to Settings →
              </a>
            </div>
          </div>
        </div>
      )}

      {shopifyMetrics && shopifyMetrics.totalOrders === 0 && shopifyMetrics.totalRevenue === 0 && !isLoading && !emptyStateDismissed && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg relative">
          <button
            onClick={handleDismissEmptyState}
            className="absolute top-3 right-3 p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-md transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start space-x-3 pr-8">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                Store Connected Successfully
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Your Shopify store is connected and ready. Once you receive orders, your metrics will automatically populate here with real-time data including revenue, profit, and performance analytics.
              </p>
            </div>
          </div>
        </div>
      )}

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
                            return `${(value / 1000).toFixed(2)}k`;
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