import { useState, useEffect } from 'react';
import { X, AlertTriangle, ArrowRight } from 'lucide-react';
import Modal from '../Modal';
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

interface ShopifyToQuoteMapping {
  shopifyVariantId: string;
  quoteVariantIndex: number | null;
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

  const isNewQuoteVariant = (variant: any): variant is NewQuoteVariant => {
    return 'shippingRules' in variant && 'costPerItem' in variant;
  };

  useEffect(() => {
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
  }, [shopifyProduct, quoteVariants]);

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
            default: qVariant.shippingCosts._default,
            byCountry: Object.fromEntries(
              Object.entries(qVariant.shippingCosts).filter(([k]) => k !== '_default')
            ),
            byQuantity: qVariant.quantityTiers,
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
        shopifyVariantSku: shopifyVariant.sku,
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

  const { skuUpdates, priceUpdates, largePriceDiffs } = getChangesSummary();

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-6xl">
      <div className="flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Map Variants to Shopify
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {shopifyProduct.title}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Shopify Variants */}
            <div>
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                  Shopify Variants
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {shopifyProduct.variants.length} variant{shopifyProduct.variants.length !== 1 ? 's' : ''} in store
                </p>
              </div>

              <div className="space-y-3">
                {shopifyProduct.variants.map((shopifyVariant) => {
                  const selectedQuoteIndex = mappings.get(shopifyVariant.id);
                  const selectedQuote = selectedQuoteIndex !== null && selectedQuoteIndex !== undefined
                    ? quoteVariants[selectedQuoteIndex]
                    : null;

                  return (
                    <div
                      key={shopifyVariant.id}
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <div className="mb-3">
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                          {shopifyVariant.title}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                          {shopifyVariant.sku && (
                            <span className="font-mono">{shopifyVariant.sku}</span>
                          )}
                          <span>${shopifyVariant.price}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                          Maps to quote variant:
                        </label>
                        <select
                          value={selectedQuoteIndex ?? ''}
                          onChange={(e) => handleMappingChange(
                            shopifyVariant.id,
                            e.target.value === '' ? null : parseInt(e.target.value)
                          )}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
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
                                {qName} • {qVariant.sku} • ${qCost.toFixed(2)}
                              </option>
                            );
                          })}
                        </select>

                        {selectedQuote && (
                          <div className="mt-2 space-y-1.5">
                            {(() => {
                              const qCost = isNewQuoteVariant(selectedQuote)
                                ? selectedQuote.costPerItem
                                : selectedQuote.costPerItem;
                              const shopifyPrice = parseFloat(shopifyVariant.price);
                              const willUpdateSku = shopifyVariant.sku !== selectedQuote.sku;
                              const willUpdatePrice = Math.abs(shopifyPrice - qCost) > 0.01;

                              return (
                                <>
                                  {willUpdateSku && (
                                    <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                                      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                      <span>SKU will update to {selectedQuote.sku}</span>
                                    </div>
                                  )}
                                  {willUpdatePrice && (
                                    <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                                      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                      <span>Price will update to ${qCost.toFixed(2)}</span>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column - Quote Variants */}
            <div>
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                  Quote Variants
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {quoteVariants.length} variant{quoteVariants.length !== 1 ? 's' : ''} from quote
                </p>
              </div>

              <div className="space-y-3">
                {quoteVariants.map((qVariant, index) => {
                  const qName = isNewQuoteVariant(qVariant)
                    ? qVariant.name
                    : qVariant.variantName || 'Unnamed Variant';
                  const qCost = isNewQuoteVariant(qVariant)
                    ? qVariant.costPerItem
                    : qVariant.costPerItem;

                  const mappedTo = Array.from(mappings.entries())
                    .filter(([_, quoteIndex]) => quoteIndex === index)
                    .map(([shopifyId]) => shopifyProduct.variants.find(v => v.id === shopifyId))
                    .filter(Boolean);

                  return (
                    <div
                      key={index}
                      className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
                    >
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-2">
                        {qName}
                      </h4>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 dark:text-gray-400">SKU:</span>
                          <span className="font-mono text-gray-700 dark:text-gray-300">{qVariant.sku}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 dark:text-gray-400">Price:</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">${qCost.toFixed(2)}</span>
                        </div>
                        {mappedTo.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-700">
                            <span className="text-gray-500 dark:text-gray-400 block mb-1">
                              Mapped from:
                            </span>
                            {mappedTo.map((sv) => (
                              <div key={sv!.id} className="text-gray-700 dark:text-gray-300 font-medium">
                                {sv!.title}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Changes Summary */}
          {(skuUpdates > 0 || priceUpdates > 0 || largePriceDiffs > 0) && (
            <div className="mt-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                    Changes
                  </p>
                  <ul className="space-y-1 text-amber-800 dark:text-amber-200">
                    {skuUpdates > 0 && (
                      <li>{skuUpdates} SKU{skuUpdates > 1 ? 's' : ''} will update</li>
                    )}
                    {priceUpdates > 0 && (
                      <li>{priceUpdates} price{priceUpdates > 1 ? 's' : ''} will update</li>
                    )}
                    {largePriceDiffs > 0 && (
                      <li>{largePriceDiffs} variant{largePriceDiffs > 1 ? 's have' : ' has'} price difference &gt;$5</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isValid() || isSubmitting}
              className="group px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-all flex items-center gap-2 shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <span>Confirm Mapping & Sync</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
