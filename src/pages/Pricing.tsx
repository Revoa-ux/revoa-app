import React, { useState } from 'react';
import { PricingTiers } from '@/components/pricing/PricingTiers';
import { ChevronDown } from 'lucide-react';

const FAQ_ITEMS = [
  {
    question: 'How does pricing work?',
    answer: 'Choose the plan based on your monthly order volume. All plans have a flat monthly fee with 0% commission on sales. As your order volume grows, you can upgrade to unlock additional features and support.',
  },
  {
    question: 'Do you charge any commission?',
    answer: 'No! All plans have 0% commission on sales. You only pay the flat monthly subscription fee for your tier. No hidden fees, no transaction fees.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes! All plans include a 14-day free trial with full access to all features. No credit card required to start.',
  },
  {
    question: 'What counts as an order?',
    answer: 'An order is counted when a customer completes a purchase on your store. We track orders over a rolling 30-day period to determine your tier. Test orders and cancelled orders are not counted.',
  },
  {
    question: 'When do I need to upgrade?',
    answer: 'You can upgrade anytime based on your order volume. We\'ll notify you when you\'re approaching your plan\'s order limit. Higher tiers unlock premium features like dedicated coaching and priority support.',
  },
  {
    question: 'How is billing handled?',
    answer: 'All billing is processed securely through Shopify\'s billing system. Your subscription fee will appear on your regular Shopify invoice. You can choose monthly or annual billing directly in Shopify admin.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Absolutely. There are no long-term contracts or commitments. Cancel your subscription anytime with no penalties or fees.',
  },
];

function FAQAccordion({ question, answer, isOpen, onToggle }: { question: string; answer: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200/60 dark:border-[#3a3a3a]/60">
      <button
        onClick={onToggle}
        className="w-full px-6 py-5 flex items-start justify-between text-left transition-colors hover:bg-gray-50/50 dark:hover:bg-[#2a2a2a]/50"
      >
        <span className="text-base font-medium text-gray-900 dark:text-white pr-8">
          {question}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-300 flex-shrink-0 mt-0.5 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className={`transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 pb-5 pt-1">
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Pricing() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="max-w-[1050px] mx-auto space-y-12">
      <div>
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">Simple pricing that scales with you</h1>
        <div className="flex items-start sm:items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 sm:mt-0 flex-shrink-0"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Transparent pricing with no hidden fees or commission.</p>
        </div>
      </div>

      <PricingTiers />

      {/* Subtle Divider */}
      <div className="relative py-8">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-gray-200 dark:border-[#3a3a3a]"></div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="text-left">
          <h2 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">Frequently Asked Questions</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Everything you need to know about our pricing</p>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((faq, index) => (
            <FAQAccordion
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onToggle={() => handleToggle(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
