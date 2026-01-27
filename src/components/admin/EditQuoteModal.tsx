import React, { useState } from 'react';
import { ExternalLink, ArrowRight } from 'lucide-react';
import { toast } from '../../lib/toast';
import { editQuote } from '@/lib/quoteEditService';
import Modal from '@/components/Modal';
import { QuickModeBulkEditor } from '@/components/quotes/QuickModeBulkEditor';
import { NewQuoteVariant, QuoteVariant, FinalVariant } from '@/types/quotes';

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

function convertToNewFormat(variants: (QuoteVariant | LegacyQuoteVariant)[]): NewQuoteVariant[] {
  return variants.map((v, index) => {
    if ('packSize' in v && v.finalVariants && v.finalVariants.length > 0) {
      const finalVar = v.finalVariants[0];
      return {
        id: `var_${Date.now()}_${index}`,
        sku: finalVar.sku || v.skuPrefix || '',
        name: finalVar.attributes && finalVar.attributes.length > 0
          ? finalVar.attributes.map(a => a.value).join(' - ')
          : `Variant ${index + 1}`,
        attributes: finalVar.attributes || [],
        costPerItem: finalVar.costPerItem || 0,
        shippingRules: {
          default: finalVar.shippingCosts._default || 0,
          byCountry: Object.keys(finalVar.shippingCosts)
            .filter(k => k !== '_default')
            .reduce((acc, k) => ({ ...acc, [k]: finalVar.shippingCosts[k] }), {}),
          byQuantity: undefined
        },
        enabled: true
      };
    }

    if ('quantity' in v || 'costPerItem' in v) {
      return {
        id: `var_${Date.now()}_${index}`,
        sku: v.sku || '',
        name: v.attributes && v.attributes.length > 0
          ? v.attributes.map(a => a.value).join(' - ')
          : `Variant ${index + 1}`,
        attributes: v.attributes || [],
        costPerItem: v.costPerItem || 0,
        shippingRules: {
          default: v.shippingCosts?._default || 0,
          byCountry: v.shippingCosts
            ? Object.keys(v.shippingCosts)
                .filter(k => k !== '_default')
                .reduce((acc, k) => ({ ...acc, [k]: v.shippingCosts![k] }), {})
            : {},
          byQuantity: undefined
        },
        enabled: true
      };
    }

    return {
      id: `var_${Date.now()}_${index}`,
      sku: '',
      name: `Variant ${index + 1}`,
      attributes: [],
      costPerItem: 0,
      shippingRules: {
        default: 0,
        byCountry: {},
        byQuantity: undefined
      },
      enabled: true
    };
  });
}

export const EditQuoteModal: React.FC<EditQuoteModalProps> = ({
  quoteId,
  quoteName,
  currentVariants,
  adminId,
  onClose,
  onSuccess
}) => {
  const [variants, setVariants] = useState<NewQuoteVariant[]>(convertToNewFormat(currentVariants));
  const [editReason, setEditReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const canSubmit = variants.every(v => v.sku.trim() && v.costPerItem > 0 && v.shippingRules.default >= 0) && editReason.trim();

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
        variantName: variant.name,
        quantityTiers: variant.shippingRules.byQuantity
      };

      return {
        packSize: 1,
        skuPrefix: variant.sku,
        finalVariants: [finalVariant]
      };
    });
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error('Please complete all required fields and provide a reason for editing');
      return;
    }

    try {
      setIsSaving(true);
      const legacyVariants = convertToLegacyFormat();
      await editQuote(quoteId, legacyVariants, adminId, editReason);
      toast.success('Quote updated successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating quote:', error);
      toast.error('Failed to update quote');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Edit Quote"
      maxWidth="max-w-7xl"
    >
      <div className="space-y-6">
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <div className="flex items-start space-x-2">
            <ExternalLink className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-900 dark:text-amber-300">
              <strong>Editing: {quoteName}</strong>
              <p className="text-xs mt-1">Changes will require customer re-approval</p>
            </div>
          </div>
        </div>

        <QuickModeBulkEditor
          variants={variants}
          onVariantsChange={setVariants}
          productName={quoteName}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Reason for Edit <span className="text-red-500">*</span>
          </label>
          <textarea
            value={editReason}
            onChange={(e) => setEditReason(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            placeholder="Explain what changed and why..."
          />
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-[#3a3a3a]/50 px-6 py-4 -mx-6 -mb-6">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="btn btn-secondary"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isSaving}
            className="btn btn-danger group"
          >
            {isSaving ? 'Saving...' : (
              <>
                Update Quote
                <ArrowRight className="btn-icon btn-icon-arrow" />
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
