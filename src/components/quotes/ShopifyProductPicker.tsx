import React, { useState, useEffect } from 'react';
import { Search, Loader2, Package, CheckCircle, ChevronRight } from 'lucide-react';
import { getProducts } from '@/lib/shopify/graphql';

interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  status: string;
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        price: string;
        sku: string;
      };
    }>;
  };
  featuredImage?: {
    url: string;
    altText: string;
  };
}

interface ShopifyProductPickerProps {
  onSelect: (product: ShopifyProduct) => void;
  onCancel: () => void;
  selectedProductId?: string;
}

export const ShopifyProductPicker: React.FC<ShopifyProductPickerProps> = ({
  onSelect,
  onCancel,
  selectedProductId
}) => {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ShopifyProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | undefined>(selectedProductId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product =>
        product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.variants.edges.some(v => v.node.sku?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedProducts = await getProducts(250);
      setProducts(fetchedProducts as any);
      setFilteredProducts(fetchedProducts as any);
    } catch (err) {
      console.error('Error fetching Shopify products:', err);
      setError('Failed to load products. Please check your Shopify connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectProduct = () => {
    const product = products.find(p => p.id === selectedId);
    if (product) {
      onSelect(product);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search products by name or SKU..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          />
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Products List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-rose-500 animate-spin mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading products...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Package className="w-12 h-12 text-gray-400 mb-3" />
            <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
            <button
              onClick={fetchProducts}
              className="mt-4 px-4 py-2 text-sm text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Package className="w-12 h-12 text-gray-400 mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">No products found</p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-2 text-sm text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-medium transition-colors"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProducts.map((product) => {
              const isSelected = selectedId === product.id;
              const variantCount = product.variants.edges.length;
              const firstVariant = product.variants.edges[0]?.node;

              return (
                <button
                  key={product.id}
                  onClick={() => setSelectedId(product.id)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all group ${
                    isSelected
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-rose-300 dark:hover:border-rose-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Product Image */}
                    {product.featuredImage ? (
                      <img
                        src={product.featuredImage.url}
                        alt={product.featuredImage.altText || product.title}
                        className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-700 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center flex-shrink-0">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className={`text-sm font-semibold truncate ${
                          isSelected
                            ? 'text-rose-900 dark:text-rose-100'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {product.title}
                        </h3>
                        {isSelected && (
                          <CheckCircle className="w-5 h-5 text-rose-500 dark:text-rose-400 flex-shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {firstVariant && (
                          <span className="font-medium">${firstVariant.price}</span>
                        )}
                        <span>•</span>
                        <span>{variantCount} variant{variantCount !== 1 ? 's' : ''}</span>
                        {product.status && (
                          <>
                            <span>•</span>
                            <span className="capitalize">{product.status}</span>
                          </>
                        )}
                      </div>

                      {firstVariant?.sku && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          SKU: {firstVariant.sku}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSelectProduct}
            disabled={!selectedId || isLoading}
            className="group px-6 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 rounded-lg transition-all active:scale-95 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Select Product
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
