import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Package,
  Search,
  Filter,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  Clock,
  ShoppingCart,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Minus,
  ArrowRight,
  Info
} from 'lucide-react';
import AdReportsTimeSelector, { TimeOption } from '../components/reports/AdReportsTimeSelector';
import TableRowSkeleton from '../components/TableRowSkeleton';
import { FilterButton } from '@/components/FilterButton';
import { InventoryOrderModal } from '@/components/inventory/InventoryOrderModal';
import FlippableMetricCard from '@/components/analytics/FlippableMetricCard';
import { MetricCardData } from '@/lib/analyticsService';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '../lib/toast';
import { SubscriptionPageWrapper } from '@/components/subscription/SubscriptionPageWrapper';
import { useIsBlocked } from '@/components/subscription/SubscriptionGate';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface Product {
  id: string;
  name: string;
  image: string;
  sku: string;
  inStock: number;
  unfulfilled: number;
  fulfilled: number;
  avgFulfillTime: number;
  avgDeliveryTime: number;
  totalSold: number;
  profitMargin: number;
  costPerItem: number;
  shippingCost: number;
  salePrice: number;
  pendingOrderQuantity?: number;
}

type FilterOption = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'unfulfilled';
type SortDirection = 'asc' | 'desc';

interface Column {
  id: keyof Product;
  label: string;
  width: string;
  sortable?: boolean;
  fixed?: boolean;
  render?: (value: any, product: Product) => React.ReactNode;
}

interface InventoryMetrics {
  inventoryStatus: {
    totalInStock: number;
    totalFulfilled: number;
    totalUnfulfilled: number;
    inStockChange: number;
  };
  orderMetrics: {
    totalOrders: number;
    totalUnitsSold: number;
    avgUnitsPerOrder: number;
    ordersChange: number;
  };
  timeMetrics: {
    avgFulfillmentTime: number;
    avgDeliveryTime: number;
    avgDoorToDoorTime: number;
    fulfillmentChange: number;
  };
  financialMetrics: {
    totalRevenue: number;
    avgProfitMarginAmount: number;
    avgProfitMarginPercent: number;
    revenueChange: number;
  };
}

const MINIMUM_ORDER_AMOUNT = 50;

