import React, { useState } from 'react';
import { Calculator, DollarSign } from 'lucide-react'; // eslint-disable-line @typescript-eslint/no-unused-vars
import { PricingTier, PricingCalculation } from '@/types/pricing';
import { pricingTiers } from './PricingTiers';

interface PricingCalculatorProps {
  selectedTier: PricingTier['id'];
  onTierSelect: (tier: PricingTier['id']) => void;
}

export const PricingCalculator: React.FC<PricingCalculatorProps> = ({
  selectedTier,
  onTierSelect
}) => {
  const [calculation, setCalculation] = useState<PricingCalculation>({ // eslint-disable-line @typescript-eslint/no-unused-vars
    monthlyOrders: 100,
    averageOrderValue: 50,
    selectedTier: selectedTier
  });

  const calculateFees = () => {
    const tier = pricingTiers.find(t => t.id === calculation.selectedTier);
    if (!tier) return { total: 0, breakdown: { orders: 0, transaction: 0 } };

    const orderFees = calculation.monthlyOrders * tier.perOrderFee;
    const transactionFees = (calculation.monthlyOrders * calculation.averageOrderValue * (tier.transactionFee / 100));
    
    return {
      total: orderFees + transactionFees,
      breakdown: {
        orders: orderFees,
        transaction: transactionFees
      }
    };
  };

  const fees = calculateFees();

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Calculator Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Calculate Your Fees</h3>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Monthly Orders
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                value={calculation.monthlyOrders}
                onChange={(e) => setCalculation(prev => ({
                  ...prev,
                  monthlyOrders: parseInt(e.target.value) || 0
                }))}
                className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calculator className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Average Order Value
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                value={calculation.averageOrderValue}
                onChange={(e) => setCalculation(prev => ({
                  ...prev,
                  averageOrderValue: parseInt(e.target.value) || 0
                }))}
                className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fee Breakdown Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Fee Breakdown</h3>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Order Processing Fees</span>
            <span className="text-lg font-medium text-gray-900 dark:text-white">${fees.breakdown.orders.toFixed(2)}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Transaction Fees</span>
            <span className="text-lg font-medium text-gray-900 dark:text-white">${fees.breakdown.transaction.toFixed(2)}</span>
          </div>
          
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-base font-medium text-gray-900 dark:text-white">Estimated Monthly Total</span>
              <span className="text-xl font-semibold text-gray-900 dark:text-white">${fees.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};