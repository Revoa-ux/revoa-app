import { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, ArrowRight, Package, Link2, Info } from 'lucide-react';
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
    <Modal isOpen={isOpen} onClose={onClose} title="Incomplete Variant Mapping">
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
  const [selectedShopifyVariant, setSelectedShopifyVariant] = useState<string | null>(null);
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
    setSelectedShopifyVariant(null);
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

  const handleQuoteVariantClick = (quoteIndex: number) => {
    if (selectedShopifyVariant) {
      const currentMapping = mappings.get(selectedShopifyVariant);
      if (currentMapping === quoteIndex) {
        // Unmap if clicking the same one
        setMappings(prev => {
          const newMappings = new Map(prev);
          newMappings.set(selectedShopifyVariant, null);
          return newMappings;
        });
      } else {
        // Map to new variant
        setMappings(prev => {
          const newMappings = new Map(prev);
          newMappings.set(selectedShopifyVariant, quoteIndex);
          return newMappings;
        });
      }
      setSelectedShopifyVariant(null);
    }
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
    const totalCount = shopifyProduct.variants.length;

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

  const getMappedQuoteIndex = (shopifyVariantId: string) => {
    return mappings.get(shopifyVariantId) ?? null;
  };

  const isQuoteVariantMapped = (quoteIndex: number) => {
    return Array.from(mappings.values()).includes(quoteIndex);
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
              className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col"
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

                {/* Instructions */}
                <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-900 dark:text-blue-100">
                      Click a Shopify variant on the left, then click a quote variant on the right to create a mapping. Click again to unmap.
                    </p>
                  </div>
                </div>
              </div>

              {/* Content - Two Column Layout */}
              <div className="flex-1 overflow-hidden flex min-h-0">
                {/* Left Column - Shopify Variants */}
                <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Shopify Variants ({shopifyProduct.variants.length})
                    </h3>
                    {unmappedCount > 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        {unmappedCount} unmapped
                      </p>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {shopifyProduct.variants.map((variant) => {
                      const mappedIndex = getMappedQuoteIndex(variant.id);
                      const isSelected = selectedShopifyVariant === variant.id;
                      const isMapped = mappedIndex !== null;

                      return (
                        <button
                          key={variant.id}
                          onClick={() => setSelectedShopifyVariant(isSelected ? null : variant.id)}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20 shadow-md'
                              : isMapped
                              ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 hover:border-green-400 dark:hover:border-green-600'
                              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className={`font-medium text-sm truncate ${
                                isSelected
                                  ? 'text-pink-900 dark:text-pink-100'
                                  : 'text-gray-900 dark:text-white'
                              }`}>
                                {variant.title === 'Default Title' ? shopifyProduct.title : variant.title}
                              </h4>
                              {variant.sku && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">
                                  SKU: {variant.sku}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                ${variant.price}
                              </span>
                              {isMapped && (
                                <Link2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                              )}
                            </div>
                          </div>

                          {isMapped && mappedIndex !== null && (
                            <div className="text-xs text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
                              Mapped to: {isNewQuoteVariant(quoteVariants[mappedIndex]) ? quoteVariants[mappedIndex].name : quoteVariants[mappedIndex].variantName}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right Column - Quote Variants */}
                <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900/30">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Quote Variants ({quoteVariants.length})
                    </h3>
                    {selectedShopifyVariant && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Select a variant to map
                      </p>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {quoteVariants.map((qVariant, index) => {
                      const qName = isNewQuoteVariant(qVariant) ? qVariant.name : qVariant.variantName || 'Unnamed';
                      const qCost = isNewQuoteVariant(qVariant) ? qVariant.costPerItem : qVariant.costPerItem;
                      const isMapped = isQuoteVariantMapped(index);
                      const suggestedPrice = getSuggestedPrice(qCost);
                      const showLowMarginWarning = suggestedPrice - qCost < 20;

                      return (
                        <button
                          key={index}
                          onClick={() => handleQuoteVariantClick(index)}
                          disabled={!selectedShopifyVariant}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                            !selectedShopifyVariant
                              ? 'opacity-50 cursor-not-allowed'
                              : ''
                          } ${
                            isMapped
                              ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 hover:border-green-400 dark:hover:border-green-600'
                              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                {qName}
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">
                                SKU: {qVariant.sku}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                ${qCost.toFixed(2)}
                              </span>
                              {isMapped && (
                                <Package className="w-4 h-4 text-green-600 dark:text-green-400" />
                              )}
                            </div>
                          </div>

                          {/* Suggested Price Info */}
                          <div className="text-xs space-y-1">
                            <div className="text-gray-600 dark:text-gray-400">
                              <span className="font-medium">Suggested price:</span> ${suggestedPrice.toFixed(2)}
                            </div>
                            {showLowMarginWarning && (
                              <div className="text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
                                Low margin - consider packs for better ad ROI
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0 rounded-b-xl">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-gray-600 dark:text-gray-400">
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
