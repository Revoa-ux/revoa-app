import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  ExternalLink,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import TableRowSkeleton from '../components/TableRowSkeleton';
import { FilterButton } from '@/components/FilterButton';
import { SubscriptionPageWrapper } from '@/components/subscription/SubscriptionPageWrapper';
import { useIsBlocked } from '@/components/subscription/SubscriptionGate';

interface Product {
  id: string;
  name: string;
  sku: string;
  image_url: string | null;
  status: string;
  cost_per_item: number;
  selling_price: number | null;
  shopify_product_id: string | null;
  created_at: string;
  quote_id: string | null;
}

type FilterOption = 'all' | 'synced' | 'pending' | 'active';
type SortField = 'name' | 'cost_per_item' | 'selling_price' | 'created_at';
type SortDirection = 'asc' | 'desc';

interface Column {
  id: string;
  label: string;
  width: string;
  sortable?: boolean;
  fixed?: boolean;
}

export default function Products() {
  const { user } = useAuth();
  const isBlocked = useIsBlocked();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOption, setFilterOption] = useState<FilterOption>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    field: SortField | null;
    direction: SortDirection;
  }>({
    field: 'created_at',
    direction: 'desc'
  });

  const columns: Column[] = [
    { id: 'name', label: 'Product', width: '35%', sortable: true, fixed: true },
    { id: 'sku', label: 'SKU', width: '15%', sortable: false },
    { id: 'cost_per_item', label: 'Unit Cost', width: '15%', sortable: true },
    { id: 'selling_price', label: 'Selling Price', width: '15%', sortable: true },
    { id: 'status', label: 'Status', width: '10%', sortable: false },
    { id: 'actions', label: '', width: '10%', sortable: false }
  ];

  useEffect(() => {
    if (isBlocked) {
      setLoading(false);
      return;
    }

    const fetchProducts = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        setProducts(data || []);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [user, isBlocked]);

  const handleSort = (field: SortField) => {
    setSortConfig(prevConfig => ({
      field,
      direction: prevConfig.field === field && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getFilteredAndSortedProducts = React.useMemo(() => {
    let filtered = products;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(term) ||
        (product.sku && product.sku.toLowerCase().includes(term))
      );
    }

    switch (filterOption) {
      case 'synced':
        filtered = filtered.filter(product => product.shopify_product_id);
        break;
      case 'pending':
        filtered = filtered.filter(product => !product.shopify_product_id);
        break;
      case 'active':
        filtered = filtered.filter(product => product.status === 'active');
        break;
    }

    if (sortConfig.field) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortConfig.field as keyof Product];
        const bValue = b[sortConfig.field as keyof Product];

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        return sortConfig.direction === 'asc'
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      });
    }

    return filtered;
  }, [products, searchTerm, filterOption, sortConfig]);

  const getSortIcon = (columnId: string) => {
    if (sortConfig.field !== columnId) {
      return <ArrowUpDown className="w-4 h-4 text-gray-300 dark:text-gray-600" />;
    }
    return sortConfig.direction === 'asc'
      ? <ArrowUp className="w-4 h-4 text-gray-900 dark:text-white" />
      : <ArrowDown className="w-4 h-4 text-gray-900 dark:text-white" />;
  };

  const getStatusBadge = (product: Product) => {
    if (product.shopify_product_id) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
          <Check className="w-3 h-3 mr-1" />
          Synced
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
        <AlertCircle className="w-3 h-3 mr-1" />
        Pending
      </span>
    );
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return `$${value.toFixed(2)}`;
  };

  const calculateMargin = (cost: number, selling: number | null) => {
    if (!selling || selling === 0) return null;
    return ((selling - cost) / selling) * 100;
  };

  const totalProducts = isBlocked ? '...' : products.length;
  const syncedProducts = isBlocked ? '...' : products.filter(p => p.shopify_product_id).length;
  const avgMargin = isBlocked ? '...' : (products.reduce((sum, p) => {
    const margin = calculateMargin(p.cost_per_item, p.selling_price);
    return sum + (margin || 0);
  }, 0) / (products.filter(p => p.selling_price).length || 1)).toFixed(1);

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-7rem)]">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 font-medium mb-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <SubscriptionPageWrapper>
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
          Products
        </h1>
        <div className="flex items-start sm:items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 sm:mt-0 flex-shrink-0"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {loading && !isBlocked ? 'Loading products...' : `${totalProducts} products in your catalog`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-dark border border-gray-200 dark:border-[#333333]">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-gray-100 dark:bg-[#2a2a2a] rounded-lg">
              <Package className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xs text-gray-500 dark:text-gray-400">Total Products</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {totalProducts}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-dark border border-gray-200 dark:border-[#333333]">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-gray-100 dark:bg-[#2a2a2a] rounded-lg">
              <ShoppingBag className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xs text-gray-500 dark:text-gray-400">Synced with Shopify</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {syncedProducts}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-dark border border-gray-200 dark:border-[#333333]">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-gray-100 dark:bg-[#2a2a2a] rounded-lg">
              <TrendingUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xs text-gray-500 dark:text-gray-400">Avg. Profit Margin</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {isBlocked ? '...' : `${avgMargin}%`}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white whitespace-nowrap">Product Catalog</h2>

          <div className="flex flex-row items-center gap-3">
            <div className="flex-1 sm:flex-initial sm:w-[280px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-[38px] pl-10 pr-10 text-sm bg-white dark:bg-dark border border-gray-200 dark:border-[#333333] rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 focus:border-gray-200 dark:focus:border-gray-700 text-gray-900 dark:text-white"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-full"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <FilterButton
                icon={Filter}
                label="Filter"
                selectedLabel={filterOption === 'all' ? 'All' : filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                isActive={filterOption !== 'all'}
                activeCount={filterOption !== 'all' ? 1 : 0}
                hideLabel="md"
                isOpen={showFilterDropdown}
              />

              {showFilterDropdown && (
                <div className="absolute right-0 mt-2 w-[200px] bg-white dark:bg-dark rounded-lg shadow-lg border border-gray-200 dark:border-[#333333] overflow-hidden z-50">
                  {(['all', 'synced', 'pending', 'active'] as const).map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setFilterOption(option);
                        setShowFilterDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]/50 transition-colors flex items-center justify-between"
                    >
                      <span>{option === 'all' ? 'All Products' : option.charAt(0).toUpperCase() + option.slice(1)}</span>
                      {filterOption === option && <Check className="w-4 h-4 text-green-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#333333] overflow-hidden">
          <div className="relative overflow-x-auto">
            <table className="w-full whitespace-nowrap">
              <thead className="bg-white dark:bg-dark">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.id}
                      className={`sticky top-0 px-4 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-dark border-b border-gray-200 dark:border-[#333333] ${
                        column.fixed ? 'sticky left-0 z-20' : ''
                      }`}
                      style={{ width: column.width }}
                    >
                      {column.sortable ? (
                        <button
                          className="group inline-flex items-center space-x-1"
                          onClick={() => handleSort(column.id as SortField)}
                        >
                          <span>{column.label}</span>
                          <span className="text-gray-400 group-hover:text-gray-500">
                            {getSortIcon(column.id)}
                          </span>
                        </button>
                      ) : (
                        column.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-[#333333]">
                {loading && !isBlocked ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRowSkeleton key={index} index={index} />
                  ))
                ) : isBlocked ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <tr key={index} className="bg-white dark:bg-dark">
                      <td className="px-4 py-4 text-sm sticky left-0 bg-white dark:bg-dark">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-[#2a2a2a] flex-shrink-0 flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                          <div className="text-[13px] font-medium text-gray-400 dark:text-gray-500">...</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">...</td>
                      <td className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">...</td>
                      <td className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">...</td>
                      <td className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">...</td>
                      <td className="px-4 py-4 text-sm"></td>
                    </tr>
                  ))
                ) : getFilteredAndSortedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-12 text-center">
                      <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No products found</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        {searchTerm ? 'Try adjusting your search' : 'Accept a quote to add products'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  getFilteredAndSortedProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="hover:bg-gray-50 dark:hover:bg-[#2a2a2a]/50 bg-white dark:bg-dark"
                    >
                      <td className="px-4 py-4 text-sm sticky left-0 bg-white dark:bg-dark">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-[#2a2a2a] flex-shrink-0">
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[13px] font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                              {product.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {product.sku || '-'}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-white font-medium">
                        {formatCurrency(product.cost_per_item)}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <div>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {formatCurrency(product.selling_price)}
                          </span>
                          {product.selling_price && (
                            <span className={`ml-2 text-xs ${
                              calculateMargin(product.cost_per_item, product.selling_price)! >= 30
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-yellow-600 dark:text-yellow-400'
                            }`}>
                              ({calculateMargin(product.cost_per_item, product.selling_price)?.toFixed(0)}%)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        {getStatusBadge(product)}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        {product.shopify_product_id && (
                          <a
                            href={`https://admin.shopify.com/store/products/${product.shopify_product_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    </SubscriptionPageWrapper>
  );
}
