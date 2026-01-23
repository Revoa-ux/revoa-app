import React from 'react';
import type { PricingTier } from '@/types/pricing';

// NOTE: Pricing configuration is for DISPLAY ONLY
// Actual billing is handled by Shopify Managed Pricing configured in Partner Dashboard
// These values must match the plans configured in Shopify Partner Dashboard
export const pricingTiers: PricingTier[] = [
  {
    id: 'startup',
    name: 'Startup',
    orderLimit: 'Up to 100 orders/mo',
    orderMin: 0,
    orderMax: 100,
    monthlyFee: 29,
    trialDays: 14,
    features: [
      'Email support',
      '14-day free trial',
      'All features included',
      'No commission on sales',
      'Cancel anytime'
    ]
  },
  {
    id: 'momentum',
    name: 'Momentum',
    orderLimit: 'Up to 300 orders/mo',
    orderMin: 101,
    orderMax: 300,
    monthlyFee: 99,
    trialDays: 14,
    features: [
      'Priority support',
      '14-day free trial',
      'All Startup features',
      'Access to exclusive community',
      'No commission on sales',
      'Advanced analytics'
    ]
  },
  {
    id: 'scale',
    name: 'Scale',
    orderLimit: 'Up to 1,000 orders/mo',
    orderMin: 301,
    orderMax: 1000,
    monthlyFee: 299,
    trialDays: 14,
    features: [
      '14-day free trial',
      'Dedicated 7-8 figure ecommerce coach',
      'Access to our CRO and Ad Specialists',
      'All Momentum features',
      'No commission on sales',
      'White-glove onboarding'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    orderLimit: 'Unlimited orders',
    orderMin: 1001,
    orderMax: Infinity,
    monthlyFee: 599,
    trialDays: 14,
    features: [
      '14-day free trial',
      'Custom packaging',
      'Store inventory in our warehouse for free',
      'Advanced supply-chain logistics',
      'All Scale features',
      'Dedicated account manager'
    ]
  }
];

export const getTierForOrders = (monthlyOrders: number): PricingTier => {
  return pricingTiers.find(
    tier => monthlyOrders >= tier.orderMin && monthlyOrders <= tier.orderMax
  ) || pricingTiers[pricingTiers.length - 1];
};

interface PricingTiersProps {
  selectedTier?: PricingTier['id'];
  onTierSelect?: (tier: PricingTier['id']) => void;
  currentOrderCount?: number;
}

export const PricingTiers: React.FC<PricingTiersProps> = ({ selectedTier, onTierSelect, currentOrderCount }) => {
  const activeTier = currentOrderCount !== undefined ? getTierForOrders(currentOrderCount) : null;

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
              {tier.orderLimit}
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
