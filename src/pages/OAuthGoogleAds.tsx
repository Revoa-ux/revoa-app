import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Check, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function OAuthGoogleAds() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Please wait while we complete the setup...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const error = params.get('error');

        if (error) {
          throw new Error(`Authorization failed: ${error}`);
        }

        if (!code || !state) {
          throw new Error('Missing authorization code or state');
        }

        setMessage('Exchanging authorization code...');

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Not authenticated');
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-ads-oauth?action=process-callback`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code,
              state,
            }),
          }
        );

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to process authorization');
        }

        setMessage('Saving accounts...');

        const saveResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-ads-oauth?action=save-accounts`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              accounts: result.accounts,
              accessToken: result.accessToken,
              refreshToken: result.refreshToken,
              userId: session.user.id,
              expiresAt: result.expiresAt,
            }),
          }
        );

        const saveResult = await saveResponse.json();
        console.log('[Google OAuth] Save result:', saveResult);

        if (!saveResult.success) {
          throw new Error(saveResult.error || 'Failed to save accounts');
        }

        setStatus('success');
        setMessage(`Successfully connected ${result.accounts.length} Google Ads account(s)!`);

        localStorage.setItem('google_oauth_success', JSON.stringify({
          accountCount: result.accounts.length,
          timestamp: Date.now()
        }));

        setTimeout(() => {
          if (window.opener) {
            window.opener.postMessage(
              {
                type: 'google-oauth-success',
                accountCount: result.accounts.length,
              },
              '*'
            );
            window.close();
          } else {
            navigate('/settings');
          }
        }, 1500);
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        setStatus('error');
        setMessage(err.message || 'Failed to connect Google Ads');

        localStorage.setItem('google_oauth_error', JSON.stringify({
          error: err.message,
          timestamp: Date.now()
        }));

        setTimeout(() => {
          if (window.opener) {
            window.opener.postMessage(
              {
                type: 'google-oauth-error',
                error: err.message,
              },
              '*'
            );
            window.close();
          } else {
            navigate('/settings');
          }
        }, 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div className={`min-h-screen flex items-center justify-center p-5 ${
      isDark
        ? 'bg-[#0a0a0a]'
        : 'bg-[#fafafa]'
    }`}
    style={{
      backgroundImage: isDark
        ? 'repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(255,255,255,0.03) 4px, rgba(255,255,255,0.03) 5px)'
        : 'repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(0,0,0,0.03) 4px, rgba(0,0,0,0.03) 5px)'
    }}>
      <div className={`rounded-2xl p-1 border max-w-[500px] w-full ${
        isDark
          ? 'bg-gray-800 border-gray-700'
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className={`rounded-xl p-12 border text-center ${
          isDark
            ? 'bg-gray-900 border-gray-600'
            : 'bg-white border-gray-300'
        }`}>
          {status === 'processing' && (
            <>
              <div className="flex items-center justify-center mx-auto mb-6">
                <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none">
                  <defs>
                    <linearGradient id="spinner-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#E11D48" />
                      <stop offset="40%" stopColor="#EC4899" />
                      <stop offset="70%" stopColor="#F87171" />
                      <stop offset="100%" stopColor="#E8795A" />
                    </linearGradient>
                  </defs>
                  <circle cx="12" cy="12" r="9" stroke="url(#spinner-gradient)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="45 15" />
                </svg>
              </div>
              <h1 className={`text-xl font-semibold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                Connecting to Google Ads
              </h1>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {message}
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div
                className="inline-flex items-center justify-center p-0.5 rounded-full mb-5 mx-auto"
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  backdropFilter: 'blur(4px)',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                }}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: '#10B981',
                    boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                  }}
                >
                  <Check className="w-7 h-7 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <h1 className={`text-xl font-semibold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                Connection Complete!
              </h1>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {message}
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div
                className="inline-flex items-center justify-center p-0.5 rounded-full mb-5 mx-auto"
                style={{
                  backgroundColor: 'rgba(244, 63, 94, 0.15)',
                  backdropFilter: 'blur(4px)',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                }}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: '#F43F5E',
                    boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                  }}
                >
                  <X className="w-7 h-7 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <h1 className={`text-xl font-semibold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                Connection Failed
              </h1>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {message}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
