import React, { useState, useEffect, useRef } from 'react';
import { X, CreditCard, AlertTriangle, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { useClickOutside } from '@/lib/useClickOutside';
import { supabase } from '@/lib/supabase';

interface StripeTopUpModalProps {
  onClose: () => void;
}

export const StripeTopUpModal: React.FC<StripeTopUpModalProps> = ({ onClose }) => {
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const modalRef = useRef<HTMLDivElement>(null);

  useClickOutside(modalRef, onClose);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!amount) {
      setError('Please enter an amount');
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

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please log in to continue');
        setLoading(false);
        return;
      }

      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ amount: numAmount }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (!data.url) {
        throw new Error('No checkout URL received');
      }

      window.location.href = data.url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      setError(error instanceof Error ? error.message : 'Failed to initiate payment. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-0 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-4">
          <div className="relative bg-white dark:bg-dark rounded-xl w-full max-w-md" ref={modalRef}>
            <div className="sticky top-0 z-10 bg-white dark:bg-dark px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-[#3a3a3a] rounded-t-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Top Up with Stripe</h3>
                <button
                  onClick={onClose}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="px-4 sm:px-6 pt-6 pb-4">
              <form onSubmit={handleSubmit} className="space-y-6">
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
                      className="w-full pl-8 pr-4 py-2 border border-gray-200 dark:border-[#4a4a4a] bg-white dark:bg-[#3a3a3a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Enter amount (min. $50)"
                      autoFocus
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    Minimum top-up amount is $50
                  </p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-dark/50 rounded-lg border border-gray-200 dark:border-[#3a3a3a]">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white dark:bg-dark rounded-lg">
                      <CreditCard className="w-5 h-5 text-gray-900 dark:text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Payment via Stripe</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Supports cards, Apple Pay, Google Pay</p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" />
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-200 dark:border-[#3a3a3a] pt-4 flex space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn btn-secondary flex-1"
                  >
                    <ArrowLeft className="btn-icon btn-icon-back" />
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !amount}
                    className="btn btn-primary flex-1 group"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="btn-icon animate-spin" />
                        <span>Redirecting...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue to Stripe</span>
                        <ArrowRight className="btn-icon btn-icon-arrow" />
                      </>
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
