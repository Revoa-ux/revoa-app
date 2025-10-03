import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import type { Quote, QuoteVariant } from '../../types/quotes';

interface QuoteFormProps {
  onSubmit: (quote: Omit<Quote, 'id' | 'requestDate' | 'status'>) => void;
  onCancel: () => void;
  initialData?: Partial<Quote>;
}

export const QuoteForm: React.FC<QuoteFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const [productUrl, setProductUrl] = useState(initialData?.productUrl || '');
  const [productName, setProductName] = useState(initialData?.productName || '');
  const [platform, setPlatform] = useState<'aliexpress' | 'amazon' | 'other'>(
    initialData?.platform || 'aliexpress'
  );
  const [variants, setVariants] = useState<QuoteVariant[]>(
    initialData?.variants || [{ quantity: 0, costPerItem: 0, shippingCost: 0, totalCost: 0 }]
  );

  const handleAddVariant = () => {
    setVariants([...variants, { quantity: 0, costPerItem: 0, shippingCost: 0, totalCost: 0 }]);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleVariantChange = (index: number, field: keyof QuoteVariant, value: number) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };

    if (field !== 'totalCost') {
      newVariants[index].totalCost =
        (newVariants[index].costPerItem * newVariants[index].quantity) + newVariants[index].shippingCost;
    }

    setVariants(newVariants);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      productUrl,
      productName,
      platform,
      variants
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Request Product Quote</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Product URL
            </label>
            <input
              type="url"
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Product Name
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Platform
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as 'aliexpress' | 'amazon' | 'other')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="aliexpress">AliExpress</option>
              <option value="amazon">Amazon</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Variants
              </label>
              <button
                type="button"
                onClick={handleAddVariant}
                className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Variant
              </button>
            </div>

            {variants.map((variant, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Variant {index + 1}</span>
                  {variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveVariant(index)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={variant.quantity}
                      onChange={(e) => handleVariantChange(index, 'quantity', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      min="0"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Cost Per Item</label>
                    <input
                      type="number"
                      step="0.01"
                      value={variant.costPerItem}
                      onChange={(e) => handleVariantChange(index, 'costPerItem', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      min="0"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Shipping Cost</label>
                    <input
                      type="number"
                      step="0.01"
                      value={variant.shippingCost}
                      onChange={(e) => handleVariantChange(index, 'shippingCost', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      min="0"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Total Cost</label>
                    <input
                      type="number"
                      step="0.01"
                      value={variant.totalCost}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                      readOnly
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Submit Quote Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
