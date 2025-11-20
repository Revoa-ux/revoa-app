import React, { useState, useEffect } from 'react';
import { Facebook, AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { PerformanceOverview } from '@/components/reports/PerformanceOverview';
import { UnifiedAdManager } from '@/components/reports/UnifiedAdManager';
import { AIInsightsSidebar } from '@/components/reports/AIInsightsSidebar';
import AdReportsTimeSelector, { TimeOption } from '@/components/reports/AdReportsTimeSelector';
import { getAdReportsMetrics, getCreativePerformance, getCampaignPerformance, getAdSetPerformance } from '@/lib/adReportsService';
import { useConnectionStore } from '@/lib/connectionStore';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

export default function Audit() {
  const [selectedTime, setSelectedTime] = useState<TimeOption>('28d');
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
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [adSets, setAdSets] = useState<any[]>([]);
  const [showAIInsights, setShowAIInsights] = useState(true);

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
      case 'custom':
        return;
    }

    setDateRange({ startDate, endDate });
  };

  const refreshData = async (showSuccessToast = false) => {
    if (!facebook.isConnected) {
      return;
    }

    setIsLoading(true);
    try {
      const startDate = dateRange.startDate.toISOString().split('T')[0];
      const endDate = dateRange.endDate.toISOString().split('T')[0];

      const [metrics, creativesData, campaignsData, adSetsData] = await Promise.all([
        getAdReportsMetrics(startDate, endDate),
        getCreativePerformance(startDate, endDate),
        getCampaignPerformance(startDate, endDate),
        getAdSetPerformance(startDate, endDate)
      ]);

      setPerformanceData(metrics);
      setCreatives(creativesData);
      setCampaigns(campaignsData);
      setAdSets(adSetsData);

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

  useEffect(() => {
    if (facebook.isConnected) {
      refreshData();
    }
  }, [facebook.isConnected, dateRange.startDate.getTime(), dateRange.endDate.getTime()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">Unified Ad Manager</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Cross-platform campaign management and performance insights</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAIInsights(!showAIInsights)}
            className={`flex items-center space-x-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
              showAIInsights
                ? 'bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Insights</span>
          </button>
          <button
            onClick={() => refreshData(true)}
            disabled={isLoading || !facebook.isConnected}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

      {!facebook.isConnected && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Connect Your Ad Platforms
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Connect Facebook to start tracking your ad performance
              </p>
            </div>
            <button className="px-6 py-3 bg-[#1877F2] text-white rounded-lg hover:bg-[#1877F2]/90 transition-colors font-medium flex items-center space-x-2">
              <Facebook className="w-5 h-5" />
              <span>Connect Now</span>
            </button>
          </div>
        </div>
      )}

      {facebook.isConnected && (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <PerformanceOverview metrics={performanceData} />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <UnifiedAdManager
              creatives={creatives}
              campaigns={campaigns}
              adSets={adSets}
              selectedTime={selectedTime}
              onTimeChange={handleTimeChange}
              showAIInsights={showAIInsights}
            />
          </div>
        </>
      )}
    </div>
  );
}
