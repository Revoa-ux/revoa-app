import { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, ArrowRight, ArrowLeft, ShoppingBag, Package, TrendingUp, DollarSign } from 'lucide-react';
import type { VariantMapping, ShopifyVariant, ShippingRules, NewQuoteVariant, FinalVariant } from '../../types/quotes';
import Modal from '../Modal';
import { QuoteVariantDropdown } from './QuoteVariantDropdown';
import { ShopifyVariantCard, getVariantOptions } from './ShopifyVariantCard';
import { SellingPriceEditor } from './SellingPriceEditor';

// Helper functions for suggested selling prices
const getSuggestedMultiplier = (cost: number): number => {
  if (cost > 100) return 2;
  if (cost > 50) return 2.5;
  return 3;
};

const applyPsychologicalPricing = (price: number): number => {
  if (price < 10) {
    return Math.ceil(price) - 0.01;
  } else {
    const roundedUp = Math.ceil(price);
    if (price > roundedUp - 0.51) {
      return roundedUp - 0.01;
    } else {
      return Math.floor(price) + 0.99;
    }
  }
};

const getSuggestedSellingPrice = (cost: number): number => {
  const basePrice = cost * getSuggestedMultiplier(cost);
  const psychologicalPrice = applyPsychologicalPricing(basePrice);

  // Enforce minimum $20 margin rule
  const minimumMargin = 20;
  const minimumPrice = cost + minimumMargin;

  // If the psychological price doesn't meet minimum margin, apply psychological pricing to minimum price
  if (psychologicalPrice < minimumPrice) {
    return applyPsychologicalPricing(minimumPrice);
  }

  return psychologicalPrice;
};

const calculateProfitMargin = (sellingPrice: number, cost: number): { amount: number; percentage: number } => {
  const amount = sellingPrice - cost;
  const percentage = (amount / cost) * 100;
  return { amount, percentage };
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
  priceChangesCount: number;
  totalCount: number;
}

