import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';
import { PageTitle } from '../components/PageTitle';

const Welcome = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'validating' | 'success' | 'error'>('validating');
  const [errorMessage, setErrorMessage] = useState('');
  const [shopName, setShopName] = useState('');
  const [isReturningUser, setIsReturningUser] = useState(false);

  useEffect(() => {
    const validateAndSignIn = async () => {
      const token = searchParams.get('token');
      const source = searchParams.get('source');
      const shop = searchParams.get('shop');
      const returningUser = searchParams.get('returning_user');

      // Check if this is a returning user (Journey C)
      if (returningUser === 'true') {
        setIsReturningUser(true);
      }

      if (!token) {
        setStatus('error');
        setErrorMessage('Invalid installation link. Please try installing again from the Shopify App Store.');
        return;
      }

      try {
        // Validate and exchange token for session
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'magiclink'
        });

        if (error) {
          console.error('Token validation error:', error);
          if (error.message.includes('expired')) {
            setErrorMessage('This link has expired. Please access Revoa from your Shopify admin.');
          } else {
            setErrorMessage('Unable to verify installation. Please contact support.');
          }
          setStatus('error');
          return;
        }

        if (!data.session) {
          setErrorMessage('Unable to create session. Please try again.');
          setStatus('error');
          return;
        }

        // Successfully signed in
        setStatus('success');

        // Get shop name for display
        if (shop) {
          const cleanShop = shop.replace('.myshopify.com', '');
          setShopName(cleanShop);
        }

        // Show success message
        toast.success('Successfully connected your Shopify store!');

        // Redirect to onboarding ads step after 2 seconds
        setTimeout(() => {
          navigate('/onboarding/ads', { replace: true });
        }, 2000);

      } catch (error) {
        console.error('Welcome page error:', error);
        setErrorMessage('An unexpected error occurred. Please contact support.');
        setStatus('error');
      }
    };

    validateAndSignIn();
  }, [searchParams, navigate]);

  return (
    <>
      <PageTitle title="Welcome to Revoa" />
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
          <div className="bg-white/70 dark:bg-dark/70 backdrop-blur-sm shadow-sm rounded-2xl p-8">
            {status === 'validating' && (
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
                    Please wait while we complete your installation...
                  </p>
                </div>
              </div>
            )}

            {status === 'success' && (
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
                    {isReturningUser ? 'Store Connected!' : 'Welcome to Revoa!'}
                  </h2>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">
                    {isReturningUser
                      ? 'Your Shopify store has been successfully linked to your account'
                      : 'Your Shopify store is connected'
                    }
                  </p>
                  {shopName && (
                    <div className="inline-flex items-center px-4 py-2 rounded-lg bg-gray-100 dark:bg-[#3a3a3a]">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {shopName}
                      </span>
                    </div>
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isReturningUser ? 'Continue to setup...' : 'Redirecting to setup...'}
                  </p>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm" style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)' }}>
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: '#F43F5E',
                        boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                      }}
                    >
                      <XCircle className="w-10 h-10 text-white" strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-medium text-gray-900 dark:text-white">
                    Installation Error
                  </h2>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">
                    {errorMessage}
                  </p>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={() => window.location.href = 'https://admin.shopify.com'}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-dark hover:bg-black hover:shadow-md dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Return to Shopify
                  </button>
                  <button
                    onClick={() => window.location.href = 'mailto:support@revoa.app'}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a] transition-colors"
                  >
                    Contact Support
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            Revoa - Intelligent Analytics & Attribution Platform
          </p>
        </div>
      </div>
    </>
  );
};

export default Welcome;
