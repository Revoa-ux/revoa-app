import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SHOPIFY_CONFIG } from '../lib/config';

type Status = 'loading' | 'success' | 'error';

export default function ShopifyCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const shop = searchParams.get('shop');
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const hmac = searchParams.get('hmac');

        console.log('[Callback] OAuth callback received:', { shop, code: code ? 'present' : 'missing', state, hmac: hmac ? 'present' : 'missing' });

        if (!shop || !code || !state || !hmac) {
          throw new Error('Missing required OAuth parameters');
        }

        const storedState = localStorage.getItem('shopify_state');
        const storedShop = localStorage.getItem('shopify_shop');

        console.log('[Callback] Stored values:', { storedState, storedShop });

        if (!storedState || state !== storedState) {
          throw new Error('Invalid state parameter - security check failed');
        }

        if (!storedShop || shop !== storedShop) {
          throw new Error('Shop mismatch - security check failed');
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('Authentication required - please sign in');
        }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Supabase configuration missing');
        }

        console.log('[Callback] Calling shopify-proxy edge function...');
        const response = await fetch(`${supabaseUrl}/functions/v1/shopify-proxy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': supabaseAnonKey
          },
          body: JSON.stringify({
            action: 'complete-oauth',
            shop,
            code,
            state,
            hmac
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || `OAuth completion failed: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('[Callback] OAuth completed successfully:', result);

        setStatus('success');

        localStorage.removeItem('shopify_state');
        localStorage.removeItem('shopify_shop');

        if (window.opener && !window.opener.closed) {
          console.log('[Callback] Sending success message to parent window');
          window.opener.postMessage({
            type: 'shopify:success',
            shop: shop,
            data: result
          }, '*');

          localStorage.setItem('shopify_oauth_success', JSON.stringify({
            shop: shop,
            timestamp: Date.now()
          }));
        }

        setTimeout(() => {
          if (window.opener && !window.opener.closed) {
            window.close();
          } else {
            navigate('/settings');
          }
        }, 1500);

      } catch (error) {
        console.error('[Callback] OAuth callback error:', error);
        const errorMsg = error instanceof Error ? error.message : 'Failed to connect to Shopify';

        setStatus('error');
        setErrorMessage(errorMsg);

        localStorage.removeItem('shopify_state');
        localStorage.removeItem('shopify_shop');

        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({
            type: 'shopify:error',
            error: errorMsg
          }, '*');

          localStorage.setItem('shopify_oauth_error', JSON.stringify({
            error: errorMsg,
            timestamp: Date.now()
          }));
        }

        setTimeout(() => {
          if (window.opener && !window.opener.closed) {
            window.close();
          } else {
            navigate('/settings');
          }
        }, 5000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 mx-auto mb-6 text-rose-600 animate-spin" />
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
              Connecting to Shopify
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we complete the setup...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-rose-600 via-pink-500 to-orange-400 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
              Installation Complete!
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Your Shopify store has been connected successfully.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 bg-red-500 rounded-full flex items-center justify-center">
              <XCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
              Connection Failed
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {errorMessage || 'Something went wrong. Please try again.'}
            </p>
            {errorMessage && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-left">
                <p className="text-sm text-red-800 dark:text-red-200 font-mono break-all">
                  {errorMessage}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
