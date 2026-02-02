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
            <div className="bg-white dark:bg-[#1f1f1f] shadow-sm rounded-2xl p-12 border border-gray-200 dark:border-[#3a3a3a]">
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
            <div className="bg-white dark:bg-[#1f1f1f] shadow-sm rounded-2xl p-12 border border-gray-200 dark:border-[#3a3a3a]">
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
            <div className="bg-white dark:bg-[#1f1f1f] shadow-sm rounded-2xl p-8 space-y-6 border border-gray-200 dark:border-[#3a3a3a]">
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
                  className="btn btn-secondary flex-1 justify-center"
                >
                  <ArrowLeft className="w-4 h-4 btn-icon" />
                  Contact Support
                </a>
                <button
                  onClick={() => window.location.reload()}
                  className="btn btn-primary flex-1 justify-center group"
                >
                  Try Again
                  <ArrowRight className="w-4 h-4 btn-icon group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
