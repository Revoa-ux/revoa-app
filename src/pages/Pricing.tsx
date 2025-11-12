import React from 'react';
import { PricingTiers } from '@/components/pricing/PricingTiers';
import { Check } from 'lucide-react';

export default function Pricing() {
  return (
    <div className="max-w-[1000px] mx-auto space-y-12">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          One plan with everything you need. Try it free for 14 days.
        </p>
      </div>

      {/* Pricing Card */}
      <PricingTiers />

      {/* What's Included Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
          What's Included
        </h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <h3 className="font-medium text-gray-900 dark:text-white flex items-center">
              <Check className="w-5 h-5 text-primary-600 mr-2" />
              Analytics & Reporting
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 ml-7">
              Complete profit tracking, COGS management, and real-time dashboard analytics for your Shopify store.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-gray-900 dark:text-white flex items-center">
              <Check className="w-5 h-5 text-primary-600 mr-2" />
              Ad Performance
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 ml-7">
              Monitor Facebook Ads campaigns with detailed creative analysis and ROI tracking.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-gray-900 dark:text-white flex items-center">
              <Check className="w-5 h-5 text-primary-600 mr-2" />
              Product Discovery
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 ml-7">
              AI-powered product recommendations based on Instagram content analysis and trending niches.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-gray-900 dark:text-white flex items-center">
              <Check className="w-5 h-5 text-primary-600 mr-2" />
              Supplier Tools
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 ml-7">
              Direct communication with suppliers, quote management, and streamlined ordering process.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-gray-900 dark:text-white flex items-center">
              <Check className="w-5 h-5 text-primary-600 mr-2" />
              Unlimited Products
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 ml-7">
              Manage unlimited products, variants, and SKUs with no restrictions or additional fees.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-gray-900 dark:text-white flex items-center">
              <Check className="w-5 h-5 text-primary-600 mr-2" />
              Priority Support
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 ml-7">
              Get fast email support and access to our exclusive community of successful ecommerce merchants.
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
          Frequently Asked Questions
        </h2>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              How does the free trial work?
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Start your 14-day free trial with full access to all features. No credit card required to start.
              You'll only be charged after the trial ends if you choose to continue.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Can I cancel anytime?
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Yes, absolutely. There are no long-term contracts or commitments. Cancel your subscription
              anytime directly from your Shopify admin or app settings.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              How is billing handled?
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Billing is processed securely through Shopify's billing system. The $29/month fee will appear
              on your regular Shopify invoice.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Are there any hidden fees?
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              No hidden fees or revenue share. Just $29/month, flat rate. No commission on sales,
              no extra charges for additional products or users.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              What if I need help?
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              All subscribers get priority email support. We typically respond within 24 hours on business days,
              and you'll have access to our community of successful merchants.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Can I upgrade features later?
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              All new features we add are automatically included in your subscription at no extra cost.
              We're constantly improving the platform based on merchant feedback.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl p-8 text-center text-white">
        <h2 className="text-2xl font-bold mb-2">Ready to grow your business?</h2>
        <p className="text-primary-100 mb-6">
          Join successful merchants using Revoa to track profits and scale their stores.
        </p>
        <a
          href="https://apps.shopify.com/revoa"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-white text-primary-600 font-semibold px-8 py-3 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Install from Shopify App Store
        </a>
      </div>
    </div>
  );
}
