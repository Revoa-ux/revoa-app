import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
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

interface NewProcessQuoteModalProps {
  quote: Quote;
  onClose: () => void;
  onSubmit: (variants: QuoteVariant[]) => void;
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
    onSubmit(legacyVariants);
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
            className="px-6 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            Submit Quote
          </button>
        </div>
      </div>
    </Modal>
  );
};
