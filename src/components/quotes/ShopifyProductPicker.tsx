import React, { useState, useEffect } from 'react';
import { Search, Loader2, Package, Check, ArrowRight, ArrowLeft } from 'lucide-react';
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
      <div className="px-4 py-3 border-b border-gray-200 dark:border-[#3a3a3a] flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search products by name or SKU..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
        </div>
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Products List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
        {isLoading ? (
          <div className="space-y-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="w-full p-3 rounded-lg border border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-dark"
              >
                <div className="flex items-start gap-2.5">
                  {/* Image Skeleton */}
                  <div className="w-12 h-12 bg-gray-200 dark:bg-[#3a3a3a] rounded-lg animate-pulse flex-shrink-0" />

                  {/* Content Skeleton */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Title */}
                    <div className="h-3.5 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse w-3/4" />

                    {/* Price and variants */}
                    <div className="flex items-center gap-2">
                      <div className="h-3 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse w-14" />
                      <div className="h-3 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse w-16" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Package className="w-12 h-12 text-gray-400 mb-3" />
            <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
            <button
              onClick={fetchProducts}
              className="mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
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
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredProducts.map((product) => {
              const isSelected = selectedId === product.id;
              const variantCount = product.variants.edges.length;
              const firstVariant = product.variants.edges[0]?.node;

              return (
                <button
                  key={product.id}
                  onClick={() => setSelectedId(product.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    isSelected
                      ? 'bg-rose-50/50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800'
                      : 'border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-dark hover:bg-gray-50 dark:hover:bg-[#3a3a3a]'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Product Image */}
                    {product.featuredImage ? (
                      <img
                        src={product.featuredImage.url}
                        alt={product.featuredImage.altText || product.title}
                        className="w-12 h-12 object-cover rounded-lg border border-gray-200 dark:border-[#3a3a3a] flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg border border-gray-200 dark:border-[#4a4a4a] flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 text-gray-400" />
                      </div>
                    )}

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <h3 className={`text-sm font-semibold truncate ${
                          isSelected
                            ? 'text-gray-900 dark:text-white'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {product.title}
                        </h3>
                        {isSelected && (
                          <div className="w-4 h-4 rounded bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
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
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
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
      <div className="border-t border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-[#3a3a3a]/50 px-6 py-4 flex justify-between flex-shrink-0 rounded-b-xl">
        <button
          onClick={onCancel}
          className="btn btn-secondary flex items-center gap-2"
        >
          <ArrowLeft className="btn-icon btn-icon-back w-4 h-4" />
          Cancel
        </button>
        <button
          onClick={handleSelectProduct}
          disabled={!selectedId || isLoading}
          className="btn btn-primary group flex items-center gap-2"
        >
          <span>Map Product</span>
          <ArrowRight className="btn-icon btn-icon-arrow w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
