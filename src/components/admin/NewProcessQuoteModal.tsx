import React, { useState } from 'react';
import { ExternalLink, ArrowRight, Shield, Truck } from 'lucide-react';
import Modal from '@/components/Modal';
import { QuickModeBulkEditor } from '@/components/quotes/QuickModeBulkEditor';
import { NewQuoteVariant, QuoteVariant, FinalVariant } from '@/types/quotes';
import { toast } from 'sonner';

interface Quote {
  id: string;
  productUrl: string;
  productName: string;
  shopifyProductId?: string;
  shopDomain?: string;
}

export interface ProductPolicies {
  warranty: string;
  coversLostItems: boolean;
  coversDamagedItems: boolean;
  coversLateDelivery: boolean;
}

interface NewProcessQuoteModalProps {
  quote: Quote;
  onClose: () => void;
  onSubmit: (variants: QuoteVariant[], policies?: ProductPolicies) => void;
}

export const NewProcessQuoteModal: React.FC<NewProcessQuoteModalProps> = ({
  quote,
  onClose,
  onSubmit
}) => {
  const [variants, setVariants] = useState<NewQuoteVariant[]>([{
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
  }]);

  // Policy fields
  const [productWarranty, setProductWarranty] = useState('30 days');
  const [coversLostItems, setCoversLostItems] = useState(false);
  const [coversDamagedItems, setCoversDamagedItems] = useState(false);
  const [coversLateDelivery, setCoversLateDelivery] = useState(false);

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
        }
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
      warranty: productWarranty,
      coversLostItems,
      coversDamagedItems,
      coversLateDelivery
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
        <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              Product Policies
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              These policies will be used in email templates for customer support
            </p>
          </div>

          {/* Product Warranty */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Product Warranty from Factory
            </label>
            <input
              type="text"
              value={productWarranty}
              onChange={(e) => setProductWarranty(e.target.value)}
              placeholder="e.g., 30 days, 60 days, 90 days"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-rose-500 dark:bg-gray-800 dark:text-white text-sm"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Defect coverage period from delivery date
            </p>
          </div>

          {/* Shipping Policy Coverage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Shipping Policy Coverage
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={coversLostItems}
                  onChange={(e) => setCoversLostItems(e.target.checked)}
                  className="w-4 h-4 text-rose-600 border-gray-300 rounded focus:ring-rose-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Covers lost items in transit
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={coversDamagedItems}
                  onChange={(e) => setCoversDamagedItems(e.target.checked)}
                  className="w-4 h-4 text-rose-600 border-gray-300 rounded focus:ring-rose-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Covers damaged items in transit
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={coversLateDelivery}
                  onChange={(e) => setCoversLateDelivery(e.target.checked)}
                  className="w-4 h-4 text-rose-600 border-gray-300 rounded focus:ring-rose-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Covers late delivery
                </span>
              </label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Select which issues your logistics provider covers
            </p>
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
