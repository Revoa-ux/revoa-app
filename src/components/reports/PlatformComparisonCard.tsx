import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Target, MousePointerClick, ShoppingCart, Percent } from 'lucide-react';
import { PLATFORM_COLORS, type PlatformMetric } from '@/lib/platformMetricsService';
import type { AdPlatform } from '@/types/ads';

interface PlatformComparisonCardProps {
  metric: 'roas' | 'cpa' | 'ctr' | 'spend' | 'conversions' | 'cvr';
  platforms: PlatformMetric[];
  title: string;
  format?: 'currency' | 'percentage' | 'number' | 'multiplier';
}

const METRIC_CONFIG = {
  roas: {
    icon: TrendingUp,
    label: 'ROAS',
    format: 'multiplier' as const,
    higherIsBetter: true
  },
  cpa: {
    icon: Target,
    label: 'CPA',
    format: 'currency' as const,
    higherIsBetter: false
  },
  ctr: {
    icon: MousePointerClick,
    label: 'CTR',
    format: 'percentage' as const,
    higherIsBetter: true
  },
  spend: {
    icon: DollarSign,
    label: 'Spend',
    format: 'currency' as const,
    higherIsBetter: false
  },
  conversions: {
    icon: ShoppingCart,
    label: 'Conversions',
    format: 'number' as const,
    higherIsBetter: true
  },
  cvr: {
    icon: Percent,
    label: 'CVR',
    format: 'percentage' as const,
    higherIsBetter: true
  }
};

const PlatformIcon: React.FC<{ platform: AdPlatform; className?: string }> = ({ platform, className }) => {
  if (platform === 'facebook') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
      </svg>
    );
  }
  if (platform === 'google') {
    return (
      <svg className={className} viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    );
  }
  if (platform === 'tiktok') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
      </svg>
    );
  }
  return null;
};

export const PlatformComparisonCard: React.FC<PlatformComparisonCardProps> = ({
  metric,
  platforms,
  title
}) => {
  const config = METRIC_CONFIG[metric];
  const Icon = config.icon;

  const formatValue = (value: number): string => {
    switch (config.format) {
      case 'currency':
        return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'percentage':
        return `${value.toFixed(2)}%`;
      case 'multiplier':
        return `${value.toFixed(2)}x`;
      case 'number':
        return Math.round(value).toLocaleString();
      default:
        return value.toFixed(2);
    }
  };

  const getValue = (p: PlatformMetric): number => {
    return p[metric] || 0;
  };

  const sortedPlatforms = [...platforms].sort((a, b) => {
    const aVal = getValue(a);
    const bVal = getValue(b);
    return config.higherIsBetter ? bVal - aVal : aVal - bVal;
  });

  const maxValue = Math.max(...platforms.map(getValue));
  const minValue = Math.min(...platforms.map(getValue));

  const getBestWorst = () => {
    if (platforms.length < 2) return { best: null, worst: null };
    return {
      best: sortedPlatforms[0]?.platform,
      worst: sortedPlatforms[sortedPlatforms.length - 1]?.platform
    };
  };

  const { best, worst } = getBestWorst();

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-xl">
            <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Cross-platform comparison</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {sortedPlatforms.map((platform, index) => {
          const value = getValue(platform);
          const colors = PLATFORM_COLORS[platform.platform];
          const isBest = platform.platform === best;
          const isWorst = platform.platform === worst && platforms.length > 1;
          const barWidth = maxValue > 0 ? (value / maxValue) * 100 : 0;

          return (
            <div key={platform.platform} className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.bgLight} ${colors.bgDark}`}
                    style={{ color: colors.primary }}
                  >
                    <PlatformIcon platform={platform.platform} className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {colors.name}
                  </span>
                  {isBest && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                      BEST
                    </span>
                  )}
                  {isWorst && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                      REVIEW
                    </span>
                  )}
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatValue(value)}
                </span>
              </div>

              <div className="relative h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.max(barWidth, 2)}%`,
                    background: `linear-gradient(90deg, ${colors.chartGradient[0]}, ${colors.chartGradient[1]}, ${colors.chartGradient[2]})`
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {platforms.length > 1 && (
        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">
              {config.higherIsBetter ? 'Higher is better' : 'Lower is better'}
            </span>
            {best && worst && (
              <span className="text-gray-600 dark:text-gray-300">
                {PLATFORM_COLORS[best].name} vs {PLATFORM_COLORS[worst].name}:{' '}
                <span className={config.higherIsBetter ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}>
                  {(() => {
                    const bestVal = getValue(sortedPlatforms[0]);
                    const worstVal = getValue(sortedPlatforms[sortedPlatforms.length - 1]);
                    if (worstVal === 0) return 'N/A';
                    const diff = ((bestVal - worstVal) / worstVal) * 100;
                    return `${diff > 0 ? '+' : ''}${diff.toFixed(0)}%`;
                  })()}
                </span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformComparisonCard;
