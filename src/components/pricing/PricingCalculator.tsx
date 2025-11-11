import React, { useState, useMemo } from 'react';
import { calculatePricing } from './PricingTiers';
import { DollarSign } from 'lucide-react';

export const PricingCalculator: React.FC = () => {
  const [monthlyRevenue, setMonthlyRevenue] = useState(10000);

  const pricing = useMemo(() => {
    return calculatePricing(monthlyRevenue);
  }, [monthlyRevenue]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '');
    const numValue = Math.max(0, Number(value) || 0);
    setMonthlyRevenue(numValue);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
        Calculate Your Costs
      </h2>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Expected Monthly Revenue
        </label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
            <DollarSign className="w-5 h-5" />
          </div>
          <input
            type="text"
            inputMode="numeric"
            value={formatCurrency(monthlyRevenue)}
            onChange={handleInputChange}
            className="w-full pl-12 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-transparent"
          />
        </div>
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

        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6">
          <div className="text-sm text-red-600 dark:text-red-400 mb-1">Total Monthly Cost</div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            ${pricing.totalFee.toFixed(0)}
          </div>
          <div className="text-xs text-red-500 dark:text-red-400 mt-1">
            {pricing.effectiveFeePercentage.toFixed(2)}% effective rate
          </div>
        </div>
      </div>

      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
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
    </div>
  );
};
