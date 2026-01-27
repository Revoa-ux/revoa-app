import React, { useState, useEffect, useRef } from 'react';
import { X, Store, Loader2, Package, CheckCircle, Plus, RefreshCw, ArrowLeft, AlertTriangle, ArrowRight } from 'lucide-react';
import { toast } from '../../lib/toast';
import { validateStoreUrl } from '@/lib/shopify/validation';
import { getShopifyAuthUrl } from '@/lib/shopify/auth';
import { createShopifyProduct } from '@/lib/shopify/api';
import { updateProduct, updateProductVariant, getProductWithVariants } from '@/lib/shopify/graphql';
import { useClickOutside } from '@/lib/useClickOutside';
import { Quote, VariantMapping, ShopifyProductWithVariants, FinalVariant, NewQuoteVariant } from '@/types/quotes';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ShopifyProductPicker } from './ShopifyProductPicker';
import VariantMappingModal from './VariantMappingModal';

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
  const [selectedProductWithVariants, setSelectedProductWithVariants] = useState<ShopifyProductWithVariants | null>(null);
  const [showVariantMapping, setShowVariantMapping] = useState(false);
  const [pendingMappings, setPendingMappings] = useState<VariantMapping[] | null>(null);
  const [criticalError, setCriticalError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

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
        const errorMsg = error instanceof Error ? error.message : 'Failed to check connection';
        toast.error(`Connection check failed: ${errorMsg}`);
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
              const errorMsg = error.message || 'Unknown error occurred';
              toast.error(`Failed to save Shopify connection: ${errorMsg}`);
              return;
            }
            
            // Connect the quote to Shopify
            onConnect(quote.id);
            onClose();
            toast.success('Successfully connected to Shopify');
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
            toast.error(`Failed to save Shopify connection: ${errorMsg}`);
          }
        };
        
        persistToken();
      } else if (event.data.type === 'shopify:error') {
        const errorMsg = event.data.error || 'Authentication failed';
        setStep('input');
        setValidationError(errorMsg);
        toast.error(`Failed to connect to Shopify: ${errorMsg}`);
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
      const errorMsg = error instanceof Error ? error.message : 'Failed to connect to Shopify store';
      setValidationError(errorMsg);
      setStep('input');
      toast.error(`Connection failed: ${errorMsg}`);
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
          body_html: '',
          vendor: 'Revoa',
          product_type: 'Imported Product',
          options: [
            {
              name: 'Quantity',
              values: quote.variants.map(v => {
                const unitText = v.packSize === 1 ? 'unit' : 'units';
                return `${v.packSize} ${unitText}`;
              })
            }
          ],
          variants: quote.variants.map(variant => {
            const unitText = variant.packSize === 1 ? 'unit' : 'units';
            return {
              option1: `${variant.packSize} ${unitText}`,
              price: (variant.finalVariants?.[0]?.costPerItem || 0).toFixed(2),
              inventory_quantity: 100,
              sku: `${quote.id}-${variant.packSize}`,
            };
          })
        };
      } else if (quote.variants && quote.variants.length === 1) {
        // Single variant - use default
        const variant = quote.variants[0];
        const price = variant.finalVariants?.[0]?.costPerItem || 0;
        productData = {
          title: quote.productName,
          body_html: '',
          vendor: 'Revoa',
          product_type: 'Imported Product',
          variants: [{
            price: price.toFixed(2),
            inventory_quantity: 100,
            sku: `${quote.id}-${variant.packSize}`,
          }]
        };
      } else {
        // No variants from quote
        productData = {
          title: quote.productName,
          body_html: '',
          vendor: 'Revoa',
          product_type: 'Imported Product',
        };
      }

      // Create the product in Shopify with error handling
      let createdProduct;
      try {
        createdProduct = await createShopifyProduct(productData);
        toast.success('Product created in Shopify successfully');
      } catch (productError) {
        const errorMsg = productError instanceof Error
          ? productError.message
          : 'Failed to create product in Shopify';

        toast.error(`Product creation failed: ${errorMsg}`);
        setCriticalError(`Product creation failed: ${errorMsg}`);
        setStep('error');
        setIsSyncing(false);
        return;
      }

      // Validate product was created with an ID
      if (!createdProduct || !createdProduct.id) {
        const errorMsg = 'Product was created but no product ID was returned from Shopify';
        toast.error(errorMsg);
        setCriticalError(errorMsg);
        setStep('error');
        setIsSyncing(false);
        return;
      }

      // Extract the numeric product ID
      const numericProductId = createdProduct.id;

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
        const errorMsg = updateError.message || 'Failed to update quote in database';
        toast.error(`Product created in Shopify but failed to update quote: ${errorMsg}`);
        setIsSyncing(false);
        return;
      }

      onConnect(quote.id);
      toast.success(`Product "${quote.productName}" successfully added to Shopify`);
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error(`Unexpected error: ${errorMessage}`);
      setCriticalError(errorMessage);
      setStep('error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleProductSelection = async (product: any) => {
    if (!product || !existingStore) return;

    setSelectedProduct(product);
    setIsSyncing(true);

    try {
      const fullProduct = await getProductWithVariants(product.id);

      if (!fullProduct || !fullProduct.variants || fullProduct.variants.length === 0) {
        toast.error('Failed to load product variants. Please try another product.');
        setIsSyncing(false);
        return;
      }

      setSelectedProductWithVariants(fullProduct);
      setShowVariantMapping(true);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to load product details';
      toast.error(`Error loading product: ${errorMsg}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const getQuoteVariants = (): (NewQuoteVariant | FinalVariant)[] => {
    if (!quote.variants || quote.variants.length === 0) return [];

    const allVariants: FinalVariant[] = [];

    for (const quoteVariant of quote.variants) {
      if (quoteVariant.finalVariants && quoteVariant.finalVariants.length > 0) {
        allVariants.push(...quoteVariant.finalVariants);
      }
    }

    return allVariants;
  };

  const handleConfirmMapping = async (mappings: VariantMapping[]) => {
    if (!selectedProduct || !existingStore || !selectedProductWithVariants) return;

    setIsSyncing(true);
    try {
      let priceUpdateCount = 0;
      let priceUpdateFailures: string[] = [];

      // Save variant mappings to database and update Shopify prices
      for (const mapping of mappings) {
        const { error: mappingError } = await supabase
          .from('shopify_variant_mappings')
          .upsert({
            quote_id: quote.id,
            user_id: user!.id,
            quote_variant_sku: mapping.quoteVariantSku,
            quote_variant_index: mapping.quoteVariantIndex,
            quote_unit_cost: mapping.quoteUnitCost,
            quote_pack_size: mapping.quotePackSize,
            quote_shipping_rules: mapping.quoteShippingRules,
            shopify_product_id: selectedProduct.id,
            shopify_variant_id: mapping.shopifyVariantId,
            shopify_variant_sku: mapping.shopifyVariantSku,
            shopify_variant_title: mapping.shopifyVariantTitle,
            sync_status: 'synced',
            last_synced_at: new Date().toISOString(),
            intended_selling_price: mapping.intendedSellingPrice,
            price_synced_at: mapping.willUpdatePrice ? new Date().toISOString() : null,
            original_variant_data: {
              sku: mapping.shopifyVariantSku,
              price: mapping.shopifyVariantPrice,
            },
          }, {
            onConflict: 'quote_id,quote_variant_sku',
          });

        if (mappingError) {
          console.error('Failed to save mapping:', mappingError);
        }

        // Update Shopify price if changed
        if (mapping.willUpdatePrice && mapping.intendedSellingPrice) {
          try {
            await updateProductVariant(mapping.shopifyVariantId, {
              price: mapping.intendedSellingPrice.toFixed(2),
            });
            priceUpdateCount++;
          } catch (priceError) {
            console.error('Failed to update price for variant:', mapping.shopifyVariantId, priceError);
            priceUpdateFailures.push(mapping.shopifyVariantTitle);
          }
        }
      }

      const { error: updateError } = await supabase
        .from('product_quotes')
        .update({
          shopify_product_id: selectedProduct.id,
          shopify_sync_status: 'synced',
          shop_domain: existingStore.store_url,
          status: 'synced_with_shopify',
          variant_mappings: mappings,
          last_shopify_sync_at: new Date().toISOString(),
        })
        .eq('id', quote.id);

      if (updateError) {
        const errorMsg = updateError.message || 'Failed to update quote in database';
        toast.error(`Product synced but failed to update quote: ${errorMsg}`);
        return;
      }

      // Show success message with price update info
      let successMessage = `Successfully synced ${mappings.length} variant${mappings.length > 1 ? 's' : ''} to "${selectedProduct.title}"`;
      if (priceUpdateCount > 0) {
        successMessage += ` and updated ${priceUpdateCount} price${priceUpdateCount > 1 ? 's' : ''}`;
      }
      toast.success(successMessage);

      // Show warning for failed price updates
      if (priceUpdateFailures.length > 0) {
        toast.warning(`Failed to update prices for: ${priceUpdateFailures.join(', ')}`);
      }

      onConnect(quote.id);
      setShowVariantMapping(false);
      onClose();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to sync variants';
      toast.error(`Sync failed: ${errorMsg}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4" onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}>
        <div
          className={`relative bg-white dark:bg-dark rounded-xl w-full ${
            step === 'product_picker' ? 'max-w-2xl' : 'max-w-md'
          }`}
          ref={modalRef}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`border-b border-gray-200 dark:border-[#3a3a3a] ${
            step === 'product_picker' ? 'px-4 py-3' : 'px-6 py-4'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className={`font-semibold text-gray-900 dark:text-white ${
                step === 'product_picker' ? 'text-base' : 'text-lg'
              }`}>
                {step === 'product_picker' ? 'Select Shopify Product' : 'Connect Shopify Store'}
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className={step === 'product_picker' ? 'p-4' : 'p-6'}>
            {step === 'checking' ? (
              <div className="space-y-4 py-4">
                <div className="h-4 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse w-1/2"></div>
                <div className="h-4 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse w-5/6"></div>
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
                  className="group w-full p-5 bg-gradient-to-br from-white to-gray-50 dark:from-[#2a2a2a] dark:to-[#2a2a2a]/50 border-2 border-gray-200 dark:border-[#3a3a3a] hover:border-rose-300 dark:hover:border-rose-600 rounded-xl transition-all text-left"
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
                  className="group w-full p-5 bg-gradient-to-br from-white to-gray-50 dark:from-[#2a2a2a] dark:to-[#2a2a2a]/50 border-2 border-gray-200 dark:border-[#3a3a3a] hover:border-rose-300 dark:hover:border-rose-600 rounded-xl transition-all text-left"
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
              <div className="flex flex-col" style={{ height: 'min(550px, 70vh)' }}>
                <div className="flex items-center gap-2 mb-2.5 flex-shrink-0">
                  <button
                    onClick={() => setStep('method_select')}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Select Product</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Choose which product to update with this quote</p>
                  </div>
                </div>
                <div className="flex-1 -mx-4 -mb-4 min-h-0 overflow-hidden">
                  <ShopifyProductPicker
                    onSelect={handleProductSelection}
                    onCancel={() => setStep('method_select')}
                  />
                </div>
              </div>
            ) : step === 'sync' ? (
              <div className="space-y-6">
                <div className="bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Package className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">{quote.productName}</p>
                      {quote.variants && quote.variants.length > 0 && (
                        <div className="space-y-1">
                          {quote.variants.map((variant, idx) => {
                            const price = variant.finalVariants?.[0]?.costPerItem || 0;
                            const unitText = variant.packSize === 1 ? 'unit' : 'units';
                            return (
                              <p key={idx} className="text-xs text-gray-600 dark:text-gray-400">
                                {variant.packSize} {unitText}: ${price.toFixed(2)}/item
                              </p>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4">
                  <p className="text-sm text-rose-900 dark:text-rose-300">
                    <strong>Note:</strong> This will create a new product in your Shopify store with the pricing information from this quote.
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setStep('method_select')}
                    disabled={isSyncing}
                    className="btn btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSyncProduct}
                    disabled={isSyncing}
                    className="btn btn-primary flex-1 group"
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="btn-icon animate-spin" />
                        Adding Product...
                      </>
                    ) : (
                      <>
                        Add to Shopify
                        <ArrowRight className="btn-icon btn-icon-arrow" />
                      </>
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
                    className="btn btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isValidating || !shopDomain.trim()}
                    className="btn btn-primary flex-1 group"
                  >
                    {isValidating ? (
                      <>
                        <Loader2 className="btn-icon animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        Connect Store
                        <ArrowRight className="btn-icon btn-icon-arrow" />
                      </>
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
                    className="btn btn-secondary flex-1"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCriticalError(null);
                      setStep('method_select');
                    }}
                    className="btn btn-primary flex-1 group"
                  >
                    Try Again
                    <ArrowRight className="btn-icon btn-icon-arrow" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="h-6 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse w-2/3 mx-auto mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse w-4/5 mx-auto"></div>
                <div className="h-4 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse w-3/4 mx-auto"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showVariantMapping && selectedProductWithVariants && (
        <VariantMappingModal
          isOpen={showVariantMapping}
          onClose={() => {
            setShowVariantMapping(false);
            setSelectedProduct(null);
            setSelectedProductWithVariants(null);
          }}
          onConfirm={handleConfirmMapping}
          quoteId={quote.id}
          quoteVariants={getQuoteVariants()}
          shopifyProduct={selectedProductWithVariants}
        />
      )}
    </div>
  );
};

export default ShopifyConnectModal;
export { ShopifyConnectModal };
