import React, { useState, useEffect } from 'react';
import { Check, X, Eye, Package, Calendar, User, AlertCircle, Loader2, Download } from 'lucide-react';
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
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getSourceBadge = (source: string) => {
    const styles = {
      ai_agent: 'bg-blue-100 text-blue-800',
      manual: 'bg-gray-100 text-gray-800',
      csv: 'bg-purple-100 text-purple-800',
      api: 'bg-cyan-100 text-cyan-800'
    };

    const labels = {
      ai_agent: 'AI Agent',
      manual: 'Manual',
      csv: 'CSV',
      api: 'API'
    };

    return (
      <span className={`px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${styles[source as keyof typeof styles] || styles.manual}`}>
        {labels[source as keyof typeof labels] || source}
      </span>
    );
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">
          Product Approvals
        </h1>
        <p className="text-gray-600 flex items-center gap-2">
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
                ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
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
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            No products found
          </h3>
          <p className="text-gray-500">
            Try adjusting your filter or add new products
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Margin
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => (
                  <tr
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images[0].url}
                            alt={product.name}
                            className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {product.name}
                          </div>
                          {product.external_id && (
                            <div className="text-xs text-gray-500 font-mono truncate">
                              ID: {product.external_id}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {product.category}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      ${product.recommended_retail_price?.toFixed(2) || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      ${product.supplier_price?.toFixed(2) || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-600">
                      {product.recommended_retail_price && product.supplier_price
                        ? `$${(product.recommended_retail_price - product.supplier_price).toFixed(2)}`
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      {getSourceBadge(product.source)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(product.approval_status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(product.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProduct(product);
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {product.approval_status === 'pending' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApprove(product.id);
                              }}
                              className="p-2 text-green-600 hover:text-green-700 transition-colors rounded-lg hover:bg-green-50"
                              title="Approve"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReject(product.id);
                              }}
                              className="p-2 text-red-600 hover:text-red-700 transition-colors rounded-lg hover:bg-red-50"
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
          title="Product Details"
        >
          <div className="space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Shopify Preview Badge */}
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Shopify Product Preview
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">How this will appear to users once approved</p>
                </div>
              </div>
              {getStatusBadge(selectedProduct.approval_status)}
            </div>

            {/* Shopify Product Page Layout */}
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6 space-y-6">
              {/* Product Title */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {selectedProduct.name}
                </h1>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-gray-900">
                    ${selectedProduct.recommended_retail_price?.toFixed(2) || 'N/A'}
                  </span>
                  {getSourceBadge(selectedProduct.source)}
                </div>
              </div>

              {/* Product Images Gallery */}
              {selectedProduct.images && selectedProduct.images.length > 0 && (
                <div>
                  <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden mb-4 border border-gray-200">
                    <img
                      src={selectedProduct.images[0].url}
                      alt={selectedProduct.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {selectedProduct.images.map((img) => (
                      <div key={img.id} className="aspect-square bg-gray-50 rounded-lg overflow-hidden border border-gray-200 hover:border-gray-400 transition-colors cursor-pointer">
                        <img
                          src={img.url}
                          alt={img.type}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Description */}
              {selectedProduct.description && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
                    Product Description
                  </h2>
                  <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selectedProduct.description}
                  </div>
                </div>
              )}

              {/* Product GIFs/Media in Description */}
              {selectedProduct.creatives && selectedProduct.creatives.filter(c => c.type === 'gif' || (c.type === 'ad' && c.url?.includes('.gif'))).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-gray-900">Product Features</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedProduct.creatives
                      .filter(c => c.type === 'gif' || (c.type === 'ad' && c.url?.includes('.gif')))
                      .map((gif, idx) => (
                        <div key={idx} className="relative rounded-lg overflow-hidden border border-gray-200">
                          <img
                            src={gif.url}
                            alt="Product Feature"
                            className="w-full h-48 object-cover"
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Ad Copy Section */}
              {selectedProduct.creatives && selectedProduct.creatives.some(c => c.ad_copy) && (
                <div className="space-y-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-5 border border-blue-200">
                  <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Marketing Copy
                  </h3>
                  <div className="space-y-2">
                    {selectedProduct.creatives
                      .filter(c => c.ad_copy)
                      .map((creative, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-4 border border-blue-200">
                          <p className="text-sm text-gray-800 italic">
                            "{creative.ad_copy}"
                          </p>
                          {creative.headline && (
                            <p className="text-xs text-gray-600 mt-2 font-medium">
                              - {creative.headline}
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Product Specifications */}
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-gray-900">Product Details</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Category</span>
                    <span className="font-medium text-gray-900">{selectedProduct.category}</span>
                  </div>
                  {selectedProduct.external_id && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Product ID</span>
                      <span className="font-mono text-xs text-gray-900">{selectedProduct.external_id}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Admin Info Section */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Admin Information</h3>
              <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg p-4 border border-gray-200">
                <label className="text-xs font-medium text-gray-500 uppercase">
                  Suggest Price
                </label>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ${selectedProduct.recommended_retail_price?.toFixed(2) || 'N/A'}
                </p>
              </div>
              <div className="rounded-lg p-4 border border-gray-200">
                <label className="text-xs font-medium text-gray-500 uppercase">
                  AliExpress Cost
                </label>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ${selectedProduct.supplier_price?.toFixed(2) || 'N/A'}
                </p>
              </div>
              <div className="rounded-lg p-4 border border-gray-200 relative overflow-hidden">
                {/* Margin Percentage Badge */}
                {selectedProduct.recommended_retail_price && selectedProduct.supplier_price && (
                  <div className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-emerald-500/50 to-green-500/50 backdrop-blur-sm rounded-full shadow-sm">
                    <span className="text-xs font-bold text-white">
                      {Math.round(((selectedProduct.recommended_retail_price - selectedProduct.supplier_price) / selectedProduct.recommended_retail_price) * 100)}%
                    </span>
                  </div>
                )}
                <label className="text-xs font-medium text-gray-500 uppercase">
                  Profit Margin
                </label>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {selectedProduct.recommended_retail_price && selectedProduct.supplier_price
                    ? `$${(selectedProduct.recommended_retail_price - selectedProduct.supplier_price).toFixed(2)}`
                    : 'N/A'}
                </p>
              </div>
            </div>
            </div>

            {/* Ad Creatives & Inspiration Videos/Reels */}
            {selectedProduct.creatives && selectedProduct.creatives.length > 0 && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-5 border border-purple-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                      <Eye className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        Ad Inspirations & Creatives
                      </h3>
                      <p className="text-xs text-gray-600">Reference materials for marketing</p>
                    </div>
                    <span className="w-6 h-6 rounded-full bg-purple-500/50 backdrop-blur-sm text-white text-xs font-bold flex items-center justify-center ml-1">
                      {selectedProduct.creatives.length}
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        for (const creative of selectedProduct.creatives) {
                          const link = document.createElement('a');
                          link.href = creative.url;
                          link.download = `${selectedProduct.name}-${creative.type}-${creative.id}`;
                          link.target = '_blank';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          await new Promise(resolve => setTimeout(resolve, 200));
                        }
                        toast.success('Downloading all creatives');
                      } catch (error) {
                        toast.error('Failed to download creatives');
                      }
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-gray-200"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download All
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {selectedProduct.creatives.map((creative) => (
                    <div
                      key={creative.id}
                      className="rounded-lg overflow-hidden bg-white border border-gray-200 group shadow-sm"
                    >
                      {/* Creative Media */}
                      <div className="relative aspect-[9/16] bg-black overflow-hidden flex items-center justify-center">
                        {creative.url && (
                          <>
                            {creative.type === 'video' || creative.type === 'reel' ? (
                              <video
                                src={creative.url}
                                controls
                                className="w-full h-full object-contain"
                                preload="metadata"
                              />
                            ) : creative.type === 'gif' ? (
                              <img
                                src={creative.url}
                                alt="GIF"
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <img
                                src={creative.url}
                                alt={creative.type}
                                className="w-full h-full object-contain"
                              />
                            )}
                          </>
                        )}

                        {/* Download button overlay */}
                        <button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = creative.url;
                            link.download = `${selectedProduct.name}-${creative.type}-${creative.id}`;
                            link.target = '_blank';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            toast.success('Downloading creative');
                          }}
                          className="absolute top-2 right-2 p-2 bg-black/70 hover:bg-black/90 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                      </div>

                      {/* Creative Details */}
                      {(creative.headline || creative.description || creative.ad_copy) && (
                        <div className="p-3 space-y-1.5 bg-gray-50">
                          {creative.headline && (
                            <p className="text-xs font-semibold text-gray-900 line-clamp-2">
                              {creative.headline}
                            </p>
                          )}

                          {creative.description && (
                            <p className="text-xs text-gray-600 line-clamp-2">
                              {creative.description}
                            </p>
                          )}

                          {creative.ad_copy && (
                            <p className="text-xs text-gray-500 italic line-clamp-2">
                              "{creative.ad_copy}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Created Info */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Created: {new Date(selectedProduct.created_at).toLocaleString()}</span>
                {selectedProduct.creator && (
                  <span>By: {selectedProduct.creator.email}</span>
                )}
              </div>
            </div>

            {/* Action Buttons - Always show for all statuses */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              {selectedProduct.approval_status === 'pending' ? (
                <>
                  <button
                    onClick={() => handleApprove(selectedProduct.id)}
                    className="flex-1 px-4 py-2.5 bg-white hover:bg-gray-50 text-green-600 border-2 border-green-600 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
                  >
                    <Check className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(selectedProduct.id)}
                    className="flex-1 px-4 py-2.5 bg-white hover:bg-gray-50 text-red-600 border-2 border-red-600 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </button>
                </>
              ) : selectedProduct.approval_status === 'approved' ? (
                <button
                  onClick={() => handleReject(selectedProduct.id)}
                  className="flex-1 px-4 py-2.5 bg-white hover:bg-gray-50 text-red-600 border-2 border-red-600 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <X className="w-4 h-4" />
                  Reject
                </button>
              ) : (
                <button
                  onClick={() => handleApprove(selectedProduct.id)}
                  className="flex-1 px-4 py-2.5 bg-white hover:bg-gray-50 text-green-600 border-2 border-green-600 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <Check className="w-4 h-4" />
                  Approve
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
