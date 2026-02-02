import React, { useState } from 'react';
import { CheckCircle, AlertCircle, Copy } from 'lucide-react';
import { NewQuoteVariant } from '@/types/quotes';
import { ShippingRulesManager } from './ShippingRulesManager';
import { toast } from '../../lib/toast';

interface GuidedModeStep3Props {
  variants: NewQuoteVariant[];
  onVariantsChange: (variants: NewQuoteVariant[]) => void;
}

type ShippingStrategy = 'simple' | 'by_variant' | 'advanced';

export const GuidedModeStep3: React.FC<GuidedModeStep3Props> = ({
  variants,
  onVariantsChange
}) => {
  const [strategy, setStrategy] = useState<ShippingStrategy>('simple');
  const [expandedVariant, setExpandedVariant] = useState<string | null>(null);

  const applySameRulesToAll = () => {
    if (variants.length === 0) return;

    const firstRules = variants[0].shippingRules;
    onVariantsChange(
      variants.map(v => ({
        ...v,
        shippingRules: {
          ...firstRules,
          byCountry: { ...firstRules.byCountry },
          byQuantity: firstRules.byQuantity ? [...firstRules.byQuantity] : undefined
        }
      }))
    );
    toast.success('Shipping rules applied to all variants');
  };

  const allHaveShipping = variants.every(v => v.shippingRules.default > 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Step 3: Shipping Configuration
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Set up shipping costs and rules for your variants
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Choose Shipping Strategy
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setStrategy('simple')}
              className={`
                p-4 rounded-lg border-2 transition-all text-left
                ${strategy === 'simple'
                  ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                  : 'border-gray-200 dark:border-[#333333] bg-white dark:bg-dark hover:border-gray-300 dark:hover:border-[#4a4a4a]'
                }
              `}
            >
              <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                Simple
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Same rules for all variants
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStrategy('by_variant')}
              className={`
                p-4 rounded-lg border-2 transition-all text-left
                ${strategy === 'by_variant'
                  ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                  : 'border-gray-200 dark:border-[#333333] bg-white dark:bg-dark hover:border-gray-300 dark:hover:border-[#4a4a4a]'
                }
              `}
            >
              <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                By Variant
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Different rules per variant
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStrategy('advanced')}
              className={`
                p-4 rounded-lg border-2 transition-all text-left
                ${strategy === 'advanced'
                  ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                  : 'border-gray-200 dark:border-[#333333] bg-white dark:bg-dark hover:border-gray-300 dark:hover:border-[#4a4a4a]'
                }
              `}
            >
              <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                Advanced
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Country & quantity rules
              </div>
            </button>
          </div>
        </div>

        {strategy === 'simple' && (
          <div className="p-6 bg-white dark:bg-dark rounded-lg border-2 border-gray-200 dark:border-[#333333]">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
              Set Default Shipping Cost
            </h4>
            <div className="max-w-xs">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Shipping Cost (applies to all variants)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={variants[0]?.shippingRules.default || ''}
                  onChange={(e) => {
                    const cost = parseFloat(e.target.value) || 0;
                    onVariantsChange(
                      variants.map(v => ({
                        ...v,
                        shippingRules: { ...v.shippingRules, default: cost }
                      }))
                    );
                  }}
                  className="w-full pl-7 pr-3 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="5.00"
                />
              </div>
            </div>
          </div>
        )}

        {strategy === 'by_variant' && (
          <div className="space-y-3">
            {variants.length > 1 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 flex items-center justify-between">
                <div className="text-sm text-blue-900 dark:text-blue-300">
                  Configure the first variant, then copy to others
                </div>
                <button
                  type="button"
                  onClick={applySameRulesToAll}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center space-x-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy to All</span>
                </button>
              </div>
            )}

            {variants.map((variant) => {
              const isExpanded = expandedVariant === variant.id;
              const hasRules = variant.shippingRules.default > 0;

              return (
                <div
                  key={variant.id}
                  className={`
                    p-4 bg-white dark:bg-dark rounded-lg border-2 transition-all
                    ${hasRules
                      ? 'border-green-200 dark:border-green-800'
                      : 'border-gray-200 dark:border-[#333333]'
                    }
                  `}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedVariant(isExpanded ? null : variant.id)}
                    className="w-full flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      {hasRules && <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />}
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {variant.name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {isExpanded ? 'Hide' : 'Configure'}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="mt-4 pt-6 border-t border-gray-200 dark:border-[#333333]">
                      <div className="max-w-xs">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Shipping Cost
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                            $
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={variant.shippingRules.default || ''}
                            onChange={(e) => {
                              const cost = parseFloat(e.target.value) || 0;
                              onVariantsChange(
                                variants.map(v =>
                                  v.id === variant.id
                                    ? { ...v, shippingRules: { ...v.shippingRules, default: cost } }
                                    : v
                                )
                              );
                            }}
                            className="w-full pl-7 pr-3 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                            placeholder="5.00"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {strategy === 'advanced' && (
          <div className="space-y-3">
            {variants.length > 1 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 flex items-center justify-between">
                <div className="text-sm text-blue-900 dark:text-blue-300">
                  Configure the first variant, then copy to others
                </div>
                <button
                  type="button"
                  onClick={applySameRulesToAll}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center space-x-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy to All</span>
                </button>
              </div>
            )}

            {variants.map((variant) => {
              const isExpanded = expandedVariant === variant.id;
              const hasRules = variant.shippingRules.default > 0;

              return (
                <div
                  key={variant.id}
                  className={`
                    p-4 bg-white dark:bg-dark rounded-lg border-2 transition-all
                    ${hasRules
                      ? 'border-green-200 dark:border-green-800'
                      : 'border-gray-200 dark:border-[#333333]'
                    }
                  `}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedVariant(isExpanded ? null : variant.id)}
                    className="w-full flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      {hasRules && <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />}
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {variant.name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {isExpanded ? 'Hide' : 'Configure'}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="mt-4 pt-6 border-t border-gray-200 dark:border-[#333333]">
                      <ShippingRulesManager
                        rules={variant.shippingRules}
                        onRulesChange={(rules) => {
                          onVariantsChange(
                            variants.map(v =>
                              v.id === variant.id ? { ...v, shippingRules: rules } : v
                            )
                          );
                        }}
                        variantName={variant.name}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {allHaveShipping ? (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-green-700 dark:text-green-300">
              Shipping configured for all variants! Ready to review and submit.
            </div>
          </div>
        ) : (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-700 dark:text-amber-300">
              Please set shipping costs for all variants before proceeding.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
