import React, { useState } from 'react';
import { PricingTiers } from '@/components/pricing/PricingTiers';

const FAQ_ITEMS = [
  {
    question: 'How does pricing work?',
    answer: 'Choose the plan that matches your monthly revenue. All plans have a flat monthly fee with 0% revenue share or commission. As your business grows, you can upgrade to unlock additional features and support.',
  },
  {
    question: 'Do you charge any commission?',
    answer: 'No! All plans have 0% revenue share. You only pay the flat monthly subscription fee for your tier. No hidden fees, no commission on your sales.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes! The Startup plan includes a 14-day free trial with full access to all features. No credit card required to start.',
  },
  {
    question: 'When do I move to a different tier?',
    answer: 'You can upgrade or downgrade your plan anytime based on your business needs. As your revenue grows, higher tiers unlock premium features like dedicated coaching and priority support.',
  },
  {
    question: 'How is billing handled?',
    answer: 'All billing is processed securely through Shopify\'s billing system. Your subscription fee will appear on your regular Shopify invoice.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Absolutely. There are no long-term contracts or commitments. Cancel your subscription anytime with no penalties or fees.',
  },
];

function FAQCard({ question, answer }: { question: string; answer: string }) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className="relative h-48 perspective-1000"
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
    >
      <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        {/* Front - Question */}
        <div className="absolute inset-0 backface-hidden rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 p-6 flex items-center justify-center shadow-lg">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center">
            {question}
          </h3>
        </div>

        {/* Back - Answer */}
        <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 p-6 flex items-center shadow-lg">
          <p className="text-sm text-gray-700 dark:text-gray-300 text-center">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Pricing() {
  return (
    <div className="max-w-[1050px] mx-auto space-y-12">
      <div>
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">Simple pricing that scales with you</h1>
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Transparent pricing with no hidden fees or commission.</p>
        </div>
      </div>

      <PricingTiers />

      {/* Subtle Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-8 text-center">Frequently Asked Questions</h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FAQ_ITEMS.map((faq, index) => (
            <FAQCard key={index} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>
    </div>
  );
}
