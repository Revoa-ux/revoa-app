import React, { useState, useEffect } from 'react';
import { Clock, X, ArrowRight, Wallet, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { WisePaymentModal } from './WisePaymentModal';
import { BankTransferModal } from './BankTransferModal';

interface PendingPayment {
  id: string;
  type: 'invoice_payment' | 'wallet_topup';
  invoice_id: string | null;
  amount: number;
  wise_pay_link: string;
  description: string | null;
  created_at: string;
  invoice?: {
    invoice_number: string;
  };
}

const bankDetails = {
  accountHolder: 'Hangzhou Jiaming Yichang Technology',
  accountNumber: '****3545',
  routingNumber: '026073150',
  bankName: 'Wise',
  swiftCode: 'CMFGUS33'
};

export const PendingPaymentBanner: React.FC = () => {
  const { user } = useAuth();
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const fetchPendingPayments = async () => {
      const { data, error } = await supabase
        .from('pending_payment_confirmations')
        .select(`
          id,
          type,
          invoice_id,
          amount,
          wise_pay_link,
          description,
          created_at,
          invoices (
            invoice_number
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        setPendingPayment({
          ...data,
          type: data.type || 'invoice_payment',
          invoice: data.invoices ? { invoice_number: (data.invoices as any).invoice_number } : undefined
        });
      } else {
        setPendingPayment(null);
      }
    };

    fetchPendingPayments();

    const subscription = supabase
      .channel('pending_payments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pending_payment_confirmations',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchPendingPayments();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  const handleComplete = () => {
    setShowModal(true);
  };

  const handlePaymentConfirmed = () => {
    setPendingPayment(null);
    setShowModal(false);
  };

  const handleDismiss = async () => {
    setIsDismissed(true);
    setTimeout(() => {
      setIsDismissed(false);
    }, 5 * 60 * 1000);
  };

  if (!pendingPayment || isDismissed) return null;

  const isInvoicePayment = pendingPayment.type === 'invoice_payment';
  const displayLabel = isInvoicePayment
    ? pendingPayment.invoice?.invoice_number || `INV-${pendingPayment.invoice_id?.slice(0, 8) || 'Unknown'}`
    : 'Wallet Top-up';

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-xl">
        <div className="bg-gradient-to-b from-amber-50 to-white dark:from-amber-900/30 dark:to-[#2a2a2a]/95 border border-amber-200/60 dark:border-amber-700/40 rounded-xl shadow-lg backdrop-blur-sm">
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="flex-shrink-0 p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
              {isInvoicePayment ? (
                <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              ) : (
                <Wallet className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                Unconfirmed {isInvoicePayment ? 'payment' : 'transfer'} pending
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 truncate">
                {displayLabel} - ${pendingPayment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleComplete}
                className="group px-3 py-1.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors flex items-center gap-1.5"
              >
                Complete
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={handleDismiss}
                className="p-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors"
                title="Dismiss for 5 minutes"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showModal && isInvoicePayment && pendingPayment.invoice_id && (
        <WisePaymentModal
          onClose={() => setShowModal(false)}
          invoiceId={pendingPayment.invoice_id}
          invoiceNumber={displayLabel}
          amount={pendingPayment.amount}
          wisePayLink={pendingPayment.wise_pay_link}
          onPaymentConfirmed={handlePaymentConfirmed}
        />
      )}

      {showModal && !isInvoicePayment && (
        <BankTransferModal
          onClose={() => setShowModal(false)}
          bankDetails={bankDetails}
          onPaymentConfirmed={handlePaymentConfirmed}
          initialAmount={pendingPayment.amount}
        />
      )}
    </>
  );
};
