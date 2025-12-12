import React, { useState } from 'react';
import { BarChart3, Table, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Sparkles, AlertTriangle, Lightbulb, Award } from 'lucide-react';
import { PLATFORM_COLORS, type PlatformMetric, type PlatformInsight } from '@/lib/platformMetricsService';
import type { AdPlatform } from '@/types/ads';

interface PerformanceBreakdownProps {
  platforms: PlatformMetric[];
  totals: {
    totalSpend: number;
    totalRevenue: number;
    totalConversions: number;
    avgRoas: number;
    avgCpa: number;
  };
  insights: PlatformInsight[];
}

type ViewMode = 'visual' | 'table';

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

const InsightIcon: React.FC<{ type: PlatformInsight['type']; className?: string }> = ({ type, className }) => {
  switch (type) {
    case 'best_performer':
      return <Award className={className} />;
    case 'opportunity':
      return <Lightbulb className={className} />;
    case 'warning':
      return <AlertTriangle className={className} />;
    case 'comparison':
      return <TrendingUp className={className} />;
    default:
      return <Sparkles className={className} />;
  }
};

const formatCurrency = (value: number): string => {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatNumber = (value: number): string => {
  return Math.round(value).toLocaleString();
};

const formatPercent = (value: number): string => {
  return `${value.toFixed(2)}%`;
};

export const PerformanceBreakdown: React.FC<PerformanceBreakdownProps> = ({
  platforms,
  totals,
  insights
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('visual');
  const [isExpanded, setIsExpanded] = useState(true);

  if (platforms.length === 0) {
    return null;
  }

  const sortedBySpend = [...platforms].sort((a, b) => b.spend - a.spend);

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div
        className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-xl">
            <BarChart3 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Performance Breakdown</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {platforms.length} platform{platforms.length > 1 ? 's' : ''} connected
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewMode('visual')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'visual'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Visual
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              Table
            </button>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="px-6 pb-6">
          {viewMode === 'visual' ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Spend Distribution
                  </h4>
                  <div className="space-y-3">
                    {sortedBySpend.map((platform) => {
                      const colors = PLATFORM_COLORS[platform.platform];
                      const percentage = totals.totalSpend > 0
                        ? (platform.spend / totals.totalSpend) * 100
                        : 0;

                      return (
                        <div key={platform.platform} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-6 h-6 rounded-lg flex items-center justify-center ${colors.bgLight} ${colors.bgDark}`}
                                style={{ color: colors.primary }}
                              >
                                <PlatformIcon platform={platform.platform} className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {colors.name}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {formatCurrency(platform.spend)}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${percentage}%`,
                                background: `linear-gradient(90deg, ${colors.chartGradient[0]}, ${colors.chartGradient[1]})`
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    ROAS Comparison
                  </h4>
                  <div className="space-y-3">
                    {[...platforms].sort((a, b) => b.roas - a.roas).map((platform, index) => {
                      const colors = PLATFORM_COLORS[platform.platform];
                      const maxRoas = Math.max(...platforms.map(p => p.roas));
                      const percentage = maxRoas > 0 ? (platform.roas / maxRoas) * 100 : 0;
                      const isTop = index === 0;

                      return (
                        <div key={platform.platform} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-6 h-6 rounded-lg flex items-center justify-center ${colors.bgLight} ${colors.bgDark}`}
                                style={{ color: colors.primary }}
                              >
                                <PlatformIcon platform={platform.platform} className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {colors.name}
                              </span>
                              {isTop && (
                                <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                  TOP
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {platform.roas.toFixed(2)}x
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${percentage}%`,
                                background: `linear-gradient(90deg, ${colors.chartGradient[0]}, ${colors.chartGradient[1]})`
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Total Spend</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(totals.totalSpend)}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Total Revenue</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(totals.totalRevenue)}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Blended ROAS</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{totals.avgRoas.toFixed(2)}x</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Avg. CPA</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(totals.avgCpa)}</p>
                </div>
              </div>

              {insights.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    AI Insights
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {insights.map((insight, index) => {
                      const colors = insight.platform ? PLATFORM_COLORS[insight.platform] : null;
                      const bgColor = insight.type === 'best_performer'
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : insight.type === 'warning'
                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
                      const iconColor = insight.type === 'best_performer'
                        ? 'text-green-600 dark:text-green-400'
                        : insight.type === 'warning'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-blue-600 dark:text-blue-400';

                      return (
                        <div
                          key={index}
                          className={`p-4 rounded-xl border ${bgColor} transition-all hover:shadow-md`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 ${iconColor}`}>
                              <InsightIcon type={insight.type} className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                {insight.title}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {insight.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Platform</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Spend</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Revenue</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ROAS</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">CPA</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">CTR</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Conv.</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBySpend.map((platform) => {
                    const colors = PLATFORM_COLORS[platform.platform];
                    return (
                      <tr
                        key={platform.platform}
                        className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.bgLight} ${colors.bgDark}`}
                              style={{ color: colors.primary }}
                            >
                              <PlatformIcon platform={platform.platform} className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {colors.fullName}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(platform.spend)}
                        </td>
                        <td className="py-4 px-4 text-right text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(platform.revenue)}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className={`text-sm font-semibold ${
                            platform.roas >= 2 ? 'text-green-600 dark:text-green-400' :
                            platform.roas >= 1 ? 'text-amber-600 dark:text-amber-400' :
                            'text-red-600 dark:text-red-400'
                          }`}>
                            {platform.roas.toFixed(2)}x
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right text-sm text-gray-700 dark:text-gray-300">
                          {formatCurrency(platform.cpa)}
                        </td>
                        <td className="py-4 px-4 text-right text-sm text-gray-700 dark:text-gray-300">
                          {formatPercent(platform.ctr)}
                        </td>
                        <td className="py-4 px-4 text-right text-sm text-gray-700 dark:text-gray-300">
                          {formatNumber(platform.conversions)}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className={`text-sm font-semibold ${
                            platform.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {formatCurrency(platform.profit)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-gray-900/50">
                    <td className="py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                      Total / Blended
                    </td>
                    <td className="py-4 px-4 text-right text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(totals.totalSpend)}
                    </td>
                    <td className="py-4 px-4 text-right text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(totals.totalRevenue)}
                    </td>
                    <td className="py-4 px-4 text-right text-sm font-bold text-gray-900 dark:text-white">
                      {totals.avgRoas.toFixed(2)}x
                    </td>
                    <td className="py-4 px-4 text-right text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(totals.avgCpa)}
                    </td>
                    <td className="py-4 px-4 text-right text-sm text-gray-500">-</td>
                    <td className="py-4 px-4 text-right text-sm font-bold text-gray-900 dark:text-white">
                      {formatNumber(totals.totalConversions)}
                    </td>
                    <td className="py-4 px-4 text-right text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(platforms.reduce((sum, p) => sum + p.profit, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PerformanceBreakdown;
