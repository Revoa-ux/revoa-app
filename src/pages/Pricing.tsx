import React from 'react';
import { PricingTiers } from '@/components/pricing/PricingTiers';

export default function Pricing() {
  return (
    <div className="max-w-[1050px] mx-auto space-y-12">
      <div>
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">Simple pricing that scales with you</h1>
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Choose the plan that fits your business. All plans include 0% revenue share.</p>
        </div>
      </div>

      <PricingTiers />

      <div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Frequently Asked Questions</h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                How does pricing work?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Choose the plan that matches your monthly revenue. All plans have a flat monthly fee with 0% revenue share or commission. As your business grows, you can upgrade to unlock additional features and support.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Do you charge any commission?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                No! All plans have 0% revenue share. You only pay the flat monthly subscription fee for your tier. No hidden fees, no commission on your sales.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Is there a free trial?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Yes! The Startup plan includes a 14-day free trial with full access to all features. No credit card required to start.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                When do I move to a different tier?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                You can upgrade or downgrade your plan anytime based on your business needs. As your revenue grows, higher tiers unlock premium features like dedicated coaching and priority support.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                How is billing handled?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                All billing is processed securely through Shopify's billing system. Your subscription fee will appear on your regular Shopify invoice.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Absolutely. There are no long-term contracts or commitments. Cancel your subscription anytime with no penalties or fees.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
