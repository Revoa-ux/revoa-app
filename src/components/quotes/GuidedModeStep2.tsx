import React, { useState } from 'react';
import { Copy, CheckCircle, AlertCircle } from 'lucide-react';
import { NewQuoteVariant } from '@/types/quotes';
import { toast } from '../../lib/toast';

interface GuidedModeStep2Props {
  variants: NewQuoteVariant[];
  onVariantsChange: (variants: NewQuoteVariant[]) => void;
}

export const GuidedModeStep2: React.FC<GuidedModeStep2Props> = ({
  variants,
  onVariantsChange
}) => {
  const [bulkCost, setBulkCost] = useState('');

  const updateVariant = (id: string, updates: Partial<NewQuoteVariant>) => {
    onVariantsChange(
      variants.map(v => v.id === id ? { ...v, ...updates } : v)
    );
  };

  const applyBulkCost = () => {
    const cost = parseFloat(bulkCost);
    if (isNaN(cost) || cost <= 0) {
      toast.error('Please enter a valid cost');
      return;
    }

    onVariantsChange(
      variants.map(v => ({ ...v, costPerItem: cost }))
    );
    toast.success(`Applied $${cost.toFixed(2)} to all variants`);
    setBulkCost('');
  };

  const copySKUPattern = (sourceSku: string) => {
    const parts = sourceSku.split('-');
    if (parts.length < 2) return;

    const prefix = parts[0];
    let counter = 1;

    onVariantsChange(
      variants.map((v, index) => {
        if (index === 0) return v;

        const suffix = v.attributes
          .map(attr => attr.value.substring(0, 3).toUpperCase())
          .join('-');

        return {
          ...v,
          sku: `${prefix}-${suffix}-${String(counter++).padStart(2, '0')}`
        };
      })
    );

    toast.success('SKU pattern applied to all variants');
  };

  const allValid = variants.every(v => v.sku.trim() && v.costPerItem > 0);
  const hasAnySKU = variants.some(v => v.sku.trim());

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Step 2: SKU & Pricing
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Set unique SKUs and costs for each variant
        </p>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-3">
            Bulk Actions
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-blue-800 dark:text-blue-300 mb-2">
                Apply Same Cost to All
              </label>
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={bulkCost}
                    onChange={(e) => setBulkCost(e.target.value)}
                    placeholder="15.00"
                    className="w-full pl-7 pr-3 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applyBulkCost();
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={applyBulkCost}
                  disabled={!bulkCost}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-400 dark:disabled:bg-[#4a4a4a] text-white text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  Apply
                </button>
              </div>
            </div>

            {hasAnySKU && (
              <div>
                <label className="block text-xs font-medium text-blue-800 dark:text-blue-300 mb-2">
                  Copy SKU Pattern
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const firstSKU = variants.find(v => v.sku.trim())?.sku;
                    if (firstSKU) copySKUPattern(firstSKU);
                  }}
                  className="w-full px-4 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] hover:bg-gray-50 dark:hover:bg-[#2a2a2a] text-gray-900 dark:text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <Copy className="w-4 h-4" />
                  <span>Apply Pattern</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {variants.map((variant, index) => {
            const isComplete = variant.sku.trim() && variant.costPerItem > 0;

            return (
              <div
                key={variant.id}
                className={`
                  p-4 bg-white dark:bg-dark rounded-lg border-2 transition-all
                  ${isComplete
                    ? 'border-green-200 dark:border-green-800'
                    : 'border-gray-200 dark:border-[#333333]'
                  }
                `}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                      ${isComplete
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 dark:bg-[#3a3a3a] text-gray-600 dark:text-gray-400'
                      }
                    `}>
                      {isComplete ? <CheckCircle className="w-4 h-4" /> : index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {variant.name}
                      </div>
                      {variant.attributes.length > 0 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {variant.attributes.map(a => `${a.name}: ${a.value}`).join(' • ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      SKU <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={variant.sku}
                      onChange={(e) => updateVariant(variant.id, { sku: e.target.value })}
                      placeholder="e.g., PROD-BLK-01"
                      className="w-full px-3 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Cost per Item <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={variant.costPerItem || ''}
                        onChange={(e) => updateVariant(variant.id, { costPerItem: parseFloat(e.target.value) || 0 })}
                        placeholder="15.00"
                        className="w-full pl-7 pr-3 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {allValid ? (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-green-700 dark:text-green-300">
              All variants configured! Ready to move to shipping setup.
            </div>
          </div>
        ) : (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-700 dark:text-amber-300">
              Please complete SKU and cost for all variants before proceeding.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
