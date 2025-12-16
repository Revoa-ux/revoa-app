import React, { useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import Modal from '@/components/Modal';
import { cancelOrder } from '@/lib/shopifyOrders';
import { toast } from 'sonner';

interface CancelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  totalPrice: number;
  currency: string;
  onSuccess: () => void;
}

export function CancelOrderModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  totalPrice,
  currency,
  onSuccess,
}: CancelOrderModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [reason, setReason] = useState<string>('customer');

  const handleCancel = async () => {
    setIsProcessing(true);

    try {
      const result = await cancelOrder(orderId, reason);

      if (result.success) {
        toast.success('Order cancelled successfully');
        onSuccess();
        onClose();
      } else {
        toast.error(result.message || 'Failed to cancel order');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('An error occurred while cancelling the order');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Cancel Order?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This action will cancel order {orderNumber} and process a full refund.
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
            <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {currency} {Number(totalPrice).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Refund Amount:</span>
            <span className="font-medium text-red-600 dark:text-red-400">
              {currency} {Number(totalPrice).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Reason Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Cancellation Reason
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
            disabled={isProcessing}
          >
            <option value="customer">Customer Request</option>
            <option value="inventory">Out of Stock</option>
            <option value="fraud">Suspected Fraud</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-2">
            Important:
          </p>
          <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 list-disc list-inside">
            <li>The order will be cancelled in Shopify</li>
            <li>A full refund will be processed automatically</li>
            <li>The customer will receive an email notification</li>
            <li>This action cannot be undone</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-6 py-4 -mx-6 -mb-6">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Keep Order
          </button>
          <button
            onClick={handleCancel}
            disabled={isProcessing}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Cancelling...
              </>
            ) : (
              'Cancel Order'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
