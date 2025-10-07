import React, { useState, useEffect } from 'react';
import { Check, X, Eye, Package, Calendar, User, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import Modal from '@/components/Modal';

interface ProductImage {
  id: string;
  url: string;
  type: string;
  display_order: number;
}

interface ProductCreative {
  id: string;
  type: string;
  url: string;
  headline?: string;
  description?: string;
  ad_copy?: string;
  is_inspiration: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  supplier_price: number;
  recommended_retail_price: number;
  source: string;
  approval_status: string;
  created_at: string;
  created_by: string;
  external_id?: string;
  images?: ProductImage[];
  creatives?: ProductCreative[];
  creator?: {
    email: string;
    name: string;
  };
}

export default function ProductApprovals() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  useEffect(() => {
    fetchProducts();
  }, [filter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('approval_status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const productsWithDetails = await Promise.all(
        (data || []).map(async (product) => {
          const [imagesRes, creativesRes, creatorRes] = await Promise.all([
            supabase
              .from('product_images')
              .select('*')
              .eq('product_id', product.id)
              .order('display_order'),
            supabase
              .from('product_creatives')
              .select('*')
              .eq('product_id', product.id),
            supabase
              .from('user_profiles')
              .select('email, name')
              .eq('user_id', product.created_by)
              .maybeSingle()
          ]);

          return {
            ...product,
            images: imagesRes.data || [],
            creatives: creativesRes.data || [],
            creator: creatorRes.data || null
          };
        })
      );

      setProducts(productsWithDetails);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          approval_status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (error) throw error;

      toast.success('Product approved successfully');
      fetchProducts();
      setSelectedProduct(null);
    } catch (error) {
      console.error('Error approving product:', error);
      toast.error('Failed to approve product');
    }
  };

  const handleReject = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ approval_status: 'rejected' })
        .eq('id', productId);

      if (error) throw error;

      toast.success('Product rejected');
      fetchProducts();
      setSelectedProduct(null);
    } catch (error) {
      console.error('Error rejecting product:', error);
      toast.error('Failed to reject product');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getSourceBadge = (source: string) => {
    const styles = {
      ai_agent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      manual: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      csv: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      api: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[source as keyof typeof styles] || styles.manual}`}>
        {source.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Product Approvals
        </h1>
        <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
          Review and approve products imported by AI agent or added manually
        </p>
      </div>

      <div className="flex items-center gap-3 mb-8">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              filter === status
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-16 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            No products found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Try adjusting your filter or add new products
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Pricing
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images[0].url}
                            alt={product.name}
                            className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white truncate">
                            {product.name}
                          </div>
                          {product.external_id && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                              ID: {product.external_id}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {product.category}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          ${product.recommended_retail_price?.toFixed(2) || 'N/A'}
                        </div>
                        {product.supplier_price && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Cost: ${product.supplier_price.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getSourceBadge(product.source)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(product.approval_status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(product.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedProduct(product)}
                          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {product.approval_status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(product.id)}
                              className="p-2 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20"
                              title="Approve"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(product.id)}
                              className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedProduct && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedProduct(null)}
          title={selectedProduct.name}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <div className="mt-1">{getStatusBadge(selectedProduct.approval_status)}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Source</label>
                <div className="mt-1">{getSourceBadge(selectedProduct.source)}</div>
              </div>
            </div>

            {selectedProduct.description && (
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{selectedProduct.description}</p>
              </div>
            )}

            {selectedProduct.images && selectedProduct.images.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Images ({selectedProduct.images.length})
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {selectedProduct.images.slice(0, 6).map((img) => (
                    <img
                      key={img.id}
                      src={img.url}
                      alt={img.type}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                  ))}
                </div>
              </div>
            )}

            {selectedProduct.creatives && selectedProduct.creatives.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Creatives ({selectedProduct.creatives.length})
                </label>
                <div className="space-y-2">
                  {selectedProduct.creatives.slice(0, 3).map((creative) => (
                    <div key={creative.id} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {creative.type.toUpperCase()}
                        </span>
                        {creative.is_inspiration && (
                          <span className="text-xs text-blue-600 dark:text-blue-400">Inspiration</span>
                        )}
                      </div>
                      {creative.headline && (
                        <p className="text-sm text-gray-900 dark:text-white font-medium">{creative.headline}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedProduct.approval_status === 'pending' && (
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => handleApprove(selectedProduct.id)}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={() => handleReject(selectedProduct.id)}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Reject
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
