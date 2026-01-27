import React, { useState, useRef, useEffect } from 'react';
import { X, ExternalLink, Building2, AlertTriangle, Loader2, ArrowLeft, Check, Clock } from 'lucide-react';
import { WarningIcon } from '@/components/StatusIcon';
import { toast } from '../../lib/toast';
import { useClickOutside } from '@/lib/useClickOutside';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface WisePaymentModalProps {
  onClose: () => void;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  wisePayLink: string;
  onPaymentConfirmed: () => void;
}

type Step = 'instructions' | 'awaiting' | 'confirm';

export const WisePaymentModal: React.FC<WisePaymentModalProps> = ({
  onClose,
  invoiceId,
  invoiceNumber,
  amount,
  wisePayLink,
  onPaymentConfirmed
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('instructions');
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

  const handleOpenWise = async () => {
    if (!user?.id) return;

    try {
      const { data: existing } = await supabase
        .from('pending_payment_confirmations')
        .select('id')
        .eq('invoice_id', invoiceId)
        .eq('user_id', user.id)
        .eq('status', 'pending')
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
            invoice_id: invoiceId,
            amount,
            wise_pay_link: wisePayLink,
            opened_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          })
          .select('id')
          .single();

        if (error) throw error;
        setPendingConfirmationId(newConfirmation.id);
      }

      window.open(wisePayLink, '_blank', 'noopener,noreferrer');
      setStep('awaiting');
    } catch (error) {
      console.error('Error creating pending confirmation:', error);
      window.open(wisePayLink, '_blank', 'noopener,noreferrer');
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

      await supabase
        .from('invoices')
        .update({
          status: 'pending',
          payment_method: 'wire',
          payment_reference: referenceNumber || null,
          notes: referenceNumber ? `Wise payment reference: ${referenceNumber}` : 'Wise payment pending verification'
        })
        .eq('id', invoiceId);

      toast.success('Payment confirmation submitted', {
        description: 'We will verify your payment and update the invoice status.'
      });

      onPaymentConfirmed();
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
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center p-6 rounded-xl">
      <div className="bg-white dark:bg-dark rounded-xl p-6 max-w-sm w-full shadow-xl border border-gray-200 dark:border-[#3a3a3a]">
        <div className="flex items-center gap-3 mb-4">
          <WarningIcon size="md" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Cancel Payment?
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to cancel? This invoice will remain unpaid and you'll need to start the payment process again later.
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
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="fixed inset-0 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-4">
          <div className="relative bg-white dark:bg-dark rounded-xl w-full max-w-lg" ref={modalRef}>
            {showCancelConfirm && renderCancelConfirmOverlay()}

            <div className="sticky top-0 z-10 bg-white dark:bg-dark px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-[#3a3a3a] rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg">
                    <Building2 className="w-5 h-5 text-gray-900 dark:text-white" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                      Pay Invoice via Wise
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {invoiceNumber} - ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
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
              {step === 'instructions' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-dark dark:bg-white text-white dark:text-gray-900 flex items-center justify-center text-sm font-semibold">
                        1
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">Click to open Wise</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Complete your payment on the Wise website
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-[#3a3a3a] text-gray-600 dark:text-gray-300 flex items-center justify-center text-sm font-semibold">
                        2
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">Return to this tab</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          After completing payment, come back here
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-[#3a3a3a] text-gray-600 dark:text-gray-300 flex items-center justify-center text-sm font-semibold">
                        3
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">Confirm your payment</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Enter your reference number to complete
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="info-banner info-banner-blue p-4">
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                          Important: Don't close this modal
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                          This window will wait for you to complete the payment. If you close it, you'll see a reminder banner until you confirm.
                        </p>
                      </div>
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
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-b from-blue-50 to-white dark:from-blue-900/30 dark:to-[#2a2a2a]/50 border border-blue-100 dark:border-blue-800/50 flex items-center justify-center">
                      <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-pulse" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Waiting for payment completion
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Complete your payment on Wise, then return here to confirm.
                    </p>
                  </div>

                  <div className="p-4 bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200 dark:border-[#3a3a3a] rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Invoice</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{invoiceNumber}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Amount</span>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-[#3a3a3a] pt-4 flex gap-3">
                    <button
                      onClick={handleCancelAttempt}
                      className="btn btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setStep('confirm')}
                      className="btn btn-primary flex-1"
                    >
                      I've Completed Payment
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
                      Confirm Your Payment
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Enter your Wise transfer reference number (optional)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Payment Reference (Optional)
                    </label>
                    <input
                      type="text"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="e.g., P123456789"
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-[#4a4a4a] bg-white dark:bg-[#3a3a3a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800/20 dark:focus:ring-gray-200/20 focus:border-gray-300 dark:focus:border-gray-500"
                    />
                    <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                      This helps us match your payment faster
                    </p>
                  </div>

                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        Only click confirm if you have completed the payment on Wise. Wire transfers typically take 1-3 business days to process.
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
                          Confirm Payment
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
  );
};
