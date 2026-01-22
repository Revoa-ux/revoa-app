import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

const Welcome = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'validating' | 'success' | 'error'>('validating');
  const [errorMessage, setErrorMessage] = useState('');
  const [shopName, setShopName] = useState('');

  useEffect(() => {
    const validateAndSignIn = async () => {
      const token = searchParams.get('token');
      const source = searchParams.get('source');
      const shop = searchParams.get('shop');

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center">
            {/* Logo */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 mb-6">
              <img
                src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Revoa%20Transparent%20Icon.png"
                alt="Revoa"
                className="w-full h-full object-contain dark:invert dark:brightness-0 dark:contrast-200"
              />
            </div>

            {/* Status Content */}
            {status === 'validating' && (
              <>
                <div className="mb-4">
                  <Loader2 className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 animate-spin" />
                </div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  Setting up your account
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Please wait while we complete your installation...
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="mb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/20">
                    <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  Welcome to Revoa!
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Your Shopify store is connected
                </p>
                {shopName && (
                  <div className="inline-flex items-center px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {shopName}
                    </span>
                  </div>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                  Redirecting to setup...
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="mb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20">
                    <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  Installation Error
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {errorMessage}
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => window.location.href = 'https://admin.shopify.com'}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                  >
                    Return to Shopify
                  </button>
                  <button
                    onClick={() => window.location.href = 'mailto:support@revoa.app'}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Contact Support
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
          Revoa - Intelligent Analytics & Attribution Platform
        </p>
      </div>
    </div>
  );
};

export default Welcome;
