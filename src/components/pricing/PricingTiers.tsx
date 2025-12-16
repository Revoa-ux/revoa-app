import React from 'react';
import type { PricingTier } from '@/types/pricing';

export const pricingTiers: PricingTier[] = [
  {
    id: 'startup',
    name: 'Startup',
    revenueRange: '$0-$5k/month',
    revenueMin: 0,
    revenueMax: 5000,
    monthlyFee: 29,
    trialDays: 14,
    features: [
      'Email support',
      '14-day free trial',
      'All features included',
      'No revenue share',
      'Cancel anytime'
    ]
  },
  {
    id: 'momentum',
    name: 'Momentum',
    revenueRange: '$5k-$25k/month',
    revenueMin: 5000,
    revenueMax: 25000,
    monthlyFee: 99,
    features: [
      'Priority support',
      'All Startup features',
      'Access to exclusive community',
      'No revenue share',
      'Advanced analytics'
    ]
  },
  {
    id: 'scale',
    name: 'Scale',
    revenueRange: '$25k-$75k/month',
    revenueMin: 25000,
    revenueMax: 75000,
    monthlyFee: 299,
    features: [
      'Dedicated 7-8 figure ecommerce coach',
      'Access to our CRO and Ad Specialists',
      'All Momentum features',
      'No revenue share',
      'White-glove onboarding'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    revenueRange: '$75k+/month',
    revenueMin: 75000,
    revenueMax: Infinity,
    monthlyFee: 599,
    features: [
      'Custom packaging',
      'Store inventory in our warehouse for free',
      'Advanced supply-chain logistics',
      'All Scale features',
      'Dedicated account manager'
    ]
  }
];

export const getTierForRevenue = (monthlyRevenue: number): PricingTier => {
  return pricingTiers.find(
    tier => monthlyRevenue >= tier.revenueMin && monthlyRevenue < tier.revenueMax
  ) || pricingTiers[pricingTiers.length - 1];
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
            className={`relative p-6 rounded-2xl bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 border transition-all duration-300 ${
              isClickable ? 'cursor-pointer' : ''
            } ${
              isSelected || isActive
                ? 'border-red-500/60 ring-2 ring-red-500/20 shadow-lg'
                : 'border-gray-200/60 dark:border-gray-700/60 hover:border-red-400/60 dark:hover:border-red-500/40 hover:shadow-md'
            }`}
          >
            {isActive && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md">
                  Current Tier
                </span>
              </div>
            )}

            {tier.trialDays && (
              <div className="absolute -top-3 right-4">
                <span className="bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md">
                  {tier.trialDays}-Day Trial
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
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                ${tier.monthlyFee}
                <span className="text-sm font-normal text-gray-600 dark:text-gray-400">/mo</span>
              </div>
            </div>

            <ul className="space-y-2">
              {tier.features.map((feature, index) => (
                <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                  <span className="text-red-500 mr-2">✓</span>
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
