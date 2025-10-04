import React, { useState, useMemo } from 'react';
import { calculatePricing } from './PricingTiers';

export const PricingCalculator: React.FC = () => {
  const [monthlyRevenue, setMonthlyRevenue] = useState(10000);

  const pricing = useMemo(() => {
    return calculatePricing(monthlyRevenue);
  }, [monthlyRevenue]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
        Calculate Your Costs
      </h2>

      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Expected Monthly Revenue
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
            $
          </span>
          <input
            type="number"
            value={monthlyRevenue}
            onChange={(e) => setMonthlyRevenue(Math.max(0, Number(e.target.value)))}
            className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg"
            min="0"
            step="1000"
          />
        </div>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Enter your projected monthly revenue from products managed through our platform
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Your Tier</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {pricing.tier.name}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {pricing.tier.revenueRange}
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Base Fee</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            ${pricing.baseFee.toFixed(0)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            per month
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Variable Fee</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            ${pricing.variableFee.toFixed(0)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {pricing.tier.percentageFee}% of revenue
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">Total Monthly Cost</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            ${pricing.totalFee.toFixed(0)}
          </div>
          <div className="text-xs text-blue-500 dark:text-blue-400 mt-1">
            {pricing.effectiveFeePercentage.toFixed(2)}% effective rate
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
          <div className="text-sm text-green-700 dark:text-green-400 mb-1">You Keep</div>
          <div className="text-3xl font-bold text-green-700 dark:text-green-400">
            ${(monthlyRevenue - pricing.totalFee).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-green-600 dark:text-green-400 mt-1">
            {monthlyRevenue > 0 ? ((monthlyRevenue - pricing.totalFee) / monthlyRevenue * 100).toFixed(2) : '0.00'}% of revenue
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Pricing Breakdown</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Monthly Revenue:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                ${monthlyRevenue.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Base Fee:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                ${pricing.baseFee.toFixed(0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                Variable ({pricing.tier.percentageFee}%):
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                ${pricing.variableFee.toFixed(0)}
              </span>
            </div>
            <div className="border-t border-gray-300 dark:border-gray-600 pt-2 flex justify-between">
              <span className="text-gray-900 dark:text-white font-semibold">Total Cost:</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">
                ${pricing.totalFee.toFixed(0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start">
          <span className="text-2xl mr-3">💡</span>
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
              Revenue-Based Pricing
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Your pricing automatically adjusts based on your monthly revenue. As you grow, the percentage decreases,
              ensuring you always get the best value. No contracts, no surprises.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        {[
          { revenue: 2500, label: '$2.5k revenue' },
          { revenue: 10000, label: '$10k revenue' },
          { revenue: 40000, label: '$40k revenue' },
          { revenue: 100000, label: '$100k revenue' }
        ].map(({ revenue, label }) => {
          const calc = calculatePricing(revenue);
          return (
            <button
              key={revenue}
              onClick={() => setMonthlyRevenue(revenue)}
              className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-left"
            >
              <div className="font-semibold text-gray-900 dark:text-white">{label}</div>
              <div className="text-gray-600 dark:text-gray-400">
                ${calc.totalFee.toFixed(0)}/mo ({calc.effectiveFeePercentage.toFixed(2)}%)
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
