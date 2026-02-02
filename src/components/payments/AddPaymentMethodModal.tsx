import React, { useState, useEffect, useRef } from 'react';
import { X, Building2, AlertTriangle, Loader2, Copy, ExternalLink, Package, Info } from 'lucide-react';
import { toast } from '../../lib/toast';
import { useClickOutside } from '@/lib/useClickOutside';

interface AddPaymentMethodModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const bankDetails = {
  accountHolder: "Hangzhou Jiaming Yichang Technology",
  accountNumber: "****3545",
  routingNumber: "026073150",
  bankName: "Wise",
  swiftCode: "CMFGUS33"
};

const AddPaymentMethodModal: React.FC<AddPaymentMethodModalProps> = ({
  onClose,
  onSuccess
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useClickOutside(modalRef, onClose);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="fixed inset-0 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-4">
          <div className="relative bg-white dark:bg-dark rounded-xl w-full max-w-md" ref={modalRef}>
            <div className="sticky top-0 z-10 bg-white dark:bg-dark px-6 py-4 border-b border-gray-200 dark:border-[#3a3a3a] rounded-t-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Fulfillment Payment Method</h3>
                <button
                  onClick={onClose}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="px-6 py-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start space-x-3">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Payment for Order Fulfillment</p>
                      <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                        These bank transfer details are for topping up your fulfillment wallet. Funds are used to pay for product costs and shipping when orders are fulfilled.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-[#3a3a3a] rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Building2 className="w-5 h-5 text-gray-900 dark:text-white" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Bank Transfer Details</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Wire transfer via Wise (1-3 business days)</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Account Holder</label>
                    <div className="flex items-center justify-between bg-white dark:bg-[#3a3a3a] p-3 rounded-lg border border-gray-200 dark:border-[#4a4a4a]">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{bankDetails.accountHolder}</p>
                      <button
                        onClick={() => copyToClipboard(bankDetails.accountHolder, 'Account holder')}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#4a4a4a] rounded-lg transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Account Number</label>
                      <div className="flex items-center justify-between bg-white dark:bg-[#3a3a3a] p-3 rounded-lg border border-gray-200 dark:border-[#4a4a4a]">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{bankDetails.accountNumber}</p>
                        <button
                          onClick={() => copyToClipboard(bankDetails.accountNumber, 'Account number')}
                          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#4a4a4a] rounded-lg transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Routing Number</label>
                      <div className="flex items-center justify-between bg-white dark:bg-[#3a3a3a] p-3 rounded-lg border border-gray-200 dark:border-[#4a4a4a]">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{bankDetails.routingNumber}</p>
                        <button
                          onClick={() => copyToClipboard(bankDetails.routingNumber, 'Routing number')}
                          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#4a4a4a] rounded-lg transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Bank Name</label>
                      <div className="flex items-center justify-between bg-white dark:bg-[#3a3a3a] p-3 rounded-lg border border-gray-200 dark:border-[#4a4a4a]">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{bankDetails.bankName}</p>
                        <button
                          onClick={() => copyToClipboard(bankDetails.bankName, 'Bank name')}
                          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#4a4a4a] rounded-lg transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">SWIFT Code</label>
                      <div className="flex items-center justify-between bg-white dark:bg-[#3a3a3a] p-3 rounded-lg border border-gray-200 dark:border-[#4a4a4a]">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{bankDetails.swiftCode}</p>
                        <button
                          onClick={() => copyToClipboard(bankDetails.swiftCode, 'SWIFT code')}
                          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#4a4a4a] rounded-lg transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                      <p className="text-sm text-yellow-600 dark:text-yellow-400">
                        Include your account ID in the transfer reference to ensure proper credit to your fulfillment wallet.
                      </p>
                    </div>
                  </div>

                  <a
                    href="https://wise.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full px-4 py-3 text-sm text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors text-center"
                  >
                    Open Wise
                    <ExternalLink className="w-4 h-4 ml-2 inline-block" />
                  </a>

                  <button
                    onClick={onClose}
                    className="btn btn-primary w-full"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddPaymentMethodModal;

export { AddPaymentMethodModal };
