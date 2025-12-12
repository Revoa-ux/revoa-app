import React, { useState, useEffect } from 'react';
import { Layers, TrendingUp, RefreshCw } from 'lucide-react';
import { PlatformComparisonCard } from './PlatformComparisonCard';
import { PlatformComparisonChart } from './PlatformComparisonChart';
import { PerformanceBreakdown } from './PerformanceBreakdown';
import { getPlatformComparisonMetrics, PLATFORM_COLORS, type PlatformComparisonMetrics } from '@/lib/platformMetricsService';
import type { AdPlatform } from '@/types/ads';

interface PlatformComparisonProps {
  startDate: string;
  endDate: string;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const PlatformComparison: React.FC<PlatformComparisonProps> = ({
  startDate,
  endDate,
  isLoading: externalLoading = false,
  onRefresh
}) => {
  const [data, setData] = useState<PlatformComparisonMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'spend' | 'roas' | 'conversions' | 'ctr' | 'cpa'>('roas');

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const metrics = await getPlatformComparisonMetrics(startDate, endDate);
      setData(metrics);
    } catch (error) {
      console.error('[PlatformComparison] Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loading = isLoading || externalLoading;
  const platforms = data?.platforms || [];
  const connectedPlatforms = platforms.map(p => p.platform) as AdPlatform[];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500/20 via-green-500/20 to-rose-500/20 rounded-xl">
              <Layers className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Cross-Platform Comparison</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading platform data...</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/80 dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
              <div className="space-y-4">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="space-y-2">
                    <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-3 w-full bg-gray-100 dark:bg-gray-600 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (platforms.length < 2) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative p-2.5 rounded-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 via-green-500/30 to-rose-500/30" />
            <Layers className="w-5 h-5 text-gray-700 dark:text-gray-300 relative z-10" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Cross-Platform Comparison</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Comparing {platforms.length} platforms: {connectedPlatforms.map(p => PLATFORM_COLORS[p].name).join(', ')}
            </p>
          </div>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <PlatformComparisonCard
          metric="roas"
          platforms={platforms}
          title="ROAS"
        />
        <PlatformComparisonCard
          metric="cpa"
          platforms={platforms}
          title="Cost per Acquisition"
        />
        <PlatformComparisonCard
          metric="ctr"
          platforms={platforms}
          title="Click-Through Rate"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Performance Trends</h3>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
          {(['roas', 'spend', 'conversions', 'ctr', 'cpa'] as const).map((metric) => (
            <button
              key={metric}
              onClick={() => setSelectedMetric(metric)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                selectedMetric === metric
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {metric === 'roas' ? 'ROAS' :
               metric === 'cpa' ? 'CPA' :
               metric === 'ctr' ? 'CTR' :
               metric.charAt(0).toUpperCase() + metric.slice(1)}
            </button>
          ))}
        </div>
        <PlatformComparisonChart
          data={data?.timeSeries[selectedMetric] || []}
          metric={selectedMetric}
          title={`${selectedMetric === 'roas' ? 'ROAS' :
                   selectedMetric === 'cpa' ? 'CPA' :
                   selectedMetric === 'ctr' ? 'CTR' :
                   selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Over Time`}
          platforms={connectedPlatforms}
          height={350}
        />
      </div>

      <PerformanceBreakdown
        platforms={platforms}
        totals={data?.totals || { totalSpend: 0, totalRevenue: 0, totalConversions: 0, avgRoas: 0, avgCpa: 0 }}
        insights={data?.insights || []}
      />
    </div>
  );
};

export default PlatformComparison;
