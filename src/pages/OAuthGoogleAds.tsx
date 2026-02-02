import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Check, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface GoogleAdsAccount {
  id: string;
  name: string;
}

export default function OAuthGoogleAds() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [status, setStatus] = useState<'processing' | 'selecting' | 'saving' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Please wait while we complete the setup...');
  const [availableAccounts, setAvailableAccounts] = useState<GoogleAdsAccount[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [oauthData, setOauthData] = useState<{
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
    userId: string;
  } | null>(null);

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

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

        if (!result.accounts || result.accounts.length === 0) {
          throw new Error('No Google Ads accounts found for this Google account');
        }

        setAvailableAccounts(result.accounts);
        setOauthData({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresAt: result.expiresAt,
          userId: session.user.id,
        });
        setStatus('selecting');
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

  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccountIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
  };

  const handleConfirmSelection = async () => {
    if (selectedAccountIds.size === 0 || !oauthData) return;

    setStatus('saving');
    setMessage('Connecting selected account...');

    try {
      const selectedAccounts = availableAccounts.filter(acc => selectedAccountIds.has(acc.id));

      const saveResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-ads-oauth?action=save-accounts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            accounts: selectedAccounts,
            accessToken: oauthData.accessToken,
            refreshToken: oauthData.refreshToken,
            userId: oauthData.userId,
            expiresAt: oauthData.expiresAt,
          }),
        }
      );

      const saveResult = await saveResponse.json();
      console.log('[Google OAuth] Save result:', saveResult);

      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save accounts');
      }

      setStatus('success');
      setMessage(selectedAccounts.length === 1
        ? 'Successfully connected your Google Ads account!'
        : `Successfully connected ${selectedAccounts.length} Google Ads accounts!`
      );

      localStorage.setItem('google_oauth_success', JSON.stringify({
        accountCount: selectedAccounts.length,
        timestamp: Date.now()
      }));

      setTimeout(() => {
        if (window.opener) {
          window.opener.postMessage(
            {
              type: 'google-oauth-success',
              accountCount: selectedAccounts.length,
            },
            '*'
          );
          window.close();
        } else {
          navigate('/settings');
        }
      }, 1500);
    } catch (err: any) {
      console.error('Save error:', err);
      setStatus('error');
      setMessage(err.message || 'Failed to save account');
    }
  };

  const getButtonText = () => {
    if (selectedAccountIds.size === 0) {
      return 'Select at least one account';
    }
    return `Connect ${selectedAccountIds.size} Account${selectedAccountIds.size > 1 ? 's' : ''}`;
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-5"
      style={{
        fontFamily: 'Suisse, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        backgroundColor: isDark ? '#0a0a0a' : '#fafafa',
        backgroundImage: isDark
          ? 'repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(255,255,255,0.03) 4px, rgba(255,255,255,0.03) 5px)'
          : 'repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(0,0,0,0.03) 4px, rgba(0,0,0,0.03) 5px)'
      }}
    >
      <div
        className="max-w-[500px] w-full rounded-2xl p-1"
        style={{
          background: isDark ? '#1f2937' : '#f9fafb',
          border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`
        }}
      >
        <div
          className="rounded-xl p-12 text-center"
          style={{
            background: isDark ? '#111827' : 'white',
            border: `1px solid ${isDark ? '#4b5563' : '#d1d5db'}`
          }}
        >
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
              <h1
                className="text-xl font-semibold mb-2"
                style={{ color: isDark ? '#f9fafb' : '#111827' }}
              >
                Connecting to Google Ads
              </h1>
              <p
                className="text-sm leading-relaxed"
                style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
              >
                {message}
              </p>
            </>
          )}

          {status === 'selecting' && (
            <div className="text-left">
              <div className="text-center mb-6">
                <h1
                  className="text-xl font-semibold mb-2"
                  style={{ color: isDark ? '#f9fafb' : '#111827' }}
                >
                  Select Ad Accounts
                </h1>
                <p style={{ color: isDark ? '#9ca3af' : '#6b7280', fontSize: '14px' }}>
                  Choose which ad accounts you want to connect:
                </p>
              </div>

              <div
                className="mb-6 max-h-[300px] overflow-y-auto"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: isDark ? '#4b5563 #1f2937' : '#d1d5db #f3f4f6'
                }}
              >
                {availableAccounts.map(account => {
                  const isSelected = selectedAccountIds.has(account.id);
                  return (
                    <div
                      key={account.id}
                      onClick={() => toggleAccountSelection(account.id)}
                      className="flex items-center p-3 rounded-lg mb-2 cursor-pointer transition-all"
                      style={{
                        border: `1px solid ${isSelected
                          ? (isDark ? '#9ca3af' : '#111827')
                          : (isDark ? '#374151' : '#e5e7eb')
                        }`,
                        background: isSelected
                          ? (isDark ? '#374151' : '#f3f4f6')
                          : (isDark ? '#1f2937' : 'white')
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="mr-3 cursor-pointer"
                        style={{
                          width: '18px',
                          height: '18px',
                          accentColor: '#111827'
                        }}
                      />
                      <div className="flex-1">
                        <div
                          className="font-medium text-sm mb-0.5"
                          style={{ color: isDark ? '#f9fafb' : '#111827' }}
                        >
                          {account.name}
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
                        >
                          {account.id}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleConfirmSelection}
                disabled={selectedAccountIds.size === 0}
                className="w-full h-10 px-4 rounded-lg text-sm font-medium transition-all text-white"
                style={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #111827',
                  boxShadow: 'inset 0 -3px 2px rgba(0, 0, 0, 0.4), inset 0 2px 0.4px rgba(255, 255, 255, 0.14)',
                  opacity: selectedAccountIds.size === 0 ? 0.5 : 1,
                  cursor: selectedAccountIds.size === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                {getButtonText()}
              </button>
            </div>
          )}

          {status === 'saving' && (
            <>
              <div className="flex items-center justify-center mx-auto mb-6">
                <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none">
                  <defs>
                    <linearGradient id="spinner-gradient-2" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#E11D48" />
                      <stop offset="40%" stopColor="#EC4899" />
                      <stop offset="70%" stopColor="#F87171" />
                      <stop offset="100%" stopColor="#E8795A" />
                    </linearGradient>
                  </defs>
                  <circle cx="12" cy="12" r="9" stroke="url(#spinner-gradient-2)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="45 15" />
                </svg>
              </div>
              <h1
                className="text-xl font-semibold mb-2"
                style={{ color: isDark ? '#f9fafb' : '#111827' }}
              >
                Connecting Account
              </h1>
              <p
                className="text-sm leading-relaxed"
                style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
              >
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
              <h1
                className="text-xl font-semibold mb-2"
                style={{ color: isDark ? '#f9fafb' : '#111827' }}
              >
                Connection Complete!
              </h1>
              <p
                className="text-sm leading-relaxed"
                style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
              >
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
              <h1
                className="text-xl font-semibold mb-2"
                style={{ color: isDark ? '#f9fafb' : '#111827' }}
              >
                Connection Failed
              </h1>
              <p
                className="text-sm leading-relaxed"
                style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
              >
                {message}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
