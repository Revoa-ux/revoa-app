import React, { useState } from 'react';
import { CheckCircle, Edit2, Package, DollarSign, Truck } from 'lucide-react';
import { NewQuoteVariant } from '@/types/quotes';

interface GuidedModeStep4Props {
  variants: NewQuoteVariant[];
  onEdit: (step: number) => void;
}

export const GuidedModeStep4: React.FC<GuidedModeStep4Props> = ({
  variants,
  onEdit
}) => {
  const [expandedVariant, setExpandedVariant] = useState<string | null>(null);

  const calculateTotal = (variant: NewQuoteVariant, quantity: number) => {
    const productCost = variant.costPerItem * quantity;

    // Start with base shipping rate
    let shippingCost = variant.shippingRules.default * quantity;

    // Apply quantity discount if applicable
    if (variant.shippingRules.byQuantity) {
      for (const tier of [...variant.shippingRules.byQuantity].reverse()) {
        if (quantity >= tier.minQty) {
          shippingCost = Math.max(0, shippingCost - tier.discountAmount);
          break;
        }
      }
    }

    return {
      productCost,
      shippingCost,
      total: productCost + shippingCost
    };
  };

  const sampleQuantities = [10, 50, 100];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Step 4: Review & Submit
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Review all variant details before submitting the quote
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onEdit(1)}
          className="p-4 bg-white dark:bg-dark rounded-lg border border-gray-200 dark:border-[#333333] hover:border-rose-500 dark:hover:border-rose-500 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <Package className="w-5 h-5 text-gray-400 group-hover:text-rose-500" />
            <Edit2 className="w-4 h-4 text-gray-400 group-hover:text-rose-500" />
          </div>
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              Variants
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {variants.length} variant{variants.length !== 1 ? 's' : ''}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onEdit(2)}
          className="p-4 bg-white dark:bg-dark rounded-lg border border-gray-200 dark:border-[#333333] hover:border-rose-500 dark:hover:border-rose-500 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5 text-gray-400 group-hover:text-rose-500" />
            <Edit2 className="w-4 h-4 text-gray-400 group-hover:text-rose-500" />
          </div>
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              Pricing
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              ${Math.min(...variants.map(v => v.costPerItem)).toFixed(2)} - ${Math.max(...variants.map(v => v.costPerItem)).toFixed(2)}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onEdit(3)}
          className="p-4 bg-white dark:bg-dark rounded-lg border border-gray-200 dark:border-[#333333] hover:border-rose-500 dark:hover:border-rose-500 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <Truck className="w-5 h-5 text-gray-400 group-hover:text-rose-500" />
            <Edit2 className="w-4 h-4 text-gray-400 group-hover:text-rose-500" />
          </div>
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              Shipping
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              From ${Math.min(...variants.map(v => v.shippingRules.default)).toFixed(2)}
            </div>
          </div>
        </button>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
          Variant Details
        </h4>

        {variants.map((variant) => {
          const isExpanded = expandedVariant === variant.id;

          return (
            <div
              key={variant.id}
              className="p-4 bg-white dark:bg-dark rounded-lg border border-gray-200 dark:border-[#333333]"
            >
              <button
                type="button"
                onClick={() => setExpandedVariant(isExpanded ? null : variant.id)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <div className="text-left">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {variant.name}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      SKU: {variant.sku} • ${variant.costPerItem.toFixed(2)} per item
                    </div>
                  </div>
                </div>
                <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                  {isExpanded ? 'Hide' : 'Details'}
                </span>
              </button>

              {isExpanded && (
                <div className="mt-4 pt-6 border-t border-gray-200 dark:border-[#333333] space-y-4">
                  {variant.attributes.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Attributes
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {variant.attributes.map((attr, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-100 dark:bg-dark text-xs text-gray-700 dark:text-gray-300 rounded"
                          >
                            {attr.name}: {attr.value}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Shipping Rules
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <div>Default: ${variant.shippingRules.default.toFixed(2)}</div>
                      {Object.keys(variant.shippingRules.byCountry).length > 0 && (
                        <div>
                          Country rates: {Object.keys(variant.shippingRules.byCountry).length} countries
                        </div>
                      )}
                      {variant.shippingRules.byQuantity && variant.shippingRules.byQuantity.length > 0 && (
                        <div>
                          Quantity tiers: {variant.shippingRules.byQuantity.length} tiers
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sample Calculations
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-[#333333]">
                            <th className="text-left py-2 text-gray-600 dark:text-gray-400">Qty</th>
                            <th className="text-right py-2 text-gray-600 dark:text-gray-400">Product</th>
                            <th className="text-right py-2 text-gray-600 dark:text-gray-400">Shipping</th>
                            <th className="text-right py-2 text-gray-600 dark:text-gray-400">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sampleQuantities.map((qty) => {
                            const calc = calculateTotal(variant, qty);
                            return (
                              <tr key={qty} className="border-b border-gray-100 dark:border-[#262626]">
                                <td className="py-2 text-gray-900 dark:text-white">{qty}</td>
                                <td className="text-right py-2 text-gray-900 dark:text-white">
                                  ${calc.productCost.toFixed(2)}
                                </td>
                                <td className="text-right py-2 text-gray-900 dark:text-white">
                                  ${calc.shippingCost.toFixed(2)}
                                </td>
                                <td className="text-right py-2 font-medium text-gray-900 dark:text-white">
                                  ${calc.total.toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <div className="flex items-start space-x-2">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-sm font-medium text-green-900 dark:text-green-300 mb-1">
              Ready to Submit
            </div>
            <div className="text-xs text-green-700 dark:text-green-400">
              All {variants.length} variant{variants.length !== 1 ? 's are' : ' is'} configured with pricing and shipping. Click Submit to send this quote to the customer.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
