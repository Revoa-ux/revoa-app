import React from 'react';
import type { PricingTier } from '@/types/pricing';
import { Check } from 'lucide-react';

export const pricingTier: PricingTier = {
  id: 'standard',
  name: 'Standard Plan',
  price: 29,
  trialDays: 14,
  interval: 'monthly',
  features: [
    'Complete profit tracking and analytics',
    'Shopify store integration',
    'Facebook Ads performance monitoring',
    'Product catalog management',
    'AI-powered product discovery',
    'Supplier communication tools',
    'Return rate tracking',
    'Unlimited products',
    'Priority email support',
    'Access to exclusive community'
  ]
};

interface PricingTiersProps {
  onSubscribe?: () => void;
}

export const PricingTiers: React.FC<PricingTiersProps> = ({ onSubscribe }) => {
  return (
    <div className="max-w-lg mx-auto">
      <div className="relative p-8 rounded-2xl border-2 border-primary-500 bg-gradient-to-br from-white to-primary-50 dark:from-gray-800 dark:to-primary-900/20 shadow-xl">
        {/* Trial Badge */}
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg">
            {pricingTier.trialDays}-Day Free Trial
          </span>
        </div>

        {/* Plan Name */}
        <div className="text-center mb-6 mt-2">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {pricingTier.name}
          </h3>
          <div className="flex items-baseline justify-center">
            <span className="text-5xl font-bold text-gray-900 dark:text-white">
              ${pricingTier.price}
            </span>
            <span className="text-xl text-gray-600 dark:text-gray-400 ml-2">
              /month
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Cancel anytime • No long-term contracts
          </p>
        </div>

        {/* Subscribe Button */}
        {onSubscribe && (
          <button
            onClick={onSubscribe}
            className="w-full py-4 px-6 mb-6 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors shadow-lg hover:shadow-xl"
          >
            Start Free Trial
          </button>
        )}

        {/* Features */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Everything you need to grow:
          </p>
          {pricingTier.features.map((feature, index) => (
            <div key={index} className="flex items-start">
              <Check className="w-5 h-5 text-primary-600 dark:text-primary-400 mr-3 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {feature}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom Note */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-center text-gray-600 dark:text-gray-400">
            Billed monthly through Shopify • Includes all future features
          </p>
        </div>
      </div>
    </div>
  );
};
