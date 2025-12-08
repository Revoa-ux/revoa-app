import React, { useState, useEffect, useRef } from 'react';
import { X, Store, Loader2, Package, CheckCircle, Plus, RefreshCw, ArrowLeft, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { validateStoreUrl } from '@/lib/shopify/validation';
import { getShopifyAuthUrl } from '@/lib/shopify/auth';
import { createShopifyProduct } from '@/lib/shopify/api';
import { updateProduct } from '@/lib/shopify/graphql';
import { useClickOutside } from '@/lib/useClickOutside';
import { Quote } from '@/types/quotes';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ShopifyProductPicker } from './ShopifyProductPicker';

type SyncMethod = 'new' | 'existing' | null;

interface ShopifyConnectModalProps {
  quote: Quote;
  onClose: () => void;
  onConnect: (quoteId: string) => void;
  initialMethod?: SyncMethod;
}

const ShopifyConnectModal: React.FC<ShopifyConnectModalProps> = ({
  quote,
  onClose,
  onConnect,
  initialMethod = null
}) => {
  const { user } = useAuth();
  const [shopDomain, setShopDomain] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [step, setStep] = useState<'checking' | 'method_select' | 'input' | 'connecting' | 'sync' | 'product_picker' | 'error'>('checking');
  const [existingStore, setExistingStore] = useState<{ store_url: string; access_token: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMethod, setSyncMethod] = useState<SyncMethod>(initialMethod);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [criticalError, setCriticalError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  useClickOutside(modalRef, onClose);

  // Check if Shopify store is already connected
  useEffect(() => {
    const checkExistingConnection = async () => {
      if (!user?.id) {
        setStep('input');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('shopify_installations')
          .select('store_url, access_token')
          .eq('user_id', user.id)
          .eq('status', 'installed')
          .maybeSingle();

        if (!error && data) {
          setExistingStore(data);
          // If method is pre-selected, go to appropriate step
          if (initialMethod === 'new') {
            setStep('sync');
          } else if (initialMethod === 'existing') {
            setStep('product_picker');
          } else {
            // Show method selector
            setStep('method_select');
          }
        } else {
          setStep('input');
        }
      } catch (error) {
        console.error('Error checking Shopify connection:', error);
        setStep('input');
      }
    };

    checkExistingConnection();
  }, [user?.id, initialMethod]);

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
      if (event.data.type === 'shopify:success' && quote) {
        console.log('OAuth success:', event.data);
        
        // Persist the token in Supabase
        const persistToken = async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session?.user) {
              throw new Error('No authenticated user found');
            }
            
            // Store the installation in Supabase
            const { error } = await supabase
              .from('shopify_installations')
              .upsert({
                user_id: session.user.id,
                store_url: event.data.shop,
                access_token: event.data.accessToken,
                scopes: event.data.scope?.split(',') || [],
                status: 'installed',
                installed_at: new Date().toISOString(),
                last_auth_at: new Date().toISOString(),
                metadata: {
                  install_count: 1,
                  last_install: new Date().toISOString()
                }
              }, {
                onConflict: 'store_url'
              });
            
            if (error) {
              console.error('Error persisting Shopify token:', error);
              toast.error('Failed to save Shopify connection');
              return;
            }
            
            // Connect the quote to Shopify
            onConnect(quote.id);
            onClose();
            toast.success('Successfully connected to Shopify');
          } catch (error) {
            console.error('Error persisting token:', error);
            toast.error('Failed to save Shopify connection');
          }
        };
        
        persistToken();
      } else if (event.data.type === 'shopify:error') {
        console.error('OAuth error:', event.data);
        setStep('input');
        setValidationError(event.data.error);
        toast.error('Failed to connect to Shopify store');
      }
    };

    window.addEventListener('message', messageHandler);
    return () => window.removeEventListener('message', messageHandler);
  }, [onConnect, onClose, quote]);

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

  const handleSyncProduct = async () => {
    if (!existingStore) return;

    setIsSyncing(true);
    try {
      // Prepare product data for Shopify
      // When there are multiple quote variants, we need to create a product with variant options
      let productData: any;

      if (quote.variants && quote.variants.length > 1) {
        // Multiple pricing tiers - create variants with "Quantity" option
        productData = {
          title: quote.productName,
          body_html: `<p>Product sourced from ${quote.platform}</p><p>Original URL: <a href="${quote.productUrl}" target="_blank">${quote.productUrl}</a></p>`,
          vendor: 'Revoa',
          product_type: 'Imported Product',
          options: [
            {
              name: 'Quantity',
              values: quote.variants.map(v => `${v.quantity} pack`)
            }
          ],
          variants: quote.variants.map(variant => ({
            option1: `${variant.quantity} pack`,
            price: variant.costPerItem.toFixed(2),
            inventory_quantity: 100, // Default inventory
            sku: `${quote.id}-${variant.quantity}`,
          }))
        };
      } else if (quote.variants && quote.variants.length === 1) {
        // Single variant - use default
        const variant = quote.variants[0];
        productData = {
          title: quote.productName,
          body_html: `<p>Product sourced from ${quote.platform}</p><p>Original URL: <a href="${quote.productUrl}" target="_blank">${quote.productUrl}</a></p>`,
          vendor: 'Revoa',
          product_type: 'Imported Product',
          variants: [{
            price: variant.costPerItem.toFixed(2),
            inventory_quantity: 100,
            sku: `${quote.id}-${variant.quantity}`,
          }]
        };
      } else {
        // No variants from quote
        productData = {
          title: quote.productName,
          body_html: `<p>Product sourced from ${quote.platform}</p><p>Original URL: <a href="${quote.productUrl}" target="_blank">${quote.productUrl}</a></p>`,
          vendor: 'Revoa',
          product_type: 'Imported Product',
        };
      }

      console.log('[Shopify Sync] Creating product with data:', JSON.stringify(productData, null, 2));

      // Create the product in Shopify with error handling
      let createdProduct;
      try {
        createdProduct = await createShopifyProduct(productData);
        console.log('[Shopify Sync] Product created successfully:', createdProduct);
      } catch (productError) {
        console.error('[Shopify Sync] Failed to create product:', productError);
        const errorMsg = productError instanceof Error
          ? productError.message
          : 'Failed to create product in Shopify';

        setCriticalError(`Product creation failed: ${errorMsg}`);
        setStep('error');
        setIsSyncing(false);
        return;
      }

      // Validate product was created with an ID
      if (!createdProduct || !createdProduct.id) {
        console.error('[Shopify Sync] Product created but no ID returned');
        setCriticalError('Product was created but no product ID was returned from Shopify');
        setStep('error');
        setIsSyncing(false);
        return;
      }

      // Extract the numeric product ID from the GraphQL format
      // GraphQL IDs are in format: gid://shopify/Product/123456789
      const numericProductId = createdProduct.id;

      console.log('[Shopify Sync] Updating quote in database with product ID:', numericProductId);

      // Update the quote in database with the Shopify product information
      const { error: updateError } = await supabase
        .from('product_quotes')
        .update({
          shopify_product_id: numericProductId,
          shopify_status: 'synced',
          shop_domain: existingStore.store_url,
          status: 'synced_with_shopify'
        })
        .eq('id', quote.id);

      if (updateError) {
        console.error('[Shopify Sync] Error updating quote:', updateError);
        toast.error('Product created in Shopify but failed to update quote. Please try syncing again.');
        setIsSyncing(false);
        return;
      }

      console.log('[Shopify Sync] Quote updated successfully');

      onConnect(quote.id);
      toast.success(`Product "${quote.productName}" successfully added to Shopify`);
      onClose();
    } catch (error) {
      console.error('[Shopify Sync] Unexpected error in handleSyncProduct:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setCriticalError(errorMessage);
      setStep('error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!selectedProduct || !existingStore) return;

    setIsSyncing(true);
    try {
      // Prepare update data based on quote variants
      const updateData: any = {};

      // Update pricing based on first variant
      if (quote.variants && quote.variants.length > 0) {
        const firstVariant = quote.variants[0];
        // Get the first variant ID from the selected product
        const firstProductVariant = selectedProduct.variants.edges[0]?.node;

        if (firstProductVariant) {
          updateData.variants = [{
            id: firstProductVariant.id,
            price: firstVariant.costPerItem.toFixed(2)
          }];
        }
      }

      console.log('[Shopify Update] Updating product:', selectedProduct.id, updateData);

      // Update the product in Shopify
      await updateProduct(selectedProduct.id, updateData);

      console.log('[Shopify Update] Product updated successfully');

      // Update quote in database
      const { error: updateError } = await supabase
        .from('product_quotes')
        .update({
          shopify_product_id: selectedProduct.id,
          shopify_status: 'synced',
          shop_domain: existingStore.store_url,
          status: 'synced_with_shopify'
        })
        .eq('id', quote.id);

      if (updateError) {
        console.error('[Shopify Update] Error updating quote in database:', updateError);
        toast.error('Product updated in Shopify but failed to update quote. Please try syncing again.');
        return;
      }

      console.log('[Shopify Update] Quote updated in database successfully');

      onConnect(quote.id);
      toast.success(`Quote pricing synced to "${selectedProduct.title}"`);
      onClose();
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error(
        error instanceof Error
          ? `Failed to update product: ${error.message}`
          : 'Failed to update product in Shopify'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className={`relative bg-white dark:bg-gray-900 rounded-xl w-full ${
          step === 'product_picker' ? 'max-w-2xl' : 'max-w-md'
        }`} ref={modalRef}>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {step === 'product_picker' ? 'Select Shopify Product' : 'Connect Shopify Store'}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6">
            {step === 'checking' ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
                <p className="text-sm text-gray-600 dark:text-gray-400">Checking connection...</p>
              </div>
            ) : step === 'method_select' ? (
              <div className="space-y-4">
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">How would you like to sync this quote?</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Choose whether to create a new product or update an existing one in your Shopify store.</p>
                </div>

                <button
                  onClick={() => {
                    setSyncMethod('new');
                    setStep('sync');
                  }}
                  className="group w-full p-5 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/50 border-2 border-gray-200 dark:border-gray-700 hover:border-rose-300 dark:hover:border-rose-600 rounded-xl transition-all text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Plus className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div className="flex-1">
                      <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Create New Product</h5>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Add this quote as a brand new product in your Shopify store with all pricing details.</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setSyncMethod('existing');
                    setStep('product_picker');
                  }}
                  className="group w-full p-5 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/50 border-2 border-gray-200 dark:border-gray-700 hover:border-rose-300 dark:hover:border-rose-600 rounded-xl transition-all text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <RefreshCw className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Sync to Existing Product</h5>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Update pricing on an existing Shopify product with this quote's details.</p>
                    </div>
                  </div>
                </button>
              </div>
            ) : step === 'product_picker' ? (
              <div className="h-[500px] flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => setStep('method_select')}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Select Product</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Choose which product to update with this quote</p>
                  </div>
                </div>
                <div className="flex-1 -mx-6 -mb-6">
                  <ShopifyProductPicker
                    onSelect={(product) => {
                      setSelectedProduct(product);
                      handleUpdateProduct();
                    }}
                    onCancel={() => setStep('method_select')}
                  />
                </div>
              </div>
            ) : step === 'sync' ? (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-900">Store Connected</p>
                      <p className="text-sm text-green-700 mt-1">{existingStore?.store_url}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-1">Product to Add</p>
                      <p className="text-sm text-gray-700">{quote.productName}</p>
                      {quote.variants && quote.variants.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-gray-500">Pricing Tiers:</p>
                          {quote.variants.map((variant, idx) => (
                            <p key={idx} className="text-xs text-gray-600">
                              Qty {variant.quantity}: ${variant.costPerItem.toFixed(2)}/item
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Note:</strong> This will create a new product in your Shopify store with the pricing information from this quote.
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSyncing}
                    className="flex-1 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSyncProduct}
                    disabled={isSyncing}
                    className="flex-1 px-4 py-2 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding Product...
                      </>
                    ) : (
                      'Add to Shopify'
                    )}
                  </button>
                </div>
              </div>
            ) : step === 'input' ? (
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
            ) : step === 'error' ? (
              <div className="space-y-6">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900 dark:text-red-200">Error Creating Product</p>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">{criticalError}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-900 dark:text-blue-200">
                    <strong>What to check:</strong>
                  </p>
                  <ul className="text-xs text-blue-800 dark:text-blue-300 mt-2 space-y-1 list-disc list-inside">
                    <li>Verify your Shopify store is accessible</li>
                    <li>Check that you have permission to create products</li>
                    <li>Ensure your store isn't frozen or paused</li>
                    <li>Review the error message for specific details</li>
                  </ul>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCriticalError(null);
                      setStep('method_select');
                    }}
                    className="flex-1 px-4 py-2 text-sm text-white bg-gray-900 dark:bg-gray-700 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Connecting to Shopify</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
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
export { ShopifyConnectModal };