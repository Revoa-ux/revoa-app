import React, { useState, useEffect } from 'react';
import { Package, Link2, Check, Search, X, Loader2, Info, ArrowRight } from 'lucide-react';
import { toast } from '../../lib/toast';
import { getActiveShopifyInstallation } from '@/lib/shopify/status';
import { getProducts } from '@/lib/shopify/graphql';
import { createQuoteRequest, createBulkQuoteRequests } from '@/lib/quotes';
import { supabase } from '@/lib/supabase';

const PENDING_QUOTE_KEY = 'pending_quote';

interface PendingQuoteData {
  product_url: string;
  product_name: string;
}

interface ProductSetupProps {
  onComplete: (completed: boolean) => void;
  onFinish: () => void;
  storeConnected: boolean;
}

interface ShopifyProduct {
  id: string;
  title: string;
  handle?: string;
  status: string;
  totalInventory?: number;
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        price: string;
        sku: string | null;
      };
    }>;
  };
  images?: {
    edges: Array<{
      node: {
        url: string;
        altText: string | null;
      };
    }>;
  };
}

const ProductSetup: React.FC<ProductSetupProps> = ({ onComplete, onFinish, storeConnected }) => {
  const [option, setOption] = useState<'existing' | 'new' | null>(null);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const [actuallyConnected, setActuallyConnected] = useState(false);
  const [shopDomain, setShopDomain] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);

  const [productUrl, setProductUrl] = useState('');

  useEffect(() => {
    const checkStoreConnection = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setIsCheckingConnection(false);
          return;
        }

        const installation = await getActiveShopifyInstallation(session.user.id);
        setActuallyConnected(!!installation);
        if (installation?.shop_domain) {
          setShopDomain(installation.shop_domain);
        }
      } catch (error) {
        console.error('[ProductSetup] Error checking connection:', error);
        setActuallyConnected(false);
      } finally {
        setIsCheckingConnection(false);
      }
    };

    checkStoreConnection();
  }, []);

  // Check for pending quote from landing page
  useEffect(() => {
    const pendingQuoteStr = localStorage.getItem(PENDING_QUOTE_KEY);
    if (pendingQuoteStr) {
      try {
        const pendingQuote: PendingQuoteData = JSON.parse(pendingQuoteStr);
        if (pendingQuote.product_url) {
          setProductUrl(pendingQuote.product_url);
          setOption('new');
          // Clear the pending quote after loading
          localStorage.removeItem(PENDING_QUOTE_KEY);
        }
      } catch (error) {
        console.error('[ProductSetup] Error parsing pending quote:', error);
      }
    }
  }, []);

  const isStoreConnected = isCheckingConnection ? storeConnected : actuallyConnected;

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const fetchedProducts = await getProducts(250);
      setProducts(fetchedProducts as unknown as ShopifyProduct[]);
      const allIds = new Set(fetchedProducts.map(p => p.id));
      setSelectedProducts(allIds);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products from Shopify');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionSelect = async (selectedOption: 'existing' | 'new') => {
    setOption(selectedOption);
    if (selectedOption === 'existing' && isStoreConnected) {
      setShowProductModal(true);
      if (products.length === 0) {
        await loadProducts();
      }
    }
  };

  const handleToggleProduct = (productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleToggleSelectAll = () => {
    // Check if all filtered products are selected
    const allSelected = filteredProducts.every(p => selectedProducts.has(p.id));

    if (allSelected) {
      // Deselect all filtered products
      setSelectedProducts(prev => {
        const newSet = new Set(prev);
        filteredProducts.forEach(p => newSet.delete(p.id));
        return newSet;
      });
    } else {
      // Select all filtered products
      setSelectedProducts(prev => {
        const newSet = new Set(prev);
        filteredProducts.forEach(p => newSet.add(p.id));
        return newSet;
      });
    }
  };

  const handleSubmitExistingProducts = async () => {
    if (selectedProducts.size === 0) return;

    setIsSubmitting(true);
    try {
      const selectedProductList = products.filter(p => selectedProducts.has(p.id));
      const productsForQuote = selectedProductList.map(p => ({
        id: p.id,
        title: p.title,
        handle: p.handle,
        featuredImage: p.images?.edges[0]?.node ? { url: p.images.edges[0].node.url } : undefined,
        variants: p.variants,
      }));

      const result = await createBulkQuoteRequests(productsForQuote, shopDomain, 'onboarding');

      toast.success(`${result.created} product${result.created > 1 ? 's' : ''} submitted for quoting!`);
      setShowProductModal(false);
      onComplete(true);
    } catch (error) {
      console.error('Error submitting products:', error);
      toast.error('Failed to submit products for quoting');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productUrl.trim()) {
      toast.error('Please enter a product URL');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalUrl = productUrl.trim();
      if (!finalUrl.match(/^https?:\/\//i)) {
        finalUrl = `https://${finalUrl}`;
      }

      let detectedPlatform: 'aliexpress' | 'amazon' | 'other' = 'other';
      if (finalUrl.includes('aliexpress.com')) {
        detectedPlatform = 'aliexpress';
      } else if (finalUrl.includes('amazon.com') || finalUrl.includes('amazon.')) {
        detectedPlatform = 'amazon';
      }

      const urlObj = new URL(finalUrl);
      const productName = urlObj.pathname.split('/').filter(Boolean).pop() || 'New Product';

      await createQuoteRequest({
        productUrl: finalUrl,
        productName: productName.replace(/-/g, ' ').replace(/\.\w+$/, ''),
        platform: detectedPlatform,
        source: 'onboarding',
      });

      toast.success('Quote request submitted successfully!');
      setProductUrl('');
      onComplete(true);
    } catch (error) {
      console.error('Error submitting quote:', error);
      toast.error('Failed to submit quote request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = searchTerm
    ? products.filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.variants.edges.some(v => v.node.sku?.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : products;

  return (
    <div className="max-w-[540px] mx-auto">
      <div className="bg-white dark:bg-[#1f1f1f] rounded-lg shadow-sm border border-gray-200 dark:border-[#3a3a3a] p-6">
        <div className="text-center">
          <h2 className="text-3xl font-medium text-gray-900 dark:text-white mb-3">Request Product Quotes</h2>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Get fulfillment quotes for your products from Revoa.
          </p>
        </div>

        <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg">
          <div className="flex gap-2">
            <Info className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-rose-700 dark:text-rose-300">
              Fulfilling with Revoa gives you complete COGS tracking, profit analytics, and automated inventory management. Without fulfillment, many features will be unavailable.
            </p>
          </div>
        </div>

        <div className="space-y-3 mt-6">
          <div className={`border rounded-lg overflow-hidden transition-all duration-200 ${
            option === 'existing'
              ? 'border-gray-900 dark:border-[#4a4a4a] bg-gray-50/50 dark:bg-[#1f1f1f]/50'
              : 'border-gray-200 dark:border-[#3a3a3a] hover:border-gray-300 dark:hover:border-gray-600'
          }`}>
            <button
              onClick={() => handleOptionSelect('existing')}
              className={`w-full p-4 text-left transition-colors ${
                isStoreConnected ? '' : 'opacity-50 cursor-not-allowed'
              }`}
              disabled={!isStoreConnected}
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-[#1f1f1f] flex items-center justify-center">
                    <Package className="w-5 h-5 text-gray-900 dark:text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-base font-medium text-gray-900 dark:text-white">Quote My Existing Products</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Select products from your Shopify store for Revoa fulfillment.
                  </p>
                  {!isStoreConnected && (
                    <p className="mt-1 text-xs text-red-600">
                      Connect your Shopify store first.
                    </p>
                  )}
                </div>
              </div>
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-[#3a3a3a]"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-2 bg-white dark:bg-[#1f1f1f] text-sm text-gray-500 dark:text-gray-400 rounded-md">or</span>
            </div>
          </div>

          <div className={`border rounded-lg overflow-hidden transition-all duration-200 ${
            option === 'new'
              ? 'border-gray-900 dark:border-[#4a4a4a] bg-gray-50/50 dark:bg-[#1f1f1f]/50'
              : 'border-gray-200 dark:border-[#3a3a3a] hover:border-gray-300 dark:hover:border-gray-600'
          }`}>
            <button
              onClick={() => setOption('new')}
              className="w-full p-4 text-left"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-[#1f1f1f] flex items-center justify-center">
                    <Link2 className="w-5 h-5 text-gray-900 dark:text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-base font-medium text-gray-900 dark:text-white">Start Fresh with a New Product</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Enter a product URL from AliExpress, Amazon, or another supplier.
                  </p>
                </div>
              </div>
            </button>

            {option === 'new' && (
              <div className="px-4 pb-4">
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[#3a3a3a]">
                  <form onSubmit={handleSubmitNewProduct} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Product URL
                      </label>
                      <input
                        type="text"
                        value={productUrl}
                        onChange={(e) => setProductUrl(e.target.value)}
                        placeholder="https://www.aliexpress.com/item/..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-[#3a3a3a] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || !productUrl.trim()}
                      className="btn btn-primary w-full px-5 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                    >
                      {isSubmitting ? (
                        <Loader2 className="btn-icon animate-spin" />
                      ) : (
                        <>
                          <span>Submit Quote Request</span>
                          <ArrowRight className="btn-icon btn-icon-arrow" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showProductModal && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowProductModal(false)} />

          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white dark:bg-[#1f1f1f] rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-[#3a3a3a] flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Select Products for Quoting</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      All products are pre-selected. Deselect any you don't want quoted.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowProductModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search products..."
                      className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#1f1f1f] border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-[#3a3a3a]"
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={handleToggleSelectAll}
                    className="btn btn-secondary px-3 py-2 text-xs font-medium whitespace-nowrap"
                  >
                    {filteredProducts.every(p => selectedProducts.has(p.id)) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
                {isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="w-full p-3 rounded-lg border border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-[#1f1f1f]">
                        <div className="flex items-start gap-3">
                          <div className="w-14 h-14 bg-gray-200 dark:bg-[#3a3a3a] rounded-lg animate-pulse flex-shrink-0" />
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="h-4 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse w-3/4" />
                            <div className="flex items-center gap-2">
                              <div className="h-3 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse w-16" />
                              <div className="h-3 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse w-20" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Package className="w-12 h-12 text-gray-400 mb-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {searchTerm ? 'No products found matching your search' : 'No products found in your store'}
                    </p>
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredProducts.map((product) => {
                      const isSelected = selectedProducts.has(product.id);
                      const firstImage = product.images?.edges[0]?.node;
                      const firstVariant = product.variants.edges[0]?.node;
                      const variantCount = product.variants.edges.length;

                      return (
                        <button
                          key={product.id}
                          onClick={() => handleToggleProduct(product.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            isSelected
                              ? 'bg-rose-50/50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800'
                              : 'border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-[#1f1f1f] hover:bg-gray-50 dark:hover:bg-[#3a3a3a]'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {firstImage?.url ? (
                              <img
                                src={firstImage.url}
                                alt={firstImage.altText || product.title}
                                className="w-14 h-14 object-cover rounded-lg border border-gray-200 dark:border-[#3a3a3a] flex-shrink-0"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    const fallback = document.createElement('div');
                                    fallback.className = 'w-14 h-14 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg border border-gray-200 dark:border-[#4a4a4a] flex items-center justify-center flex-shrink-0';
                                    fallback.innerHTML = '<svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>';
                                    parent.insertBefore(fallback, target);
                                  }
                                }}
                              />
                            ) : (
                              <div className="w-14 h-14 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg border border-gray-200 dark:border-[#4a4a4a] flex items-center justify-center flex-shrink-0">
                                <Package className="w-6 h-6 text-gray-400" />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {product.title}
                                </h4>
                                <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                                  isSelected
                                    ? 'bg-gradient-to-br from-red-500 to-pink-500'
                                    : 'border-2 border-gray-300 dark:border-[#4a4a4a]'
                                }`}>
                                  {isSelected && <Check className="w-3 h-3 text-white" />}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {firstVariant && <span className="font-medium">${firstVariant.price}</span>}
                                <span>-</span>
                                <span>{variantCount} variant{variantCount !== 1 ? 's' : ''}</span>
                                {product.status && (
                                  <>
                                    <span>-</span>
                                    <span className="capitalize">{product.status.toLowerCase()}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-[#2a2a2a] flex-shrink-0 rounded-b-xl">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedProducts.size} of {products.length} products selected
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowProductModal(false)}
                      className="btn btn-ghost px-4 py-2 text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitExistingProducts}
                      disabled={selectedProducts.size === 0 || isSubmitting}
                      className="btn btn-primary group px-5 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <Loader2 className="btn-icon animate-spin" />
                      ) : (
                        <>
                          <span>Submit for Quote</span>
                          <ArrowRight className="btn-icon btn-icon-arrow" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductSetup;
