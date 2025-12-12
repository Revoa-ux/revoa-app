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
  { value: 'other' as const, label: 'Other' }
];

export const QuoteForm: React.FC<QuoteFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const [productUrl, setProductUrl] = useState(initialData?.productUrl || '');
  const [productName, setProductName] = useState(initialData?.productName || '');
  const [platform, setPlatform] = useState<'aliexpress' | 'amazon' | 'other'>(
    initialData?.platform || 'aliexpress'
  );
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);

  const platformDropdownRef = useRef<HTMLDivElement>(null);
  useClickOutside(platformDropdownRef, () => setShowPlatformDropdown(false));

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
      platform
    });
  };

  const getPlatformLabel = () => {
    return platformOptions.find(opt => opt.value === platform)?.label || 'Select platform';
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

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Platform
              </label>
              <div className="relative" ref={platformDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowPlatformDropdown(!showPlatformDropdown)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 text-left flex items-center justify-between"
                >
                  <span>{getPlatformLabel()}</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {showPlatformDropdown && (
                  <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 max-h-60 overflow-auto">
                    {platformOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setPlatform(option.value);
                          setShowPlatformDropdown(false);
                        }}
                        className="flex items-center justify-between w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <span className="text-gray-900 dark:text-white">{option.label}</span>
                        {platform === option.value && (
                          <Check className="w-4 h-4 text-rose-500 flex-shrink-0 ml-2" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 h-11 px-4 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 h-11 px-4 text-sm font-medium bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 hover:shadow-md transition-all flex items-center justify-center gap-2 group"
              >
                <span>Submit Quote Request</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
