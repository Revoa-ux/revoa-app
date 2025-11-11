import React, { useState, useRef, useEffect } from 'react';
import {
  Search, Filter, ChevronDown, Check, X, Package, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Plus,
  Minus,
  DollarSign,
  Truck,
  Loader2
} from 'lucide-react';
import { useClickOutside } from '@/lib/useClickOutside';
import { toast } from 'sonner';
import Modal from '@/components/Modal';
import { supabase } from '@/lib/supabase';

type SortField = 'sales' | 'createdAt' | 'cost' | 'recommendedPrice' | 'margin';
type SortDirection = 'asc' | 'desc';

interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  cost: number;
  recommendedPrice: number;
  stock: number;
  pricingTiers?: {
    quantity: number;
    itemCost: number;
    shippingCost: number;
    totalCost: number;
  }[];
}

interface VariantGroup {
  name: string; // e.g., "Size", "Color"
  variants: ProductVariant[];
}

interface Product {
  id: string;
  name: string;
  category: string;
  description?: string;
  image: string;
  images?: string[];
  cost: number;
  recommendedPrice: number;
  stock: number;
  sales: number;
  createdAt: string;
  variantGroups?: VariantGroup[];
}

interface ProductDetailsModalProps {
  product: Product;
  onClose: () => void;
  onAddToShopify: (product: Product) => void;
  importing: boolean;
}

