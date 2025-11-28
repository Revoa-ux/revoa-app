import React, { useState } from 'react';
import { X, Plus, Trash2, AlertCircle, Globe, Save } from 'lucide-react';
import { toast } from 'sonner';
import { editQuote } from '@/lib/quoteEditService';
import Modal from '@/components/Modal';

interface QuoteVariant {
  quantity: number;
  sku: string;
  costPerItem: number;
  shippingCosts: {
    [countryCode: string]: number;
    _default: number;
  };
}

interface EditQuoteModalProps {
  quoteId: string;
  quoteName: string;
  currentVariants: QuoteVariant[];
  adminId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'AT', name: 'Austria' },
  { code: 'IE', name: 'Ireland' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'SG', name: 'Singapore' },
  { code: 'JP', name: 'Japan' }
];

export const EditQuoteModal: React.FC<EditQuoteModalProps> = ({
  quoteId,
  quoteName,
  currentVariants,
  adminId,
  onClose,
  onSuccess
}) => {
  const [variants, setVariants] = useState<QuoteVariant[]>(
    JSON.parse(JSON.stringify(currentVariants)) // Deep clone
  );
  const [editReason, setEditReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleVariantChange = (
    index: number,
    field: keyof QuoteVariant,
    value: any
  ) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const handleShippingCostChange = (
    variantIndex: number,
    countryCode: string,
    cost: number
  ) => {
    const updated = [...variants];
    updated[variantIndex] = {
      ...updated[variantIndex],
      shippingCosts: {
        ...updated[variantIndex].shippingCosts,
        [countryCode]: cost
      }
    };
    setVariants(updated);
  };

  const addShippingCountry = (variantIndex: number, countryCode: string) => {
    const updated = [...variants];
    const defaultCost = updated[variantIndex].shippingCosts._default || 0;
    updated[variantIndex] = {
      ...updated[variantIndex],
      shippingCosts: {
        ...updated[variantIndex].shippingCosts,
        [countryCode]: defaultCost
      }
    };
    setVariants(updated);
  };

  const removeShippingCountry = (variantIndex: number, countryCode: string) => {
    const updated = [...variants];
    const { [countryCode]: removed, ...rest } = updated[variantIndex].shippingCosts;
    updated[variantIndex] = {
      ...updated[variantIndex],
      shippingCosts: rest
    };
    setVariants(updated);
  };

  const getAvailableCountries = (variantIndex: number) => {
    const usedCodes = Object.keys(variants[variantIndex].shippingCosts).filter(
      (code) => code !== '_default'
    );
    return COUNTRIES.filter((country) => !usedCodes.includes(country.code));
  };

  const handleSave = async () => {
    // Validation
    if (!editReason.trim()) {
      toast.error('Please provide a reason for editing this quote');
      return;
    }

    for (const variant of variants) {
      if (variant.costPerItem <= 0) {
        toast.error('All cost per item values must be greater than 0');
        return;
      }
      if (!variant.sku.trim()) {
        toast.error('All variants must have a SKU');
        return;
      }
    }

    setIsSaving(true);

    const result = await editQuote({
      quoteId,
      newVariants: variants,
      editReason: editReason.trim(),
      adminId
    });

    setIsSaving(false);

    if (result.success) {
      toast.success('Quote updated successfully. User has been notified.');
      onSuccess();
      onClose();
    } else {
      toast.error(result.error || 'Failed to update quote');
    }
  };

  const hasChanges = JSON.stringify(variants) !== JSON.stringify(currentVariants);

  return (
    <Modal isOpen={true} onClose={onClose} title={`Edit Quote: ${quoteName}`}>
      <div className="space-y-6 max-h-[70vh] overflow-y-auto">
        {/* Warning Banner */}
        <div className="flex items-start space-x-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium mb-1">User Re-Acceptance Required</p>
            <p className="text-xs">
              After saving, the user will be notified and must review and accept the changes
              before this quote becomes active again.
            </p>
          </div>
        </div>

        {/* Variants */}
        <div className="space-y-6">
          {variants.map((variant, variantIndex) => (
            <div
              key={variantIndex}
              className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                Pricing Option {variantIndex + 1}
              </h4>

              {/* Quantity, SKU, Cost */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={variant.quantity}
                    onChange={(e) =>
                      handleVariantChange(variantIndex, 'quantity', parseInt(e.target.value) || 1)
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    SKU
                  </label>
                  <input
                    type="text"
                    value={variant.sku}
                    onChange={(e) => handleVariantChange(variantIndex, 'sku', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cost Per Item ($)
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={variant.costPerItem}
                    onChange={(e) =>
                      handleVariantChange(variantIndex, 'costPerItem', parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Shipping Costs */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Shipping by Country
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {/* Default Shipping */}
                  <div className="flex items-center space-x-2">
                    <div className="flex-1">
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Default (All Other Countries)
                      </span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={variant.shippingCosts._default}
                      onChange={(e) =>
                        handleShippingCostChange(variantIndex, '_default', parseFloat(e.target.value) || 0)
                      }
                      className="w-24 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-900 dark:text-white"
                    />
                    <span className="text-xs text-gray-500 w-6">$</span>
                  </div>

                  {/* Country-Specific Shipping */}
                  {Object.entries(variant.shippingCosts)
                    .filter(([code]) => code !== '_default')
                    .map(([code, cost]) => (
                      <div key={code} className="flex items-center space-x-2">
                        <div className="flex-1">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {COUNTRIES.find((c) => c.code === code)?.name || code}
                          </span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={cost}
                          onChange={(e) =>
                            handleShippingCostChange(variantIndex, code, parseFloat(e.target.value) || 0)
                          }
                          className="w-24 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-900 dark:text-white"
                        />
                        <button
                          onClick={() => removeShippingCountry(variantIndex, code)}
                          className="p-1 text-red-600 hover:text-red-700 dark:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                  {/* Add Country */}
                  {getAvailableCountries(variantIndex).length > 0 && (
                    <div className="pt-2">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            addShippingCountry(variantIndex, e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="w-full px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-900 dark:text-white"
                      >
                        <option value="">+ Add Country</option>
                        {getAvailableCountries(variantIndex).map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Edit Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Reason for Edit <span className="text-red-500">*</span>
          </label>
          <textarea
            value={editReason}
            onChange={(e) => setEditReason(e.target.value)}
            placeholder="Explain why you're updating this quote (visible to user)"
            rows={3}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
