import React from 'react';
import { Check } from 'lucide-react'; // eslint-disable-line @typescript-eslint/no-unused-vars
import { PricingTier } from '@/types/pricing';

export const pricingTiers: PricingTier[] = [
  {
    id: 'startup',
    name: 'Startup',
    description: 'Perfect for new businesses and startups',
    monthlyFee: 0,
    perOrderFee: 0.25,
    transactionFee: 2.5,
    orderLimit: 50,
    features: [
      'Up to 50 orders per month'
    ]
  },
  {
    id: 'momentum',
    name: 'Momentum',
    description: 'Ideal for growing businesses',
    monthlyFee: 0,
    perOrderFee: 0.20,
    transactionFee: 2.0,
    orderLimit: 500,
    features: [
      'Up to 500 orders per month'
    ]
  },
  {
    id: 'scale',
    name: 'Scale',
    description: 'For brands with high sales volume',
    monthlyFee: 0,
    perOrderFee: 0.15,
    transactionFee: 1.5,
    orderLimit: 1000,
    features: [
      'Up to 1,000 orders per month'
    ]
  },
  {
    id: 'business',
    name: 'Business',
    description: 'The ultimate solution for established brands',
    monthlyFee: 0,
    perOrderFee: 0.10,
    transactionFee: 1.0,
    orderLimit: 'unlimited',
    features: [
      'Unlimited orders'
    ]
  }
];

interface PricingTiersProps {
  selectedTier: PricingTier['id'];
  onTierSelect: (tier: PricingTier['id']) => void;
}

export const PricingTiers: React.FC<PricingTiersProps> = ({
  selectedTier,
  onTierSelect
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {pricingTiers.map((tier) => (
        <div
          key={tier.id}
          className={`relative bg-white dark:bg-gray-800 rounded-xl border transition-all ${
            selectedTier === tier.id
              ? 'border-primary-500 shadow-lg scale-[1.02]'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <div className="p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{tier.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">{tier.description}</p>
            
            <div className="mt-6 space-y-1">
              <div className="flex items-baseline">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">${tier.perOrderFee.toFixed(2)}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">per order</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">+{tier.transactionFee.toFixed(1)}% transaction fee</p>
            </div>

            <div className="mt-6">
              <button
                onClick={() => onTierSelect(tier.id)}
                className={`w-full flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedTier === tier.id
                    ? 'bg-primary-500 text-white hover:bg-primary-600'
                    : 'bg-gray-900 dark:bg-gray-700 text-white hover:bg-gray-800 dark:hover:bg-gray-600'
                }`}
              >
                {selectedTier === tier.id ? (
                  <>Selected</>
                ) : (
                  <>Select Plan</>
                )}
              </button>
            </div>

            <div className="mt-8">
              <ul className="space-y-3">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="w-4 h-4 text-green-500 dark:text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PricingTiers;