import React, { useState, useEffect, useRef } from 'react';
import { X, CreditCard, Building2, Banknote, AlertTriangle, Loader2, Copy, ExternalLink, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useClickOutside } from '@/lib/useClickOutside';
import { PaymentMethod, getPaymentMethods } from '@/lib/payments';
import AddPaymentMethodModal from '@/components/payments/AddPaymentMethodModal';

interface TopUpModalProps {
  onClose: () => void;
  onTopUp: (amount: number, method: string) => Promise<void>;
}

export const TopUpModal: React.FC<TopUpModalProps> = ({ onClose, onTopUp }) => {
  const [amount, setAmount] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [addPaymentMethodType, setAddPaymentMethodType] = useState<'card' | 'paypal' | null>(null);
  const [loadingMethods, setLoadingMethods] = useState(false);
  
  const modalRef = useRef<HTMLDivElement>(null);
  
  useClickOutside(modalRef, onClose);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Load payment methods
  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoadingMethods(true);
      const data = await getPaymentMethods('customer_id');
      setSavedPaymentMethods(data.methods.filter(m => m.type === 'card' || m.type === 'paypal'));
    } catch (error) {
      console.error('Failed to load payment methods:', error);
    } finally {
      setLoadingMethods(false);
    }
  };

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

    if (selectedMethod !== 'bank_transfer' && !hasVerifiedPaymentMethod()) {
      setError('Please add and verify a payment method to continue');
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
      await onTopUp(numAmount, selectedMethod);
      toast.success('Payment processed successfully', {
        description: `$${numAmount.toLocaleString()} has been added to your balance`
      });
      onClose();
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

  const hasVerifiedPaymentMethod = () => {
    return savedPaymentMethods.some(method => method.status === 'verified');
  };

  const handleAddPaymentMethod = (type: 'card' | 'paypal') => {
    setAddPaymentMethodType(type);
    setShowAddPaymentModal(true);
  };

  const handlePaymentMethodAdded = () => {
    loadPaymentMethods();
    setShowAddPaymentModal(false);
    setAddPaymentMethodType(null);
  };

  const renderPaymentMethodButton = (method: PaymentMethod) => {
    const isSelected = selectedMethod === method.id;

    return (
      <button
        key={method.id}
        type="button"
        onClick={() => setSelectedMethod(method.id)}
        className={`w-full p-4 rounded-lg border transition-colors text-left ${
          isSelected
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {method.type === 'card' ? (
              <CreditCard className="w-5 h-5 text-gray-400" />
            ) : (
              <Banknote className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">
                {method.type === 'card'
                  ? `${method.nickname || method.brand} ****${method.last4}`
                  : 'PayPal Account'}
              </p>
              <p className="text-xs text-gray-500">
                {method.type === 'card'
                  ? `Expires ${method.expiryMonth}/${method.expiryYear}`
                  : method.email || 'Connected'}
              </p>
            </div>
          </div>
          {method.status === 'verified' && (
            <Check className="w-4 h-4 text-green-500" />
          )}
        </div>
      </button>
    );
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
                  className="text-gray-400 hover:text-gray-600 transition-colors"
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
                  {loadingMethods ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {savedPaymentMethods.map(renderPaymentMethodButton)}

                    {!savedPaymentMethods.some(m => m.type === 'card') && (
                      <button
                        type="button"
                        onClick={() => handleAddPaymentMethod('card')}
                        className="w-full p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors text-left"
                      >
                        <div className="flex items-center space-x-3">
                          <CreditCard className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Add Credit Card</p>
                            <p className="text-xs text-gray-500">Instant processing</p>
                          </div>
                        </div>
                      </button>
                    )}

                    {!savedPaymentMethods.some(m => m.type === 'paypal') && (
                      <button
                        type="button"
                        onClick={() => handleAddPaymentMethod('paypal')}
                        className="w-full p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors text-left"
                      >
                        <div className="flex items-center space-x-3">
                          <Banknote className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Connect PayPal</p>
                            <p className="text-xs text-gray-500">2.9% + $0.30 fee</p>
                          </div>
                        </div>
                      </button>
                    )}

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
                          <p className="text-xs text-gray-500">1-3 business days</p>
                        </div>
                      </div>
                    </button>
                    </div>
                  )}
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

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || (selectedMethod === 'bank_transfer' && !showBankDetails)}
                    className="flex-1 px-4 py-2 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Confirm Payment'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {showAddPaymentModal && (
        <AddPaymentMethodModal
          onClose={() => {
            setShowAddPaymentModal(false);
            setAddPaymentMethodType(null);
          }}
          onSuccess={handlePaymentMethodAdded}
          initialMethod={addPaymentMethodType}
        />
      )}
    </div>
  );
};