import React, { useState, useEffect } from 'react';
import { TrendingUp, BarChart3, DollarSign, CreditCard, RefreshCw, AlertTriangle } from 'lucide-react';
import AdReportsTimeSelector, { TimeOption } from '../components/reports/AdReportsTimeSelector';
import { getCalculatorMetrics, ShopifyCalculatorMetrics } from '../lib/shopify/api';
import { CalculatorSkeleton } from '../components/PageSkeletons';
import { toast } from 'sonner';
import { getCombinedDashboardMetrics } from '../lib/dashboardMetrics';
import { useConnectionStore } from '../lib/connectionStore';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface Metrics {
  profit: number;
  profitChange: number;
  totalRevenue: number;
  revenueChange: number;
  avgOrderValue: number;
  avgOrderChange: number;
  totalAdSpend: number;
  adSpendChange: number;
}

export default function Calculator() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTime, setSelectedTime] = useState<TimeOption>('7d');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endDate: new Date()
  });
  const [metrics, setMetrics] = useState<Metrics>({
    profit: 0,
    profitChange: 0,
    totalRevenue: 0,
    revenueChange: 0,
    avgOrderValue: 0,
    avgOrderChange: 0,
    totalAdSpend: 0,
    adSpendChange: 0
  });
  const [calculatorMetrics, setCalculatorMetrics] = useState<ShopifyCalculatorMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use centralized connection store
  const { shopify, facebook } = useConnectionStore();

  useEffect(() => {
    fetchCalculatorData();
  }, [selectedTime]);

  const handleTimeChange = (time: TimeOption) => {
    setSelectedTime(time);
  };

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
  };

  const handleApplyDateRange = () => {
    fetchCalculatorData();
  };

  const fetchCalculatorData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch combined metrics from Shopify + Facebook
      const combined = await getCombinedDashboardMetrics();
      console.log('[Calculator] Received combined metrics:', combined);

      // Also fetch detailed calculator metrics
      let timeframe = '7d';
      switch (selectedTime) {
        case '24h':
          timeframe = '1d';
          break;
        case '7d':
        case '14d':
          timeframe = '7d';
          break;
        case '30d':
        case '60d':
        case '90d':
          timeframe = '30d';
          break;
        case 'custom':
          timeframe = 'custom';
          break;
      }

      const data = await getCalculatorMetrics(timeframe);
      setCalculatorMetrics(data);

      // Update metrics state with REAL calculated values from combined data
      setMetrics({
        profit: combined.computed.profit,
        profitChange: 0, // TODO: Calculate historical comparison
        totalRevenue: combined.shopify.totalRevenue,
        revenueChange: 0, // TODO: Calculate historical comparison
        avgOrderValue: combined.shopify.averageOrderValue,
        avgOrderChange: 0, // TODO: Calculate historical comparison
        totalAdSpend: combined.facebook.totalSpend,
        adSpendChange: 0 // TODO: Calculate historical comparison
      });
    } catch (error) {
      console.error('Error fetching calculator data:', error);
      setError('Failed to fetch calculator data');
      toast.error('Failed to fetch calculator data', {
        description: error instanceof Error ? error.message : 'Please check your connection'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderChangeIndicator = (change: number) => {
    const isPositive = change > 0;
    const color = isPositive ? 'text-green-500' : 'text-red-500';
    return (
      <span className={`text-sm ${color}`}>
        {isPositive ? '+' : ''}{change}%
      </span>
    );
  };

  if (isLoading) {
    return <CalculatorSkeleton />;
  }

  if (error) {
    return (
      <div className="max-w-[1050px] mx-auto">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
          <div className="text-red-500 mb-4">
            <AlertTriangle className="w-12 h-12 mx-auto" />
          </div>
          <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">Error Loading Calculator</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button 
            onClick={fetchCalculatorData}
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
    <div className="max-w-[1050px] mx-auto space-y-12">
      <div className="mb-6">
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
          Profit & Expenses Calculator
        </h1>
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isLoading ? 'Updating calculations...' : 'Real-time profit tracking'}
          </p>
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
          <AdReportsTimeSelector
            selectedTime={selectedTime}
            onTimeChange={handleTimeChange}
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            onApply={handleApplyDateRange}
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Overview Cards - All same height with flex column justify-between */}
        {[
          {
            icon: <TrendingUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />,
            label: "Profit",
            value: metrics.profit,
            change: metrics.profitChange
          },
          {
            icon: <BarChart3 className="w-4 h-4 text-gray-600 dark:text-gray-400" />,
            label: "Total Revenue",
            value: metrics.totalRevenue,
            change: metrics.revenueChange
          },
          {
            icon: <DollarSign className="w-4 h-4 text-gray-600 dark:text-gray-400" />,
            label: "Avg Order Value",
            value: metrics.avgOrderValue,
            change: metrics.avgOrderChange
          },
          {
            icon: <CreditCard className="w-4 h-4 text-gray-600 dark:text-gray-400" />,
            label: "Total Ad Spend",
            value: metrics.totalAdSpend,
            change: metrics.adSpendChange
          }
        ].map((card, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 h-[140px] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                {card.icon}
              </div>
              {renderChangeIndicator(card.change)}
            </div>
            <div>
              <h3 className="text-xs text-gray-500 dark:text-gray-400">{card.label}</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
                ${card.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Incoming Revenue</h2>
        <div className="grid grid-cols-4 gap-6">
          {/* Incoming Revenue Cards */}
          {[
            {
              label: "Total Revenue",
              value: calculatorMetrics?.totalRevenue || 0,
              change: 12.5
            },
            {
              label: "Returns",
              value: calculatorMetrics?.returnAmount || 0,
              change: -2.1,
              highlight: true
            },
            {
              label: "Net Revenue",
              value: calculatorMetrics?.netRevenue || 0,
              change: 10.4
            },
            {
              label: "Number of Orders",
              value: calculatorMetrics?.numberOfOrders || 0,
              change: 8.1,
              format: (v: number) => v.toString()
            }
          ].map((card, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 h-[120px] flex flex-col justify-between">
              <h3 className="text-xs text-gray-500 dark:text-gray-400">{card.label}</h3>
              <div className="flex items-end space-x-2">
                <span className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {card.format ? card.format(card.value) : `$${card.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </span>
                {renderChangeIndicator(card.change)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-16">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Outgoing Expenses</h2>
        <div className="grid grid-cols-4 gap-6">
          {/* Outgoing Expenses Cards */}
          {[
            {
              label: "COGS",
              value: calculatorMetrics?.costOfGoodsSold || 0,
              change: 6.2
            },
            {
              label: "Transaction Fees",
              value: calculatorMetrics?.transactionFees || 0,
              change: 2.1
            },
            {
              label: "Refunds",
              value: calculatorMetrics?.refunds || 0,
              change: -3.5
            },
            {
              label: "Chargebacks",
              value: calculatorMetrics?.chargebacks || 0,
              change: -1.2
            }
          ].map((card, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 h-[120px] flex flex-col justify-between">
              <h3 className="text-xs text-gray-500 dark:text-gray-400">{card.label}</h3>
              <div className="flex items-end space-x-2">
                <span className="text-2xl font-semibold text-gray-900 dark:text-white">
                  ${card.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {renderChangeIndicator(card.change)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-16">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">More Metrics</h2>
        <div className="grid grid-cols-4 gap-6">
          {/* More Metrics Cards */}
          {[
            {
              label: "Avg Order Value",
              value: calculatorMetrics?.averageOrderValue || 0,
              change: 5.6,
              prefix: "$"
            },
            {
              label: "AOV (Net Refunds)",
              value: calculatorMetrics?.averageOrderValueNetRefunds || 0,
              change: 4.8,
              prefix: "$"
            },
            {
              label: "CLV",
              value: calculatorMetrics?.customerLifetimeValue || 0,
              change: 7.2,
              prefix: "$"
            },
            {
              label: "Purchase Frequency",
              value: calculatorMetrics?.purchaseFrequency || 0,
              change: 2.5,
              format: (v: number) => v.toFixed(2)
            },
            {
              label: "Ad Cost Per Order",
              value: calculatorMetrics?.adCostPerOrder || 0,
              change: -1.8,
              prefix: "$"
            },
            {
              label: "ROAS (Refunds Included)",
              value: calculatorMetrics?.roasRefundsIncluded || 0,
              change: 3.2,
              suffix: "x"
            },
            {
              label: "B/E ROAS",
              value: calculatorMetrics?.breakEvenRoas || 0,
              change: 0.5,
              suffix: "x"
            },
            {
              label: "CAC",
              value: calculatorMetrics?.customerAcquisitionCost || 0,
              change: -2.1,
              prefix: "$"
            },
            {
              label: "Average COGS",
              value: calculatorMetrics?.averageCogs || 0,
              change: 1.5,
              prefix: "$"
            },
            {
              label: "Gross Margin %",
              value: calculatorMetrics?.grossMarginPercent || 0,
              change: 2.2,
              suffix: "%"
            },
            {
              label: "Profit Margin %",
              value: calculatorMetrics?.profitMarginPercent || 0,
              change: 3.1,
              suffix: "%"
            },
            {
              label: "Return Rate",
              value: calculatorMetrics?.returnRate || 0,
              change: -1.5,
              suffix: "%"
            }
          ].map((card, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 h-[120px] flex flex-col justify-between">
              <h3 className="text-xs text-gray-500 dark:text-gray-400">{card.label}</h3>
              <div className="flex items-end space-x-2">
                <span className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {card.prefix || ''}{card.format ? card.format(card.value) : card.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{card.suffix || ''}
                </span>
                {renderChangeIndicator(card.change)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}