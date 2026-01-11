import React, { useState, useEffect } from 'react';
import { Clock, X, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { WisePaymentModal } from './WisePaymentModal';

interface PendingPayment {
  id: string;
  invoice_id: string;
  amount: number;
  wise_pay_link: string;
  created_at: string;
  invoice?: {
    invoice_number: string;
  };
}

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
          invoice_id,
          amount,
          wise_pay_link,
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

  const invoiceNumber = pendingPayment.invoice?.invoice_number || `INV-${pendingPayment.invoice_id.slice(0, 8)}`;

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-xl">
        <div className="bg-gradient-to-b from-amber-50 to-white dark:from-amber-900/30 dark:to-gray-800/95 border border-amber-200/60 dark:border-amber-700/40 rounded-xl shadow-lg backdrop-blur-sm">
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="flex-shrink-0 p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                Unconfirmed payment pending
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 truncate">
                {invoiceNumber} - ${pendingPayment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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

      {showModal && (
        <WisePaymentModal
          onClose={() => setShowModal(false)}
          invoiceId={pendingPayment.invoice_id}
          invoiceNumber={invoiceNumber}
          amount={pendingPayment.amount}
          wisePayLink={pendingPayment.wise_pay_link}
          onPaymentConfirmed={handlePaymentConfirmed}
        />
      )}
    </>
  );
};
