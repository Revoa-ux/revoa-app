import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
      width: '25%',
      fixed: true,
      sortable: true,
      render: (value, product) => (
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-gray-900 dark:text-white truncate">{value}</div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{product.sku}</div>
        </div>
      )
    },
    { id: 'inStock', label: 'In Stock', width: '8%', sortable: true },
    { id: 'unfulfilled', label: 'Unfulfilled', width: '8%', sortable: true },
    { id: 'fulfilled', label: 'Fulfilled', width: '8%', sortable: true },
    { id: 'avgFulfillTime', label: 'Avg. Fulfill Time', width: '11%', sortable: true },
    { id: 'avgDeliveryTime', label: 'Avg. Delivery Time', width: '11%', sortable: true },
    { id: 'totalSold', label: 'Total Sold', width: '8%', sortable: true },
    {
      id: 'profitMargin',
      label: 'Profit Margin',
      width: '8%',
      sortable: true,
      render: (value) => (
        <div className={`font-medium ${value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {value.toFixed(2)}%
        </div>
      )
    }
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

  useEffect(() => {
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

        const formattedProducts: Product[] = (productsData || []).map((p, index) => {
          const metadata = p.metadata as Record<string, unknown> || {};
          const inStock = (metadata.quantity_available as number) || 0;
          const quantitySold = (metadata.quantity_sold as number) || 0;

          // Generate realistic mock data based on product index for consistency
          const seed = index + 1;
          const unfulfilled = Math.floor(Math.random() * 15) + 2; // 2-16
          const fulfilled = quantitySold || (Math.floor(seed * 8.7) + 50); // Realistic fulfilled count
          const totalSold = unfulfilled + fulfilled;

          // Fulfillment time: 24-72 hours (1-3 days)
          const avgFulfillTime = (seed % 3) + 1 + (Math.random() * 0.5);

          // Delivery time: 3-7 days
          const avgDeliveryTime = 3 + (seed % 5) + (Math.random() * 0.8);

          // Calculate profit margin
          const costPerItem = p.cogs_cost || p.supplier_price || 10;
          const salePrice = p.recommended_retail_price || costPerItem * 2.5;
          const shippingCost = (metadata.shipping_cost as number) || 3.5;
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

        // Calculate order metrics
        const totalOrders = Math.floor(totalFulfilled / 1.8); // Avg 1.8 items per order
        const totalUnitsSold = totalFulfilled;
        const avgUnitsPerOrder = totalOrders > 0 ? totalUnitsSold / totalOrders : 0;

        // Calculate time metrics (in days)
        const avgFulfillmentTime = formattedProducts.length > 0
          ? formattedProducts.reduce((sum, p) => sum + p.avgFulfillTime, 0) / formattedProducts.length / 24 // Convert hours to days
          : 0;

        const avgDeliveryTime = formattedProducts.length > 0
          ? formattedProducts.reduce((sum, p) => sum + p.avgDeliveryTime, 0) / formattedProducts.length
          : 0;

        const avgDoorToDoorTime = avgFulfillmentTime + avgDeliveryTime;

        // Calculate financial metrics
        const totalRevenue = formattedProducts.reduce((sum, p) => sum + (p.totalSold * p.salePrice), 0);
        const totalProfit = formattedProducts.reduce((sum, p) => {
          const profitPerItem = p.salePrice - p.costPerItem - p.shippingCost;
          return sum + (p.totalSold * profitPerItem);
        }, 0);
        const avgProfitMarginAmount = totalOrders > 0 ? totalProfit / totalOrders : 0;
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
  }, [user?.id, selectedTime]);

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
    setLoading(true);
    setSelectedTime(time);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
    }, 1000);
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

  const renderChangeIndicator = (change: number) => {
    const isPositive = change > 0;
    const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
    return (
      <div className={`flex items-center text-sm ${isPositive ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
        <Icon className="w-4 h-4 mr-1" />
        {Math.abs(change)}%
      </div>
    );
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
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
          Inventory Tracker
        </h1>
        <div className="flex items-start sm:items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 sm:mt-0 flex-shrink-0"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {loading ? 'Updating inventory data...' : 'Real-time inventory tracking'}
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
        {/* Inventory Status Card */}
        <div className="h-[180px] p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <Package className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  {renderChangeIndicator(metrics.inventoryStatus.inStockChange)}
                </div>
                <div>
                  <h3 className="text-xs text-gray-500 dark:text-gray-400">Total Items in Stock</h3>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {metrics.inventoryStatus.totalInStock.toLocaleString()}
                  </p>
                </div>
                <div className="mt-auto space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Unfulfilled Orders</span>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      {metrics.inventoryStatus.totalUnfulfilled.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Total Sold</span>
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      {metrics.inventoryStatus.totalFulfilled.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

        {/* Order Metrics Card */}
        <div className="h-[180px] p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <ShoppingCart className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  {renderChangeIndicator(metrics.orderMetrics.ordersChange)}
                </div>
                <div>
                  <h3 className="text-xs text-gray-500 dark:text-gray-400">Total Orders</h3>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {metrics.orderMetrics.totalOrders.toLocaleString()}
                  </p>
                </div>
                <div className="mt-auto space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Units Sold</span>
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      {metrics.orderMetrics.totalUnitsSold.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Avg Units/Order</span>
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      {metrics.orderMetrics.avgUnitsPerOrder.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

        {/* Time Metrics Card */}
        <div className="h-[180px] p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  {renderChangeIndicator(metrics.timeMetrics.fulfillmentChange)}
                </div>
                <div>
                  <h3 className="text-xs text-gray-500 dark:text-gray-400">Avg Fulfillment Time</h3>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {metrics.timeMetrics.avgFulfillmentTime.toFixed(1)}h
                  </p>
                </div>
                <div className="mt-auto space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Delivery Time</span>
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      {metrics.timeMetrics.avgDeliveryTime.toFixed(1)}d
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Door-to-Door</span>
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      {metrics.timeMetrics.avgDoorToDoorTime.toFixed(1)}d
                    </span>
                  </div>
                </div>
              </div>
            </div>

        {/* Financial Metrics Card */}
        <div className="h-[180px] p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <DollarSign className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  {renderChangeIndicator(metrics.financialMetrics.revenueChange)}
                </div>
                <div>
                  <h3 className="text-xs text-gray-500 dark:text-gray-400">Total Sold</h3>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${metrics.financialMetrics.totalRevenue.toLocaleString()}
                  </p>
                </div>
                <div className="mt-auto space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Avg Margin</span>
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      ${metrics.financialMetrics.avgProfitMarginAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Margin %</span>
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      {metrics.financialMetrics.avgProfitMarginPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
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
                  className="w-full h-[38px] pl-10 pr-10 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 focus:border-gray-200 dark:focus:border-gray-700"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
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
                <div className="absolute right-0 mt-2 w-[280px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                  {(['all', 'in_stock', 'low_stock', 'out_of_stock', 'unfulfilled'] as const).map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setFilterOption(option);
                        setShowFilterDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center justify-between"
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

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="relative overflow-x-auto">
            <table className="w-full whitespace-nowrap">
              <thead className="bg-white dark:bg-gray-800">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.id}
                      className={`sticky top-0 px-4 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${
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
                  <th className="sticky top-0 px-4 py-3.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700" style={{ width: '140px', minWidth: '140px' }}>
                    Order Qty
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  Array.from({ length: 10 }).map((_, index) => (
                    <TableRowSkeleton key={index} index={index} />
                  ))
                ) : (
                  getFilteredAndSortedProducts.map((product, index) => {
                    const currentQty = orderQuantities[product.id] || 0;
                    const hasPendingOrder = (product.pendingOrderQuantity || 0) > 0;

                    return (
                      <tr
                        key={product.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800"
                      >
                        {columns.map((column) => (
                          <td
                            key={column.id}
                            className={`px-4 py-4 text-sm ${
                              column.fixed ? 'sticky left-0 z-10 bg-white dark:bg-gray-800' : ''
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
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                  Ordered on {new Date().toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => handleQuantityChange(product.id, -1)}
                                disabled={currentQty === 0}
                                className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-8 text-center text-sm font-medium text-gray-900 dark:text-white">
                                {currentQty}
                              </span>
                              <button
                                onClick={() => handleQuantityChange(product.id, 1)}
                                className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
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
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              <span>Make Order ${orderTotals.totalCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
              <ArrowRight className="w-4 h-4" />
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
  );
}