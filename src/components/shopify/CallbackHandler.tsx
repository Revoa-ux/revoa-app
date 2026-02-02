import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Check, AlertTriangle } from 'lucide-react';
import { toast } from '../../lib/toast';
import { handleCallback } from '@/lib/shopify/auth';

const CallbackHandler: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const processCallback = async () => {
      try {
        console.log('=== SHOPIFY CALLBACK START ===');
        console.log('All URL params:', Object.fromEntries(searchParams));
        console.log('Is popup window:', !!window.opener);

        // Get and validate required parameters
        const shop = searchParams.get('shop');
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const hmac = searchParams.get('hmac');

        console.log('Shop:', shop);
        console.log('Code:', code ? 'present' : 'missing');
        console.log('State:', state);
        console.log('HMAC:', hmac ? 'present' : 'missing');

        if (!shop || !code || !state || !hmac) {
          const missing = [];
          if (!shop) missing.push('shop');
          if (!code) missing.push('code');
          if (!state) missing.push('state');
          if (!hmac) missing.push('hmac');
          throw new Error(`Missing required parameters: ${missing.join(', ')}`);
        }

        console.log('Calling handleCallback...');
        await handleCallback(searchParams);
        console.log('handleCallback completed successfully');

        // Show success state
        setStatus('success');
        toast.success('Successfully connected to Shopify');

        // If in popup, send message to parent and close
        if (window.opener) {
          try {
            // Send success message
            window.opener.postMessage({ type: 'shopify:success', shop }, '*');
            console.log('Sent success message to parent window');

            // Close the popup after a short delay to ensure message is received
            setTimeout(() => {
              console.log('Closing OAuth popup window...');
              window.close();
            }, 1000);
          } catch (error) {
            console.error('Error communicating with parent window:', error);
          }
        } else {
          // Navigate to next step
          navigate('/onboarding/ads', { replace: true });
        }
      } catch (error) {
        console.error('=== CALLBACK ERROR ===');
        console.error('Error details:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'no stack');

        const errorMessage = error instanceof Error ? error.message : 'Failed to connect to Shopify';
        setErrorMessage(errorMessage);
        setStatus('error');

        // If in popup, send error to parent but DON'T close
        if (window.opener) {
          window.opener.postMessage({ type: 'shopify:error', error: errorMessage }, '*');
          console.log('=== ERROR - Window will stay open for debugging ===');
          console.log('Close this window manually when done reviewing logs');
        } else {
          toast.error('Failed to connect Shopify store', {
            description: errorMessage
          });
        }
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 max-w-md w-full">
          <div className="text-center">
            <div className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm mx-auto mb-4" style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)' }}>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: '#F43F5E',
                  boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                }}
              >
                <AlertTriangle className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <h2 className="text-2xl font-medium text-gray-900 mb-2">Connection Failed</h2>
            <p className="text-sm text-gray-600 mb-6">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 text-sm text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        {status === 'loading' ? (
          <>
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-medium text-gray-900 mb-2">
              Connecting to Shopify
            </h2>
            <p className="text-sm text-gray-600">Please wait while we complete the setup...</p>
          </>
        ) : status === 'success' ? (
          <div className="space-y-6">
            <div>
              <div className="w-12 h-12 rounded-full bg-[linear-gradient(135deg,#E11D48_40%,#EC4899_80%,#E8795A_100%)] mx-auto mb-4 flex items-center justify-center">
                <Check className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-medium text-gray-900 mb-2">Installation Complete</h2>
              <p className="text-sm text-gray-600">Your Shopify store has been connected.</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CallbackHandler;
