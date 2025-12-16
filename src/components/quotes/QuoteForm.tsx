import React, { useState, useRef } from 'react';
import { X, ChevronDown, Check, ArrowRight } from 'lucide-react';
import { useClickOutside } from '@/lib/useClickOutside';
import type { Quote } from '../../types/quotes';

interface QuoteFormProps {
  onSubmit: (quote: Omit<Quote, 'id' | 'requestDate' | 'status'>) => void;
  onCancel: () => void;
  initialData?: Partial<Quote>;
}

const platformOptions = [
  { value: 'aliexpress' as const, label: 'AliExpress' },
  { value: 'amazon' as const, label: 'Amazon' },
  { value: '1688' as const, label: '1688' },
  { value: 'alibaba' as const, label: 'Alibaba' },
  { value: 'other' as const, label: 'Other' }
];

export const QuoteForm: React.FC<QuoteFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const [productUrl, setProductUrl] = useState(initialData?.productUrl || '');
  const [productName, setProductName] = useState(initialData?.productName || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Auto-add https:// if protocol is missing
    let finalUrl = productUrl.trim();
    if (finalUrl && !finalUrl.match(/^https?:\/\//i)) {
      finalUrl = `https://${finalUrl}`;
    }

    onSubmit({
      productUrl: finalUrl,
      productName,
      platform: 'aliexpress' // Default platform
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Request Product Quote</h2>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Product URL
              </label>
              <input
                type="text"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="example.com/product or https://example.com/product"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Product Name
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                required
              />
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-6 flex justify-between">
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
