import React, { useState, useEffect, useRef } from 'react';
import { X, Store, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { validateStoreUrl } from '@/lib/shopify/validation';
import { getShopifyAuthUrl } from '@/lib/shopify/auth';
import { useClickOutside } from '@/lib/useClickOutside';

interface ShopifyConnectModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const ShopifyConnectModal: React.FC<ShopifyConnectModalProps> = ({ 
  onClose,
  onSuccess,
  onError
}) => {
  const [shopDomain, setShopDomain] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [step, setStep] = useState<'input' | 'connecting'>('input');
  
  const modalRef = useRef<HTMLDivElement>(null);
  useClickOutside(modalRef, onClose);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Set up OAuth listener
  useEffect(() => {
    const messageHandler = (event: MessageEvent) => {
      if (event.data.type === 'shopify:success') {
        console.log('OAuth success:', event.data);
        if (onSuccess) onSuccess();
        onClose();
        toast.success('Successfully connected to Shopify');
      } else if (event.data.type === 'shopify:error') {
        console.error('OAuth error:', event.data);
        setStep('input');
        setValidationError(event.data.error);
        if (onError) onError(event.data.error);
        toast.error('Failed to connect to Shopify store');
      }
    };

    window.addEventListener('message', messageHandler);
    return () => window.removeEventListener('message', messageHandler);
  }, [onSuccess, onError, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setIsValidating(true);

    try {
      // Validate store URL format
      const validation = validateStoreUrl(shopDomain);
      
      if (!validation.success) {
        setValidationError(validation.error);
        setIsValidating(false);
        return;
      }

      const validDomain = validation.data;
      setShopDomain(validDomain);

      // Check if store exists
      const storeUrl = `https://${validDomain}`;
      const response = await fetch(storeUrl);

      if (!response.ok) {
        throw new Error('Store not found');
      }

      // Get auth URL and open in new tab
      const authUrl = await getShopifyAuthUrl(validDomain);
      
      // Open auth in new window
      const width = 800;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const authWindow = window.open(
        authUrl,
        'shopify-auth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!authWindow) {
        throw new Error('Please allow pop-ups for this site to connect your Shopify store');
      }

      setStep('connecting');

      // Check if window was closed before completing auth
      const checkTabClosed = setInterval(() => {
        if (authWindow.closed && step !== 'input') {
          clearInterval(checkTabClosed);
          setStep('input');
          setValidationError('Authentication window was closed. Please try again.');
        }
      }, 1000);

      return () => clearInterval(checkTabClosed);

    } catch (error) {
      console.error('Error connecting to Shopify:', error);
      setValidationError(
        error instanceof Error ? error.message : 'Failed to connect to Shopify store'
      );
      setStep('input');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl w-full max-w-md" ref={modalRef}>
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Connect Shopify Store</h3>
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6">
            {step === 'input' ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="shopDomain" className="block text-sm font-medium text-gray-700 mb-2">
                    Store URL
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="shopDomain"
                      value={shopDomain}
                      onChange={(e) => {
                        setShopDomain(e.target.value);
                        setValidationError(null);
                      }}
                      placeholder="your-store.myshopify.com"
                      className={`w-full px-4 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        validationError ? 'border-red-300' : 'border-gray-200'
                      }`}
                      disabled={isValidating}
                    />
                    {isValidating && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                      </div>
                    )}
                  </div>
                  {validationError && (
                    <p className="mt-2 text-sm text-red-600">{validationError}</p>
                  )}
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Store className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="text-sm text-gray-600">
                      <p className="font-medium text-gray-900 mb-1">Store Requirements</p>
                      <ul className="space-y-1">
                        <li>• Must be on a paid Shopify plan</li>
                        <li>• Admin access is required</li>
                        <li>• Store must be active and not frozen</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isValidating || !shopDomain.trim()}
                    className="flex-1 px-4 py-2 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isValidating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      'Connect Store'
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Connecting to Shopify</h3>
                <p className="text-sm text-gray-600">
                  Please complete the authentication process in the popup window.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopifyConnectModal;