import React, { useState, useEffect } from 'react';
import { Facebook, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
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

      const [metrics, creativesData] = await Promise.all([
        getAdReportsMetrics(startDate, endDate),
        getCreativePerformance(startDate, endDate)
      ]);

      setPerformanceData(metrics);
      setCreatives(creativesData);

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
    <div className="space-y-6 p-6 max-w-[1800px] mx-auto">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Ad Performance Analytics</h1>
            <p className="text-blue-100">Real-time insights from your advertising campaigns</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => refreshData(true)}
              disabled={isLoading || !facebook.isConnected}
              className="flex items-center space-x-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
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
