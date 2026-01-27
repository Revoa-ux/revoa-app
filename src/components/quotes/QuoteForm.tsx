import React, { useState, useRef } from 'react';
import { X, ChevronDown, Check, ArrowRight, ArrowLeft } from 'lucide-react';
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
        <div className="relative bg-white dark:bg-dark rounded-xl overflow-hidden max-w-2xl w-full">
          <div className="px-6 pt-6 pb-4">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-gray-200 dark:border-[#333333]">
              <h2 className="text-xl font-medium text-gray-900 dark:text-white">Request Product Quote</h2>
              <button onClick={onCancel} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="quote-form" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Product URL
                </label>
                <input
                  type="text"
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  placeholder="example.com/product or https://example.com/product"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                  required
                />
              </div>
            </form>
          </div>

          <div className="border-t border-gray-200 dark:border-[#333333] bg-gray-50 dark:bg-[#2a2a2a]/50 px-6 py-4 flex justify-between">
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary flex items-center gap-2"
            >
              <ArrowLeft className="btn-icon btn-icon-back w-4 h-4" />
              Cancel
            </button>
            <button
              type="submit"
              form="quote-form"
              onClick={handleSubmit}
              className="btn btn-primary group flex items-center gap-2"
            >
              <span>Submit Request</span>
              <ArrowRight className="btn-icon btn-icon-arrow w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
