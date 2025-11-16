import React, { useState, useEffect, useRef } from 'react';
import {
  Facebook,
  Search,
  AlertTriangle,
  X,
  ChevronDown,
  Check,
  GitBranch as BrandTiktok,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { AdAccount, AdInsight, AdCheckItem } from '@/types/ads';
import { PerformanceOverview } from '@/components/reports/PerformanceOverview';
import { CreativeAnalysis } from '@/components/reports/CreativeAnalysis';
import AdReportsTimeSelector, { TimeOption } from '@/components/reports/AdReportsTimeSelector';
import { getAdReportsMetrics, getCreativePerformance } from '@/lib/adReportsService';
import { useConnectionStore } from '@/lib/connectionStore';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

export default function Audit() {
  const [selectedTime, setSelectedTime] = useState<TimeOption>('28d');

  // Initialize date range for last 28 days
  const initialEndDate = new Date();
  initialEndDate.setHours(23, 59, 59, 999);
  const initialStartDate = new Date(initialEndDate);
  initialStartDate.setDate(initialStartDate.getDate() - 28);
  initialStartDate.setHours(0, 0, 0, 0);

  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: initialStartDate,
    endDate: initialEndDate
  });
  const [isLoading, setIsLoading] = useState(false);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [creatives, setCreatives] = useState<any[]>([]);
  const [hasRealData, setHasRealData] = useState(false);

  // Use centralized connection store
  const { facebook } = useConnectionStore();

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
        startDate = new Date(now);
        startDate.setDate(1);
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
      case 'custom':
        // For custom, don't update dates - they'll be set by the calendar
        return;
    }

    setDateRange({ startDate, endDate });
  };

  const refreshData = async (showSuccessToast = false) => {
    if (!facebook.isConnected) {
      console.log('[Audit] Facebook not connected, skipping data fetch');
      return;
    }

    setIsLoading(true);
    try {
      const startDate = dateRange.startDate.toISOString().split('T')[0];
      const endDate = dateRange.endDate.toISOString().split('T')[0];

      console.log('[Audit] Fetching data for date range:', { startDate, endDate });

      // Fetch real metrics and creatives
      const [metrics, creativesData] = await Promise.all([
        getAdReportsMetrics(startDate, endDate),
        getCreativePerformance(startDate, endDate)
      ]);

      console.log('[Audit] Received data:', { metrics, creativesCount: creativesData.length });

      setPerformanceData(metrics);
      setCreatives(creativesData);
      setHasRealData(creativesData.length > 0);

      // Only show success toast if explicitly requested (e.g., manual refresh)
      if (showSuccessToast) {
        toast.success('Data refreshed successfully');
      }
    } catch (error) {
      console.error('[Audit] Error refreshing data:', error);
      toast.error('Failed to refresh ad data');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount and when Facebook is connected
  useEffect(() => {
    if (facebook.isConnected) {
      refreshData();
    }
  }, [facebook.isConnected]);

  // Refresh data when date range changes
  useEffect(() => {
    if (facebook.isConnected) {
      refreshData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.startDate.getTime(), dateRange.endDate.getTime()]);

  const handleConnectPlatform = (platform: 'facebook' | 'tiktok') => {
    console.log('Connecting to', platform);
  };

  const getTimePeriodText = (time: TimeOption): string => {
    switch (time) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case '7d': return 'Last 7 days';
      case '14d': return 'Last 14 days';
      case '28d': return 'Last 28 days';
      default: return 'Today';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Ad Performance Audit</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Comprehensive analysis of your advertising campaigns
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => refreshData(true)}
              disabled={isLoading || !facebook.isConnected}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <AdReportsTimeSelector
              selectedTime={selectedTime}
              onTimeChange={handleTimeChange}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              onApply={refreshData}
            />
          </div>
        </div>
      </div>

      {!facebook.isConnected && (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-white dark:bg-gray-700 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Connect Facebook Ads</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Connect your Facebook Ads account to view performance insights</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleConnectPlatform('facebook')}
                className="px-4 py-2 text-sm text-white bg-[#1877F2] rounded-lg hover:bg-[#1877F2]/90 transition-colors flex items-center whitespace-nowrap"
              >
                <Facebook className="w-4 h-4 mr-2" />
                Connect Facebook
              </button>
            </div>
          </div>
        </div>
      )}

      {facebook.isConnected && (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <PerformanceOverview metrics={performanceData} />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <CreativeAnalysis
              creatives={creatives}
              selectedTime={selectedTime}
              onTimeChange={handleTimeChange}
            />
          </div>
        </>
      )}
    </div>
  );
}
