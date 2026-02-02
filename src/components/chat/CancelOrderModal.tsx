import React, { useState, useRef, useEffect } from 'react';
import { AlertTriangle, Loader2, ChevronDown, Info, Check } from 'lucide-react';
import Modal from '@/components/Modal';
import { cancelOrder } from '@/lib/shopifyOrders';
import { toast } from '../../lib/toast';

const REASON_OPTIONS = [
  { value: 'customer', label: 'Customer Request' },
  { value: 'inventory', label: 'Out of Stock' },
  { value: 'fraud', label: 'Suspected Fraud' },
  { value: 'other', label: 'Other' },
];

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setIsDropdownOpen(false);
    }
  }, [isOpen]);

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
      <div className="space-y-5 font-sans">
        {/* Header with 3D Icon */}
        <div className="flex items-start gap-4">
          <div
            className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm"
            style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)' }}
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: '#F43F5E',
                boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
              }}
            >
              <AlertTriangle className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
          </div>
          <div className="pt-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Cancel Order?
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This action will cancel order {orderNumber} and process a full refund.
            </p>
          </div>
        </div>

        {/* Order Details - Single Border Card */}
        <div className="bg-gray-50 dark:bg-[#262626]/50 rounded-lg p-4 border border-gray-200 dark:border-[#333333] space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Order Number:</span>
            <span className="font-medium text-gray-900 dark:text-white">{orderNumber}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Total Amount:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {currency} {Number(totalPrice).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Refund Amount:</span>
            <span className="font-medium text-rose-600 dark:text-rose-400">
              {currency} {Number(totalPrice).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Reason Selection - Custom Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Cancellation Reason
          </label>
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => !isProcessing && setIsDropdownOpen(!isDropdownOpen)}
              className={`w-full pl-3 pr-10 py-2.5 bg-white dark:bg-[#262626] border rounded-lg text-sm text-left text-gray-900 dark:text-white transition-colors ${
                isDropdownOpen
                  ? 'border-rose-500 ring-2 ring-rose-500 dark:ring-rose-400'
                  : 'border-gray-300 dark:border-[#4a4a4a] hover:border-gray-400 dark:hover:border-gray-500'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              disabled={isProcessing}
            >
              {REASON_OPTIONS.find(opt => opt.value === reason)?.label}
            </button>
            <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />

            {isDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#262626] border border-gray-200 dark:border-[#333333] rounded-lg shadow-lg overflow-hidden">
                {REASON_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setReason(option.value);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 text-sm text-left flex items-center justify-between transition-colors ${
                      reason === option.value
                        ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]/50'
                    }`}
                  >
                    {option.label}
                    {reason === option.value && (
                      <Check className="w-4 h-4 text-rose-500" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Warning - Double Border Apple Gradient Style */}
        <div className="info-banner info-banner-yellow rounded-xl p-4">
            <div className="flex gap-3">
              <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-800 dark:text-amber-200 font-medium mb-2">
                  Important
                </p>
                <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-amber-500 dark:bg-amber-400 mt-2 flex-shrink-0" />
                    The order will be cancelled in Shopify
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-amber-500 dark:bg-amber-400 mt-2 flex-shrink-0" />
                    A full refund will be processed automatically
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-amber-500 dark:bg-amber-400 mt-2 flex-shrink-0" />
                    The customer will receive an email notification
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-amber-500 dark:bg-amber-400 mt-2 flex-shrink-0" />
                    This action cannot be undone
                  </li>
                </ul>
              </div>
            </div>
        </div>
      </div>

      {/* Actions - Fixed Footer */}
      <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-200 dark:border-[#333333]">
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="btn btn-secondary"
        >
          Keep Order
        </button>
        <button
          onClick={handleCancel}
          disabled={isProcessing}
          className="btn btn-danger flex items-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 btn-icon animate-spin" />
              Cancelling...
            </>
          ) : (
            'Cancel Order'
          )}
        </button>
      </div>
    </Modal>
  );
}