export default function Inventory() {
  const { user } = useAuth();
  const isBlocked = useIsBlocked();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTime, setSelectedTime] = useState<TimeOption>('7d');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endDate: new Date()
  });
  const [filterOption, setFilterOption] = useState<FilterOption>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    field: keyof Product | null;
    direction: SortDirection;
  }>({
    field: null,
    direction: 'asc'
  });

  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>({});
  const [showOrderModal, setShowOrderModal] = useState(false);

  const [metrics, setMetrics] = useState<InventoryMetrics>({
    inventoryStatus: {
      totalInStock: 0,
      totalFulfilled: 0,
      totalUnfulfilled: 0,
      inStockChange: 0
    },
    orderMetrics: {
      totalOrders: 0,
      totalUnitsSold: 0,
      avgUnitsPerOrder: 0,
      ordersChange: 0
    },
    timeMetrics: {
      avgFulfillmentTime: 0,
      avgDeliveryTime: 0,
      avgDoorToDoorTime: 0,
      fulfillmentChange: 0
    },
    financialMetrics: {
      totalRevenue: 0,
      avgProfitMarginAmount: 0,
      avgProfitMarginPercent: 0,
      revenueChange: 0
    }
  });

  const columns: Column[] = [
    {
      id: 'name',
      label: 'Product',
      width: '30%',
      fixed: true,
      sortable: true,
      render: (value, product) => (
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-gray-900 dark:text-white truncate">{value}</div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{product.sku}</div>
        </div>
      )
    },
    { id: 'avgDeliveryTime', label: 'Avg. Delivery Time', width: '18%', sortable: true },
    { id: 'totalSold', label: 'Total Sold', width: '14%', sortable: true },
    {
      id: 'profitMargin',
      label: 'Profit Margin',
      width: '16%',
      sortable: true,
      render: (value) => (
        <div className={`font-medium ${value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {value.toFixed(2)}%
        </div>
      )
    },
    { id: 'inStock', label: 'In Stock', width: '12%', sortable: true }
  ];

  const orderTotals = useMemo(() => {
    let totalCost = 0;
    let totalUnits = 0;
    const items: Array<{
      productId: string;
      productName: string;
      sku: string;
      quantity: number;
      unitCost: number;
      totalCost: number;
    }> = [];

    Object.entries(orderQuantities).forEach(([productId, quantity]) => {
      if (quantity > 0) {
        const product = products.find(p => p.id === productId);
        if (product) {
          const itemCost = quantity * product.costPerItem;
          totalCost += itemCost;
          totalUnits += quantity;
          items.push({
            productId,
            productName: product.name,
            sku: product.sku,
            quantity,
            unitCost: product.costPerItem,
            totalCost: itemCost
          });
        }
      }
    });

    return { totalCost, totalUnits, items };
  }, [orderQuantities, products]);

  const handleQuantityChange = (productId: string, delta: number) => {
    setOrderQuantities(prev => {
      const currentQty = prev[productId] || 0;
      const newQty = Math.max(0, currentQty + delta);
      if (newQty === 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: newQty };
    });
  };

  const handleOrderComplete = (invoiceId: string, paymentMethod: 'stripe' | 'wire') => {
    setOrderQuantities({});
    if (paymentMethod === 'wire') {
      toast.success('Purchase order created. Complete the wire transfer to process your order.');
    }
  };

  const canMakeOrder = orderTotals.totalCost >= MINIMUM_ORDER_AMOUNT;

  // Get days from selected time option
  const getDaysFromTimeOption = (time: TimeOption): number => {
    switch (time) {
      case '24h': return 1;
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case 'custom': return Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24));
      default: return 7;
    }
  };

  // Generate chart data for metrics
  const generateChartData = (baseValue: number, variance: number = 0.15) => {
    const days = getDaysFromTimeOption(selectedTime);
    const data = [];
    // Use dateRange.endDate instead of today, so dates update when range changes
    const endDate = new Date(dateRange.endDate);
    endDate.setHours(23, 59, 59, 999); // End of day

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0); // Start of day

      // Create realistic trending data
      const trend = (days - i) / days; // 0 to 1 over time
      const randomVariance = (Math.random() - 0.5) * variance;
      const value = Math.round(baseValue * (0.85 + trend * 0.3 + randomVariance));

      data.push({
        date: date.toISOString().split('T')[0],
        value: Math.max(0, value)
      });
    }

    return data;
  };

  const metricCards: MetricCardData[] = useMemo(() => {
    if (isBlocked) {
      return [
        {
          id: 'inventory-stock',
          title: 'Total Items in Stock',
          mainValue: '...',
          change: '...',
          changeType: 'positive' as const,
          icon: 'Package',
          dataPoint1: { label: 'Unfulfilled Orders', value: '...' },
          dataPoint2: { label: 'Total Sold', value: '...' }
        },
        {
          id: 'inventory-orders',
          title: 'Total Orders',
          mainValue: '...',
          change: '...',
          changeType: 'positive' as const,
          icon: 'ShoppingCart',
          dataPoint1: { label: 'Units Sold', value: '...' },
          dataPoint2: { label: 'Avg Units/Order', value: '...' }
        },
        {
          id: 'inventory-time',
          title: 'Avg. Delivery Time',
          mainValue: '...',
          change: '...',
          changeType: 'positive' as const,
          icon: 'Clock',
          dataPoint1: { label: 'Fulfillment', value: '...' },
          dataPoint2: { label: 'Door to Door', value: '...' }
        },
        {
          id: 'inventory-revenue',
          title: 'Total Revenue',
          mainValue: '...',
          change: '...',
          changeType: 'positive' as const,
          icon: 'DollarSign',
          dataPoint1: { label: 'Avg Profit/Item', value: '...' },
          dataPoint2: { label: 'Profit Margin', value: '...' }
        }
      ];
    }
    return [
      {
        id: 'inventory-stock',
        title: 'Total Items in Stock',
        mainValue: metrics.inventoryStatus.totalInStock.toLocaleString(),
        change: `${Math.abs(metrics.inventoryStatus.inStockChange)}%`,
        changeType: metrics.inventoryStatus.inStockChange >= 0 ? 'positive' : 'negative',
        icon: 'Package',
        dataPoint1: {
          label: 'Unfulfilled Orders',
          value: metrics.inventoryStatus.totalUnfulfilled.toLocaleString()
        },
        dataPoint2: {
          label: 'Total Sold',
          value: metrics.inventoryStatus.totalFulfilled.toLocaleString()
        }
      },
      {
        id: 'inventory-orders',
        title: 'Total Orders',
        mainValue: metrics.orderMetrics.totalOrders.toLocaleString(),
        change: `${Math.abs(metrics.orderMetrics.ordersChange)}%`,
        changeType: metrics.orderMetrics.ordersChange >= 0 ? 'positive' : 'negative',
        icon: 'ShoppingCart',
        dataPoint1: {
          label: 'Units Sold',
          value: metrics.orderMetrics.totalUnitsSold.toLocaleString()
        },
        dataPoint2: {
          label: 'Avg Units/Order',
          value: metrics.orderMetrics.avgUnitsPerOrder.toFixed(2)
        }
      },
      {
        id: 'inventory-time',
        title: 'Avg Fulfillment Time',
        mainValue: `${metrics.timeMetrics.avgFulfillmentTime.toFixed(1)}h`,
        change: `${Math.abs(metrics.timeMetrics.fulfillmentChange)}%`,
        changeType: metrics.timeMetrics.fulfillmentChange <= 0 ? 'positive' : 'negative', // Lower is better
        icon: 'Clock',
        dataPoint1: {
          label: 'Delivery Time',
          value: `${metrics.timeMetrics.avgDeliveryTime.toFixed(1)}d`
        },
        dataPoint2: {
          label: 'Door-to-Door',
          value: `${metrics.timeMetrics.avgDoorToDoorTime.toFixed(1)}d`
        }
      },
      {
        id: 'inventory-revenue',
        title: 'Total Sold',
        mainValue: `$${metrics.financialMetrics.totalRevenue.toLocaleString()}`,
        change: `${Math.abs(metrics.financialMetrics.revenueChange)}%`,
        changeType: metrics.financialMetrics.revenueChange >= 0 ? 'positive' : 'negative',
        icon: 'DollarSign',
        dataPoint1: {
          label: 'Avg Margin',
          value: `$${metrics.financialMetrics.avgProfitMarginAmount.toFixed(2)}`
        },
        dataPoint2: {
          label: 'Margin %',
          value: `${metrics.financialMetrics.avgProfitMarginPercent.toFixed(1)}%`
        }
      }
    ];
  }, [metrics, isBlocked]);

  // Generate chart data for each metric
  const chartDataMap = useMemo(() => {
    return {
      'inventory-stock': generateChartData(metrics.inventoryStatus.totalInStock, 0.12),
      'inventory-orders': generateChartData(metrics.orderMetrics.totalOrders, 0.20),
      'inventory-time': generateChartData(metrics.timeMetrics.avgFulfillmentTime, 0.10),
      'inventory-revenue': generateChartData(metrics.financialMetrics.totalRevenue, 0.18)
    };
  }, [metrics, selectedTime, dateRange]);

  useEffect(() => {
    if (isBlocked) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);

        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('created_by', user.id)
          .order('name', { ascending: true });

        if (productsError) throw productsError;

        const formattedProducts: Product[] = (productsData || []).map((p) => {
          const metadata = p.metadata as Record<string, unknown> || {};
          const inStock = (metadata.quantity_available as number) || 0;
          const quantitySold = (metadata.quantity_sold as number) || 0;
          const unfulfilled = (metadata.unfulfilled_quantity as number) || 0;
          const fulfilled = quantitySold;
          const totalSold = unfulfilled + fulfilled;

          const avgFulfillTime = (metadata.avg_fulfillment_hours as number) || 0;
          const avgDeliveryTime = (metadata.avg_delivery_days as number) || 0;

          const costPerItem = p.cogs_cost || p.supplier_price || 0;
          const salePrice = p.recommended_retail_price || 0;
          const shippingCost = (metadata.shipping_cost as number) || 0;
          const profitPerItem = salePrice - costPerItem - shippingCost;
          const profitMargin = salePrice > 0 ? (profitPerItem / salePrice) * 100 : 0;

          return {
            id: p.id,
            name: p.name || 'Unnamed Product',
            image: (metadata.image_url as string) || (metadata.images as string[])?.[0] || '',
            sku: (metadata.sku as string) || p.external_id || '',
            inStock,
            unfulfilled,
            fulfilled,
            avgFulfillTime,
            avgDeliveryTime,
            totalSold,
            profitMargin,
            costPerItem,
            shippingCost,
            salePrice,
            pendingOrderQuantity: 0,
          };
        });

        setProducts(formattedProducts);

        const totalInStock = formattedProducts.reduce((sum, p) => sum + p.inStock, 0);
        const totalFulfilled = formattedProducts.reduce((sum, p) => sum + p.fulfilled, 0);
        const totalUnfulfilled = formattedProducts.reduce((sum, p) => sum + p.unfulfilled, 0);
        const totalPending = formattedProducts.reduce((sum, p) => sum + (p.pendingOrderQuantity || 0), 0);

        // Calculate order metrics from inventory data (mock data)
        const totalUnitsSold = totalFulfilled;
        const totalSoldAndUnfulfilled = totalFulfilled + totalUnfulfilled;

        // Estimate total orders (assuming average of 1.8 units per order - realistic for e-commerce)
        const estimatedAvgUnitsPerOrder = 1.8;
        const totalOrders = totalSoldAndUnfulfilled > 0
          ? Math.round(totalSoldAndUnfulfilled / estimatedAvgUnitsPerOrder)
          : 0;

        const avgUnitsPerOrder = totalOrders > 0 ? totalSoldAndUnfulfilled / totalOrders : 0;

        // Calculate time metrics (in days)
        const avgFulfillmentTime = formattedProducts.length > 0
          ? formattedProducts.reduce((sum, p) => sum + p.avgFulfillTime, 0) / formattedProducts.length / 24 // Convert hours to days
          : 0;

        const avgDeliveryTime = formattedProducts.length > 0
          ? formattedProducts.reduce((sum, p) => sum + p.avgDeliveryTime, 0) / formattedProducts.length
          : 0;

        const avgDoorToDoorTime = avgFulfillmentTime + avgDeliveryTime;

        // Calculate financial metrics based on actual fulfilled items
        const totalRevenue = formattedProducts.reduce((sum, p) => sum + (p.fulfilled * p.salePrice), 0);
        const totalProfit = formattedProducts.reduce((sum, p) => {
          const profitPerItem = p.salePrice - p.costPerItem - p.shippingCost;
          return sum + (p.fulfilled * profitPerItem);
        }, 0);
        const avgProfitMarginAmount = totalUnitsSold > 0 ? totalProfit / totalUnitsSold : 0;
        const avgProfitMarginPercent = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

        setMetrics({
          inventoryStatus: {
            totalInStock,
            totalFulfilled,
            totalUnfulfilled,
            inStockChange: 0,
          },
          orderMetrics: {
            totalOrders,
            totalUnitsSold,
            avgUnitsPerOrder,
            ordersChange: 0,
          },
          timeMetrics: {
            avgFulfillmentTime: avgFulfillmentTime * 24, // Convert back to hours for display
            avgDeliveryTime,
            avgDoorToDoorTime,
            fulfillmentChange: 0,
          },
          financialMetrics: {
            totalRevenue,
            avgProfitMarginAmount,
            avgProfitMarginPercent,
            revenueChange: 0,
          },
        });

        setError(null);
      } catch (error) {
        setError('Failed to fetch inventory data');
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id, selectedTime, isBlocked]);

  useEffect(() => {
    const fetchMetrics = async () => {
      // Metrics are already set in state
    };

    fetchMetrics();
  }, [selectedTime]);

  const handleSort = (field: keyof Product) => {
    setSortConfig(prevConfig => ({
      field,
      direction: prevConfig.field === field && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getFilteredAndSortedProducts = React.useMemo(() => {
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    switch (filterOption) {
      case 'in_stock':
        filtered = filtered.filter(product => product.inStock > 100);
        break;
      case 'low_stock':
        filtered = filtered.filter(product => product.inStock <= 100 && product.inStock > 0);
        break;
      case 'out_of_stock':
        filtered = filtered.filter(product => product.inStock === 0);
        break;
      case 'unfulfilled':
        filtered = filtered.filter(product => product.unfulfilled > 0);
        break;
    }

    if (sortConfig.field) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortConfig.field!];
        const bValue = b[sortConfig.field!];

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        return sortConfig.direction === 'asc'
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      });
    }

    return filtered;
  }, [products, searchTerm, filterOption, sortConfig]);

  const getSortIcon = (columnId: keyof Product) => {
    if (sortConfig.field !== columnId) {
      return <ArrowUpDown className="w-4 h-4 text-gray-300 dark:text-gray-600" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-gray-900 dark:text-white" />
      : <ArrowDown className="w-4 h-4 text-gray-900 dark:text-white" />;
  };

  const handleTimeChange = (time: TimeOption) => {
    setSelectedTime(time);

    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (time) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '7d':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '14d':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 14);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '28d':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 28);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'lastMonth': {
        const lastMonth = new Date(now);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      }
      case 'last3Months':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 3);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'ytd':
        startDate = new Date(now.getFullYear(), 0, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '1y':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        return;
      default:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
    }

    setDateRange({ startDate, endDate });
  };

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
  };

  const handleApplyDateRange = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-7rem)]">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 font-medium mb-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <SubscriptionPageWrapper>
      <Helmet>
        <title>Inventory | Revoa</title>
      </Helmet>
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
          Inventory Tracker
        </h1>
        <div className="flex items-start sm:items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 sm:mt-0 flex-shrink-0"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {loading && !isBlocked ? 'Updating inventory data...' : 'Real-time inventory tracking'}
          </p>
        </div>
      </div>

      <div className="flex justify-start sm:justify-end">
        <AdReportsTimeSelector
          selectedTime={selectedTime}
          onTimeChange={handleTimeChange}
          dateRange={dateRange}
          onDateRangeChange={handleDateRangeChange}
          onApply={handleApplyDateRange}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading && !isBlocked ? (
          <>
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-[180px] p-4 rounded-xl bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] animate-pulse">
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-[#3a3a3a] rounded-lg"></div>
                    <div className="w-12 h-5 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
                  </div>
                  <div>
                    <div className="w-24 h-3 bg-gray-200 dark:bg-[#3a3a3a] rounded mb-2"></div>
                    <div className="w-20 h-8 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
                  </div>
                  <div className="mt-auto space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-20 h-3 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
                      <div className="w-12 h-3 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="w-16 h-3 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
                      <div className="w-14 h-3 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            {metricCards.map((card) => (
              <FlippableMetricCard
                key={card.id}
                data={card}
                chartData={isBlocked ? [] : chartDataMap[card.id as keyof typeof chartDataMap]}
                dateRange={dateRange}
                isLoading={loading && !isBlocked}
              />
            ))}
          </>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white whitespace-nowrap">Warehouse Inventory</h2>

          <div className="flex flex-row items-center gap-3">
            <div className="flex-1 sm:flex-initial sm:w-[280px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-[38px] pl-10 pr-10 text-sm bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 focus:border-gray-200 dark:focus:border-gray-700"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-full"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <FilterButton
                icon={Filter}
                label="Filter"
                selectedLabel={filterOption === 'all' ? 'All' : filterOption.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                isActive={filterOption !== 'all'}
                activeCount={filterOption !== 'all' ? 1 : 0}
                hideLabel="md"
                isOpen={showFilterDropdown}
              />

              {showFilterDropdown && (
                <div className="absolute right-0 mt-2 w-[280px] bg-white dark:bg-dark rounded-lg shadow-lg border border-gray-200 dark:border-[#3a3a3a] overflow-hidden z-50">
                  {(['all', 'in_stock', 'low_stock', 'out_of_stock', 'unfulfilled'] as const).map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setFilterOption(option);
                        setShowFilterDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors flex items-center justify-between"
                    >
                      <span>{option === 'all' ? 'All Products' : option.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span>
                      {filterOption === option && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a] overflow-hidden">
          <div className="relative overflow-x-auto">
            <table className="w-full whitespace-nowrap">
              <thead className="bg-white dark:bg-dark">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.id}
                      className={`sticky top-0 px-4 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-dark border-b border-gray-200 dark:border-[#3a3a3a] ${
                        column.fixed ? 'sticky left-0 z-20' : ''
                      }`}
                      style={{ width: column.width }}
                    >
                      {column.sortable ? (
                        <button
                          className="group inline-flex items-center space-x-1"
                          onClick={() => handleSort(column.id)}
                        >
                          <span>{column.label}</span>
                          <span className="text-gray-400 group-hover:text-gray-500">
                            {getSortIcon(column.id)}
                          </span>
                        </button>
                      ) : (
                        column.label
                      )}
                    </th>
                  ))}
                  <th className="sticky top-0 px-4 py-3.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-dark border-b border-gray-200 dark:border-[#3a3a3a]" style={{ width: '140px', minWidth: '140px' }}>
                    Order Qty
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-[#333333]">
                {loading && !isBlocked ? (
                  Array.from({ length: 10 }).map((_, index) => (
                    <TableRowSkeleton key={index} index={index} />
                  ))
                ) : isBlocked ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="bg-white dark:bg-dark">
                      <td className="px-4 py-4 text-sm sticky left-0 z-10 bg-white dark:bg-dark">
                        <div className="min-w-0">
                          <div className="text-[13px] font-medium text-gray-400 dark:text-gray-500">...</div>
                          <div className="text-[11px] text-gray-400 dark:text-gray-500">...</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">...</td>
                      <td className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">...</td>
                      <td className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">...</td>
                      <td className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">...</td>
                      <td className="px-4 py-4 text-sm text-center text-gray-400 dark:text-gray-500">...</td>
                    </tr>
                  ))
                ) : (
                  getFilteredAndSortedProducts.map((product, index) => {
                    const currentQty = orderQuantities[product.id] || 0;
                    const hasPendingOrder = (product.pendingOrderQuantity || 0) > 0;

                    return (
                      <tr
                        key={product.id}
                        className="hover:bg-gray-50 dark:hover:bg-[#3a3a3a] bg-white dark:bg-dark"
                      >
                        {columns.map((column) => (
                          <td
                            key={column.id}
                            className={`px-4 py-4 text-sm ${
                              column.fixed ? 'sticky left-0 z-10 bg-white dark:bg-dark' : ''
                            }`}
                            style={{ width: column.width }}
                          >
                            {column.render
                              ? column.render(product[column.id], product)
                              : typeof product[column.id] === 'number'
                              ? column.id.includes('Time')
                                ? `${product[column.id].toFixed(1)} days`
                                : product[column.id].toLocaleString()
                              : product[column.id]}
                          </td>
                        ))}
                        <td className="px-4 py-4 text-sm" style={{ width: '140px', minWidth: '140px' }}>
                          {hasPendingOrder ? (
                            <div className="flex items-center justify-center">
                              <div className="group relative inline-flex items-center gap-1.5 text-xs font-normal text-blue-600 dark:text-blue-400">
                                <Info className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                                <span>{product.pendingOrderQuantity} ordered</span>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-dark dark:bg-[#3a3a3a] text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                  Ordered on {new Date().toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => handleQuantityChange(product.id, -1)}
                                disabled={currentQty === 0}
                                className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 dark:bg-[#3a3a3a] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#4a4a4a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-8 text-center text-sm font-medium text-gray-900 dark:text-white">
                                {currentQty}
                              </span>
                              <button
                                onClick={() => handleQuantityChange(product.id, 1)}
                                className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 dark:bg-[#3a3a3a] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#4a4a4a] transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {orderTotals.totalUnits > 0 && (
          <div className="flex items-center justify-end gap-4 mt-4">
            <span className="text-xs text-gray-500 dark:text-gray-400">Minimum order: ${MINIMUM_ORDER_AMOUNT}</span>
            <button
              onClick={() => setShowOrderModal(true)}
              disabled={!canMakeOrder}
              className="btn btn-primary inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap"
            >
              <span>Make Order ${orderTotals.totalCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
              <ArrowRight className="btn-icon btn-icon-arrow" />
            </button>
          </div>
        )}
      </div>

      {showOrderModal && (
        <InventoryOrderModal
          onClose={() => setShowOrderModal(false)}
          orderItems={orderTotals.items}
          totalAmount={orderTotals.totalCost}
          totalUnits={orderTotals.totalUnits}
          onOrderComplete={handleOrderComplete}
        />
      )}
    </div>
    </SubscriptionPageWrapper>
  );
}
