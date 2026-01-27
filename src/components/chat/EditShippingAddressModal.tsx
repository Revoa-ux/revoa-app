import React, { useState, useEffect } from 'react';
import { Loader2, Info, ArrowLeft, ArrowRight } from 'lucide-react';
import Modal from '@/components/Modal';
import { updateShippingAddress } from '@/lib/shopifyOrders';
import { toast } from '../../lib/toast';

interface EditShippingAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  currentAddress: {
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    zip?: string;
    country?: string;
    phone?: string;
  };
  onSuccess: () => void;
}

export function EditShippingAddressModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  currentAddress,
  onSuccess,
}: EditShippingAddressModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [address, setAddress] = useState({
    address1: currentAddress.address1 || '',
    address2: currentAddress.address2 || '',
    city: currentAddress.city || '',
    province: currentAddress.province || '',
    zip: currentAddress.zip || '',
    country: currentAddress.country || '',
    phone: currentAddress.phone || '',
  });

  useEffect(() => {
    if (isOpen) {
      setAddress({
        address1: currentAddress.address1 || '',
        address2: currentAddress.address2 || '',
        city: currentAddress.city || '',
        province: currentAddress.province || '',
        zip: currentAddress.zip || '',
        country: currentAddress.country || '',
        phone: currentAddress.phone || '',
      });
    }
  }, [isOpen, currentAddress]);

  const handleUpdate = async () => {
    // Validate required fields
    if (!address.address1 || !address.city || !address.province || !address.zip || !address.country) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsProcessing(true);

    try {
      const result = await updateShippingAddress(orderId, address);

      if (result.success) {
        toast.success('Shipping address updated successfully');
        onSuccess();
        onClose();
      } else {
        toast.error(result.message || 'Failed to update shipping address');
      }
    } catch (error) {
      console.error('Error updating shipping address:', error);
      toast.error('An error occurred while updating the address');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Shipping Address" maxWidth="max-w-2xl" noPadding>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Update the shipping address for order #{orderNumber}
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Address Line 1 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={address.address1}
              onChange={(e) => setAddress({ ...address, address1: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-[#2a2a2a] border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              disabled={isProcessing}
              placeholder="Street address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Address Line 2 <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={address.address2}
              onChange={(e) => setAddress({ ...address, address2: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-[#2a2a2a] border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              disabled={isProcessing}
              placeholder="Apartment, suite, etc."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-[#2a2a2a] border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                disabled={isProcessing}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                State/Province <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={address.province}
                onChange={(e) => setAddress({ ...address, province: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-[#2a2a2a] border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                disabled={isProcessing}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ZIP/Postal Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={address.zip}
                onChange={(e) => setAddress({ ...address, zip: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-[#2a2a2a] border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                disabled={isProcessing}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Country <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={address.country}
                onChange={(e) => setAddress({ ...address, country: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-[#2a2a2a] border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                disabled={isProcessing}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="tel"
              value={address.phone}
              onChange={(e) => setAddress({ ...address, phone: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-[#2a2a2a] border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              disabled={isProcessing}
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              This will update the shipping address in Shopify. Ensure the order hasn't been shipped yet.
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
                <span>Update Address</span>
                <ArrowRight className="w-4 h-4 btn-icon btn-icon-arrow" />
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
