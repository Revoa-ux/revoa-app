import React, { useState } from 'react';
import { PricingTiers } from '@/components/pricing/PricingTiers';
import { PricingCalculator } from '@/components/pricing/PricingCalculator';
import { PricingTier } from '@/types/pricing';
import { pricingTiers } from '@/constants/pricingTiers';

export default function Pricing() {
  const [selectedTier, setSelectedTier] = useState<PricingTier['id']>('momentum');

  return (
    <div className="max-w-[1000px] mx-auto space-y-12">
      <div>
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">Simple, transparent pricing</h1>
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Choose the plan that best fits your business needs</p>
        </div>
      </div>

      <PricingTiers
        selectedTier={selectedTier}
        onTierSelect={setSelectedTier}
      />

      <div>
        <PricingCalculator
          selectedTier={selectedTier}
          onTierSelect={setSelectedTier}
        />
      </div>

      <div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Frequently Asked Questions</h2>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                How does automatic tier adjustment work?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your pricing tier automatically adjusts based on your 30-day order volume. You'll always get the best rate for your volume without needing to manually change plans.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                What's included in the transaction fee?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                The transaction fee is a percentage of your order value that covers payment processing, fraud prevention, and secure transaction handling. It scales with your tier level.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Is there a monthly subscription fee?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                No, there's no base monthly fee. You only pay for what you use through per-order fees and transaction fees. This makes our pricing completely usage-based and scalable.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                How is my tier determined?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your tier is determined by your rolling 30-day order volume. For example, if you process 300 orders in 30 days, you'll automatically qualify for the Momentum tier pricing.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                When do tier changes take effect?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Tier changes happen automatically and take effect immediately. If your order volume increases or decreases, your pricing adjusts in real-time to match your current tier.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Are there any long-term commitments?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                No, our pricing is completely flexible with no long-term commitments. You can scale up or down based on your business needs, and you'll only pay for what you use.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}