function WarningModal({ isOpen, onClose, onConfirm, unmappedCount, priceChangesCount, totalCount }: WarningModalProps) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Variant Mapping" maxWidth="max-w-lg">
      <div className="space-y-4">
        {unmappedCount > 0 && (
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
        )}

        {priceChangesCount > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  {priceChangesCount} price{priceChangesCount > 1 ? 's' : ''} will be updated in Shopify
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  The selling prices you've set will be synced to your Shopify store immediately.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="btn btn-ghost"
          >
            Go Back
          </button>
          <button
            onClick={onConfirm}
            className="btn btn-danger group"
          >
            <span>{unmappedCount > 0 ? 'Continue Anyway' : 'Confirm & Sync'}</span>
            <ArrowRight className="btn-icon btn-icon-arrow" />
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
  const [sellingPrices, setSellingPrices] = useState<Map<string, number | null>>(new Map());
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

  const handlePriceChange = (shopifyVariantId: string, price: number | null) => {
    setSellingPrices(prev => {
      const newPrices = new Map(prev);
      newPrices.set(shopifyVariantId, price);
      return newPrices;
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

      const intendedSellingPrice = sellingPrices.get(shopifyVariantId) ?? null;
      const currentPrice = parseFloat(shopifyVariant.price);
      const willUpdateSku = shopifyVariant.sku !== qVariant.sku;
      const willUpdatePrice = intendedSellingPrice !== null && Math.abs(intendedSellingPrice - currentPrice) > 0.01;
      const priceDifference = willUpdatePrice && intendedSellingPrice ? intendedSellingPrice - currentPrice : undefined;

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
        currentSellingPrice: shopifyVariant.price,
        willUpdateSku,
        willUpdatePrice,
        priceDifference,
        intendedSellingPrice: intendedSellingPrice ?? undefined,
      });
    });

    return result;
  };

  const countPriceChanges = (): number => {
    let count = 0;
    mappings.forEach((quoteIndex, shopifyVariantId) => {
      if (quoteIndex === null) return;
      const shopifyVariant = shopifyProduct.variants.find(v => v.id === shopifyVariantId);
      const intendedPrice = sellingPrices.get(shopifyVariantId);
      if (shopifyVariant && intendedPrice !== null && intendedPrice !== undefined) {
        const currentPrice = parseFloat(shopifyVariant.price);
        if (Math.abs(intendedPrice - currentPrice) > 0.01) {
          count++;
        }
      }
    });
    return count;
  };

  const handleConfirmClick = () => {
    const unmappedCount = Array.from(mappings.values()).filter(v => v === null).length;
    const priceChangesCount = countPriceChanges();

    if (unmappedCount > 0 || priceChangesCount > 0) {
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
      <div className="fixed inset-0 z-40">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          aria-hidden="true"
        />

        {/* Modal Container */}
        <div className="fixed inset-0 z-40 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              ref={modalRef}
              className="relative bg-white dark:bg-dark rounded-xl shadow-xl w-full max-w-[95vw] sm:max-w-xl md:max-w-2xl lg:max-w-5xl xl:max-w-7xl max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              {/* Header */}
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-[#3a3a3a] flex-shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
                      Map Quote to Existing Shopify Product
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {shopifyProduct.title}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-all duration-200 flex-shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-6 min-h-[400px] bg-gray-50 dark:bg-[#3a3a3a]/50/30">
                {/* Column Headers - Hidden on mobile */}
                <div className="hidden lg:grid grid-cols-[1fr,40px,1fr,40px,1fr] gap-4 mb-5 px-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <ShoppingBag className="w-4 h-4" />
                    <span>Shopify Variant</span>
                  </div>
                  <div></div>
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Package className="w-4 h-4" />
                    <span>Quote Variant</span>
                  </div>
                  <div></div>
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <TrendingUp className="w-4 h-4" />
                    <span>Profit</span>
                  </div>
                </div>

                {/* Variant Mapping List */}
                <div className="space-y-3 sm:space-y-4">
                  {shopifyProduct.variants.map((shopifyVariant, index) => {
                    const selectedQuoteIndex = mappings.get(shopifyVariant.id);
                    const selectedQuote = selectedQuoteIndex !== null && selectedQuoteIndex !== undefined
                      ? quoteVariants[selectedQuoteIndex]
                      : null;

                    const cost = selectedQuote
                      ? (isNewQuoteVariant(selectedQuote) ? selectedQuote.costPerItem : selectedQuote.costPerItem)
                      : 0;
                    const suggestedPrice = cost > 0 ? getSuggestedSellingPrice(cost) : 0;
                    const variantOptions = getVariantOptions(shopifyVariant, shopifyProduct.options);

                    // Calculate margin percentage for current price
                    const currentPrice = parseFloat(shopifyVariant.price);
                    const currentMargin = currentPrice - cost;
                    const currentMarginPercent = currentPrice > 0 ? ((currentMargin / currentPrice) * 100) : 0;

                    // Check if this is a new group (option changed from previous variant)
                    const prevVariant = index > 0 ? shopifyProduct.variants[index - 1] : null;
                    const prevOptions = prevVariant ? getVariantOptions(prevVariant, shopifyProduct.options) : null;
                    const showGroupHeader = variantOptions && variantOptions !== prevOptions;

                    return (
                      <div key={shopifyVariant.id}>
                        {/* Option Names Group Header */}
                        {showGroupHeader && (
                          <div className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5 mt-3 sm:mt-4 first:mt-0">
                            {variantOptions}
                          </div>
                        )}

                        {/* Mobile Layout - Stacked */}
                        <div className="flex flex-col gap-3 lg:hidden">
                          {/* Shopify Variant */}
                          <div>
                            <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>Shopify Variant</span>
                            </div>
                            <div className="bg-white dark:bg-dark rounded-lg p-2.5 border border-gray-200 dark:border-[#3a3a3a] shadow-sm">
                              <ShopifyVariantCard
                                variant={shopifyVariant}
                                productOptions={shopifyProduct.options}
                                productTitle={shopifyProduct.title}
                                showPrice={true}
                                marginPercent={selectedQuote ? currentMarginPercent : undefined}
                              />
                            </div>
                          </div>

                          {/* Quote Variant */}
                          <div>
                            <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                              <Package className="w-3.5 h-3.5" />
                              <span>Quote Variant</span>
                            </div>
                            <div className="bg-white dark:bg-dark rounded-lg p-2.5 border border-gray-200 dark:border-[#3a3a3a] shadow-sm">
                              <QuoteVariantDropdown
                                value={selectedQuoteIndex ?? null}
                                onChange={(value) => handleMappingChange(shopifyVariant.id, value)}
                                quoteVariants={quoteVariants}
                                isNewQuoteVariant={isNewQuoteVariant}
                              />
                            </div>
                          </div>

                          {/* Profit */}
                          <div>
                            <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                              <TrendingUp className="w-3.5 h-3.5" />
                              <span>Profit</span>
                            </div>
                            <div className="bg-white dark:bg-dark rounded-lg p-2.5 border border-gray-200 dark:border-[#3a3a3a] shadow-sm">
                              {selectedQuote ? (
                                <SellingPriceEditor
                                  currentPrice={shopifyVariant.price}
                                  cost={cost}
                                  suggestedPrice={suggestedPrice}
                                  value={sellingPrices.get(shopifyVariant.id) ?? null}
                                  onChange={(price) => handlePriceChange(shopifyVariant.id, price)}
                                />
                              ) : (
                                <div className="flex items-center justify-center text-xs text-gray-400 dark:text-gray-500 py-2">
                                  Select quote variant first
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Desktop Layout - Grid */}
                        <div className="hidden lg:grid grid-cols-[1fr,40px,1fr,40px,1fr] gap-4 items-stretch">
                          {/* Column 1: Shopify Variant with Card */}
                          <div className="bg-white dark:bg-dark rounded-xl p-3 border border-gray-200 dark:border-[#3a3a3a] shadow-sm hover:shadow transition-shadow h-[70px] flex items-center">
                            <div className="w-full">
                              <ShopifyVariantCard
                                variant={shopifyVariant}
                                productOptions={shopifyProduct.options}
                                productTitle={shopifyProduct.title}
                                showPrice={true}
                                marginPercent={selectedQuote ? currentMarginPercent : undefined}
                              />
                            </div>
                          </div>

                          {/* Column 2: Arrow */}
                          <div className="flex items-center justify-center">
                            <ArrowRight className="w-5 h-5 text-gray-400" />
                          </div>

                          {/* Column 3: Quote Variant Dropdown with Card */}
                          <div className="bg-white dark:bg-dark rounded-xl p-3 border border-gray-200 dark:border-[#3a3a3a] shadow-sm hover:shadow transition-shadow h-[70px] flex items-center">
                            <div className="w-full">
                              <QuoteVariantDropdown
                                value={selectedQuoteIndex ?? null}
                                onChange={(value) => handleMappingChange(shopifyVariant.id, value)}
                                quoteVariants={quoteVariants}
                                isNewQuoteVariant={isNewQuoteVariant}
                              />
                            </div>
                          </div>

                          {/* Column 4: Arrow */}
                          <div className="flex items-center justify-center">
                            <ArrowRight className="w-5 h-5 text-gray-400" />
                          </div>

                          {/* Column 5: Profit Info with Card */}
                          <div className="bg-white dark:bg-dark rounded-xl p-3 border border-gray-200 dark:border-[#3a3a3a] shadow-sm hover:shadow transition-shadow h-[70px] flex items-center">
                            {selectedQuote ? (
                              <div className="w-full">
                                <SellingPriceEditor
                                  currentPrice={shopifyVariant.price}
                                  cost={cost}
                                  suggestedPrice={suggestedPrice}
                                  value={sellingPrices.get(shopifyVariant.id) ?? null}
                                  onChange={(price) => handlePriceChange(shopifyVariant.id, price)}
                                />
                              </div>
                            ) : (
                              <div className="flex items-center justify-center text-sm text-gray-400 dark:text-gray-500 w-full">
                                Select a quote variant first
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-[#3a3a3a]/50 px-6 py-4 flex justify-between flex-shrink-0 rounded-b-xl">
                <button
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="btn btn-secondary"
                >
                  <ArrowLeft className="btn-icon btn-icon-back" />
                  Cancel
                </button>
                <button
                  onClick={handleConfirmClick}
                  disabled={!isValid() || isSubmitting}
                  className="btn btn-primary group"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm & Sync</span>
                      <ArrowRight className="btn-icon btn-icon-arrow" />
                    </>
                  )}
                </button>
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
        priceChangesCount={countPriceChanges()}
        totalCount={shopifyProduct.variants.length}
      />
    </>
  );
}
