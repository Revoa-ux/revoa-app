import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { handleCallback } from '@/lib/shopify/auth';

const CallbackHandler: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const processCallback = async () => {
      try {
        console.debug('Processing callback with params:', Object.fromEntries(searchParams));
        
        // Get and validate required parameters
        const shop = searchParams.get('shop');
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const hmac = searchParams.get('hmac');

        if (!shop || !code || !state || !hmac) {
          throw new Error('Missing required parameters');
        }

        await handleCallback(searchParams);

        // Show success state
        setStatus('success');
        toast.success('Successfully connected to Shopify');

        // If in popup, send message to parent and close
        if (window.opener) {
          try {
            // Send success message
            window.opener.postMessage({ type: 'shopify:success', shop }, '*');
            console.log('Sent success message to parent window');

            // Also try to trigger a reload on the parent
            if (window.opener.location) {
              window.opener.location.reload();
            }
          } catch (error) {
            console.error('Error communicating with parent window:', error);
          }

          // Close popup after delay
          setTimeout(() => {
            window.close();
          }, 1000);
        } else {
          // Navigate to next step
          navigate('/onboarding/ads', { replace: true });
        }
      } catch (error) {
        console.error('Callback processing error:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Failed to connect to Shopify';
        setErrorMessage(errorMessage);
        setStatus('error');
        
        // If in popup, send error to parent
        if (window.opener) {
          window.opener.postMessage({ type: 'shopify:error', error: errorMessage }, '*');
          window.close();
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
            <div className="w-12 h-12 rounded-full bg-red-100 mx-auto mb-4 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
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
              <div className="w-12 h-12 rounded-full bg-green-100 mx-auto mb-4 flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-2xl font-medium text-gray-900 mb-2">Connection Successful</h2>
              <p className="text-sm text-gray-600">Your Shopify store has been connected.</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CallbackHandler;