import React, { useState, useEffect } from 'react';
import { Check, X, Eye, Package, Calendar, User, AlertCircle, Loader2, Download, ChevronLeft, ChevronRight, Maximize2, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '../../lib/toast';
import Modal from '@/components/Modal';
import UpdateCogsModal from '@/components/admin/UpdateCogsModal';

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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [showUpdateCogsModal, setShowUpdateCogsModal] = useState(false);

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
        <h1 className="text-2xl font-normal text-gray-900 dark:text-gray-100 mb-2">
          Product Approvals
        </h1>
        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 flex items-start sm:items-center gap-2">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 sm:mt-0 flex-shrink-0"></span>
          Review and approve products imported by AI agent
        </p>
      </div>

      <div className="flex items-center gap-3 mb-6">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-sm'
                : 'bg-white dark:bg-dark text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a] border border-gray-200 dark:border-[#3a3a3a]'
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
        <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a] p-16 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-[#3a3a3a] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            No products found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Try adjusting your filter or add new products
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-dark/50 border-b border-gray-200 dark:border-[#3a3a3a]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Margin
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => (
                  <tr
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className="hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 dark:bg-dark/50/50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images[0].url}
                            alt={product.name}
                            className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-[#3a3a3a]"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-50 dark:bg-dark/50 border border-gray-200 dark:border-[#3a3a3a] flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
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
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      ${product.recommended_retail_price?.toFixed(2) || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
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
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(product.created_at).toLocaleDateString()}
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
          onClose={() => {
            setSelectedProduct(null);
            setShowFullPreview(false);
            setCurrentImageIndex(0);
          }}
          title={showFullPreview ? "Full Product Page Preview" : "Product Details"}
          maxWidth={showFullPreview ? "max-w-7xl" : "max-w-4xl"}
        >
          {!showFullPreview ? (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-200 dark:border-[#3a3a3a]">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {selectedProduct.name}
                </h3>
              </div>
            </div>

            {/* Pricing Info */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg p-4 border border-gray-200 dark:border-[#3a3a3a]">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Suggest Price
                </label>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  ${selectedProduct.recommended_retail_price?.toFixed(2) || 'N/A'}
                </p>
              </div>
              <div className="rounded-lg p-4 border border-gray-200 dark:border-[#3a3a3a]">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  AliExpress Cost
                </label>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  ${selectedProduct.supplier_price?.toFixed(2) || 'N/A'}
                </p>
              </div>
              <div className="rounded-lg p-4 border border-gray-200 dark:border-[#3a3a3a] relative overflow-hidden">
                {/* Margin Percentage Badge */}
                {selectedProduct.recommended_retail_price && selectedProduct.supplier_price && (
                  <div className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-600/80 rounded-full shadow-sm">
                    <span className="text-xs font-bold text-white">
                      {Math.round(((selectedProduct.recommended_retail_price - selectedProduct.supplier_price) / selectedProduct.recommended_retail_price) * 100)}%
                    </span>
                  </div>
                )}
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Profit Margin
                </label>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {selectedProduct.recommended_retail_price && selectedProduct.supplier_price
                    ? `$${(selectedProduct.recommended_retail_price - selectedProduct.supplier_price).toFixed(2)}`
                    : 'N/A'}
                </p>
              </div>
            </div>

            {/* Ad Creatives & Inspiration Videos/Reels */}
            {selectedProduct.creatives && selectedProduct.creatives.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Ad Inspirations
                    </label>
                    <span className="w-5 h-5 rounded-full bg-red-600/80 text-white text-xs font-semibold flex items-center justify-center">
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
                    className="btn btn-secondary text-xs"
                  >
                    <Download className="btn-icon" />
                    Download All
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {selectedProduct.creatives.map((creative) => (
                    <div
                      key={creative.id}
                      className="rounded-lg overflow-hidden border border-gray-200 dark:border-[#3a3a3a] group"
                    >
                      {/* Creative Media */}
                      <div className="relative aspect-[9/16] bg-black">
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
                          className="btn btn-primary absolute top-2 right-2 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Download className="btn-icon" />
                        </button>

                      </div>

                      {/* Creative Details */}
                      <div className="p-3 space-y-2 bg-gray-50 dark:bg-dark/50">
                        {creative.headline && (
                          <div>
                            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
                              {creative.headline}
                            </p>
                          </div>
                        )}

                        {creative.description && (
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                              {creative.description}
                            </p>
                          </div>
                        )}

                        {creative.ad_copy && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 italic line-clamp-2">
                              "{creative.ad_copy}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Product Page Preview */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Product Page Preview
                </label>
                <button
                  onClick={() => {
                    setShowFullPreview(true);
                    setCurrentImageIndex(0);
                  }}
                  className="btn btn-secondary text-xs"
                >
                  <Maximize2 className="btn-icon" />
                  Full Preview
                </button>
              </div>

              <div className="rounded-xl border-2 border-gray-200 dark:border-[#3a3a3a] overflow-hidden bg-white dark:bg-dark shadow-sm">
                {/* Mock Browser Chrome */}
                <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 dark:border-[#3a3a3a] flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                  </div>
                  <div className="flex-1 bg-white dark:bg-dark rounded px-3 py-1 text-xs text-gray-500 dark:text-gray-400 font-mono">
                    yourstore.myshopify.com/products/{selectedProduct.name.toLowerCase().replace(/\s+/g, '-')}
                  </div>
                </div>

                {/* Product Layout */}
                <div className="p-6 bg-white dark:bg-dark max-h-[400px] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left: Product Images with Carousel */}
                    <div className="space-y-3">
                      {selectedProduct.images && selectedProduct.images.length > 0 ? (
                        <>
                          {/* Main Image with Navigation */}
                          <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-dark/50 group">
                            <img
                              src={selectedProduct.images[currentImageIndex].url}
                              alt={selectedProduct.name}
                              className="w-full aspect-square object-cover"
                            />
                            {selectedProduct.images.length > 1 && (
                              <>
                                <button
                                  onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? selectedProduct.images.length - 1 : prev - 1))}
                                  className="btn btn-ghost absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <ChevronLeft className="btn-icon" />
                                </button>
                                <button
                                  onClick={() => setCurrentImageIndex((prev) => (prev === selectedProduct.images.length - 1 ? 0 : prev + 1))}
                                  className="btn btn-ghost absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <ChevronRight className="btn-icon" />
                                </button>
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                                  {selectedProduct.images.map((_, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => setCurrentImageIndex(idx)}
                                      className={`w-2 h-2 rounded-full transition-all ${
                                        idx === currentImageIndex ? 'bg-white w-4' : 'bg-white/60'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                          {/* Thumbnail Grid */}
                          {selectedProduct.images.length > 1 && (
                            <div className="grid grid-cols-4 gap-2">
                              {selectedProduct.images.slice(0, 4).map((img, idx) => (
                                <button
                                  key={img.id}
                                  onClick={() => setCurrentImageIndex(idx)}
                                  className={`rounded border-2 overflow-hidden bg-gray-50 transition-all ${
                                    idx === currentImageIndex ? 'border-gray-900' : 'border-gray-200 hover:border-gray-400'
                                  }`}
                                >
                                  <img
                                    src={img.url}
                                    alt={img.type}
                                    className="w-full aspect-square object-cover"
                                  />
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="rounded-lg border border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-dark/50 aspect-square flex items-center justify-center">
                          <Package className="w-12 h-12 text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Right: Product Info */}
                    <div className="space-y-3">
                      <div>
                        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">
                          {selectedProduct.name}
                        </h2>
                        <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                          ${selectedProduct.recommended_retail_price?.toFixed(2) || 'N/A'}
                        </div>
                      </div>

                      {/* Description - Scrollable */}
                      <div className="border-t border-gray-200 dark:border-[#3a3a3a] pt-3">
                        <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto pr-2">
                          {selectedProduct.description}
                        </div>
                      </div>

                      {/* Mock Add to Cart Button */}
                      <button className="w-full py-2.5 bg-gray-800 text-white text-sm font-medium rounded-lg cursor-default opacity-60">
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Created Info */}
            <div className="pt-4 border-t border-gray-200 dark:border-[#3a3a3a]">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Created: {new Date(selectedProduct.created_at).toLocaleString()}</span>
                {selectedProduct.creator && (
                  <span>By: {selectedProduct.creator.email}</span>
                )}
              </div>
            </div>

            {/* Action Buttons - Always show for all statuses */}
            <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-[#3a3a3a]">
              <div className="flex gap-3">
                {selectedProduct.approval_status === 'pending' ? (
                  <>
                    <button
                      onClick={() => handleApprove(selectedProduct.id)}
                      className="btn btn-secondary flex-1 text-green-600 border-2 border-green-600 font-medium"
                    >
                      <Check className="btn-icon" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(selectedProduct.id)}
                      className="btn btn-danger flex-1 border-2 font-medium"
                    >
                      <X className="btn-icon" />
                      Reject
                    </button>
                  </>
                ) : selectedProduct.approval_status === 'approved' ? (
                  <button
                    onClick={() => handleReject(selectedProduct.id)}
                    className="btn btn-danger flex-1 border-2 font-medium"
                  >
                    <X className="btn-icon" />
                    Reject
                  </button>
                ) : (
                  <button
                    onClick={() => handleApprove(selectedProduct.id)}
                    className="btn btn-secondary flex-1 text-green-600 border-2 border-green-600 font-medium"
                  >
                    <Check className="btn-icon" />
                    Approve
                  </button>
                )}
              </div>

              {/* Update COGS Button */}
              {selectedProduct.approval_status === 'approved' && selectedProduct.created_by && (
                <button
                  onClick={() => setShowUpdateCogsModal(true)}
                  className="btn btn-primary w-full font-medium"
                >
                  <DollarSign className="btn-icon" />
                  Update COGS
                </button>
              )}
            </div>
          </div>
          ) : (
          <div className="space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Back Button */}
            <button
              onClick={() => {
                setShowFullPreview(false);
                setCurrentImageIndex(0);
              }}
              className="btn btn-ghost text-sm mb-4"
            >
              <ChevronLeft className="btn-icon btn-icon-back" />
              Back to Product Details
            </button>
            {/* Mock Browser Chrome */}
            <div className="bg-gray-100 px-4 py-2 rounded-lg border border-gray-200 dark:border-[#3a3a3a] flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
              </div>
              <div className="flex-1 bg-white dark:bg-dark rounded px-3 py-1 text-xs text-gray-500 dark:text-gray-400 font-mono">
                yourstore.myshopify.com/products/{selectedProduct.name.toLowerCase().replace(/\s+/g, '-')}
              </div>
            </div>

            {/* Full Product Layout */}
            <div className="bg-white dark:bg-dark rounded-lg border border-gray-200 dark:border-[#3a3a3a] p-8">
              <div className="grid grid-cols-2 gap-12">
                {/* Left: Product Images with Carousel */}
                <div className="space-y-4">
                  {selectedProduct.images && selectedProduct.images.length > 0 ? (
                    <>
                      {/* Main Image with Navigation */}
                      <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-dark/50 group">
                        <img
                          src={selectedProduct.images[currentImageIndex].url}
                          alt={selectedProduct.name}
                          className="w-full aspect-square object-cover"
                        />
                        {selectedProduct.images.length > 1 && (
                          <>
                            <button
                              onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? selectedProduct.images.length - 1 : prev - 1))}
                              className="btn btn-ghost absolute left-3 top-1/2 -translate-y-1/2 p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <ChevronLeft className="btn-icon" />
                            </button>
                            <button
                              onClick={() => setCurrentImageIndex((prev) => (prev === selectedProduct.images.length - 1 ? 0 : prev + 1))}
                              className="btn btn-ghost absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <ChevronRight className="btn-icon" />
                            </button>
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                              {selectedProduct.images.map((_, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => setCurrentImageIndex(idx)}
                                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                                    idx === currentImageIndex ? 'bg-white w-6' : 'bg-white/60'
                                  }`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      {/* Thumbnail Grid */}
                      {selectedProduct.images.length > 1 && (
                        <div className="grid grid-cols-5 gap-3">
                          {selectedProduct.images.map((img, idx) => (
                            <button
                              key={img.id}
                              onClick={() => setCurrentImageIndex(idx)}
                              className={`rounded border-2 overflow-hidden bg-gray-50 transition-all ${
                                idx === currentImageIndex ? 'border-gray-900' : 'border-gray-200 hover:border-gray-400'
                              }`}
                            >
                              <img
                                src={img.url}
                                alt={img.type}
                                className="w-full aspect-square object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="rounded-lg border border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-dark/50 aspect-square flex items-center justify-center">
                      <Package className="w-16 h-16 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Right: Product Info */}
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                      {selectedProduct.name}
                    </h1>
                    <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      ${selectedProduct.recommended_retail_price?.toFixed(2) || 'N/A'}
                    </div>
                  </div>

                  {/* Description - Fully Scrollable */}
                  <div className="border-t border-gray-200 dark:border-[#3a3a3a] pt-6">
                    <div className="text-base text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto pr-2">
                      {selectedProduct.description}
                    </div>
                  </div>

                  {/* Mock Add to Cart Button */}
                  <button className="w-full py-3.5 bg-gray-800 text-white text-base font-semibold rounded-lg cursor-default opacity-60">
                    Add to Cart
                  </button>
                </div>
              </div>

              {/* Product Features Section with GIFs */}
              {selectedProduct.creatives && selectedProduct.creatives.filter(c => c.type === 'gif' || (c.type === 'ad' && c.url?.includes('.gif'))).length > 0 && (
                <div className="mt-12 pt-12 border-t border-gray-200 dark:border-[#3a3a3a]">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Product Features</h2>
                  <div className="grid grid-cols-3 gap-6">
                    {selectedProduct.creatives
                      .filter(c => c.type === 'gif' || (c.type === 'ad' && c.url?.includes('.gif')))
                      .map((gif, idx) => (
                        <div key={idx} className="rounded-lg overflow-hidden border border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-dark/50">
                          <img
                            src={gif.url}
                            alt="Product Feature"
                            className="w-full aspect-square object-cover"
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Marketing Copy Section */}
              {selectedProduct.creatives && selectedProduct.creatives.some(c => c.ad_copy) && (
                <div className="mt-12 pt-12 border-t border-gray-200 dark:border-[#3a3a3a]">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Marketing Copy</h2>
                  <div className="space-y-4">
                    {selectedProduct.creatives
                      .filter(c => c.ad_copy)
                      .map((creative, idx) => (
                        <div key={idx} className="bg-gray-50 dark:bg-dark/50 rounded-lg p-5 border border-gray-200 dark:border-[#3a3a3a]">
                          <p className="text-base text-gray-700 dark:text-gray-300 italic">"{creative.ad_copy}"</p>
                          {creative.headline && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 font-semibold">{creative.headline}</p>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          )}
        </Modal>
      )}

      {/* Update COGS Modal */}
      {selectedProduct && (
        <UpdateCogsModal
          isOpen={showUpdateCogsModal}
          onClose={() => setShowUpdateCogsModal(false)}
          product={{
            id: selectedProduct.id,
            name: selectedProduct.name,
            supplier_price: selectedProduct.supplier_price,
            created_by: selectedProduct.created_by,
          }}
          onSuccess={() => {
            fetchProducts();
          }}
        />
      )}
    </div>
  );
}
