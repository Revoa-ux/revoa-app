import React, { useState, useMemo } from 'react';
import type { PricingTier } from '@/types/pricing';
import { pricingTiers } from './PricingTiers';

interface PricingCalculatorProps {
  selectedTier: PricingTier['id'];
  onTierSelect: (tier: PricingTier['id']) => void;
}

export const PricingCalculator: React.FC<PricingCalculatorProps> = ({ selectedTier, onTierSelect }) => {
  const [orders, setOrders] = useState(100);
  const [avgOrderValue, setAvgOrderValue] = useState(50);

  const tier = pricingTiers.find(t => t.id === selectedTier) || pricingTiers[0];

  const calculation = useMemo(() => {
    const totalOrderValue = orders * avgOrderValue;
    const perOrderFees = orders * tier.perOrderFee;
    const transactionFees = totalOrderValue * (tier.transactionFee / 100);
    const totalFees = perOrderFees + transactionFees;
    const effectiveFeePercentage = (totalFees / totalOrderValue) * 100;

    return {
      totalOrderValue,
      perOrderFees,
      transactionFees,
      totalFees,
      effectiveFeePercentage
    };
  }, [orders, avgOrderValue, tier]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
        Calculate Your Costs
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Monthly Orders
          </label>
          <input
            type="number"
            value={orders}
            onChange={(e) => setOrders(Number(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            min="1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Average Order Value
          </label>
          <input
            type="number"
            value={avgOrderValue}
            onChange={(e) => setAvgOrderValue(Number(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            min="1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Order Value</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            ${calculation.totalOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Fees</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            ${calculation.totalFees.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            ({calculation.effectiveFeePercentage.toFixed(2)}% effective rate)
          </div>
        </div>
        <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-6">
          <div className="text-sm text-primary-600 dark:text-primary-400 mb-1">You Keep</div>
          <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
            ${(calculation.totalOrderValue - calculation.totalFees).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          💡 Based on {orders} orders at ${avgOrderValue} average value, you're in the <strong>{tier.name}</strong> tier
        </p>
      </div>
    </div>
  );
};
