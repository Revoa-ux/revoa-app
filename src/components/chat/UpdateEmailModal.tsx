import React, { useState } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import Modal from '@/components/Modal';
import { updateCustomerEmail } from '@/lib/shopifyOrders';
import { toast } from 'sonner';

interface UpdateEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  currentEmail: string;
  onSuccess: () => void;
}

export function UpdateEmailModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  currentEmail,
  onSuccess,
}: UpdateEmailModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [email, setEmail] = useState(currentEmail);

  const handleUpdate = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsProcessing(true);

    try {
      const result = await updateCustomerEmail(orderId, email);

      if (result.success) {
        toast.success('Customer email updated successfully');
        onSuccess();
        onClose();
      } else {
        toast.error(result.message || 'Failed to update email');
      }
    } catch (error) {
      console.error('Error updating customer email:', error);
      toast.error('An error occurred while updating the email');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
            <Mail className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Update Customer Email
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Change the email address for order {orderNumber}
            </p>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Current Email:</div>
          <div className="font-medium text-gray-900 dark:text-white">{currentEmail}</div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            New Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent"
            disabled={isProcessing}
            placeholder="customer@example.com"
          />
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> This will update the customer's email in Shopify. Future order notifications will be sent to the new address.
          </p>
        </div>

        <div className="flex gap-3 justify-end pt-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-6 py-4 -mx-6 -mb-6">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdate}
            disabled={isProcessing}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Email'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
