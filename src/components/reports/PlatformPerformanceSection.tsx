import React, { useState, useEffect } from 'react';
import { Layers, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { PlatformComparisonCard } from './PlatformComparisonCard';
import { PlatformBreakdown } from './PlatformBreakdown';
import {
  getMetricsByPlatform,
  getPlatformTimeSeriesData,
  type PlatformComparison,
  type PlatformMetrics,
} from '@/lib/platformComparisonService';
import type { AdPlatform, PlatformBreakdownData } from '@/types/ads';
import { PLATFORM_COLORS } from '@/types/ads';

interface PlatformPerformanceSectionProps {
  startDate: string;
  endDate: string;
  isLoading?: boolean;
}

interface PlatformChartData {
  date: string;
  facebook?: number;
  google?: number;
  tiktok?: number;
}

type MetricKey = 'spend' | 'roas' | 'profit' | 'conversions';

const METRICS_CONFIG: { key: MetricKey; title: string; format: 'currency' | 'multiplier' | 'number' }[] = [
  { key: 'spend', title: 'Ad Spend', format: 'currency' },
  { key: 'roas', title: 'ROAS', format: 'multiplier' },
  { key: 'profit', title: 'Net Profit', format: 'currency' },
  { key: 'conversions', title: 'Conversions', format: 'number' },
];

export const PlatformPerformanceSection: React.FC<PlatformPerformanceSectionProps> = ({
  startDate,
  endDate,
  isLoading: externalLoading = false,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [platformData, setPlatformData] = useState<PlatformComparison | null>(null);
  const [chartDataByMetric, setChartDataByMetric] = useState<Map<MetricKey, PlatformChartData[]>>(new Map());

  useEffect(() => {
    const fetchData = async () => {
      if (!startDate || !endDate) return;

      setIsLoading(true);
      try {
        const comparison = await getMetricsByPlatform(startDate, endDate);
        setPlatformData(comparison);

        const chartDataMap = new Map<MetricKey, PlatformChartData[]>();

        for (const metric of METRICS_CONFIG) {
          const timeSeriesData = await getPlatformTimeSeriesData(startDate, endDate, metric.key);

          const dateMap = new Map<string, PlatformChartData>();

          timeSeriesData.platforms.forEach(p => {
            p.data.forEach(d => {
              const existing = dateMap.get(d.date) || { date: d.date };
              (existing as any)[p.platform] = d.value;
              dateMap.set(d.date, existing);
            });
          });

          const sortedData = Array.from(dateMap.values()).sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );

          chartDataMap.set(metric.key, sortedData);
        }

        setChartDataByMetric(chartDataMap);
      } catch (error) {
        console.error('[PlatformPerformanceSection] Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  const loading = isLoading || externalLoading;

  const getPlatformValue = (platform: AdPlatform, metricKey: MetricKey): number => {
    if (!platformData) return 0;
    const p = platformData.platforms.find(pl => pl.platform === platform);
    if (!p) return 0;

    switch (metricKey) {
      case 'spend':
        return p.spend;
      case 'roas':
        return p.roas;
      case 'profit':
        return p.profit;
      case 'conversions':
        return p.conversions;
      default:
        return 0;
    }
  };

  const getBreakdownData = (): PlatformBreakdownData[] => {
    if (!platformData || platformData.platforms.length === 0) return [];

    const totalSpend = platformData.totalSpend;
    const totalProfit = platformData.totalProfit;

    return platformData.platforms.map(p => ({
      platform: p.platform,
      spend: p.spend,
      spendShare: totalSpend > 0 ? (p.spend / totalSpend) * 100 : 0,
      profit: p.profit,
      profitShare: totalProfit !== 0 ? (p.profit / Math.abs(totalProfit)) * 100 : 0,
      roas: p.roas,
      netROAS: p.netROAS,
      conversions: p.conversions,
      isTopPerformer: p.platform === platformData.topPerformer,
    }));
  };

  const availablePlatforms = platformData?.platforms.map(p => p.platform) || [];

  if (!loading && availablePlatforms.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div
        className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-blue-500/10 via-green-500/10 to-rose-500/10 dark:from-blue-500/20 dark:via-green-500/20 dark:to-rose-500/20 rounded-lg">
              <Layers className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Platform Comparison
            </h2>
          </div>
          {availablePlatforms.length > 0 && (
            <div className="flex items-center gap-1.5">
              {availablePlatforms.map(platform => {
                const colors = PLATFORM_COLORS[platform];
                return (
                  <div
                    key={platform}
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: `linear-gradient(135deg, ${colors.gradient[0]}, ${colors.gradient[1]})`,
                    }}
                  />
                );
              })}
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                {availablePlatforms.length} platform{availablePlatforms.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isCollapsed ? (
            <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          )}
        </div>
      </div>

      {!isCollapsed && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {METRICS_CONFIG.map(metric => {
              const chartData = chartDataByMetric.get(metric.key) || [];
              const platforms = availablePlatforms.map(platform => ({
                platform,
                value: getPlatformValue(platform, metric.key),
                change: 0,
              }));

              return (
                <PlatformComparisonCard
                  key={metric.key}
                  title={metric.title}
                  metricKey={metric.key}
                  platforms={platforms}
                  chartData={chartData}
                  format={metric.format}
                  isLoading={loading}
                />
              );
            })}
          </div>

          <PlatformBreakdown
            platforms={getBreakdownData()}
            isLoading={loading}
          />
        </>
      )}
    </div>
  );
};
