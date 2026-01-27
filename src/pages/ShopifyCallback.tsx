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

  // Force light mode IMMEDIATELY before any render
  // This needs to happen synchronously to prevent flash
  if (typeof window !== 'undefined') {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }

  // Also use effect to keep it light and prevent ThemeProvider from re-adding dark
  useEffect(() => {
    const removeDarkMode = () => {
      document.documentElement.classList.remove('dark');
    };

    removeDarkMode();

    // Use MutationObserver to prevent dark class from being added back
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const hasD = document.documentElement.classList.contains('dark');
          if (hasD) {
            document.documentElement.classList.remove('dark');
          }
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => {
      observer.disconnect();
    };
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
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(to bottom right, #f9fafb, #f3f4f6)' }}
    >
      <div
        className="rounded-2xl shadow-xl p-12 max-w-md w-full text-center"
        style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }}
      >
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 mx-auto mb-6 animate-spin" style={{ color: '#e11d48' }} />
            <h1 className="text-2xl font-semibold mb-3" style={{ color: '#171717' }}>
              Connecting to Shopify
            </h1>
            <p style={{ color: '#4b5563' }}>
              Please wait while we complete the setup...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div
              className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(to bottom right, #10b981, #059669)' }}
            >
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-semibold mb-3" style={{ color: '#171717' }}>
              Installation Complete!
            </h1>
            <p className="mb-4" style={{ color: '#4b5563' }}>
              Your Shopify store has been connected successfully.
            </p>
            <button
              onClick={() => window.close()}
              className="px-6 py-2 text-white rounded-lg hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(to right, #e11d48, #ec4899, #f97316)' }}
            >
              Close Window
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div
              className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#ef4444' }}
            >
              <XCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-semibold mb-3" style={{ color: '#171717' }}>
              Connection Failed
            </h1>
            <p className="mb-4" style={{ color: '#4b5563' }}>
              {errorMessage || 'Something went wrong. Please try again.'}
            </p>
            {errorMessage && (
              <div
                className="rounded-lg p-3 text-left mb-4"
                style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}
              >
                <p className="text-sm font-mono break-all" style={{ color: '#991b1b' }}>
                  {JSON.stringify({ error: errorMessage })}
                </p>
              </div>
            )}
            <button
              onClick={() => window.close()}
              className="px-6 py-2 text-white rounded-lg transition-colors"
              style={{ backgroundColor: '#4b5563' }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#3a3a3a'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
            >
              Close Window
            </button>
          </>
        )}
      </div>
    </div>
  );
}
