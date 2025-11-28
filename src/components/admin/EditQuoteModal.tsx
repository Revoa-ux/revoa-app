import React, { useState } from 'react';
import { X, Plus, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { editQuote } from '@/lib/quoteEditService';
import Modal from '@/components/Modal';
import { PackSizeEditor } from '@/components/quotes/PackSizeEditor';
import { QuoteVariant, FinalVariant } from '@/types/quotes';

interface LegacyQuoteVariant {
  quantity?: number;
  sku?: string;
  attributes?: { name: string; value: string }[];
  costPerItem?: number;
  shippingCosts?: {
    [countryCode: string]: number;
    _default: number;
  };
}

interface EditQuoteModalProps {
  quoteId: string;
  quoteName: string;
  currentVariants: (QuoteVariant | LegacyQuoteVariant)[];
  adminId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function migrateLegacyVariant(legacy: LegacyQuoteVariant): QuoteVariant {
  return {
    packSize: legacy.quantity || 1,
    skuPrefix: legacy.sku || '',
    finalVariants: legacy.attributes && legacy.attributes.length > 0
      ? [{
          sku: legacy.sku || '',
          attributes: legacy.attributes,
          costPerItem: legacy.costPerItem || 0,
          shippingCosts: legacy.shippingCosts || { _default: 0 }
        }]
      : [{
          sku: legacy.sku || '',
          attributes: [],
          costPerItem: legacy.costPerItem || 0,
          shippingCosts: legacy.shippingCosts || { _default: 0 }
        }]
  };
}

function isLegacyVariant(v: QuoteVariant | LegacyQuoteVariant): v is LegacyQuoteVariant {
  return 'quantity' in v || 'costPerItem' in v;
}

export const EditQuoteModal: React.FC<EditQuoteModalProps> = ({
  quoteId,
  quoteName,
  currentVariants,
  adminId,
  onClose,
  onSuccess
}) => {
  const [variants, setVariants] = useState<QuoteVariant[]>(
    currentVariants.map(v =>
      isLegacyVariant(v) ? migrateLegacyVariant(v) : JSON.parse(JSON.stringify(v))
    )
  );
  const [editReason, setEditReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const addPackOption = () => {
    const newPack: QuoteVariant = {
      packSize: 1,
      skuPrefix: '',
      finalVariants: []
    };
    setVariants([...variants, newPack]);
  };

  const removePackOption = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updatePack = (index: number, updates: Partial<QuoteVariant>) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], ...updates };
    setVariants(updated);
  };

  const handleSave = async () => {
    if (!editReason.trim()) {
      toast.error('Please provide a reason for editing this quote');
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

    setIsSaving(true);

    const result = await editQuote({
      quoteId,
      newVariants: variants as any,
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

  const hasChanges = JSON.stringify(variants) !== JSON.stringify(
    currentVariants.map(v => isLegacyVariant(v) ? migrateLegacyVariant(v) : v)
  );

  return (
    <Modal isOpen={true} onClose={onClose} title={`Edit Quote: ${quoteName}`}>
      <div className="space-y-6 max-h-[70vh] overflow-y-auto">
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

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Reason for Edit <span className="text-red-500">*</span>
          </label>
          <textarea
            value={editReason}
            onChange={(e) => setEditReason(e.target.value)}
            placeholder="Explain why you're updating this quote (visible to user)"
            rows={3}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
          />
        </div>

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
            className="px-6 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
