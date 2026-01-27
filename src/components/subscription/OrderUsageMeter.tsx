import React, { useEffect, useState } from 'react';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import { getOrderCountAnalysis } from '@/lib/subscriptionService';
import type { PricingTier } from '@/types/pricing';
import { pricingTiers } from '@/components/pricing/PricingTiers';

interface OrderUsageMeterProps {
  storeId: string;
  onUpgradeClick?: () => void;
}

export function OrderUsageMeter({ storeId, onUpgradeClick }: OrderUsageMeterProps) {
  const [analysis, setAnalysis] = useState<{
    orderCount: number;
    currentTier: PricingTier['id'];
    recommendedTier: PricingTier;
    isOverLimit: boolean;
    utilizationPercentage: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsageData();
  }, [storeId]);

  const loadUsageData = async () => {
    setLoading(true);
    const data = await getOrderCountAnalysis(storeId);
    if (data) {
      setAnalysis(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-[#333333] bg-white dark:bg-dark p-6 animate-pulse">
        <div className="h-6 w-40 bg-gray-200 dark:bg-[#2a2a2a] rounded mb-4"></div>
        <div className="h-4 w-full bg-gray-200 dark:bg-[#2a2a2a] rounded"></div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const noPlanSelected = (analysis as any).noPlanSelected === true || !analysis.currentTier;

  if (noPlanSelected) {
    return (
      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
              No Plan Selected
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Please select a subscription plan to continue using all features.
            </p>
            {onUpgradeClick && (
              <button
                onClick={onUpgradeClick}
                className="mt-3 btn btn-primary"
              >
                Select a Plan
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const currentTierData = pricingTiers.find(t => t.id === analysis.currentTier) || pricingTiers[0];
  const isNearLimit = analysis.utilizationPercentage >= 80;
  const isOverLimit = analysis.isOverLimit;
  const needsUpgrade = analysis.recommendedTier.id !== analysis.currentTier;

  // Determine progress bar color
  const getProgressColor = () => {
    if (isOverLimit) return 'bg-red-500';
    if (analysis.utilizationPercentage >= 95) return 'bg-red-500';
    if (analysis.utilizationPercentage >= 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getProgressGradient = () => {
    if (isOverLimit) return 'from-red-500 to-red-600';
    if (analysis.utilizationPercentage >= 95) return 'from-red-500 to-red-600';
    if (analysis.utilizationPercentage >= 80) return 'from-amber-500 to-amber-600';
    return 'from-emerald-500 to-emerald-600';
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-[#333333] bg-white dark:bg-dark p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Order Usage
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Rolling 30-day count
          </p>
        </div>
        {isNearLimit && (
          <AlertTriangle className={`w-5 h-5 ${isOverLimit ? 'text-red-500' : 'text-amber-500'}`} />
        )}
      </div>

      {/* Order Count Display */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900 dark:text-white">
            {analysis.orderCount.toLocaleString()}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            / {currentTierData.orderMax === Infinity ? '∞' : currentTierData.orderMax.toLocaleString()} orders
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {Math.min(analysis.utilizationPercentage, 100)}% of your {currentTierData.name} plan
        </p>
      </div>

      {/* Progress Bar */}
      <div className="relative w-full h-3 bg-gray-100 dark:bg-[#2a2a2a] rounded-full overflow-hidden mb-4">
        <div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${getProgressGradient()} transition-all duration-500 rounded-full`}
          style={{ width: `${Math.min(analysis.utilizationPercentage, 100)}%` }}
        >
          <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
        </div>
      </div>

      {/* Warning Messages */}
      {isOverLimit && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 mb-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900 dark:text-red-100">
                You've exceeded your plan limit
              </p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                Upgrade to continue using all features without interruption.
              </p>
            </div>
          </div>
        </div>
      )}

      {!isOverLimit && isNearLimit && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 mb-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                Approaching your plan limit
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Consider upgrading to avoid service interruption.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade CTA */}
      {needsUpgrade && onUpgradeClick && (
        <button
          onClick={onUpgradeClick}
          className="btn btn-danger w-full"
        >
          <TrendingUp className="btn-icon w-4 h-4" />
          Upgrade to {analysis.recommendedTier.name}
        </button>
      )}
    </div>
  );
}
