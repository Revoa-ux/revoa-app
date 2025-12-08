import { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, ArrowRight } from 'lucide-react';
import type { VariantMapping, ShopifyVariant, ShippingRules, NewQuoteVariant, FinalVariant } from '../../types/quotes';
import Modal from '../Modal';

// Helper functions for suggested selling prices
const getSuggestedMultiplier = (cost: number): number => {
  if (cost > 100) return 2;
  if (cost > 50) return 2.5;
  return 3;
};

const getSuggestedPrice = (cost: number): number => {
  return cost * getSuggestedMultiplier(cost);
};

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

interface CustomDropdownProps {
  value: number | null;
  onChange: (value: number | null) => void;
  quoteVariants: NewQuoteVariant[] | FinalVariant[];
  isNewQuoteVariant: (variant: any) => variant is NewQuoteVariant;
}

function CustomDropdown({ value, onChange, quoteVariants, isNewQuoteVariant }: CustomDropdownProps) {
  return (
    <select
      value={value === null ? '' : value}
      onChange={(e) => onChange(e.target.value === '' ? null : parseInt(e.target.value))}
      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
    >
      <option value="">No mapping</option>
      {quoteVariants.map((variant, index) => {
        const name = isNewQuoteVariant(variant) ? variant.name : variant.variantName || 'Unnamed Variant';
        const cost = isNewQuoteVariant(variant) ? variant.costPerItem : variant.costPerItem;
        return (
          <option key={index} value={index}>
            {name} - ${cost.toFixed(2)} (SKU: {variant.sku})
          </option>
        );
      })}
    </select>
  );
}

interface WarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  unmappedCount: number;
  totalCount: number;
}

function WarningModal({ isOpen, onClose, onConfirm, unmappedCount, totalCount }: WarningModalProps) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Incomplete Variant Mapping" maxWidth="max-w-lg">
      <div className="space-y-4">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2">
                {unmappedCount} of {totalCount} Shopify variants are unmapped
              </h3>
              <div className="text-sm text-amber-800 dark:text-amber-200 space-y-2">
                <p>Proceeding with incomplete mapping will have the following implications:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Unmapped variants will not be fulfilled automatically</li>
                  <li>Orders for unmapped variants will not be invoiced</li>
                  <li>You will need to manually handle these variants</li>
                  <li>Customers ordering unmapped variants may experience delays</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-pink-500 hover:shadow-md rounded-lg transition-all shadow-sm"
          >
            Continue Anyway
          </button>
        </div>
      </div>
    </Modal>
  );
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
  const [showWarning, setShowWarning] = useState(false);
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

  const handleConfirmClick = () => {
    const unmappedCount = Array.from(mappings.values()).filter(v => v === null).length;

    if (unmappedCount > 0) {
      setShowWarning(true);
    } else {
      handleConfirm();
    }
  };

  const handleConfirm = async () => {
    setShowWarning(false);
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

  const isValid = () => {
    let mappedCount = 0;
    mappings.forEach(quoteIndex => {
      if (quoteIndex !== null) mappedCount++;
    });
    return mappedCount > 0;
  };

  if (!isOpen) return null;

  const unmappedCount = Array.from(mappings.values()).filter(v => v === null).length;

  return (
    <>
      <div className="fixed inset-0 z-50">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal Container */}
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              ref={modalRef}
              className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
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
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 flex-shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 min-h-0">
                {/* Column Headers */}
                <div className="grid grid-cols-[1fr,auto,1fr] gap-4 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    Shopify Variant
                  </div>
                  <div className="w-8"></div>
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    Quote Variant
                  </div>
                </div>

                {/* Variant Mapping List */}
                <div className="space-y-3">
                  {shopifyProduct.variants.map((shopifyVariant) => {
                    const selectedQuoteIndex = mappings.get(shopifyVariant.id);
                    const selectedQuote = selectedQuoteIndex !== null && selectedQuoteIndex !== undefined
                      ? quoteVariants[selectedQuoteIndex]
                      : null;

                    return (
                      <div
                        key={shopifyVariant.id}
                        className="grid grid-cols-[1fr,auto,1fr] gap-4 items-start"
                      >
                        {/* Left: Shopify Variant Info */}
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                              {shopifyVariant.title === 'Default Title' ? shopifyProduct.title : shopifyVariant.title}
                            </h4>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              ${shopifyVariant.price}
                            </span>
                          </div>
                          {shopifyVariant.sku && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                              SKU: {shopifyVariant.sku}
                            </p>
                          )}
                        </div>

                        {/* Center: Arrow */}
                        <div className="flex items-center justify-center pt-2">
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                        </div>

                        {/* Right: Quote Variant Dropdown */}
                        <div className="flex flex-col gap-2">
                          <CustomDropdown
                            value={selectedQuoteIndex ?? null}
                            onChange={(value) => handleMappingChange(shopifyVariant.id, value)}
                            quoteVariants={quoteVariants}
                            isNewQuoteVariant={isNewQuoteVariant}
                          />

                          {/* Suggested Price Info */}
                          {selectedQuote && (() => {
                            const qCost = isNewQuoteVariant(selectedQuote)
                              ? selectedQuote.costPerItem
                              : selectedQuote.costPerItem;
                            const suggestedPrice = getSuggestedPrice(qCost);
                            const showLowMarginWarning = suggestedPrice - qCost < 20;

                            return (
                              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                <div>
                                  <span className="font-medium">Suggested price:</span> ${suggestedPrice.toFixed(2)}
                                </div>
                                {showLowMarginWarning && (
                                  <div className="text-amber-700 dark:text-amber-300">
                                    Low margin - consider packs for better ad ROI
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Unmapped Warning */}
                {unmappedCount > 0 && (
                  <div className="mt-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800 dark:text-amber-200">
                        <span className="font-medium">{unmappedCount} variant{unmappedCount > 1 ? 's' : ''} unmapped.</span> These will not be fulfilled or invoiced automatically.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0 rounded-b-xl">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {Array.from(mappings.values()).filter(v => v !== null).length} of {shopifyProduct.variants.length} variants mapped
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={onClose}
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmClick}
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
      </div>

      <WarningModal
        isOpen={showWarning}
        onClose={() => setShowWarning(false)}
        onConfirm={handleConfirm}
        unmappedCount={unmappedCount}
        totalCount={shopifyProduct.variants.length}
      />
    </>
  );
}
