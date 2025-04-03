import React, { useState, useRef, useEffect } from 'react';
import { 
  Search,
  Filter,
  TrendingUp,
  ChevronDown,
  Check,
  X,
  ArrowUpRight,
  ArrowDownRight,
  LineChart,
  Package,
  DollarSign,
  Truck,
  ShoppingCart,
  Percent,
  Calendar,
  RefreshCw,
  Store,
  Link as LinkIcon,
  Plus,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { useClickOutside } from '@/lib/useClickOutside';
import { ExplodingProduct, ProductFilters, SortField, SortDirection } from '@/types/products';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Modal from '@/components/Modal';

const mockProducts: ExplodingProduct[] = [
  {
    id: '1',
    name: 'Smart LED Strip Lights',
    description: 'WiFi-enabled RGB LED strip lights with app control and music sync',
    category: 'Smart Home',
    factoryCost: 8.50,
    shippingCost: 2.50,
    recommendedPrice: 29.99,
    profitMargin: 63.32,
    moq: 100,
    trendStrength: 'viral',
    trendScore: 92,
    salesData: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      units: Math.floor(Math.random() * 500) + 200,
      revenue: Math.floor(Math.random() * 15000) + 5000
    })),
    variants: [
      {
        id: '1-1',
        name: '5M Single Color',
        sku: 'LED-5M-W',
        factoryCost: 8.50,
        shippingCost: 2.50,
        recommendedPrice: 29.99,
        inStock: 1500,
        moq: 100,
        images: [
          'https://images.unsplash.com/photo-1586780845263-44001a0ab4d3',
          'https://images.unsplash.com/photo-1586780847113-8b9e0a416c1e'
        ]
      },
      {
        id: '1-2',
        name: '10M RGB',
        sku: 'LED-10M-RGB',
        factoryCost: 12.75,
        shippingCost: 3.25,
        recommendedPrice: 39.99,
        inStock: 1000,
        moq: 100,
        images: [
          'https://images.unsplash.com/photo-1586780847113-8b9e0a416c1e',
          'https://images.unsplash.com/photo-1586780845263-44001a0ab4d3'
        ]
      }
    ],
    images: [
      'https://images.unsplash.com/photo-1586780845263-44001a0ab4d3',
      'https://images.unsplash.com/photo-1586780847113-8b9e0a416c1e'
    ],
    status: 'active',
    visibility: 'public',
    createdAt: '2024-03-10T00:00:00Z',
    updatedAt: '2024-03-17T00:00:00Z'
  },
  {
    id: '2',
    name: 'Portable Power Station',
    description: '300W portable power station with solar charging capability',
    category: 'Electronics',
    factoryCost: 85.00,
    shippingCost: 15.00,
    recommendedPrice: 249.99,
    profitMargin: 55.20,
    moq: 50,
    trendStrength: 'rising',
    trendScore: 78,
    salesData: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      units: Math.floor(Math.random() * 200) + 50,
      revenue: Math.floor(Math.random() * 50000) + 10000
    })),
    variants: [
      {
        id: '2-1',
        name: '300W Standard',
        sku: 'PWR-300W',
        factoryCost: 85.00,
        shippingCost: 15.00,
        recommendedPrice: 249.99,
        inStock: 500,
        moq: 50,
        images: [
          'https://images.unsplash.com/photo-1618099378810-1fd4c13961d5',
          'https://images.unsplash.com/photo-1618099378777-14b6317d3e1c'
        ]
      }
    ],
    images: [
      'https://images.unsplash.com/photo-1618099378810-1fd4c13961d5',
      'https://images.unsplash.com/photo-1618099378777-14b6317d3e1c'
    ],
    status: 'active',
    visibility: 'public',
    createdAt: '2024-03-12T00:00:00Z',
    updatedAt: '2024-03-17T00:00:00Z'
  }
];

const categories = ['All Categories', 'Smart Home', 'Electronics', 'Fashion', 'Beauty', 'Home & Garden'];
const trendStrengths = ['All Trends', 'viral', 'rising', 'stable', 'declining'];

interface ProductDetailsModalProps {
  product: ExplodingProduct;
  onClose: () => void;
  onAddToStore: (product: ExplodingProduct, mode: 'new' | 'map') => void;
}

