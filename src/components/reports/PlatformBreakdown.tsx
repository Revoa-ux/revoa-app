import React from 'react';
import { TrendingUp, TrendingDown, Crown, DollarSign, Target, Percent } from 'lucide-react';
import type { AdPlatform, PlatformBreakdownData } from '@/types/ads';
import { PLATFORM_COLORS } from '@/types/ads';
import { getPlatformDisplayName } from '@/lib/platformComparisonService';

interface PlatformBreakdownProps {
  platforms: PlatformBreakdownData[];
  isLoading?: boolean;
}

const PlatformIcon: React.FC<{ platform: AdPlatform; className?: string }> = ({ platform, className = '' }) => {
  const colors = PLATFORM_COLORS[platform];

  if (platform === 'facebook') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor" style={{ color: colors.primary }}>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    );
  }

  if (platform === 'google') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor" style={{ color: colors.primary }}>
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    );
  }

  if (platform === 'tiktok') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor" style={{ color: colors.primary }}>
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
      </svg>
    );
  }

  return null;
};

export const PlatformBreakdown: React.FC<PlatformBreakdownProps> = ({
  platforms,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-sm rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-3 w-full bg-gray-100 dark:bg-gray-700/50 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (platforms.length === 0) {
    return (
      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-sm rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Connect ad platforms to see performance breakdown</p>
        </div>
      </div>
    );
  }

  const maxSpend = Math.max(...platforms.map(p => p.spend));

  return (
    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-sm rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-5 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-medium text-gray-900 dark:text-white">
          Platform Performance Breakdown
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Compare metrics across your connected ad platforms
        </p>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {platforms.map((p) => {
          const colors = PLATFORM_COLORS[p.platform];
          const spendWidth = maxSpend > 0 ? (p.spend / maxSpend) * 100 : 0;

          return (
            <div key={p.platform} className="p-5 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${colors.gradient[0]}20, ${colors.gradient[1]}20)`,
                  }}
                >
                  <PlatformIcon platform={p.platform} className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {getPlatformDisplayName(p.platform)}
                    </span>
                    {p.isTopPerformer && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                        <Crown className="w-3 h-3" />
                        Top Performer
                      </span>
                    )}
                  </div>

                  <div className="relative h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                      style={{
                        width: `${spendWidth}%`,
                        background: `linear-gradient(90deg, ${colors.gradient[0]}, ${colors.gradient[1]})`,
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                        <DollarSign className="w-3 h-3" />
                        Spend
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        ${p.spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {p.spendShare.toFixed(1)}% of total
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                        <TrendingUp className="w-3 h-3" />
                        ROAS
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {p.roas.toFixed(2)}x
                      </div>
                      <div className={`text-xs ${p.netROAS >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        Net: {p.netROAS.toFixed(2)}x
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                        <Percent className="w-3 h-3" />
                        Profit
                      </div>
                      <div className={`text-sm font-medium ${p.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {p.profit >= 0 ? '+' : ''}${Math.abs(p.profit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {p.profitShare.toFixed(1)}% of total
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                        <Target className="w-3 h-3" />
                        Conversions
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {p.conversions.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        ${p.conversions > 0 ? (p.spend / p.conversions).toFixed(2) : '0.00'} CPA
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