const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({ product, onClose, onAddToShopify, importing }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedVariantGroup, setSelectedVariantGroup] = useState<string | null>(
    product.variantGroups?.[0]?.name || null
  );
  const [expandedVariants, setExpandedVariants] = useState<string[]>([]);

  const handlePrevImage = () => {
    setCurrentImageIndex(prev => 
      prev === 0 ? (product.images?.length || 1) - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex(prev => 
      prev === (product.images?.length || 1) - 1 ? 0 : prev + 1
    );
  };

  const toggleVariantExpansion = (variantId: string) => {
    setExpandedVariants(prev =>
      prev.includes(variantId)
        ? prev.filter(id => id !== variantId)
        : [...prev, variantId]
    );
  };

  // Mock pricing tiers for demonstration
  const defaultPricingTiers = [
    { quantity: 1, itemCost: 15, shippingCost: 5, totalCost: 20 },
    { quantity: 2, itemCost: 14, shippingCost: 4.5, totalCost: 37 },
    { quantity: 4, itemCost: 13, shippingCost: 4, totalCost: 68 },
    { quantity: 6, itemCost: 12, shippingCost: 3.5, totalCost: 93 }
  ];

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Product Details"
      maxWidth="max-w-5xl"
    >
      <div className="space-y-6">
        <div className="flex gap-6">
          {/* Image Gallery */}
          <div className="w-1/3">
            <div className="relative h-[300px] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
              <img
                src={product.images?.[currentImageIndex] || product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {product.images && product.images.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/90 dark:bg-gray-800/90 rounded-full hover:bg-white dark:hover:bg-gray-700 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-900 dark:text-white" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/90 dark:bg-gray-800/90 rounded-full hover:bg-white dark:hover:bg-gray-700 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-900 dark:text-white" />
                  </button>
                </>
              )}
            </div>
            {product.images && product.images.length > 1 && (
              <div className="flex gap-2 mt-4">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      currentImageIndex === index ? 'border-primary-500' : 'border-transparent'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="w-2/3 space-y-6">
            <div>
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">{product.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{product.description}</p>
            </div>

            {/* Variant Groups Navigation */}
            {product.variantGroups && product.variantGroups.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  {product.variantGroups.map(group => (
                    <button
                      key={group.name}
                      onClick={() => setSelectedVariantGroup(group.name)}
                      className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                        selectedVariantGroup === group.name
                          ? 'bg-gray-900 dark:bg-gray-700 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {group.name}
                    </button>
                  ))}
                </div>

                {/* Variant Pricing Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Variant</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Item</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Shipping</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {product.variantGroups
                          ?.find(g => g.name === selectedVariantGroup)
                          ?.variants.map((variant) => (
                            <React.Fragment key={variant.id}>
                              <tr 
                                onClick={() => toggleVariantExpansion(variant.id)}
                                className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                              >
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                  <div className="flex items-center">
                                    <ChevronRight 
                                      className={`w-4 h-4 mr-2 text-gray-400 transition-transform ${
                                        expandedVariants.includes(variant.id) ? 'rotate-90' : ''
                                      }`}
                                    />
                                    {variant.name}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right">
                                  ${variant.cost.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right">
                                  ${(variant.cost * 0.1).toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right">
                                  ${(variant.cost * 1.1).toFixed(2)}
                                </td>
                              </tr>
                              {expandedVariants.includes(variant.id) && (
                                <>
                                  {(variant.pricingTiers || defaultPricingTiers).map((tier, index) => (
                                    <tr 
                                      key={`${variant.id}-${tier.quantity}`}
                                      className="bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700"
                                    >
                                      <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 pl-10">
                                        {tier.quantity} {tier.quantity === 1 ? 'Unit' : 'Units'}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white text-right">
                                        ${tier.itemCost.toFixed(2)}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white text-right">
                                        ${tier.shippingCost.toFixed(2)}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white text-right">
                                        ${tier.totalCost.toFixed(2)}
                                      </td>
                                    </tr>
                                  ))}
                                </>
                              )}
                            </React.Fragment>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  onAddToShopify(product);
                  onClose();
                }}
                disabled={importing}
                className="w-full px-4 py-2 text-sm text-white bg-gray-900 dark:bg-gray-800 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding to Store...
                  </>
                ) : (
                  <>
                    Add to Store
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

const mockProducts = [
  {
    id: '1',
    name: 'Wireless Earbuds Pro',
    category: 'Electronics',
    description: 'Premium wireless earbuds with active noise cancellation, 40-hour battery life, and crystal clear sound quality. Features include touch controls, wireless charging case, and IPX5 water resistance.',
    image: 'https://placehold.co/600x400/e5e7eb/6b7280?text=Wireless+Earbuds',
    images: [
      'https://placehold.co/600x400/e5e7eb/6b7280?text=Wireless+Earbuds',
      'https://placehold.co/600x400/e5e7eb/6b7280?text=View+2',
      'https://placehold.co/600x400/e5e7eb/6b7280?text=View+3'
    ],
    cost: 49.99,
    recommendedPrice: 149.99,
    stock: 256,
    sales: 1243,
    createdAt: '2024-03-01T00:00:00Z',
    variantGroups: [
      {
        name: 'Color',
        variants: [
          {
            id: '1-1',
            name: 'Black',
            sku: 'WEP-BLK',
            cost: 49.99,
            recommendedPrice: 149.99,
            stock: 156,
            pricingTiers: [
              { quantity: 1, itemCost: 49.99, shippingCost: 5.99, totalCost: 55.98 },
              { quantity: 2, itemCost: 47.99, shippingCost: 7.99, totalCost: 103.97 },
              { quantity: 4, itemCost: 45.99, shippingCost: 11.99, totalCost: 195.95 },
              { quantity: 6, itemCost: 43.99, shippingCost: 15.99, totalCost: 279.93 }
            ]
          },
          {
            id: '1-2',
            name: 'White',
            sku: 'WEP-WHT',
            cost: 49.99,
            recommendedPrice: 149.99,
            stock: 100,
            pricingTiers: [
              { quantity: 1, itemCost: 49.99, shippingCost: 5.99, totalCost: 55.98 },
              { quantity: 2, itemCost: 47.99, shippingCost: 7.99, totalCost: 103.97 },
              { quantity: 4, itemCost: 45.99, shippingCost: 11.99, totalCost: 195.95 },
              { quantity: 6, itemCost: 43.99, shippingCost: 15.99, totalCost: 279.93 }
            ]
          }
        ]
      },
      {
        name: 'Features',
        variants: [
          {
            id: '1-3',
            name: 'Standard',
            sku: 'WEP-STD',
            cost: 49.99,
            recommendedPrice: 149.99,
            stock: 100,
            pricingTiers: [
              { quantity: 1, itemCost: 49.99, shippingCost: 5.99, totalCost: 55.98 },
              { quantity: 2, itemCost: 47.99, shippingCost: 7.99, totalCost: 103.97 },
              { quantity: 4, itemCost: 45.99, shippingCost: 11.99, totalCost: 195.95 },
              { quantity: 6, itemCost: 43.99, shippingCost: 15.99, totalCost: 279.93 }
            ]
          },
          {
            id: '1-4',
            name: 'Pro (ANC)',
            sku: 'WEP-PRO',
            cost: 59.99,
            recommendedPrice: 179.99,
            stock: 80,
            pricingTiers: [
              { quantity: 1, itemCost: 59.99, shippingCost: 5.99, totalCost: 65.98 },
              { quantity: 2, itemCost: 57.99, shippingCost: 7.99, totalCost: 123.97 },
              { quantity: 4, itemCost: 55.99, shippingCost: 11.99, totalCost: 235.95 },
              { quantity: 6, itemCost: 53.99, shippingCost: 15.99, totalCost: 339.93 }
            ]
          }
        ]
      }
    ]
  },
  {
    id: '2',
    name: 'Smart Watch Series X',
    category: 'Electronics',
    description: 'Advanced smartwatch with health tracking, ECG monitoring, and always-on display. Features include blood oxygen monitoring, sleep tracking, and 5ATM water resistance.',
    image: 'https://placehold.co/600x400/e5e7eb/6b7280?text=Smart+Watch',
    images: [
      'https://placehold.co/600x400/e5e7eb/6b7280?text=Smart+Watch',
      'https://placehold.co/600x400/e5e7eb/6b7280?text=View+2',
      'https://placehold.co/600x400/e5e7eb/6b7280?text=View+3'
    ],
    cost: 99.99,
    recommendedPrice: 299.99,
    stock: 189,
    sales: 892,
    createdAt: '2024-03-05T00:00:00Z',
    variantGroups: [
      {
        name: 'Size',
        variants: [
          {
            id: '2-1',
            name: '41mm',
            sku: 'SWX-41',
            cost: 99.99,
            recommendedPrice: 299.99,
            stock: 89,
            pricingTiers: [
              { quantity: 1, itemCost: 99.99, shippingCost: 6.99, totalCost: 106.98 },
              { quantity: 2, itemCost: 97.99, shippingCost: 9.99, totalCost: 205.97 },
              { quantity: 4, itemCost: 95.99, shippingCost: 15.99, totalCost: 399.95 },
              { quantity: 6, itemCost: 93.99, shippingCost: 19.99, totalCost: 583.93 }
            ]
          },
          {
            id: '2-2',
            name: '45mm',
            sku: 'SWX-45',
            cost: 109.99,
            recommendedPrice: 329.99,
            stock: 100,
            pricingTiers: [
              { quantity: 1, itemCost: 109.99, shippingCost: 6.99, totalCost: 116.98 },
              { quantity: 2, itemCost: 107.99, shippingCost: 9.99, totalCost: 225.97 },
              { quantity: 4, itemCost: 105.99, shippingCost: 15.99, totalCost: 439.95 },
              { quantity: 6, itemCost: 103.99, shippingCost: 19.99, totalCost: 643.93 }
            ]
          }
        ]
      },
      {
        name: 'Color',
        variants: [
          {
            id: '2-3',
            name: 'Space Gray',
            sku: 'SWX-GRY',
            cost: 99.99,
            recommendedPrice: 299.99,
            stock: 89,
            pricingTiers: [
              { quantity: 1, itemCost: 99.99, shippingCost: 6.99, totalCost: 106.98 },
              { quantity: 2, itemCost: 97.99, shippingCost: 9.99, totalCost: 205.97 },
              { quantity: 4, itemCost: 95.99, shippingCost: 15.99, totalCost: 399.95 },
              { quantity: 6, itemCost: 93.99, shippingCost: 19.99, totalCost: 583.93 }
            ]
          },
          {
            id: '2-4',
            name: 'Silver',
            sku: 'SWX-SLV',
            cost: 99.99,
            recommendedPrice: 299.99,
            stock: 100,
            pricingTiers: [
              { quantity: 1, itemCost: 99.99, shippingCost: 6.99, totalCost: 106.98 },
              { quantity: 2, itemCost: 97.99, shippingCost: 9.99, totalCost: 205.97 },
              { quantity: 4, itemCost: 95.99, shippingCost: 15.99, totalCost: 399.95 },
              { quantity: 6, itemCost: 93.99, shippingCost: 19.99, totalCost: 583.93 }
            ]
          }
        ]
      }
    ]
  }
];

const Products: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    field: SortField;
    direction: SortDirection;
  }>({
    field: 'sales',
    direction: 'desc'
  });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(categoryDropdownRef, () => setShowCategoryDropdown(false));
  useClickOutside(sortDropdownRef, () => setShowSortDropdown(false));

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          images:product_images(*),
          media:product_media(*),
          creatives:product_creatives(*),
          variants:product_variants(*)
        `)
        .eq('approval_status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedProducts = (data || []).map(product => ({
        id: product.id,
        name: product.name,
        category: product.category,
        description: product.description,
        image: product.images?.[0]?.url || 'https://placehold.co/600x400/e5e7eb/6b7280?text=Product+Image',
        images: product.images?.map((img: any) => img.url) || [],
        cost: product.supplier_price || 0,
        recommendedPrice: product.recommended_retail_price || 0,
        stock: 0,
        sales: 0,
        createdAt: product.created_at,
        variantGroups: product.variants?.length > 0 ? [{
          name: 'Variants',
          variants: product.variants.map((v: any) => ({
            id: v.id,
            name: v.name,
            sku: v.sku,
            cost: v.item_cost,
            recommendedPrice: v.recommended_price,
            stock: 0
          }))
        }] : undefined
      }));

      setProducts(transformedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
      setProducts(mockProducts);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToShopify = async (product: Product) => {
    try {
      setImporting(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to add products');
        return;
      }

      const productInput = {
        title: product.name,
        descriptionHtml: product.description || '',
        vendor: 'Revoa',
        productType: product.category,
        status: 'ACTIVE' as const,
        variants: product.variantGroups?.[0]?.variants.map(v => ({
          price: v.recommendedPrice.toString(),
          sku: v.sku,
          inventoryQuantity: v.stock
        })) || [{
          price: product.recommendedPrice.toString(),
          inventoryQuantity: product.stock
        }]
      };

      const mutation = `
        mutation CreateProduct($input: ProductInput!) {
          productCreate(input: $input) {
            product {
              id
              title
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-proxy?endpoint=/graphql.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: mutation,
            variables: { input: productInput }
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add product to Shopify');
      }

      const result = await response.json();
      if (result.data?.productCreate?.userErrors?.length > 0) {
        throw new Error(result.data.productCreate.userErrors[0].message);
      }

      toast.success('Product added to your Shopify store!');
    } catch (error) {
      console.error('Error adding to Shopify:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add product');
    } finally {
      setImporting(false);
    }
  };

  const categories = ['All Categories', 'Electronics', 'Fashion', 'Home', 'Beauty'];

  const sortOptions = [
    { field: 'sales' as const, label: 'Sales' },
    { field: 'createdAt' as const, label: 'Date Added' },
    { field: 'cost' as const, label: 'Cost' },
    { field: 'recommendedPrice' as const, label: 'Sell For' },
    { field: 'margin' as const, label: 'Margin' }
  ];

  const getSortedProducts = (products: typeof mockProducts) => {
    return [...products].sort((a, b) => {
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      
      switch (sortConfig.field) {
        case 'sales':
          return (a.sales - b.sales) * direction;
        case 'createdAt':
          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * direction;
        case 'cost':
          return (a.cost - b.cost) * direction;
        case 'recommendedPrice':
          return (a.recommendedPrice - b.recommendedPrice) * direction;
        case 'margin':
          return (
            ((a.recommendedPrice - a.cost) / a.recommendedPrice -
             (b.recommendedPrice - b.cost) / b.recommendedPrice) * direction
          );
        default:
          return 0;
      }
    });
  };

  const displayProducts = products.length > 0 ? products : mockProducts;

  const filteredProducts = displayProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All Categories' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedProducts = getSortedProducts(filteredProducts);

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-300 dark:text-gray-600" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-gray-900 dark:text-white" />
      : <ArrowDown className="w-4 h-4 text-gray-900 dark:text-white" />;
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div>
        <div className="flex items-center space-x-3 mb-2">
          <h1 className="text-2xl font-normal text-gray-900 dark:text-white">
            Products
          </h1>
          <span className="px-3 py-1 text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full">
            Coming Soon
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Recommended products backed by data from our factory partners in China
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between blur-sm pointer-events-none select-none">
        <div className="flex items-center space-x-4">
          <div className="relative w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 focus:border-gray-200 dark:focus:border-gray-700"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          <div className="relative" ref={categoryDropdownRef}>
            <button
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between min-w-[180px]"
            >
              <div className="flex items-center">
                <Filter className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-gray-700 dark:text-gray-300">{selectedCategory}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {showCategoryDropdown && (
              <div className="absolute z-50 w-[180px] mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      setSelectedCategory(category);
                      setShowCategoryDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <span>{category}</span>
                    {selectedCategory === category && (
                      <Check className="w-4 h-4 text-primary-500" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative" ref={sortDropdownRef}>
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between min-w-[180px]"
            >
              <div className="flex items-center">
                {getSortIcon(sortConfig.field)}
                <span className="text-gray-700 dark:text-gray-300 ml-2">Sort by: {sortOptions.find(opt => opt.field === sortConfig.field)?.label}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {showSortDropdown && (
              <div className="absolute z-50 w-[180px] mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1">
                {sortOptions.map((option) => (
                  <button
                    key={option.field}
                    onClick={() => {
                      setSortConfig(prev => ({
                        field: option.field,
                        direction: prev.field === option.field && prev.direction === 'asc' ? 'desc' : 'asc'
                      }));
                      setShowSortDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <span>{option.label}</span>
                    {sortConfig.field === option.field && (
                      sortConfig.direction === 'asc' ?
                        <ArrowUp className="w-4 h-4 text-primary-500" /> :
                        <ArrowDown className="w-4 h-4 text-primary-500" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : sortedProducts.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No products found</p>
        </div>
      ) : (
        <div className="relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 blur-sm pointer-events-none select-none">
            {Array.from({ length: 9 }).map((_, index) => (
            <div
              key={`placeholder-${index}`}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="relative h-48 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Package className="w-16 h-16 text-gray-300 dark:text-gray-600" />
              </div>

              <div className="p-4">
                <div className="mb-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                  </div>
                  <div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                  </div>
                </div>
              </div>
            </div>
            ))}
          </div>
        </div>
      )}

      {selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToShopify={handleAddToShopify}
          importing={importing}
        />
      )}
    </div>
  );
};

export default Products;