const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  product,
  onClose,
  onAddToStore
}) => {
  const [selectedVariant, setSelectedVariant] = useState(product.variants[0].id);
  const [mode, setMode] = useState<'new' | 'map'>('new');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [matchedProducts, setMatchedProducts] = useState<Array<{ id: string; title: string; similarity: number }>>([]);

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMatchedProducts([
        { id: 'sp1', title: 'Similar Product 1', similarity: 92 },
        { id: 'sp2', title: 'Similar Product 2', similarity: 85 },
        { id: 'sp3', title: 'Similar Product 3', similarity: 78 }
      ]);
    } catch (error) {
      toast.error('Failed to search products');
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (mode === 'map' && searchTerm) {
      const debounce = setTimeout(handleSearch, 300);
      return () => clearTimeout(debounce);
    }
  }, [searchTerm, mode]);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Add Product to Store"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6">
        <div className="flex items-start space-x-6">
          <div className="w-40 h-40 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 mb-2">{product.name}</h3>
            <p className="text-sm text-gray-500 mb-4">{product.description}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">Factory Cost</span>
                <p className="text-sm font-medium text-gray-900">{formatCurrency(product.factoryCost)}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Recommended Price</span>
                <p className="text-sm font-medium text-gray-900">{formatCurrency(product.recommendedPrice)}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Profit Margin</span>
                <p className="text-sm font-medium text-gray-900">{product.profitMargin.toFixed(1)}%</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">MOQ</span>
                <p className="text-sm font-medium text-gray-900">{product.moq} units</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center space-x-4 mb-6">
            <button
              onClick={() => setMode('new')}
              className={`flex-1 px-4 py-2 text-sm rounded-lg transition-colors ${
                mode === 'new'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Create New Product
            </button>
            <button
              onClick={() => setMode('map')}
              className={`flex-1 px-4 py-2 text-sm rounded-lg transition-colors ${
                mode === 'map'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <LinkIcon className="w-4 h-4 inline mr-2" />
              Map to Existing Product
            </button>
          </div>

          {mode === 'map' ? (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search your store products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-200"
                />
              </div>

              {isSearching ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-6 h-6 text-gray-400 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Searching products...</p>
                </div>
              ) : matchedProducts.length > 0 ? (
                <div className="space-y-2">
                  {matchedProducts.map((match) => (
                    <button
                      key={match.id}
                      onClick={() => onAddToStore(product, 'map')}
                      className="w-full p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{match.title}</p>
                          <p className="text-xs text-gray-500">{match.similarity}% match</p>
                        </div>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchTerm && (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">No matching products found</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-4">Product Settings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Location</label>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm font-medium text-gray-900">Revoa Warehouse</p>
                      <p className="text-xs text-gray-500">Guangzhou, China</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Inventory Sync</label>
                    <select
                      className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-200"
                    >
                      <option value="real_time">Real-time sync</option>
                      <option value="daily">Daily sync</option>
                      <option value="manual">Manual sync</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-4">Pricing Rules</h4>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <select
                      className="flex-1 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-200"
                    >
                      <option value="fixed">Fixed markup</option>
                      <option value="percentage">Percentage markup</option>
                      <option value="margin">Target margin</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Enter value"
                      className="w-32 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-200"
                    />
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Final Price</span>
                      <span className="font-medium text-gray-900">{formatCurrency(product.recommendedPrice)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-gray-500">Profit Margin</span>
                      <span className="font-medium text-gray-900">{product.profitMargin.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onAddToStore(product, mode)}
            className="px-4 py-2 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
          >
            {mode === 'new' ? 'Add to Store' : 'Map Product'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default function ExplodingProducts() {
  const [products, setProducts] = useState<ExplodingProduct[]>(mockProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<ProductFilters>({});
  const [sortConfig, setSortConfig] = useState<{
    field: SortField;
    direction: SortDirection;
  }>({
    field: 'trendScore',
    direction: 'desc'
  });
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedTrend, setSelectedTrend] = useState('All Trends');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showTrendDropdown, setShowTrendDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ExplodingProduct | null>(null);

  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const trendDropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(categoryDropdownRef, () => setShowCategoryDropdown(false));
  useClickOutside(trendDropdownRef, () => setShowTrendDropdown(false));

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Products refreshed');
    } catch (error) {
      toast.error('Failed to refresh products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToStore = async (product: ExplodingProduct, mode: 'new' | 'map') => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success(
        mode === 'new' 
          ? 'Product added to store successfully' 
          : 'Product mapped successfully'
      );
      
      setSelectedProduct(null);
    } catch (error) {
      toast.error(
        mode === 'new'
          ? 'Failed to add product to store'
          : 'Failed to map product to store'
      );
    }
  };

  const filteredProducts = React.useMemo(() => {
    return products
      .filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            product.description.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesCategory = selectedCategory === 'All Categories' || product.category === selectedCategory;
        
        const matchesTrend = selectedTrend === 'All Trends' || product.trendStrength === selectedTrend;
        
        return matchesSearch && matchesCategory && matchesTrend;
      })
      .sort((a, b) => {
        const direction = sortConfig.direction === 'asc' ? 1 : -1;
        
        switch (sortConfig.field) {
          case 'profitMargin':
            return (a.profitMargin - b.profitMargin) * direction;
          case 'createdAt':
            return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * direction;
          case 'trendScore':
            return (a.trendScore - b.trendScore) * direction;
          case 'recommendedPrice':
            return (a.recommendedPrice - b.recommendedPrice) * direction;
          case 'moq':
            return (a.moq - b.moq) * direction;
          default:
            return 0;
        }
      });
  }, [products, searchTerm, selectedCategory, selectedTrend, sortConfig]);

  const getTrendColor = (strength: ExplodingProduct['trendStrength']) => {
    switch (strength) {
      case 'viral':
        return 'text-purple-600 bg-purple-50 border-purple-100';
      case 'rising':
        return 'text-green-600 bg-green-50 border-green-100';
      case 'stable':
        return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'declining':
        return 'text-red-600 bg-red-50 border-red-100';
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-normal text-gray-900 mb-2">
          Exploding Products
        </h1>
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
          <p className="text-sm text-gray-500">
            {isLoading ? 'Updating product data...' : 'Exclusive trending products from our partner factories'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-200"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          <div className="relative" ref={categoryDropdownRef}>
            <button
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between min-w-[180px]"
            >
              <div className="flex items-center">
                <Filter className="w-4 h-4 text-gray-400 mr-2" />
                <span>{selectedCategory}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            
            {showCategoryDropdown && (
              <div className="absolute z-50 w-[180px] mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      setSelectedCategory(category);
                      setShowCategoryDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
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

          <div className="relative" ref={trendDropdownRef}>
            <button
              onClick={() => setShowTrendDropdown(!showTrendDropdown)}
              className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between min-w-[180px]"
            >
              <div className="flex items-center">
                <TrendingUp className="w-4 h-4 text-gray-400 mr-2" />
                <span>{selectedTrend}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            
            {showTrendDropdown && (
              <div className="absolute z-50 w-[180px] mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                {trendStrengths.map((trend) => (
                  <button
                    key={trend}
                    onClick={() => {
                      setSelectedTrend(trend);
                      setShowTrendDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
                  >
                    <span>{trend === 'All Trends' ? trend : trend.charAt(0).toUpperCase() + trend.slice(1)}</span>
                    {selectedTrend === trend && (
                      <Check className="w-4 h-4 text-primary-500" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 transition-all duration-200 group"
          >
            <div className="relative h-48 bg-gray-100">
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 right-4">
                <div className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getTrendColor(product.trendStrength)}`}>
                  {product.trendStrength.charAt(0).toUpperCase() + product.trendStrength.slice(1)}
                </div>
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              <button
                onClick={() => setSelectedProduct(product)}
                className="absolute bottom-4 right-4 px-3 py-1.5 text-xs font-medium text-white bg-gray-900/90 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-800"
              >
                See Details
              </button>
            </div>

            <div className="p-4">
              <div className="mb-3">
                <h3 className="text-sm font-medium text-gray-900 mb-1 line-clamp-1">{product.name}</h3>
                <p className="text-xs text-gray-500">{product.category}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Total Cost</span>
                  <p className="font-medium text-gray-900">
                    {formatCurrency(product.factoryCost + product.shippingCost)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Margin</span>
                  <p className="font-medium text-gray-900">{product.profitMargin.toFixed(1)}%</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs">
                  <div className="text-gray-500">
                    <Calendar className="w-3.5 h-3.5 inline mr-1" />
                    {new Date(product.createdAt).toLocaleDateString()}
                  </div>
                  <div className="text-gray-500">
                    MOQ: {product.moq} units
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <Package className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-500">Try adjusting your filters or search term</p>
        </div>
      )}

      {selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToStore={handleAddToStore}
        />
      )}
    </div>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}