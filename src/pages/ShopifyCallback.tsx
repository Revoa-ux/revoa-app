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

  // Force light mode for this page to match onboarding
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

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

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('Authentication required - please sign in');
        }

        console.log('[Callback] Verifying state against database...');
        console.log('[Callback] Looking for state:', state);
        console.log('[Callback] User ID:', session.user.id);

        // First, try to find ANY session with this state to debug
        const { data: anySession, error: debugError } = await supabase
          .from('oauth_sessions')
          .select('*')
          .eq('state', state)
          .maybeSingle();

        console.log('[Callback] Debug - Any session with state found?', anySession ? 'YES' : 'NO');
        if (anySession) {
          console.log('[Callback] Debug - Session user_id:', anySession.user_id);
          console.log('[Callback] Debug - Current user_id:', session.user.id);
          console.log('[Callback] Debug - Match?', anySession.user_id === session.user.id);
        }

        const { data: oauthSession, error: sessionError } = await supabase
          .from('oauth_sessions')
          .select('*')
          .eq('state', state)
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (sessionError) {
          console.error('[Callback] Error checking OAuth session:', sessionError);
          throw new Error('Failed to verify OAuth state');
        }

        if (!oauthSession) {
          console.error('[Callback] No matching OAuth session found for state:', state);
          console.error('[Callback] User ID:', session.user.id);
          console.error('[Callback] This may occur if testing on a preview environment with a different database');
          throw new Error('Invalid state parameter - security check failed. Are you testing on a preview environment?');
        }

        if (oauthSession.shop_domain !== shop) {
          console.error('[Callback] Shop mismatch:', { expected: oauthSession.shop_domain, received: shop });
          throw new Error('Shop mismatch - security check failed');
        }

        const expiresAt = new Date(oauthSession.expires_at);
        if (expiresAt < new Date()) {
          console.error('[Callback] OAuth session expired:', { expiresAt, now: new Date() });
          throw new Error('OAuth session expired - please try again');
        }

        console.log('[Callback] State verification successful');

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Supabase configuration missing');
        }

        console.log('[Callback] Calling shopify-proxy edge function...');
        const requestBody = {
          action: 'complete-oauth',
          shop,
          code,
          state,
          hmac
        };
        console.log('[Callback] Request body:', requestBody);
        console.log('[Callback] Has Authorization header:', !!session.access_token);

        const response = await fetch(`${supabaseUrl}/functions/v1/shopify-proxy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': supabaseAnonKey
          },
          body: JSON.stringify(requestBody)
        });

        console.log('[Callback] Response status:', response.status);
        console.log('[Callback] Response headers:', Object.fromEntries(response.headers.entries()));

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
          console.log('[Shopify Callback] Sending success messages to parent window (multiple attempts)');

          const successMessage = {
            type: 'shopify:success',
            shop: shop,
            data: result,
            timestamp: Date.now()
          };

          // Send message immediately
          window.opener.postMessage(successMessage, '*');
          console.log('[Shopify Callback] Success message sent #1');

          // Send again after 100ms
          setTimeout(() => {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage(successMessage, '*');
              console.log('[Shopify Callback] Success message sent #2');
            }
          }, 100);

          // Send again after 300ms
          setTimeout(() => {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage(successMessage, '*');
              console.log('[Shopify Callback] Success message sent #3');
            }
          }, 300);

          // Set localStorage as backup
          localStorage.setItem('shopify_oauth_success', JSON.stringify({
            shop: shop,
            timestamp: Date.now()
          }));
          console.log('[Shopify Callback] Set localStorage success flag');
        }

        // Auto-close popup after brief delay to ensure messages are sent
        setTimeout(() => {
          console.log('[Shopify Callback] Auto-closing popup window...');
          if (window.opener && !window.opener.closed) {
            console.log('[Shopify Callback] Parent window detected, closing popup');
            window.close();
          } else {
            console.log('[Shopify Callback] No parent window, redirecting to settings');
            navigate('/settings');
          }
        }, 500);

      } catch (error) {
        console.error('[Callback] OAuth callback error:', error);
        const errorMsg = error instanceof Error ? error.message : 'Failed to connect to Shopify';

        setStatus('error');
        setErrorMessage(errorMsg);

        localStorage.removeItem('shopify_state');
        localStorage.removeItem('shopify_shop');

        if (window.opener && !window.opener.closed) {
          const errorMessage = {
            type: 'shopify:error',
            error: errorMsg,
            timestamp: Date.now()
          };

          window.opener.postMessage(errorMessage, '*');
          console.log('[Shopify Callback] Error message sent to parent');

          localStorage.setItem('shopify_oauth_error', JSON.stringify({
            error: errorMsg,
            timestamp: Date.now()
          }));
        }

        // Keep error window open longer for user to read the message
        setTimeout(() => {
          console.log('[Shopify Callback] Auto-closing error popup window...');
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-12 max-w-md w-full text-center border border-gray-200">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 mx-auto mb-6 text-rose-600 animate-spin" />
            <h1 className="text-2xl font-semibold text-gray-900 mb-3">
              Connecting to Shopify
            </h1>
            <p className="text-gray-600">
              Please wait while we complete the setup...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-rose-600 via-pink-500 to-orange-400 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-3">
              Installation Complete!
            </h1>
            <p className="text-gray-600 mb-4">
              Your Shopify store has been connected successfully.
            </p>
            <button
              onClick={() => window.close()}
              className="px-6 py-2 bg-gradient-to-r from-rose-600 via-pink-500 to-orange-400 text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Close Window
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 bg-red-500 rounded-full flex items-center justify-center">
              <XCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-3">
              Connection Failed
            </h1>
            <p className="text-gray-600 mb-4">
              {errorMessage || 'Something went wrong. Please try again.'}
            </p>
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-left mb-4">
                <p className="text-sm text-red-800 font-mono break-all">
                  {JSON.stringify({ error: errorMessage })}
                </p>
              </div>
            )}
            <button
              onClick={() => window.close()}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close Window
            </button>
          </>
        )}
      </div>
    </div>
  );
}
