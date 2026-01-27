import React, { useState, useRef, useEffect } from 'react';
import { X, Copy, AlertTriangle, Building2, ExternalLink, Clock, Check, ArrowLeft, Loader2, Info } from 'lucide-react';
import { WarningIcon } from '@/components/StatusIcon';
import { toast } from '../../lib/toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface BankTransferModalProps {
  onClose: () => void;
  bankDetails: {
    accountHolder: string;
    accountNumber: string;
    routingNumber: string;
    bankName: string;
    swiftCode: string;
  };
  onPaymentConfirmed?: () => void;
  initialAmount?: number;
}

type Step = 'amount' | 'details' | 'awaiting' | 'confirm';

export const BankTransferModal: React.FC<BankTransferModalProps> = ({
  onClose,
  bankDetails,
  onPaymentConfirmed,
  initialAmount
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(initialAmount ? 'awaiting' : 'amount');
  const [amount, setAmount] = useState<string>(initialAmount ? initialAmount.toString() : '');
  const [amountError, setAmountError] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [pendingConfirmationId, setPendingConfirmationId] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

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

  const parsedAmount = parseFloat(amount) || 0;

  const handleContinueToDetails = () => {
    setAmountError('');

    if (!amount) {
      setAmountError('Please enter an amount');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setAmountError('Please enter a valid amount');
      return;
    }

    if (numAmount < 50) {
      setAmountError('Minimum transfer amount is $50');
      return;
    }

    setStep('details');
  };

  const handleOpenWise = async () => {
    if (!user?.id) return;

    try {
      const { data: existing } = await supabase
        .from('pending_payment_confirmations')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'wallet_topup')
        .eq('status', 'pending')
        .eq('amount', parsedAmount)
        .maybeSingle();

      if (existing) {
        setPendingConfirmationId(existing.id);
        await supabase
          .from('pending_payment_confirmations')
          .update({ opened_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        const { data: newConfirmation, error } = await supabase
          .from('pending_payment_confirmations')
          .insert({
            user_id: user.id,
            type: 'wallet_topup',
            amount: parsedAmount,
            wise_pay_link: 'https://wise.com',
            description: `Wallet top-up - $${parsedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            opened_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          })
          .select('id')
          .single();

        if (error) throw error;
        setPendingConfirmationId(newConfirmation.id);
      }

      window.open('https://wise.com', '_blank', 'noopener,noreferrer');
      setStep('awaiting');
    } catch (error) {
      console.error('Error creating pending confirmation:', error);
      window.open('https://wise.com', '_blank', 'noopener,noreferrer');
      setStep('awaiting');
    }
  };

  const handleConfirmPayment = async () => {
    if (!user?.id) return;

    setIsSubmitting(true);

    try {
      if (pendingConfirmationId) {
        await supabase
          .from('pending_payment_confirmations')
          .update({
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
            payment_reference: referenceNumber || null
          })
          .eq('id', pendingConfirmationId);
      }

      toast.success('Payment confirmation submitted', {
        description: 'We will verify your payment and credit your wallet balance.'
      });

      onPaymentConfirmed?.();
      onClose();
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('Failed to submit confirmation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelAttempt = () => {
    setShowCancelConfirm(true);
  };

  const handleConfirmCancel = async () => {
    if (pendingConfirmationId) {
      try {
        await supabase
          .from('pending_payment_confirmations')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString()
          })
          .eq('id', pendingConfirmationId);
      } catch (error) {
        console.error('Error cancelling pending confirmation:', error);
      }
    }
    onClose();
  };

  const renderCancelConfirmOverlay = () => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCancelConfirm(false)} />
      <div className="relative bg-white dark:bg-dark rounded-xl p-6 max-w-sm w-full shadow-xl border border-gray-200 dark:border-[#3a3a3a]">
        <div className="flex items-center gap-3 mb-4">
          <WarningIcon size="md" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Cancel Transfer?
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to cancel? If you've already initiated a bank transfer, you'll need to start the confirmation process again later.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCancelConfirm(false)}
            className="btn btn-secondary flex-1"
          >
            <ArrowLeft className="w-4 h-4 btn-icon btn-icon-back" />
            Go Back
          </button>
          <button
            onClick={handleConfirmCancel}
            className="btn btn-danger flex-1"
          >
            Yes, Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="fixed inset-0 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-4">
          <div className="relative bg-white dark:bg-dark rounded-xl w-full max-w-md" ref={modalRef}>

            <div className="sticky top-0 z-10 bg-white dark:bg-dark px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-[#3a3a3a] rounded-t-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                    {step === 'amount' ? 'Top Up via Bank Transfer' : 'Bank Transfer Details'}
                  </h3>
                    {step !== 'amount' && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Via Wise - ${parsedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    )}
                </div>
                <button
                  onClick={handleCancelAttempt}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="px-4 sm:px-6 py-6">
              {step === 'amount' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Amount (USD)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 dark:text-gray-400">$</span>
                      </div>
                      <input
                        type="number"
                        min="50"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full pl-8 pr-4 py-2.5 border border-gray-200 dark:border-[#4a4a4a] bg-white dark:bg-[#3a3a3a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800/20 dark:focus:ring-gray-200/20 focus:border-gray-300 dark:focus:border-gray-500"
                        placeholder="Enter amount (min. $50)"
                        autoFocus
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                      Minimum transfer amount is $50
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-dark/50 rounded-lg border border-gray-200 dark:border-[#3a3a3a]">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white dark:bg-dark rounded-lg">
                        <Building2 className="w-5 h-5 text-gray-900 dark:text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Bank Transfer via Wise</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Takes 1-3 business days to process</p>
                      </div>
                    </div>
                  </div>

                  <div className="info-banner info-banner-blue p-4">
                    <div className="flex items-start space-x-3">
                      <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Fulfillment Wallet Top-up</p>
                        <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                          Funds added to your wallet will be used to cover product costs and shipping fees when orders are fulfilled.
                        </p>
                      </div>
                    </div>
                  </div>

                  {amountError && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" />
                        <p className="text-sm text-red-600 dark:text-red-400">{amountError}</p>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-gray-200 dark:border-[#3a3a3a] pt-4 flex gap-3">
                    <button
                      onClick={handleCancelAttempt}
                      className="btn btn-secondary flex-1"
                    >
                      <ArrowLeft className="w-4 h-4 btn-icon btn-icon-back" />
                      Cancel
                    </button>
                    <button
                      onClick={handleContinueToDetails}
                      disabled={!amount}
                      className="btn btn-primary flex-1"
                    >
                      View Bank Details
                      <ExternalLink className="w-4 h-4 btn-icon btn-icon-arrow" />
                    </button>
                  </div>
                </div>
              )}

              {step === 'details' && (
                <div className="space-y-4">
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

                  <div className="info-banner info-banner-blue p-4">
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                          Important: Return here after payment
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                          After initiating your bank transfer, come back to confirm it. If you close this, you'll see a reminder until you confirm.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-[#3a3a3a] pt-4 flex gap-3">
                    <button
                      onClick={() => setStep('amount')}
                      className="btn btn-secondary flex-1"
                    >
                      <ArrowLeft className="w-4 h-4 btn-icon btn-icon-back" />
                      Back
                    </button>
                    <button
                      onClick={handleOpenWise}
                      className="btn btn-primary flex-1"
                    >
                      Open Wise
                      <ExternalLink className="w-4 h-4 btn-icon btn-icon-arrow" />
                    </button>
                  </div>
                </div>
              )}

              {step === 'awaiting' && (
                <div className="space-y-6">
                  <div className="text-center py-4">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-b from-primary-50 to-white dark:from-primary-900/30 dark:to-[#2a2a2a]/50 border border-primary-100 dark:border-primary-800/50 flex items-center justify-center">
                      <Clock className="w-8 h-8 text-primary-600 dark:text-primary-400 animate-pulse" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Waiting for transfer completion
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Initiate your bank transfer on Wise, then return here to confirm.
                    </p>
                  </div>

                  <div className="p-4 bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200 dark:border-[#3a3a3a] rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Type</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Wallet Top-up</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Amount</span>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        ${parsedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-[#3a3a3a] pt-4 flex gap-3">
                    <button
                      onClick={handleCancelAttempt}
                      className="btn btn-secondary flex-1"
                    >
                      <ArrowLeft className="w-4 h-4 btn-icon btn-icon-back" />
                      Cancel
                    </button>
                    <button
                      onClick={() => setStep('confirm')}
                      className="btn btn-primary flex-1"
                    >
                      Done
                      <Check className="w-4 h-4 btn-icon" />
                    </button>
                  </div>
                </div>
              )}

              {step === 'confirm' && (
                <div className="space-y-6">
                  <div className="text-center py-2">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-b from-green-50 to-white dark:from-green-900/30 dark:to-[#2a2a2a]/50 border border-green-100 dark:border-green-800/50 flex items-center justify-center">
                      <Check className="w-7 h-7 text-green-600 dark:text-green-400" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      Confirm Your Transfer
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Enter your transfer reference number (optional)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Transfer Reference (Optional)
                    </label>
                    <input
                      type="text"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="e.g., P123456789"
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-[#4a4a4a] bg-white dark:bg-[#3a3a3a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800/20 dark:focus:ring-gray-200/20 focus:border-gray-300 dark:focus:border-gray-500"
                    />
                    <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                      This helps us match your transfer faster
                    </p>
                  </div>

                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        Only click confirm if you have initiated the bank transfer. Wire transfers typically take 1-3 business days to process.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-[#3a3a3a] pt-4 flex gap-3">
                    <button
                      onClick={() => setStep('awaiting')}
                      className="btn btn-secondary flex-1"
                    >
                      <ArrowLeft className="w-4 h-4 btn-icon btn-icon-back" />
                      Back
                    </button>
                    <button
                      onClick={handleConfirmPayment}
                      disabled={isSubmitting}
                      className="btn btn-primary flex-1"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Confirming...
                        </>
                      ) : (
                        <>
                          Confirm Transfer
                          <Check className="w-4 h-4 btn-icon" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    {showCancelConfirm && renderCancelConfirmOverlay()}
    </>
  );
};
