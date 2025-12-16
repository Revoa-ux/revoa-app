import React, { useState } from 'react';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import Modal from '@/components/Modal';
import { PackSizeEditor } from '@/components/quotes/PackSizeEditor';
import { QuoteVariant } from '@/types/quotes';

interface Quote {
  id: string;
  productUrl: string;
  productName: string;
  shopifyProductId?: string;
  shopDomain?: string;
}

interface ProcessQuoteModalProps {
  quote: Quote;
  onClose: () => void;
  onSubmit: (variants: QuoteVariant[]) => void;
}

export const ProcessQuoteModal: React.FC<ProcessQuoteModalProps> = ({
  quote,
  onClose,
  onSubmit
}) => {
  const [variants, setVariants] = useState<QuoteVariant[]>([
    { packSize: 1, skuPrefix: '', finalVariants: [] }
  ]);

  const addPackOption = () => {
    const newPack: QuoteVariant = {
      packSize: 1,
      skuPrefix: '',
      finalVariants: []
    };
    setVariants([...variants, newPack]);
  };

  const removePackOption = (index: number) => {
    if (variants.length === 1) {
      toast.error('At least one pack option is required');
      return;
    }
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updatePack = (index: number, updates: Partial<QuoteVariant>) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], ...updates };
    setVariants(updated);
  };

  const handleSubmit = () => {
    for (let i = 0; i < variants.length; i++) {
      const pack = variants[i];
      if (!pack.skuPrefix.trim()) {
        toast.error(`Pack ${i + 1}: SKU prefix is required`);
        return;
      }
      if (pack.finalVariants.length === 0) {
        toast.error(`Pack ${i + 1}: At least one variant is required`);
        return;
      }
      for (let j = 0; j < pack.finalVariants.length; j++) {
        const finalVar = pack.finalVariants[j];
        if (!finalVar.sku.trim()) {
          toast.error(`Pack ${i + 1}, Variant ${j + 1}: SKU is required`);
          return;
        }
        if (finalVar.costPerItem <= 0) {
          toast.error(`Pack ${i + 1}, Variant ${j + 1}: Cost must be greater than 0`);
          return;
        }
      }
    }

    onSubmit(variants);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Process Quote Request"
      maxWidth="max-w-5xl"
    >
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Product Details
          </h3>
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
              className="text-sm text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 flex items-center transition-colors"
            >
              View Product
              <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
            </a>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Pack Options
          </h3>

          <div className="space-y-4">
            {variants.map((pack, packIndex) => (
              <div
                key={packIndex}
                className="p-5 bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                    Pack Option {packIndex + 1}
                  </h4>
                  {variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePackOption(packIndex)}
                      className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <PackSizeEditor
                  packSize={pack.packSize}
                  skuPrefix={pack.skuPrefix}
                  finalVariants={pack.finalVariants}
                  onPackSizeChange={(packSize) => updatePack(packIndex, { packSize })}
                  onSkuPrefixChange={(skuPrefix) => updatePack(packIndex, { skuPrefix })}
                  onFinalVariantsChange={(finalVariants) => updatePack(packIndex, { finalVariants })}
                />
              </div>
            ))}

            <button
              type="button"
              onClick={addPackOption}
              className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Pack Size</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Submit Quote
          </button>
        </div>
      </div>
    </Modal>
  );
};
