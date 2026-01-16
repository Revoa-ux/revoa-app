import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { PageTitle } from '../components/PageTitle';
import { useAuth } from '../contexts/AuthContext';
import { createQuoteRequest } from '../lib/quotes';
import { supabase } from '../lib/supabase';

import type { QuotePlatform } from '../lib/quotes';

const PENDING_QUOTE_KEY = 'pending_quote';

interface PendingQuoteData {
  product_url: string;
  product_name: string;
}

const detectPlatformFromUrl = (url: string): QuotePlatform => {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('aliexpress.com') || lowerUrl.includes('aliexpress.')) return 'aliexpress';
  if (lowerUrl.includes('amazon.com') || lowerUrl.includes('amazon.')) return 'amazon';
  if (lowerUrl.includes('1688.com')) return '1688';
  if (lowerUrl.includes('alibaba.com')) return 'alibaba';
  return 'other';
};

type VerificationStatus = 'loading' | 'success' | 'error' | 'expired';

const ConfirmEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshEmailConfirmed, user, isAuthenticated } = useAuth();
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setErrorMessage('No verification token provided');
        return;
      }

      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(`${supabaseUrl}/functions/v1/verify-signup-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          // If we got a session token, auto sign-in
          if (result.sessionToken) {
            try {
              const { error } = await supabase.auth.verifyOtp({
                token_hash: result.sessionToken,
                type: 'magiclink',
              });

              if (!error) {
                // Successfully signed in!
                setStatus('success');

                // Refresh email confirmed status and wait for state to propagate
                await refreshEmailConfirmed();

                // Add a small delay to ensure AuthContext state has updated
                // This prevents race condition where UserProtectedRoute checks too early
                await new Promise(resolve => setTimeout(resolve, 500));

                // Auto-navigate after state is synchronized
                setTimeout(async () => {
                  await handleContinue();
                }, 1000);
                return;
              }
            } catch (err) {
              console.error('Auto sign-in failed:', err);
            }
          }

          setStatus('success');
        } else if (result.error?.includes('expired')) {
          setStatus('expired');
          setErrorMessage('This verification link has expired. Please request a new one.');
        } else {
          setStatus('error');
          setErrorMessage(result.error || 'Failed to verify email');
        }
      } catch {
        setStatus('error');
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
    };

    verifyToken();
  }, [searchParams]);

  const handleContinue = async () => {
    // If user is not authenticated, redirect to sign in
    if (!isAuthenticated || !user) {
      navigate('/auth', { replace: true });
      return;
    }

    // Refresh email confirmed status one more time before navigation
    await refreshEmailConfirmed();

    // Wait a moment for state to propagate through AuthContext
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      const pendingQuoteStr = localStorage.getItem(PENDING_QUOTE_KEY);
      if (pendingQuoteStr) {
        const pendingQuote: PendingQuoteData = JSON.parse(pendingQuoteStr);

        if (pendingQuote.product_url) {
          try {
            const productUrl = pendingQuote.product_url.startsWith('http')
              ? pendingQuote.product_url
              : `https://${pendingQuote.product_url}`;

            let productName = pendingQuote.product_name;
            if (!productName) {
              try {
                const urlObj = new URL(productUrl);
                productName = urlObj.pathname.split('/').filter(Boolean).pop() || 'Untitled Product';
                productName = productName.replace(/-/g, ' ').replace(/\.\w+$/, '');
              } catch {
                productName = 'Untitled Product';
              }
            }

            await createQuoteRequest({
              productUrl,
              productName,
              platform: detectPlatformFromUrl(productUrl),
              source: 'landing_page',
            });

            toast.success('Your quote request has been submitted!');
          } catch (quoteError) {
            console.error('[ConfirmEmail] Failed to create quote from pending URL:', quoteError);
          }
        }

        localStorage.removeItem(PENDING_QUOTE_KEY);
      }
    } catch (err) {
      console.error('[ConfirmEmail] Error processing pending quote:', err);
      localStorage.removeItem(PENDING_QUOTE_KEY);
    }

    // Navigate with a flag indicating we just confirmed email
    // This prevents UserProtectedRoute from redirecting back to check-email
    navigate('/onboarding/store', {
      replace: true,
      state: { emailJustConfirmed: true }
    });
  };

  return (
    <>
      <PageTitle title="Email Confirmation" />
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
          {status === 'loading' && (
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-sm rounded-2xl p-12">
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <Loader2 className="w-12 h-12 text-gray-600 dark:text-gray-400 animate-spin" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-medium text-gray-900 dark:text-white">
                    Verifying Your Email
                  </h2>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">
                    Please wait while we confirm your email address.
                  </p>
                </div>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-sm rounded-2xl p-12 space-y-8">
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-gray-900 dark:text-white" strokeWidth={2.5} />
                  </div>
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-medium text-gray-900 dark:text-white">
                    Email Confirmed
                  </h2>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">
                    {isAuthenticated
                      ? "Redirecting you to onboarding..."
                      : "Your account is now active. Let's get you set up."
                    }
                  </p>
                </div>
              </div>

              {!isAuthenticated && (
                <button
                  onClick={handleContinue}
                  className="group w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg text-base font-medium text-white bg-gray-900 hover:bg-black hover:shadow-lg dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Continue
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}
            </div>
          )}

          {(status === 'error' || status === 'expired') && (
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-sm rounded-2xl p-8 space-y-6">
              <div className="text-center">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <XCircle className="w-10 h-10 text-gray-900 dark:text-white" strokeWidth={2.5} />
                  </div>
                </div>
                <h2 className="text-3xl font-medium text-gray-900 dark:text-white mb-3">
                  {status === 'expired' ? 'Link Expired' : 'Verification Failed'}
                </h2>
                <p className="mt-1 text-gray-600 dark:text-gray-400">
                  {errorMessage}
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => navigate('/signup')}
                  className="group w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-gray-900 hover:bg-black hover:shadow-md dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Sign up again
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button
                  onClick={() => navigate('/auth')}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Back to sign in
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ConfirmEmail;
