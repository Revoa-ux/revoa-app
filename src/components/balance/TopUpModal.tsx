import React, { useState, useEffect, useRef } from 'react';
import { X, CreditCard, Building2, AlertTriangle, Loader2, Copy, ExternalLink } from 'lucide-react';
import { toast } from '../../lib/toast';
import { useClickOutside } from '@/lib/useClickOutside';

interface TopUpModalProps {
  onClose: () => void;
  onTopUp: (amount: number, method: string) => Promise<void>;
}

export const TopUpModal: React.FC<TopUpModalProps> = ({ onClose, onTopUp }) => {
  const [amount, setAmount] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<'stripe' | 'bank_transfer' | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showBankDetails, setShowBankDetails] = useState(false);
  
  const modalRef = useRef<HTMLDivElement>(null);
  
  useClickOutside(modalRef, onClose);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);


  const bankDetails = {
    accountHolder: "Hangzhou Jiaming Yichang Technology",
    accountNumber: "****3545",
    routingNumber: "026073150",
    bankName: "Wise",
    swiftCode: "CMFGUS33"
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!amount) {
      setError('Please enter an amount');
      return;
    }

    if (!selectedMethod) {
      setError('Please select a payment method');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (numAmount < 50) {
      setError('Minimum top-up amount is $50');
      return;
    }

    try {
      setLoading(true);

      if (selectedMethod === 'stripe') {
        toast.info('Redirecting to Stripe Checkout...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        window.location.href = 'https://checkout.stripe.com/pay/cs_test_example';
      } else {
        await onTopUp(numAmount, selectedMethod);
        toast.success('Bank transfer details confirmed', {
          description: 'Please complete the transfer using the details provided'
        });
        onClose();
      }
    } catch (error) {
      setError('Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };


  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Modal */}
      <div className="fixed inset-0 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-4">
          <div className="relative bg-white rounded-xl w-full max-w-md" ref={modalRef}>
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white px-6 py-4 border-b border-gray-200 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Top Up Balance</h3>
                <button
                  onClick={onClose}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (USD)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">$</span>
                    </div>
                    <input
                      type="number"
                      min="50"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Enter amount (min. $50)"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500">
                    Minimum top-up amount is $50
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMethod('stripe');
                        setShowBankDetails(false);
                      }}
                      className={`w-full p-4 rounded-lg border transition-colors text-left ${
                        selectedMethod === 'stripe'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <CreditCard className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Pay with Stripe</p>
                          <p className="text-xs text-gray-500">Cards, Apple Pay, Google Pay - Instant</p>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMethod('bank_transfer');
                        setShowBankDetails(true);
                      }}
                      className={`w-full p-4 rounded-lg border transition-colors text-left ${
                        selectedMethod === 'bank_transfer'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Building2 className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Bank Transfer</p>
                          <p className="text-xs text-gray-500">Via Wise - 1-3 business days</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {selectedMethod === 'bank_transfer' && showBankDetails && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm text-gray-500 mb-1">Account Holder</label>
                        <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                          <p className="text-sm font-medium text-gray-900">{bankDetails.accountHolder}</p>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(bankDetails.accountHolder, 'Account holder')}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-500 mb-1">Account Number</label>
                          <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                            <p className="text-sm font-medium text-gray-900">{bankDetails.accountNumber}</p>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(bankDetails.accountNumber, 'Account number')}
                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-500 mb-1">Routing Number</label>
                          <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                            <p className="text-sm font-medium text-gray-900">{bankDetails.routingNumber}</p>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(bankDetails.routingNumber, 'Routing number')}
                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-500 mb-1">Bank Name</label>
                          <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                            <p className="text-sm font-medium text-gray-900">{bankDetails.bankName}</p>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(bankDetails.bankName, 'Bank name')}
                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-500 mb-1">SWIFT Code</label>
                          <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                            <p className="text-sm font-medium text-gray-900">{bankDetails.swiftCode}</p>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(bankDetails.swiftCode, 'SWIFT code')}
                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <a
                        href="https://wise.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full px-4 py-3 text-sm text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors text-center"
                      >
                        Open Wise
                        <ExternalLink className="w-4 h-4 ml-2 inline-block" />
                      </a>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !selectedMethod}
                    className="btn btn-primary flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {selectedMethod === 'stripe' ? 'Redirecting...' : 'Processing...'}
                      </>
                    ) : (
                      selectedMethod === 'stripe' ? 'Continue to Stripe' : 'Confirm'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
