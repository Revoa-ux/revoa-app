import React, { useState } from 'react';
import { DollarSign, Loader2 } from 'lucide-react';
import Modal from '@/components/Modal';
import { refundOrder } from '@/lib/shopifyOrders';
import { toast } from 'sonner';

interface RefundOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  totalPrice: number;
  currency: string;
  onSuccess: () => void;
}

export function RefundOrderModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  totalPrice,
  currency,
  onSuccess,
}: RefundOrderModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [refundAmount, setRefundAmount] = useState(totalPrice.toString());
  const [note, setNote] = useState('');

  const handleRefund = async () => {
    const amount = refundType === 'full' ? totalPrice : Number(refundAmount);

    if (refundType === 'partial' && (isNaN(amount) || amount <= 0 || amount > totalPrice)) {
      toast.error('Please enter a valid refund amount');
      return;
    }

    setIsProcessing(true);

    try {
      const result = await refundOrder(orderId, amount, undefined, note);

      if (result.success) {
        toast.success(refundType === 'full' ? 'Full refund processed successfully' : 'Partial refund processed successfully');
        onSuccess();
        onClose();
      } else {
        toast.error(result.message || 'Failed to process refund');
      }
    } catch (error) {
      console.error('Error processing refund:', error);
      toast.error('An error occurred while processing the refund');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
            <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Issue Refund
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Process a refund for order {orderNumber}
            </p>
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Order Number:</span>
            <span className="font-medium text-gray-900 dark:text-white">{orderNumber}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Order Total:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {currency} {Number(totalPrice).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Refund Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Refund Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setRefundType('full')}
              className={`p-4 border-2 rounded-lg transition-colors ${
                refundType === 'full'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              disabled={isProcessing}
            >
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                Full Refund
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {currency} {Number(totalPrice).toFixed(2)}
              </div>
            </button>
            <button
              onClick={() => setRefundType('partial')}
              className={`p-4 border-2 rounded-lg transition-colors ${
                refundType === 'partial'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              disabled={isProcessing}
            >
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                Partial Refund
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Custom amount
              </div>
            </button>
          </div>
        </div>

        {/* Partial Refund Amount */}
        {refundType === 'partial' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Refund Amount ({currency})
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={totalPrice}
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              disabled={isProcessing}
              placeholder={`Max: ${totalPrice.toFixed(2)}`}
            />
          </div>
        )}

        {/* Note */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Internal Note <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none"
            disabled={isProcessing}
            placeholder="Add a note about this refund (visible to your team only)"
          />
        </div>

        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-2">
            Refund Details:
          </p>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
            <li>Refund will be processed through Shopify</li>
            <li>Customer will receive email notification</li>
            <li>Funds typically arrive within 5-10 business days</li>
            <li>Order status will be updated automatically</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-6 py-4 -mx-6 -mb-6">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleRefund}
            disabled={isProcessing}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Issue {currency} {refundType === 'full' ? Number(totalPrice).toFixed(2) : refundAmount} Refund
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
