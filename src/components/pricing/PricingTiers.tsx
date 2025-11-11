import React from 'react';
import type { PricingTier } from '@/types/pricing';

export const pricingTiers: PricingTier[] = [
  {
    id: 'startup',
    name: 'Startup',
    revenueRange: '$0-$5k/month',
    revenueMin: 0,
    revenueMax: 5000,
    baseFee: 0,
    percentageFee: 3.5,
    features: [
      'Email support',
      'No subscription fee',
      'All features'
    ]
  },
  {
    id: 'momentum',
    name: 'Momentum',
    revenueRange: '$5k-$25k/month',
    revenueMin: 5000,
    revenueMax: 25000,
    baseFee: 99,
    percentageFee: 1.5,
    features: [
      'Priority support',
      'Lower revenue share',
      'Access to our exclusive community'
    ]
  },
  {
    id: 'scale',
    name: 'Scale',
    revenueRange: '$25k-$75k/month',
    revenueMin: 25000,
    revenueMax: 75000,
    baseFee: 299,
    percentageFee: 0.75,
    features: [
      'Dedicated 7-8 figure ecommerce coach',
      'Access to our CRO and Ad Specialists'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    revenueRange: '$75k+/month',
    revenueMin: 75000,
    revenueMax: Infinity,
    baseFee: 599,
    percentageFee: 0.5,
    features: [
      'Custom packaging',
      'Store inventory in our warehouse for free',
      'Advanced supply-chain logistics'
    ]
  }
];

export const getTierForRevenue = (monthlyRevenue: number): PricingTier => {
  return pricingTiers.find(
    tier => monthlyRevenue >= tier.revenueMin && monthlyRevenue < tier.revenueMax
  ) || pricingTiers[pricingTiers.length - 1];
};

export const calculatePricing = (monthlyRevenue: number): {
  tier: PricingTier;
  baseFee: number;
  variableFee: number;
  totalFee: number;
  effectiveFeePercentage: number;
} => {
  const tier = getTierForRevenue(monthlyRevenue);
  const baseFee = tier.baseFee;
  const variableFee = monthlyRevenue * (tier.percentageFee / 100);
  const totalFee = baseFee + variableFee;
  const effectiveFeePercentage = monthlyRevenue > 0 ? (totalFee / monthlyRevenue) * 100 : 0;

  return {
    tier,
    baseFee,
    variableFee,
    totalFee,
    effectiveFeePercentage
  };
};

interface PricingTiersProps {
  selectedTier?: PricingTier['id'];
  onTierSelect?: (tier: PricingTier['id']) => void;
  currentRevenue?: number;
}

export const PricingTiers: React.FC<PricingTiersProps> = ({ selectedTier, onTierSelect, currentRevenue }) => {
  const activeTier = currentRevenue !== undefined ? getTierForRevenue(currentRevenue) : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {pricingTiers.map((tier) => {
        const isSelected = selectedTier === tier.id;
        const isActive = activeTier?.id === tier.id;
        const isClickable = onTierSelect !== undefined;

        return (
          <div
            key={tier.id}
            onClick={() => isClickable && onTierSelect?.(tier.id)}
            className={`relative p-6 rounded-xl border-2 transition-all duration-300 ${
              isClickable ? 'cursor-pointer' : ''
            } ${
              isSelected || isActive
                ? 'border-primary-500 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 shadow-lg shadow-primary-500/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-600 hover:shadow-lg hover:shadow-primary-500/10 hover:bg-gradient-to-br hover:from-primary-50/50 hover:to-transparent dark:hover:from-primary-900/10 dark:hover:to-transparent'
            }`}
          >
            {isActive && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-primary-600 to-primary-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md">
                  Current Tier
                </span>
              </div>
            )}

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {tier.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {tier.revenueRange}
            </p>

            <div className="mb-4">
              {tier.baseFee > 0 ? (
                <>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    ${tier.baseFee}
                    <span className="text-sm font-normal text-gray-600 dark:text-gray-400">/mo</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    + {tier.percentageFee}% of revenue
                  </div>
                </>
              ) : (
                <>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    $0
                    <span className="text-sm font-normal text-gray-600 dark:text-gray-400">/month</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    + {tier.percentageFee}% of revenue
                  </div>
                </>
              )}
            </div>

            <ul className="space-y-2">
              {tier.features.map((feature, index) => (
                <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                  <span className="text-primary-500 mr-2">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
};
