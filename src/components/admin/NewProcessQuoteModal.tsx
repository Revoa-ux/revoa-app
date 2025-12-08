import React, { useState, useEffect } from 'react';
import { ExternalLink, ArrowRight, Truck, Calendar } from 'lucide-react';
import Modal from '@/components/Modal';
import { QuickModeBulkEditor } from '@/components/quotes/QuickModeBulkEditor';
import { NewQuoteVariant, QuoteVariant, FinalVariant, Quote } from '@/types/quotes';
import { toast } from 'sonner';
import { CustomCheckbox } from '@/components/CustomCheckbox';
import ToggleSwitch from '@/components/ToggleSwitch';

export interface ProductPolicies {
  warrantyDays: number | null;
  coversLostItems: boolean;
  coversDamagedItems: boolean;
  coversLateDelivery: boolean;
}

interface NewProcessQuoteModalProps {
  quote: Quote;
  onClose: () => void;
  onSubmit: (variants: QuoteVariant[], policies: ProductPolicies) => void;
}

export const NewProcessQuoteModal: React.FC<NewProcessQuoteModalProps> = ({
  quote,
  onClose,
  onSubmit
}) => {
  // Convert existing quote variants to NewQuoteVariant format
  const convertExistingVariants = (existingVariants?: QuoteVariant[]): NewQuoteVariant[] => {
    if (!existingVariants || existingVariants.length === 0) {
      return [{
        id: `var_${Date.now()}`,
        sku: '',
        name: quote.productName,
        attributes: [],
        costPerItem: 0,
        shippingRules: {
          default: 0,
          byCountry: {},
          byQuantity: undefined
        },
        enabled: true
      }];
    }

    const converted: NewQuoteVariant[] = [];
    existingVariants.forEach((variant) => {
      variant.finalVariants.forEach((fv, idx) => {
        const { _default, ...byCountry } = fv.shippingCosts;
        converted.push({
          id: `var_${Date.now()}_${idx}`,
          sku: fv.sku,
          name: fv.variantName ||
                (fv.attributes.length > 0
                  ? fv.attributes.map(a => a.value).join(' - ')
                  : quote.productName),
          attributes: fv.attributes,
          costPerItem: fv.costPerItem,
          shippingRules: {
            default: _default,
            byCountry: byCountry,
            byQuantity: undefined
          },
          enabled: true
        });
      });
    });

    return converted;
  };

  const [variants, setVariants] = useState<NewQuoteVariant[]>(() =>
    convertExistingVariants(quote.variants)
  );

  // Policy fields - initialize from existing quote data
  const [hasWarranty, setHasWarranty] = useState(!!quote.warrantyDays);
  const [warrantyDays, setWarrantyDays] = useState(quote.warrantyDays || 30);
  const [hasShippingCoverage, setHasShippingCoverage] = useState(
    !!(quote.coversLostItems || quote.coversDamagedItems || quote.coversLateDelivery)
  );
  const [coversLostItems, setCoversLostItems] = useState(!!quote.coversLostItems);
  const [coversDamagedItems, setCoversDamagedItems] = useState(!!quote.coversDamagedItems);
  const [coversLateDelivery, setCoversLateDelivery] = useState(!!quote.coversLateDelivery);

  // Update warranty days when quote changes
  useEffect(() => {
    if (quote.warrantyDays) {
      setHasWarranty(true);
      setWarrantyDays(quote.warrantyDays);
    }
  }, [quote.warrantyDays]);

  // Update shipping coverage when quote changes
  useEffect(() => {
    const hasAnyCoverage = !!(quote.coversLostItems || quote.coversDamagedItems || quote.coversLateDelivery);
    setHasShippingCoverage(hasAnyCoverage);
    setCoversLostItems(!!quote.coversLostItems);
    setCoversDamagedItems(!!quote.coversDamagedItems);
    setCoversLateDelivery(!!quote.coversLateDelivery);
  }, [quote.coversLostItems, quote.coversDamagedItems, quote.coversLateDelivery]);

  // Update variants when quote changes
  useEffect(() => {
    setVariants(convertExistingVariants(quote.variants));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote.id, quote.variants]);

  const canSubmit = variants.every(v => v.sku.trim() && v.costPerItem > 0 && v.shippingRules.default >= 0);

  const convertToLegacyFormat = (): QuoteVariant[] => {
    return variants.map(variant => {
      const finalVariant: FinalVariant = {
        sku: variant.sku,
        attributes: variant.attributes,
        costPerItem: variant.costPerItem,
        shippingCosts: {
          _default: variant.shippingRules.default,
          ...variant.shippingRules.byCountry
        },
        variantName: variant.name
      };

      return {
        packSize: 1,
        skuPrefix: variant.sku,
        finalVariants: [finalVariant]
      };
    });
  };

  const handleSubmit = () => {
    if (!canSubmit) {
      toast.error('Please complete all required fields');
      return;
    }

    const legacyVariants = convertToLegacyFormat();

    const policies: ProductPolicies = {
      warrantyDays: hasWarranty ? warrantyDays : null,
      coversLostItems: hasShippingCoverage ? coversLostItems : false,
      coversDamagedItems: hasShippingCoverage ? coversDamagedItems : false,
      coversLateDelivery: hasShippingCoverage ? coversLateDelivery : false
    };

    onSubmit(legacyVariants, policies);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Process Quote Request"
      maxWidth="max-w-7xl"
    >
      <div className="space-y-6">
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            {quote.productName}
          </p>
          <a
            href={
              quote.shopifyProductId && quote.shopDomain
                ? `https://${quote.shopDomain}/admin/products/${quote.shopifyProductId}`
                : quote.productUrl
            }
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 flex items-center space-x-1 transition-colors"
          >
            <span>View Product</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <QuickModeBulkEditor
          variants={variants}
          onVariantsChange={setVariants}
        />

        {/* Product Policies Section */}
        <div>
          <div className="mb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Product Policies
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              These policies will be used in email templates for customer support
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Product Warranty Card */}
            <div className="p-5 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Factory's Product Warranty
                  </label>
                </div>
                <ToggleSwitch
                  checked={hasWarranty}
                  onChange={setHasWarranty}
                  size="sm"
                />
              </div>

              {hasWarranty && (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={warrantyDays}
                      onChange={(e) => setWarrantyDays(parseInt(e.target.value) || 0)}
                      placeholder="30"
                      className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-rose-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">days</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Defect coverage period from delivery date
                  </p>
                </>
              )}

              {!hasWarranty && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  No warranty coverage
                </p>
              )}
            </div>

            {/* Shipping Coverage Card */}
            <div className="p-5 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Logistics Shipment Coverage
                  </label>
                </div>
                <ToggleSwitch
                  checked={hasShippingCoverage}
                  onChange={setHasShippingCoverage}
                  size="sm"
                />
              </div>

              {hasShippingCoverage && (
                <>
                  <div className="space-y-2.5">
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <CustomCheckbox
                        checked={coversLostItems}
                        onChange={(e) => setCoversLostItems(e.target.checked)}
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                        Covers lost items in transit
                      </span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <CustomCheckbox
                        checked={coversDamagedItems}
                        onChange={(e) => setCoversDamagedItems(e.target.checked)}
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                        Covers damaged items in transit
                      </span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <CustomCheckbox
                        checked={coversLateDelivery}
                        onChange={(e) => setCoversLateDelivery(e.target.checked)}
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                        Covers late delivery
                      </span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Select which issues your logistics provider covers
                  </p>
                </>
              )}

              {!hasShippingCoverage && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  No shipping coverage
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="group px-6 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 rounded-lg transition-all active:scale-95 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Submit Quote
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </Modal>
  );
};
