import React, { useState, useEffect } from 'react';
import { Truck, Loader2 } from 'lucide-react';
import Modal from '@/components/Modal';
import { updateShippingAddress } from '@/lib/shopifyOrders';
import { toast } from 'sonner';

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
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-2xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
            <Truck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Edit Shipping Address
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Update the shipping address for order {orderNumber}
            </p>
          </div>
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
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
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
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
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
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
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
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
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
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
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
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
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
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              disabled={isProcessing}
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Note:</strong> This will update the shipping address in Shopify. Ensure the order hasn't been shipped yet.
          </p>
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
            onClick={handleUpdate}
            disabled={isProcessing}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Address'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
