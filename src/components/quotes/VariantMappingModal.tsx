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
    <Modal isOpen={isOpen} onClose={onClose} title="Map Quote Variants to Shopify" size="xl">
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
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="w-4 h-4 text-gray-400" />
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Quote Variant {index + 1}
                      </h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {quoteVariantName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                          SKU: {qVariant.sku}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>${quoteUnitCost.toFixed(2)} per unit</span>
                      </div>
                      <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                        <Truck className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span className="text-xs leading-relaxed">
                          {formatShippingRules(quoteShippingRules)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">→</span>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Shopify Variant
                      </h4>
                    </div>
                    <select
                      value={mapping?.shopifyVariantId || ''}
                      onChange={(e) => handleMappingChange(index, e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-gray-900 dark:text-white mb-3"
                    >
                      <option value="">Select a Shopify variant...</option>
                      {shopifyProduct.variants.map((sVariant) => (
                        <option key={sVariant.id} value={sVariant.id}>
                          {sVariant.title} {sVariant.sku ? `(SKU: ${sVariant.sku})` : '(No SKU)'} - ${sVariant.price}
                        </option>
                      ))}
                    </select>

                    {mapping && (
                      <div className="space-y-2 text-sm">
                        {mapping.willUpdateSku && (
                          <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            <span className="text-xs">
                              Will update SKU from "{mapping.shopifyVariantSku || 'none'}" to "{mapping.quoteVariantSku}"
                            </span>
                          </div>
                        )}
                        {mapping.willUpdatePrice && (
                          <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            <span className="text-xs">
                              Will update price from ${mapping.shopifyVariantPrice} to ${mapping.quoteUnitCost.toFixed(2)}
                              {mapping.priceDifference && (
                                <span className="ml-1">
                                  ({mapping.priceDifference > 0 ? '+' : ''}${mapping.priceDifference.toFixed(2)})
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                        {!mapping.willUpdateSku && !mapping.willUpdatePrice && (
                          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="text-xs">No changes needed</span>
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