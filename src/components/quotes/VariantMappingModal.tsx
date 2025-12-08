import { useState, useEffect, useMemo } from 'react';
import { X, AlertTriangle, CheckCircle2, Package, DollarSign, Truck, Info } from 'lucide-react';
import Modal from '../Modal';
import Button from '../Button';
import type { VariantMapping, VariantMappingState, ShopifyVariant, ShippingRules, NewQuoteVariant, FinalVariant } from '../../types/quotes';

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
  const [mappingState, setMappingState] = useState<VariantMappingState>({
    quoteId,
    shopifyProductId: shopifyProduct.id,
    shopifyProductTitle: shopifyProduct.title,
    mappings: [],
    isValid: false,
    warnings: [],
    changes: {
      skuUpdates: 0,
      priceUpdates: 0,
    },
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isNewQuoteVariant = (variant: any): variant is NewQuoteVariant => {
    return 'shippingRules' in variant && 'costPerItem' in variant;
  };

  useEffect(() => {
    const initialMappings: VariantMapping[] = quoteVariants.map((qVariant, index) => {
      const quoteVariantSku = qVariant.sku;
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

      const matchingShopifyVariant = shopifyProduct.variants.find(
        (sVariant) => sVariant.sku === quoteVariantSku
      ) || shopifyProduct.variants[index];

      if (!matchingShopifyVariant) {
        return null;
      }

      const shopifyPrice = parseFloat(matchingShopifyVariant.price);
      const willUpdateSku = matchingShopifyVariant.sku !== quoteVariantSku;
      const willUpdatePrice = Math.abs(shopifyPrice - quoteUnitCost) > 0.01;
      const priceDifference = willUpdatePrice ? quoteUnitCost - shopifyPrice : undefined;

      return {
        quoteVariantIndex: index,
        quoteVariantSku,
        quoteVariantName,
        quoteUnitCost,
        quotePackSize: 1,
        quoteShippingRules,
        shopifyVariantId: matchingShopifyVariant.id,
        shopifyVariantTitle: matchingShopifyVariant.title,
        shopifyVariantSku: matchingShopifyVariant.sku,
        shopifyVariantPrice: matchingShopifyVariant.price,
        willUpdateSku,
        willUpdatePrice,
        priceDifference,
      };
    }).filter((m): m is VariantMapping => m !== null);

    const warnings: string[] = [];
    const skuUpdates = initialMappings.filter(m => m.willUpdateSku).length;
    const priceUpdates = initialMappings.filter(m => m.willUpdatePrice).length;

    if (skuUpdates > 0) {
      warnings.push(`${skuUpdates} variant SKU${skuUpdates > 1 ? 's' : ''} will be updated`);
    }

    if (priceUpdates > 0) {
      warnings.push(`${priceUpdates} variant price${priceUpdates > 1 ? 's' : ''} will be updated`);
    }

    const largePriceDifferences = initialMappings.filter(
      m => m.priceDifference && Math.abs(m.priceDifference) > 5
    );

    if (largePriceDifferences.length > 0) {
      warnings.push(`${largePriceDifferences.length} variant${largePriceDifferences.length > 1 ? 's have' : ' has'} significant price differences (>$5)`);
    }

    setMappingState({
      quoteId,
      shopifyProductId: shopifyProduct.id,
      shopifyProductTitle: shopifyProduct.title,
      mappings: initialMappings,
      isValid: initialMappings.length === quoteVariants.length,
      warnings,
      changes: {
        skuUpdates,
        priceUpdates,
      },
    });
  }, [quoteId, quoteVariants, shopifyProduct]);

  const handleMappingChange = (quoteIndex: number, shopifyVariantId: string) => {
    const shopifyVariant = shopifyProduct.variants.find(v => v.id === shopifyVariantId);
    if (!shopifyVariant) return;

    const qVariant = quoteVariants[quoteIndex];
    const quoteVariantSku = qVariant.sku;
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
    const willUpdateSku = shopifyVariant.sku !== quoteVariantSku;
    const willUpdatePrice = Math.abs(shopifyPrice - quoteUnitCost) > 0.01;
    const priceDifference = willUpdatePrice ? quoteUnitCost - shopifyPrice : undefined;

    const newMappings = [...mappingState.mappings];
    newMappings[quoteIndex] = {
      quoteVariantIndex: quoteIndex,
      quoteVariantSku,
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
    };

    const warnings: string[] = [];
    const skuUpdates = newMappings.filter(m => m.willUpdateSku).length;
    const priceUpdates = newMappings.filter(m => m.willUpdatePrice).length;

    if (skuUpdates > 0) {
      warnings.push(`${skuUpdates} variant SKU${skuUpdates > 1 ? 's' : ''} will be updated`);
    }

    if (priceUpdates > 0) {
      warnings.push(`${priceUpdates} variant price${priceUpdates > 1 ? 's' : ''} will be updated`);
    }

    const largePriceDifferences = newMappings.filter(
      m => m.priceDifference && Math.abs(m.priceDifference) > 5
    );

    if (largePriceDifferences.length > 0) {
      warnings.push(`${largePriceDifferences.length} variant${largePriceDifferences.length > 1 ? 's have' : ' has'} significant price differences (>$5)`);
    }

    setMappingState({
      ...mappingState,
      mappings: newMappings,
      isValid: newMappings.length === quoteVariants.length && newMappings.every(m => m.shopifyVariantId),
      warnings,
      changes: {
        skuUpdates,
        priceUpdates,
      },
    });
  };

  const handleConfirm = async () => {
    if (!mappingState.isValid) return;

    setIsSubmitting(true);
    try {
      await onConfirm(mappingState.mappings);
    } catch (error) {
      console.error('Error confirming mappings:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatShippingRules = (rules: ShippingRules) => {
    const countries = Object.entries(rules.byCountry)
      .slice(0, 2)
      .map(([code, cost]) => `${code}: $${cost.toFixed(2)}`)
      .join(', ');

    const moreCountries = Object.keys(rules.byCountry).length > 2
      ? `, +${Object.keys(rules.byCountry).length - 2} more`
      : '';

    const tiers = rules.byQuantity && rules.byQuantity.length > 0
      ? ` • Discounts at ${rules.byQuantity.map(t => `${t.minQty} units`).join(', ')}`
      : '';

    return `Default: $${rules.default.toFixed(2)}${countries ? ` • ${countries}${moreCountries}` : ''}${tiers}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Map Quote Variants to Shopify" maxWidth="max-w-5xl">
      <div className="space-y-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-medium mb-1">Syncing to: {shopifyProduct.title}</p>
              <p className="text-blue-700 dark:text-blue-300">
                Map each quote variant to a Shopify variant. SKUs and prices will be automatically updated in your store.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {quoteVariants.map((qVariant, index) => {
            const mapping = mappingState.mappings[index];
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

            return (
              <div
                key={index}
                className="border-2 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800"
              >
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-0">
                  {/* Left Column - Quote Variant */}
                  <div className="p-5 bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-900/10 dark:to-transparent border-r border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-4">
                      <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        Quote Variant {index + 1}
                      </h4>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="font-semibold text-gray-900 dark:text-white text-base">
                          {quoteVariantName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono bg-white dark:bg-gray-900 px-3 py-1.5 rounded-lg text-gray-700 dark:text-gray-300 text-xs font-medium border border-gray-200 dark:border-gray-600">
                          SKU: {qVariant.sku}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="font-medium">${quoteUnitCost.toFixed(2)} per unit</span>
                      </div>
                      <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <Truck className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-500" />
                        <div className="text-xs leading-relaxed">
                          <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Shipping:</p>
                          <p>{formatShippingRules(quoteShippingRules)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Arrow Separator */}
                  <div className="flex items-center justify-center px-4 py-5 bg-gray-50 dark:bg-gray-900/30">
                    <div className="flex flex-col items-center gap-2">
                      <div className="text-3xl text-gray-400 dark:text-gray-500 font-light">→</div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">maps to</span>
                    </div>
                  </div>

                  {/* Right Column - Shopify Variant */}
                  <div className="p-5 bg-gradient-to-bl from-rose-50 to-transparent dark:from-rose-900/10 dark:to-transparent">
                    <div className="flex items-center gap-2 mb-4">
                      <Package className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        Shopify Variant
                      </h4>
                    </div>
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Select destination variant:
                      </label>
                      <select
                        value={mapping?.shopifyVariantId || ''}
                        onChange={(e) => handleMappingChange(index, e.target.value)}
                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-rose-500 dark:focus:ring-rose-400 focus:border-rose-500 dark:focus:border-rose-400 text-gray-900 dark:text-white font-medium transition-all"
                      >
                        <option value="">Choose a Shopify variant...</option>
                        {shopifyProduct.variants.map((sVariant) => (
                          <option key={sVariant.id} value={sVariant.id}>
                            {sVariant.title} {sVariant.sku ? `• SKU: ${sVariant.sku}` : '• No SKU'} • ${sVariant.price}
                          </option>
                        ))}
                      </select>
                    </div>

                    {mapping && (
                      <div className="space-y-2.5">
                        {mapping.willUpdateSku && (
                          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                            <div className="text-xs">
                              <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">SKU Update</p>
                              <p className="text-amber-700 dark:text-amber-300">
                                "{mapping.shopifyVariantSku || 'none'}" → "{mapping.quoteVariantSku}"
                              </p>
                            </div>
                          </div>
                        )}
                        {mapping.willUpdatePrice && (
                          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                            <div className="text-xs">
                              <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">Price Update</p>
                              <p className="text-amber-700 dark:text-amber-300">
                                ${mapping.shopifyVariantPrice} → ${mapping.quoteUnitCost.toFixed(2)}
                                {mapping.priceDifference && (
                                  <span className="ml-1 font-semibold">
                                    ({mapping.priceDifference > 0 ? '+' : ''}${mapping.priceDifference.toFixed(2)})
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        )}
                        {!mapping.willUpdateSku && !mapping.willUpdatePrice && (
                          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <span className="text-xs font-medium text-green-700 dark:text-green-300">Perfect match - no changes needed</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {mappingState.warnings.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-900 dark:text-amber-100 mb-2">
                  Changes to Shopify:
                </p>
                <ul className="space-y-1 text-amber-800 dark:text-amber-200">
                  {mappingState.warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
                <p className="mt-3 text-amber-700 dark:text-amber-300">
                  Existing orders will not be affected by these changes.
                </p>
              </div>
            </div>
          </div>
        )}

        {mappingState.mappings.some(m => Object.keys(m.quoteShippingRules.byCountry).length > 0) && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-medium mb-1">Shipping Rules</p>
                <p className="text-blue-700 dark:text-blue-300">
                  Shipping costs and quantity discounts are stored separately and will be applied automatically during invoicing.
                  They are not synced as separate Shopify variants.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!mappingState.isValid || isSubmitting}
            isLoading={isSubmitting}
          >
            {isSubmitting ? 'Syncing...' : 'Confirm Mapping & Sync'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}