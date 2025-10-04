import React from 'react';
import { PricingTiers } from '@/components/pricing/PricingTiers';
import { PricingCalculator } from '@/components/pricing/PricingCalculator';

export default function Pricing() {
  return (
    <div className="max-w-[1000px] mx-auto space-y-12">
      <div>
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">Revenue-based pricing that scales with you</h1>
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Pay a percentage of your revenue. As you grow, your rate automatically decreases.</p>
        </div>
      </div>

      <PricingTiers />

      <div>
        <PricingCalculator />
      </div>

      <div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Frequently Asked Questions</h2>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                How does revenue-based pricing work?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                You pay a small monthly base fee plus a percentage of your monthly revenue. As your revenue grows, you automatically move to a higher tier with a lower percentage rate, ensuring you always get the best value.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                When do I move to a different tier?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Tiers adjust automatically based on your monthly revenue. Once you cross a tier threshold, your pricing updates immediately for the next billing cycle. No manual upgrades needed.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                What counts as revenue?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Revenue is calculated as the total sales value from products managed through our platform. This is tracked automatically from your connected store or manual entries.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Is there a startup discount?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Yes! The Startup tier has no base fee - you only pay 3.5% of revenue up to $5k/month. Perfect for new businesses just getting started.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Can I downgrade if my revenue decreases?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Absolutely. Your tier automatically adjusts based on your actual revenue. If your revenue decreases, you'll move to a lower tier with reduced fees.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Are there any long-term commitments?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                No contracts or commitments. Pay month-to-month and cancel anytime. Our pricing is designed to grow with your business, not lock you in.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}