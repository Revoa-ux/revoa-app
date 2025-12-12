import React, { useState, useEffect } from 'react';
import { Layers, ChevronDown, ChevronUp, FlaskConical } from 'lucide-react';
import { PlatformComparisonCard } from './PlatformComparisonCard';
import { PlatformBreakdown } from './PlatformBreakdown';
import {
  getMetricsByPlatform,
  getPlatformTimeSeriesData,
  type PlatformComparison,
} from '@/lib/platformComparisonService';
import type { AdPlatform, PlatformBreakdownData } from '@/types/ads';
import { PLATFORM_COLORS } from '@/types/ads';

interface PlatformPerformanceSectionProps {
  startDate: string;
  endDate: string;
  isLoading?: boolean;
  showDemoData?: boolean;
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

function generateMockChartData(days: number = 14): Map<MetricKey, PlatformChartData[]> {
  const chartDataMap = new Map<MetricKey, PlatformChartData[]>();
  const today = new Date();

  const spendData: PlatformChartData[] = [];
  const roasData: PlatformChartData[] = [];
  const profitData: PlatformChartData[] = [];
  const conversionsData: PlatformChartData[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayVariance = Math.sin(i * 0.5) * 0.2 + 1;
    const weekendFactor = [0, 6].includes(date.getDay()) ? 0.7 : 1;

    spendData.push({
      date: dateStr,
      facebook: Math.round((850 + Math.random() * 300) * dayVariance * weekendFactor),
      google: Math.round((620 + Math.random() * 200) * dayVariance * weekendFactor),
      tiktok: Math.round((380 + Math.random() * 150) * dayVariance * weekendFactor),
    });

    roasData.push({
      date: dateStr,
      facebook: 2.8 + Math.random() * 0.8 + (i % 3) * 0.1,
      google: 3.2 + Math.random() * 0.6 + (i % 4) * 0.1,
      tiktok: 2.4 + Math.random() * 0.5 + (i % 2) * 0.15,
    });

    profitData.push({
      date: dateStr,
      facebook: Math.round((420 + Math.random() * 200) * dayVariance * weekendFactor),
      google: Math.round((580 + Math.random() * 250) * dayVariance * weekendFactor),
      tiktok: Math.round((180 + Math.random() * 120) * dayVariance * weekendFactor),
    });

    conversionsData.push({
      date: dateStr,
      facebook: Math.round((45 + Math.random() * 20) * dayVariance * weekendFactor),
      google: Math.round((38 + Math.random() * 15) * dayVariance * weekendFactor),
      tiktok: Math.round((22 + Math.random() * 12) * dayVariance * weekendFactor),
    });
  }

  chartDataMap.set('spend', spendData);
  chartDataMap.set('roas', roasData);
  chartDataMap.set('profit', profitData);
  chartDataMap.set('conversions', conversionsData);

  return chartDataMap;
}

function generateMockPlatformData(): PlatformComparison {
  return {
    platforms: [
      {
        platform: 'facebook',
        spend: 12450.00,
        impressions: 2850000,
        clicks: 42750,
        conversions: 612,
        conversionValue: 38520.00,
        ctr: 1.5,
        cpa: 20.34,
        roas: 3.09,
        profit: 5870.00,
        netROAS: 0.47,
        profitMargin: 15.2,
        change: 12.5,
        data: [],
      },
      {
        platform: 'google',
        spend: 8920.00,
        impressions: 1920000,
        clicks: 34560,
        conversions: 489,
        conversionValue: 32150.00,
        ctr: 1.8,
        cpa: 18.24,
        roas: 3.60,
        profit: 7230.00,
        netROAS: 0.81,
        profitMargin: 22.5,
        change: 8.3,
        data: [],
      },
      {
        platform: 'tiktok',
        spend: 5340.00,
        impressions: 3200000,
        clicks: 28800,
        conversions: 298,
        conversionValue: 14900.00,
        ctr: 0.9,
        cpa: 17.92,
        roas: 2.79,
        profit: 2560.00,
        netROAS: 0.48,
        profitMargin: 17.2,
        change: -3.2,
        data: [],
      },
    ],
    totalSpend: 26710.00,
    totalProfit: 15660.00,
    topPerformer: 'google',
    dateRange: {
      start: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
    },
  };
}

export const PlatformPerformanceSection: React.FC<PlatformPerformanceSectionProps> = ({
  startDate,
  endDate,
  isLoading: externalLoading = false,
  showDemoData = false,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [platformData, setPlatformData] = useState<PlatformComparison | null>(null);
  const [chartDataByMetric, setChartDataByMetric] = useState<Map<MetricKey, PlatformChartData[]>>(new Map());
  const [usingMockData, setUsingMockData] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!startDate || !endDate) return;

      setIsLoading(true);
      try {
        const comparison = await getMetricsByPlatform(startDate, endDate);

        if (comparison.platforms.length === 0 && showDemoData) {
          setPlatformData(generateMockPlatformData());
          setChartDataByMetric(generateMockChartData(14));
          setUsingMockData(true);
          setIsLoading(false);
          return;
        }

        setPlatformData(comparison);
        setUsingMockData(false);

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
        if (showDemoData) {
          setPlatformData(generateMockPlatformData());
          setChartDataByMetric(generateMockChartData(14));
          setUsingMockData(true);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, showDemoData]);

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

  if (!loading && availablePlatforms.length === 0 && !showDemoData) {
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
          {usingMockData && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
              <FlaskConical className="w-3 h-3" />
              Demo Data
            </span>
          )}
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
