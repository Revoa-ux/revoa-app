import React, { useRef } from 'react';
import { X, Copy, AlertTriangle, Building2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useClickOutside } from '@/lib/useClickOutside';

interface BankTransferModalProps {
  onClose: () => void;
  bankDetails: {
    accountHolder: string;
    accountNumber: string;
    routingNumber: string;
    bankName: string;
    swiftCode: string;
  };
}

export const BankTransferModal: React.FC<BankTransferModalProps> = ({
  onClose,
  bankDetails
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  
  useClickOutside(modalRef, onClose);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      
      <div className="fixed inset-0 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-4">
          <div className="relative bg-white dark:bg-gray-800 rounded-xl w-full max-w-md" ref={modalRef}>
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Building2 className="w-5 h-5 text-gray-900 dark:text-white" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Bank Transfer Details</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Via Wise</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Account Holder</label>
                  <div className="flex items-center justify-between bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{bankDetails.accountHolder}</p>
                    <button
                      onClick={() => copyToClipboard(bankDetails.accountHolder, 'Account holder')}
                      className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Account Number</label>
                    <div className="flex items-center justify-between bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{bankDetails.accountNumber}</p>
                      <button
                        onClick={() => copyToClipboard(bankDetails.accountNumber, 'Account number')}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Routing Number</label>
                    <div className="flex items-center justify-between bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{bankDetails.routingNumber}</p>
                      <button
                        onClick={() => copyToClipboard(bankDetails.routingNumber, 'Routing number')}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Bank Name</label>
                    <div className="flex items-center justify-between bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{bankDetails.bankName}</p>
                      <button
                        onClick={() => copyToClipboard(bankDetails.bankName, 'Bank name')}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">SWIFT Code</label>
                    <div className="flex items-center justify-between bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{bankDetails.swiftCode}</p>
                      <button
                        onClick={() => copyToClipboard(bankDetails.swiftCode, 'SWIFT code')}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
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
                      Bank transfers typically take 1-3 business days to process. Make sure to include your account ID in the transfer reference.
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

                <div className="sticky bottom-0 bg-white dark:bg-gray-800 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={onClose}
                    className="w-full px-5 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Close
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