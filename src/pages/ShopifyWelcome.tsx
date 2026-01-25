import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2, X, ArrowRight, ArrowLeft } from 'lucide-react';
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
    <>
      <div
        className="min-h-screen flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
        style={{
          backgroundColor: 'var(--auth-bg-color, #fafafa)',
          backgroundImage: 'var(--auth-bg-pattern)',
        }}
      >
        <style>{`
          :root {
            --auth-bg-color: #fafafa;
            --auth-bg-pattern: repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 4px,
              rgba(0, 0, 0, 0.03) 4px,
              rgba(0, 0, 0, 0.03) 5px
            );
          }
          .dark {
            --auth-bg-color: #171717;
            --auth-bg-pattern: repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 4px,
              rgba(255, 255, 255, 0.06) 4px,
              rgba(255, 255, 255, 0.06) 5px
            );
          }
        `}</style>

        <div className="w-full max-w-[420px] space-y-8 relative">
          {state.status === 'verifying' && (
            <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm shadow-sm rounded-2xl p-12">
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm" style={{ backgroundColor: 'rgba(14, 165, 233, 0.15)' }}>
                    <div
                      className="w-24 h-24 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: '#0EA5E9',
                        boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                      }}
                    >
                      <Loader2 className="w-12 h-12 text-white animate-spin" strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-medium text-gray-900 dark:text-white">
                    Setting up your account
                  </h2>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">
                    {state.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          {state.status === 'success' && (
            <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm shadow-sm rounded-2xl p-12">
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)' }}>
                    <div
                      className="w-24 h-24 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: '#10B981',
                        boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                      }}
                    >
                      <CheckCircle className="w-12 h-12 text-white" strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-medium text-gray-900 dark:text-white">
                    All set!
                  </h2>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">
                    Subscription activated successfully! Redirecting you now...
                  </p>
                </div>
              </div>
            </div>
          )}

          {state.status === 'error' && (
            <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm shadow-sm rounded-2xl p-8 space-y-6">
              <div className="text-center">
                <div className="flex justify-center mb-6">
                  <div className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm" style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)' }}>
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: '#F43F5E',
                        boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                      }}
                    >
                      <X className="w-10 h-10 text-white" strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
                <h2 className="text-3xl font-medium text-gray-900 dark:text-white mb-3">
                  Something went wrong
                </h2>
                <p className="mt-1 text-gray-600 dark:text-gray-400">
                  {state.message}
                </p>
              </div>

              <div className="flex gap-3">
                <a
                  href="https://revoa.app/support"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Contact Support
                </a>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 group flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-gray-800 dark:bg-gray-600 hover:bg-black dark:hover:bg-gray-500 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Try Again
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
