import React, { useState } from 'react';
import { DollarSign, Loader2, Info } from 'lucide-react';
import Modal from '@/components/Modal';
import { refundOrder } from '@/lib/shopifyOrders';
import { toast } from '../../lib/toast';

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
      <div className="space-y-5 font-sans">
        {/* Header with 3D Icon */}
        <div className="flex items-start gap-4">
          <div
            className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm"
            style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)' }}
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: '#3B82F6',
                boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
              }}
            >
              <DollarSign className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
          </div>
          <div className="pt-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Issue Refund
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Process a refund for order {orderNumber}
            </p>
          </div>
        </div>

        {/* Order Details - Double Border Style */}
        <div className="rounded-xl p-0.5 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Order Number:</span>
              <span className="font-medium text-gray-900 dark:text-white">{orderNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Order Total:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {currency} {Number(totalPrice).toFixed(2)}
              </span>
            </div>
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
              className={`p-4 border rounded-lg transition-all ${
                refundType === 'full'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
              }`}
              disabled={isProcessing}
            >
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                Full Refund
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {currency} {Number(totalPrice).toFixed(2)}
              </div>
            </button>
            <button
              onClick={() => setRefundType('partial')}
              className={`p-4 border rounded-lg transition-all ${
                refundType === 'partial'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
              }`}
              disabled={isProcessing}
            >
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                Partial Refund
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
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
              className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              disabled={isProcessing}
              placeholder={`Max: ${totalPrice.toFixed(2)}`}
            />
          </div>
        )}

        {/* Note */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Internal Note <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none"
            disabled={isProcessing}
            placeholder="Add a note about this refund (visible to your team only)"
          />
        </div>

        {/* Info - Double Border Apple Gradient Style */}
        <div className="rounded-xl p-0.5 border border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-950/30">
          <div
            className="rounded-lg p-4 border border-blue-300 dark:border-blue-700/60"
            style={{ background: 'linear-gradient(to bottom, rgba(239, 246, 255, 1), rgba(219, 234, 254, 1))' }}
          >
            <div className="flex gap-3">
              <Info className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-2">
                  Refund Details
                </p>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                    Refund will be processed through Shopify
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                    Customer will receive email notification
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                    Funds typically arrive within 5-10 business days
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                    Order status will be updated automatically
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions - Fixed Footer */}
      <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="btn btn-secondary"
        >
          Cancel
        </button>
        <button
          onClick={handleRefund}
          disabled={isProcessing}
          className="btn btn-primary flex items-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 btn-icon animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Issue {currency} {refundType === 'full' ? Number(totalPrice).toFixed(2) : refundAmount} Refund
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}
