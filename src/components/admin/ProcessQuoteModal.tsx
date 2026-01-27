import React, { useState } from 'react';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import { toast } from '../../lib/toast';
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
  onSubmit: (variants: QuoteVariant[], shippingTimeframe: { min: number; max: number }) => void;
}

export const ProcessQuoteModal: React.FC<ProcessQuoteModalProps> = ({
  quote,
  onClose,
  onSubmit
}) => {
  const [variants, setVariants] = useState<QuoteVariant[]>([
    { packSize: 1, skuPrefix: '', finalVariants: [] }
  ]);
  const [shippingTimeframeMin, setShippingTimeframeMin] = useState(4);
  const [shippingTimeframeMax, setShippingTimeframeMax] = useState(7);

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
    if (shippingTimeframeMin < 1) {
      toast.error('Minimum shipping timeframe must be at least 1 business day');
      return;
    }
    if (shippingTimeframeMax < shippingTimeframeMin) {
      toast.error('Maximum shipping timeframe must be greater than or equal to minimum');
      return;
    }
    if (shippingTimeframeMax > 30) {
      toast.error('Maximum shipping timeframe cannot exceed 30 business days');
      return;
    }

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

    onSubmit(variants, { min: shippingTimeframeMin, max: shippingTimeframeMax });
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
          <div className="p-4 bg-gray-50 dark:bg-[#3a3a3a]/50/50 rounded-lg border border-gray-200 dark:border-[#3a3a3a]">
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
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Shipping Timeframe
          </h3>
          <div className="p-4 bg-gray-50 dark:bg-[#3a3a3a]/50/50 rounded-lg border border-gray-200 dark:border-[#3a3a3a]">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              Expected delivery time in business days (excludes weekends and holidays)
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Minimum Business Days
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={shippingTimeframeMin}
                  onChange={(e) => setShippingTimeframeMin(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 dark:focus:ring-rose-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Maximum Business Days
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={shippingTimeframeMax}
                  onChange={(e) => setShippingTimeframeMax(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 dark:focus:ring-rose-400 focus:border-transparent"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              Customer expectation: Delivery within {shippingTimeframeMin === shippingTimeframeMax ? `${shippingTimeframeMin}` : `${shippingTimeframeMin}-${shippingTimeframeMax}`} business days after shipment
            </p>
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
                className="p-5 bg-white dark:bg-dark rounded-lg border-2 border-gray-200 dark:border-[#3a3a3a]"
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
              className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-[#4a4a4a] rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Pack Size</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-[#3a3a3a]/50 px-6 py-4 -mx-6 -mb-6">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="btn btn-primary"
          >
            Submit Quote
          </button>
        </div>
      </div>
    </Modal>
  );
};
