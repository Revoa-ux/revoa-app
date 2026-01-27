import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, TrendingUp, TrendingDown, Globe } from 'lucide-react';
import { toast } from '../../lib/toast';
import { acceptQuoteChanges, rejectQuoteChanges, getQuoteRevisions } from '@/lib/quoteEditService';
import { formatDistanceToNow } from 'date-fns';
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

interface QuoteData {
  id: string;
  product_name: string;
  variants: QuoteVariant[];
  original_variants: QuoteVariant[];
  edit_reason: string | null;
  last_edited_at: string | null;
  last_edited_by: string | null;
}

interface QuoteComparisonModalProps {
  quote: QuoteData;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const COUNTRIES: { [key: string]: string } = {
  US: 'United States',
  CA: 'Canada',
  GB: 'United Kingdom',
  AU: 'Australia',
  DE: 'Germany',
  FR: 'France',
  IT: 'Italy',
  ES: 'Spain',
  NL: 'Netherlands',
  BE: 'Belgium',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  CH: 'Switzerland',
  AT: 'Austria',
  IE: 'Ireland',
  NZ: 'New Zealand',
  SG: 'Singapore',
  JP: 'Japan'
};

export const QuoteComparisonModal: React.FC<QuoteComparisonModalProps> = ({
  quote,
  userId,
  onClose,
  onSuccess
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [editorName, setEditorName] = useState<string>('Admin');

  useEffect(() => {
    fetchEditorInfo();
  }, [quote.last_edited_by]);

  const fetchEditorInfo = async () => {
    if (!quote.last_edited_by) return;

    try {
      const revisions = await getQuoteRevisions(quote.id);
      if (revisions.length > 0) {
        const editor = revisions[0].editor;
        const name = editor?.name ||
          (editor?.first_name && editor?.last_name
            ? `${editor.first_name} ${editor.last_name}`
            : 'Admin');
        setEditorName(name);
      }
    } catch (error) {
      console.error('Error fetching editor info:', error);
    }
  };

  const handleAccept = async () => {
    setIsProcessing(true);
    const result = await acceptQuoteChanges(quote.id, userId);
    setIsProcessing(false);

    if (result.success) {
      toast.success('Quote changes accepted successfully!');
      onSuccess();
      onClose();
    } else {
      toast.error(result.error || 'Failed to accept changes');
    }
  };

  const handleReject = async () => {
    if (!confirm('Are you sure you want to reject these changes? The quote will be restored to its original pricing.')) {
      return;
    }

    setIsProcessing(true);
    const result = await rejectQuoteChanges(quote.id, userId);
    setIsProcessing(false);

    if (result.success) {
      toast.success('Quote changes rejected. Original pricing restored.');
      onSuccess();
      onClose();
    } else {
      toast.error(result.error || 'Failed to reject changes');
    }
  };

  const getPriceChange = (oldPrice: number, newPrice: number) => {
    const diff = newPrice - oldPrice;
    const percentChange = ((diff / oldPrice) * 100).toFixed(1);
    return { diff, percentChange };
  };

  const renderPriceComparison = (oldPrice: number, newPrice: number, label: string) => {
    const { diff, percentChange } = getPriceChange(oldPrice, newPrice);
    const isIncrease = diff > 0;
    const isDecrease = diff < 0;
    const isUnchanged = diff === 0;

    return (
      <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-[#3a3a3a] last:border-0">
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500 dark:text-gray-500 line-through">
            ${oldPrice.toFixed(2)}
          </span>
          <div className="flex items-center space-x-1">
            {isIncrease && <TrendingUp className="w-4 h-4 text-red-500" />}
            {isDecrease && <TrendingDown className="w-4 h-4 text-green-500" />}
            <span className={`text-sm font-medium ${
              isIncrease ? 'text-red-600 dark:text-red-400' :
              isDecrease ? 'text-green-600 dark:text-green-400' :
              'text-gray-900 dark:text-white'
            }`}>
              ${newPrice.toFixed(2)}
            </span>
            {!isUnchanged && (
              <span className={`text-xs ${
                isIncrease ? 'text-red-600 dark:text-red-400' :
                'text-green-600 dark:text-green-400'
              }`}>
                ({isIncrease ? '+' : ''}{percentChange}%)
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Review Quote Changes: ${quote.product_name}`}>
      <div className="space-y-6">
        {/* Edit Info */}
        <div className="flex items-start space-x-3 p-4 bg-gray-50 dark:bg-[#3a3a3a]/50/20 rounded-lg border border-gray-200 dark:border-[#3a3a3a]">
          <AlertTriangle className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-800 dark:text-gray-200">
            <p className="font-medium mb-1">
              {editorName} updated this quote {quote.last_edited_at && formatDistanceToNow(new Date(quote.last_edited_at), { addSuffix: true })}
            </p>
            {quote.edit_reason && (
              <p className="text-xs mt-2">
                <span className="font-medium">Reason:</span> {quote.edit_reason}
              </p>
            )}
          </div>
        </div>

        {/* Variant Comparisons */}
        <div className="space-y-4">
          {quote.variants.map((newVariant, idx) => {
            const oldVariant = quote.original_variants[idx];
            if (!oldVariant) return null;

            const hasChanges =
              oldVariant.costPerItem !== newVariant.costPerItem ||
              oldVariant.sku !== newVariant.sku ||
              JSON.stringify(oldVariant.shippingCosts) !== JSON.stringify(newVariant.shippingCosts);

            return (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${
                  hasChanges
                    ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
                    : 'bg-gray-50 dark:bg-[#3a3a3a]/50/50 border-gray-200 dark:border-[#3a3a3a]'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    {newVariant.quantity} Unit{newVariant.quantity > 1 ? 's' : ''}
                  </h4>
                  {hasChanges && (
                    <span className="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-full">
                      Modified
                    </span>
                  )}
                </div>

                {/* SKU Change */}
                {oldVariant.sku !== newVariant.sku && (
                  <div className="mb-3 pb-3 border-b border-gray-200 dark:border-[#3a3a3a]">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">SKU</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500 dark:text-gray-500 line-through">
                        {oldVariant.sku}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {newVariant.sku}
                      </span>
                    </div>
                  </div>
                )}

                {/* Price Comparison */}
                {renderPriceComparison(oldVariant.costPerItem, newVariant.costPerItem, 'Cost Per Item')}

                {/* Shipping Costs Comparison */}
                {JSON.stringify(oldVariant.shippingCosts) !== JSON.stringify(newVariant.shippingCosts) && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[#3a3a3a]">
                    <div className="flex items-center space-x-2 mb-3">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Shipping Changes
                      </span>
                    </div>
                    <div className="space-y-2">
                      {Object.keys({...oldVariant.shippingCosts, ...newVariant.shippingCosts}).map((countryCode) => {
                        const oldCost = oldVariant.shippingCosts[countryCode];
                        const newCost = newVariant.shippingCosts[countryCode];

                        if (oldCost === newCost) return null;

                        const countryName = countryCode === '_default'
                          ? 'Default (All Other Countries)'
                          : (COUNTRIES[countryCode] || countryCode);

                        return (
                          <div key={countryCode} className="text-xs">
                            {renderPriceComparison(oldCost || 0, newCost || 0, countryName)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-[#3a3a3a]/50 px-6 py-4 -mx-6 -mb-6">
          <button
            onClick={handleReject}
            disabled={isProcessing}
            className="btn btn-danger"
          >
            <XCircle className="btn-icon" />
            <span>Reject Changes</span>
          </button>
          <button
            onClick={handleAccept}
            disabled={isProcessing}
            className="btn btn-primary"
          >
            <CheckCircle className="btn-icon" />
            <span>{isProcessing ? 'Processing...' : 'Accept Changes'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
