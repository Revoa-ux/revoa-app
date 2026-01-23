import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * PUBLIC Shopify Welcome Page (No Auth Required)
 *
 * This page receives redirects from Shopify after plan selection.
 * URL format: /welcome?charge_id=XXX&shop=YYY.myshopify.com
 *
 * Compliance requirements:
 * - Must be public (no sign-in required)
 * - Verifies subscription server-side
 * - Handles OAuth if needed
 * - Stores subscription state
 * - Redirects to authenticated app
 */

interface VerificationState {
  status: 'verifying' | 'success' | 'error';
  message: string;
}

export default function ShopifyWelcome() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<VerificationState>({
    status: 'verifying',
    message: 'Verifying your subscription...'
  });

  useEffect(() => {
    verifyAndActivate();
  }, []);

  const verifyAndActivate = async () => {
    try {
      const chargeId = searchParams.get('charge_id');
      const shop = searchParams.get('shop');

      if (!chargeId || !shop) {
        setState({
          status: 'error',
          message: 'Missing required parameters from Shopify. Please try installing the app again.'
        });
        return;
      }

      // Call edge function to verify subscription server-side
      const { data, error } = await supabase.functions.invoke('verify-shopify-subscription', {
        body: { chargeId, shop }
      });

      if (error) throw error;

      if (!data.success) {
        setState({
          status: 'error',
          message: data.message || 'Failed to verify subscription. Please contact support.'
        });
        return;
      }

      // Subscription verified successfully
      setState({
        status: 'success',
        message: 'Subscription activated successfully!'
      });

      // Check if user is already authenticated
      const { data: { session } } = await supabase.auth.getSession();

      // Wait 2 seconds to show success message
      setTimeout(() => {
        if (session) {
          // User is authenticated, redirect to dashboard with refresh flag
          navigate('/?subscription_updated=true', { replace: true });
        } else {
          // User needs to authenticate, initiate OAuth
          // Store shop in localStorage for OAuth callback
          localStorage.setItem('shopify_shop', shop);
          localStorage.setItem('shopify_charge_id', chargeId);

          // Redirect to Shopify OAuth
          window.location.href = data.oauthUrl;
        }
      }, 2000);

    } catch (error) {
      console.error('Error verifying subscription:', error);
      setState({
        status: 'error',
        message: 'An error occurred while verifying your subscription. Please try again or contact support.'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img
              src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Revoa%20Transparent%20Icon.png"
              alt="Revoa"
              className="w-16 h-16"
            />
          </div>

          {/* Status Icon */}
          <div className="flex justify-center mb-4">
            {state.status === 'verifying' && (
              <Loader2 className="w-16 h-16 text-primary-500 animate-spin" />
            )}
            {state.status === 'success' && (
              <CheckCircle className="w-16 h-16 text-emerald-500" />
            )}
            {state.status === 'error' && (
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <span className="text-3xl">✕</span>
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            {state.status === 'verifying' && 'Setting up your account...'}
            {state.status === 'success' && 'All set!'}
            {state.status === 'error' && 'Something went wrong'}
          </h1>

          {/* Message */}
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {state.message}
          </p>

          {/* Action Button (Error State) */}
          {state.status === 'error' && (
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Try Again
              </button>
              <a
                href="https://revoa.app/support"
                className="block w-full px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Contact Support
              </a>
            </div>
          )}

          {/* Loading indicator */}
          {state.status === 'success' && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Redirecting you now...
            </p>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Official Shopify App
        </p>
      </div>
    </div>
  );
}
