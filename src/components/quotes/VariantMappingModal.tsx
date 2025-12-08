import { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, ArrowRight, ChevronDown } from 'lucide-react';
import type { VariantMapping, ShopifyVariant, ShippingRules, NewQuoteVariant, FinalVariant } from '../../types/quotes';

interface VariantMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mappings: VariantMapping[]) => Promise<void>;
  quoteId: string;
  quoteVariants: NewQuoteVariant[] | FinalVariant[];
  shopifyProduct: {
    id: string;
    title: string;
    variants: ShopifyVariant[];
  };
}

export default function VariantMappingModal({
  isOpen,
  onClose,
  onConfirm,
  quoteId,
  quoteVariants,
  shopifyProduct,
}: VariantMappingModalProps) {
  const [mappings, setMappings] = useState<Map<string, number | null>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const isNewQuoteVariant = (variant: any): variant is NewQuoteVariant => {
    return 'shippingRules' in variant && 'costPerItem' in variant;
  };

  useEffect(() => {
    if (!isOpen) return;

    const initialMappings = new Map<string, number | null>();
    shopifyProduct.variants.forEach((shopifyVariant, index) => {
      const matchingQuoteIndex = quoteVariants.findIndex(
        (qVariant) => qVariant.sku === shopifyVariant.sku
      );
      initialMappings.set(
        shopifyVariant.id,
        matchingQuoteIndex >= 0 ? matchingQuoteIndex : (index < quoteVariants.length ? index : null)
      );
    });
    setMappings(initialMappings);
  }, [isOpen, shopifyProduct, quoteVariants]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleMappingChange = (shopifyVariantId: string, quoteIndex: number | null) => {
    setMappings(prev => {
      const newMappings = new Map(prev);
      newMappings.set(shopifyVariantId, quoteIndex);
      return newMappings;
    });
  };

  const buildVariantMappings = (): VariantMapping[] => {
    const result: VariantMapping[] = [];

    mappings.forEach((quoteIndex, shopifyVariantId) => {
      if (quoteIndex === null) return;

      const shopifyVariant = shopifyProduct.variants.find(v => v.id === shopifyVariantId);
      const qVariant = quoteVariants[quoteIndex];

      if (!shopifyVariant || !qVariant) return;

      const quoteVariantName = isNewQuoteVariant(qVariant)
        ? qVariant.name
        : qVariant.variantName || 'Unnamed Variant';

      const quoteUnitCost = isNewQuoteVariant(qVariant)
        ? qVariant.costPerItem
        : qVariant.costPerItem;

      const quoteShippingRules: ShippingRules = isNewQuoteVariant(qVariant)
        ? qVariant.shippingRules
        : {
            default: qVariant.shippingCosts?._default || 0,
            byCountry: Object.fromEntries(
              Object.entries(qVariant.shippingCosts || {}).filter(([k]) => k !== '_default')
            ),
            byQuantity: qVariant.quantityTiers || [],
          };

      const shopifyPrice = parseFloat(shopifyVariant.price);
      const willUpdateSku = shopifyVariant.sku !== qVariant.sku;
      const willUpdatePrice = Math.abs(shopifyPrice - quoteUnitCost) > 0.01;
      const priceDifference = willUpdatePrice ? quoteUnitCost - shopifyPrice : undefined;

      result.push({
        quoteVariantIndex: quoteIndex,
        quoteVariantSku: qVariant.sku,
        quoteVariantName,
        quoteUnitCost,
        quotePackSize: 1,
        quoteShippingRules,
        shopifyVariantId: shopifyVariant.id,
        shopifyVariantTitle: shopifyVariant.title,
        shopifyVariantSku: shopifyVariant.sku || '',
        shopifyVariantPrice: shopifyVariant.price,
        willUpdateSku,
        willUpdatePrice,
        priceDifference,
      });
    });

    return result;
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const variantMappings = buildVariantMappings();
      await onConfirm(variantMappings);
    } catch (error) {
      console.error('Error confirming mappings:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getChangesSummary = () => {
    const variantMappings = buildVariantMappings();
    const skuUpdates = variantMappings.filter(m => m.willUpdateSku).length;
    const priceUpdates = variantMappings.filter(m => m.willUpdatePrice).length;
    const largePriceDiffs = variantMappings.filter(
      m => m.priceDifference && Math.abs(m.priceDifference) > 5
    ).length;

    return { skuUpdates, priceUpdates, largePriceDiffs };
  };

  const isValid = () => {
    let mappedCount = 0;
    mappings.forEach(quoteIndex => {
      if (quoteIndex !== null) mappedCount++;
    });
    return mappedCount > 0;
  };

  if (!isOpen) return null;

  const { skuUpdates, priceUpdates, largePriceDiffs } = getChangesSummary();

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="fixed inset-0 overflow-y-auto" style={{ pointerEvents: 'none' }}>
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            ref={modalRef}
            className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col"
            style={{ pointerEvents: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    Map Quote to Existing Shopify Product
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {shopifyProduct.title}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 min-h-0 bg-gray-50 dark:bg-gray-900/30">
              <div className="space-y-2">
                {shopifyProduct.variants.map((shopifyVariant) => {
                  const selectedQuoteIndex = mappings.get(shopifyVariant.id);
                  const selectedQuote = selectedQuoteIndex !== null && selectedQuoteIndex !== undefined
                    ? quoteVariants[selectedQuoteIndex]
                    : null;

                  return (
                    <div
                      key={shopifyVariant.id}
                      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                    >
                      <div className="p-3 flex items-center gap-3">
                        {/* Shopify Variant Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                              {shopifyVariant.title}
                            </h4>
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                              ${shopifyVariant.price}
                            </span>
                          </div>
                          {shopifyVariant.sku && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                              {shopifyVariant.sku}
                            </p>
                          )}
                        </div>

                        {/* Arrow */}
                        <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />

                        {/* Mapping Dropdown */}
                        <div className="w-64 flex-shrink-0 relative">
                          <select
                            value={selectedQuoteIndex ?? ''}
                            onChange={(e) => handleMappingChange(
                              shopifyVariant.id,
                              e.target.value === '' ? null : parseInt(e.target.value)
                            )}
                            className="w-full appearance-none pl-3 pr-8 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 dark:focus:ring-rose-400 focus:border-transparent transition-all"
                          >
                            <option value="">No mapping</option>
                            {quoteVariants.map((qVariant, index) => {
                              const qName = isNewQuoteVariant(qVariant)
                                ? qVariant.name
                                : qVariant.variantName || 'Unnamed';
                              const qCost = isNewQuoteVariant(qVariant)
                                ? qVariant.costPerItem
                                : qVariant.costPerItem;
                              return (
                                <option key={index} value={index}>
                                  {qName} • ${qCost.toFixed(2)}
                                </option>
                              );
                            })}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>

                      {/* Warnings */}
                      {selectedQuote && (() => {
                        const qCost = isNewQuoteVariant(selectedQuote)
                          ? selectedQuote.costPerItem
                          : selectedQuote.costPerItem;
                        const shopifyPrice = parseFloat(shopifyVariant.price);
                        const willUpdateSku = shopifyVariant.sku !== selectedQuote.sku;
                        const willUpdatePrice = Math.abs(shopifyPrice - qCost) > 0.01;

                        if (!willUpdateSku && !willUpdatePrice) return null;

                        return (
                          <div className="px-3 pb-3">
                            <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 px-2 py-1.5 rounded">
                              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                              <div className="space-y-0.5">
                                {willUpdateSku && <div>SKU → {selectedQuote.sku}</div>}
                                {willUpdatePrice && <div>Price → ${qCost.toFixed(2)}</div>}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>

              {/* Changes Summary */}
              {(skuUpdates > 0 || priceUpdates > 0 || largePriceDiffs > 0) && (
                <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                        Changes
                      </p>
                      <ul className="space-y-0.5 text-amber-800 dark:text-amber-200">
                        {skuUpdates > 0 && <li>{skuUpdates} SKU update{skuUpdates > 1 ? 's' : ''}</li>}
                        {priceUpdates > 0 && <li>{priceUpdates} price update{priceUpdates > 1 ? 's' : ''}</li>}
                        {largePriceDiffs > 0 && <li>{largePriceDiffs} large price change{largePriceDiffs > 1 ? 's' : ''} (&gt;$5)</li>}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0 rounded-b-xl">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!isValid() || isSubmitting}
                  className="group px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-pink-500 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all flex items-center gap-2 shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm & Sync</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
