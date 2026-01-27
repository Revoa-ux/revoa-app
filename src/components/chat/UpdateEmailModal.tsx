import React, { useState } from 'react';
import { Loader2, Info, ArrowLeft, ArrowRight } from 'lucide-react';
import Modal from '@/components/Modal';
import { updateCustomerEmail } from '@/lib/shopifyOrders';
import { toast } from '../../lib/toast';

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
    <Modal isOpen={isOpen} onClose={onClose} title="Update Customer Email" noPadding>
      <div className="p-6 space-y-6">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Change the email address for order #{orderNumber}
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-dark rounded-lg p-4">
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
            className="w-full px-3 py-2 bg-white dark:bg-[#2a2a2a] border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent"
            disabled={isProcessing}
            placeholder="customer@example.com"
          />
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              This will update the customer's email in Shopify. Future order notifications will be sent to the new address.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-gray-200 dark:border-[#333333] bg-gray-50 dark:bg-[#2a2a2a]/50 px-6 py-4">
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="group btn btn-secondary flex-1 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4 btn-icon btn-icon-back" />
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpdate}
            disabled={isProcessing}
            className="group btn btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 btn-icon animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                <span>Update Email</span>
                <ArrowRight className="w-4 h-4 btn-icon btn-icon-arrow" />
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
