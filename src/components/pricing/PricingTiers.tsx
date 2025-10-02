import React from 'react';
import type { PricingTier } from '@/types/pricing';

export const pricingTiers: PricingTier[] = [
  {
    id: 'startup',
    name: 'Startup',
    orderRange: '1-100 orders/month',
    perOrderFee: 2.00,
    transactionFee: 3.5,
    features: ['Basic support', 'Standard processing', 'Email notifications']
  },
  {
    id: 'momentum',
    name: 'Momentum',
    orderRange: '101-500 orders/month',
    perOrderFee: 1.50,
    transactionFee: 3.0,
    features: ['Priority support', 'Fast processing', 'SMS notifications', 'Analytics dashboard']
  },
  {
    id: 'scale',
    name: 'Scale',
    orderRange: '501-2000 orders/month',
    perOrderFee: 1.00,
    transactionFee: 2.5,
    features: ['Dedicated support', 'Express processing', 'Advanced analytics', 'API access']
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    orderRange: '2000+ orders/month',
    perOrderFee: 0.75,
    transactionFee: 2.0,
    features: ['24/7 support', 'Custom integration', 'White-label options', 'Custom SLA']
  }
];

interface PricingTiersProps {
  selectedTier: PricingTier['id'];
  onTierSelect: (tier: PricingTier['id']) => void;
}

export const PricingTiers: React.FC<PricingTiersProps> = ({ selectedTier, onTierSelect }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {pricingTiers.map((tier) => (
        <div
          key={tier.id}
          onClick={() => onTierSelect(tier.id)}
          className={`relative p-6 rounded-xl border-2 transition-all cursor-pointer ${
            selectedTier === tier.id
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
          }`}
        >
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {tier.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {tier.orderRange}
          </p>
          <div className="mb-4">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              ${tier.perOrderFee}
              <span className="text-sm font-normal text-gray-600 dark:text-gray-400">/order</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              + {tier.transactionFee}% transaction fee
            </div>
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
      ))}
    </div>
  );
};
