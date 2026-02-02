import React, { useState } from 'react';
import { Loader2, Info, ArrowLeft, ArrowRight } from 'lucide-react';
import Modal from '@/components/Modal';
import { toast } from '../../lib/toast';

interface UpdatePhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  currentPhone: string;
  onSuccess: () => void;
}

export function UpdatePhoneModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  currentPhone,
  onSuccess,
}: UpdatePhoneModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [phone, setPhone] = useState(currentPhone);

  const handleUpdate = async () => {
    if (!phone) {
      toast.error('Please enter a phone number');
      return;
    }

    setIsProcessing(true);

    try {
      // TODO: Implement phone update in shopifyOrders.ts
      // const result = await updateCustomerPhone(orderId, phone);

      // For now, simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success('Phone number updated successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating phone number:', error);
      toast.error('An error occurred while updating the phone number');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Phone Number" noPadding>
      <div className="p-6 space-y-6">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Change the phone number for order #{orderNumber}
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-dark rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Current Phone:</div>
          <div className="font-medium text-gray-900 dark:text-white">{currentPhone || 'No phone number'}</div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            New Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-[#2a2a2a] border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
            disabled={isProcessing}
            placeholder="+1 (555) 123-4567"
          />
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              This will update the customer's phone number in Shopify. This may be used for order notifications and customer support.
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
                <span>Update Phone</span>
                <ArrowRight className="w-4 h-4 btn-icon btn-icon-arrow" />
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
