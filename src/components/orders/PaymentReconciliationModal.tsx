import React, { useState, useEffect } from 'react';
import { X, DollarSign, AlertTriangle, CheckCircle, CreditCard, Building2, ArrowLeft, ArrowRight } from 'lucide-react';
import { Invoice, invoiceService } from '../../lib/invoiceService';
import { balanceService } from '../../lib/balanceService';
import { toast } from '../../lib/toast';
import { format } from 'date-fns';

interface PaymentReconciliationModalProps {
  invoice: Invoice;
  adminId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentReconciliationModal({
  invoice,
  adminId,
  onClose,
  onSuccess
}: PaymentReconciliationModalProps) {
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'wire'>('wire');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [merchantBalance, setMerchantBalance] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(true);

  const totalAmount = invoice.total_amount || invoice.amount;

  useEffect(() => {
    setAmountReceived(totalAmount.toFixed(2));
    loadMerchantBalance();
  }, [invoice]);

  const loadMerchantBalance = async () => {
    try {
      setLoadingBalance(true);
      const balance = await balanceService.getBalanceAccountByUserId(invoice.user_id);
      setMerchantBalance(balance?.current_balance || 0);
    } catch (error) {
      console.error('Error loading merchant balance:', error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const amountReceivedNum = parseFloat(amountReceived) || 0;
  const difference = amountReceivedNum - totalAmount;
  const isOverpayment = difference > 0;
  const isUnderpayment = difference < 0;
  const isExact = difference === 0;

  const newBalance = isOverpayment ? merchantBalance + difference : merchantBalance;

  const handleSubmit = async () => {
    if (amountReceivedNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (paymentMethod === 'wire' && !referenceNumber.trim()) {
      toast.error('Please enter a wire transfer reference number');
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await invoiceService.applyPaymentWithReconciliation(
        invoice.id,
        amountReceivedNum,
        paymentMethod,
        referenceNumber,
        adminId
      );

      if (result.success) {
        if (result.overpayment) {
          toast.success(`Payment recorded! $${result.overpayment.toFixed(2)} credited to merchant balance.`);
        } else if (result.underpayment) {
          toast.success(`Partial payment recorded. $${result.underpayment.toFixed(2)} remaining.`);
        } else {
          toast.success('Payment recorded successfully!');
        }
        onSuccess();
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Failed to process payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] bg-white dark:bg-dark rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#3a3a3a] flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Payment Reconciliation
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          <div className="bg-gray-50 dark:bg-[#3a3a3a]/50/50 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Invoice</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {invoice.invoice_number || `INV-${invoice.id.slice(0, 8)}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">Amount Due</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-[#3a3a3a]">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Merchant: {invoice.user_profile?.company || invoice.user_profile?.email || 'Unknown'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Due: {invoice.due_date ? format(new Date(invoice.due_date), 'MMM dd, yyyy') : 'N/A'}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('stripe')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                  paymentMethod === 'stripe'
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300'
                    : 'border-gray-200 dark:border-[#3a3a3a] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span className="text-sm font-medium">Stripe</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('wire')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                  paymentMethod === 'wire'
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300'
                    : 'border-gray-200 dark:border-[#3a3a3a] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span className="text-sm font-medium">Wire Transfer</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Amount Received
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
          </div>

          {paymentMethod === 'wire' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Wire Transfer Reference
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                placeholder="Enter reference number"
              />
            </div>
          )}

          {paymentMethod === 'stripe' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stripe Payment ID (optional)
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                placeholder="pi_..."
              />
            </div>
          )}

          {amountReceivedNum > 0 && !isExact && (
            <div className={`rounded-lg p-4 ${
              isOverpayment
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
            }`}>
              {isOverpayment ? (
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      Overpayment of ${difference.toFixed(2)} will be credited to merchant balance
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                      New Balance: ${newBalance.toFixed(2)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Underpayment of ${Math.abs(difference).toFixed(2)}
                    </p>
                    <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                      Invoice will be marked as partially paid. Remaining: ${Math.abs(difference).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-gray-50 dark:bg-[#3a3a3a]/50/50 rounded-lg p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Current Merchant Balance</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {loadingBalance ? '...' : `$${merchantBalance.toFixed(2)}`}
              </span>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-[#3a3a3a]/50/50 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Summary
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Invoice Amount</span>
                <span className="text-gray-900 dark:text-white">${totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Amount Received</span>
                <span className="text-gray-900 dark:text-white">${amountReceivedNum.toFixed(2)}</span>
              </div>
              {!isExact && (
                <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200 dark:border-[#3a3a3a]">
                  <span className="text-gray-600 dark:text-gray-400">
                    {isOverpayment ? 'Balance Credit' : 'Remaining Due'}
                  </span>
                  <span className={isOverpayment ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}>
                    {isOverpayment ? '+' : ''}${Math.abs(difference).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200 dark:border-[#3a3a3a]">
                <span className="text-gray-600 dark:text-gray-400">New Status</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  isUnderpayment
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                    : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                }`}>
                  {isUnderpayment ? 'Partially Paid' : 'Paid'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-[#3a3a3a]/50 flex-shrink-0 rounded-b-xl px-4 sm:px-6 py-4">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="btn btn-secondary flex-1"
            >
              <ArrowLeft className="btn-icon btn-icon-back" />
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || amountReceivedNum <= 0 || (paymentMethod === 'wire' && !referenceNumber.trim())}
              className="btn btn-primary flex-1"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  Confirm Payment
                  <ArrowRight className="btn-icon btn-icon-arrow" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
