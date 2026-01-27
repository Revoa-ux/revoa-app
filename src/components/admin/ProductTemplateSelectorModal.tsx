import React, { useState, useEffect } from 'react';
import { Package, Loader2, Mail, ChevronRight } from 'lucide-react';
import Modal from '@/components/Modal';
import { toast } from '../../lib/toast';
import { supabase } from '@/lib/supabase';
import { TemplateEditorModal } from './TemplateEditorModal';

interface Product {
  id: string;
  name: string;
  sku: string | null;
  status: string;
  created_at: string;
  template_count: number;
}

interface ProductTemplateSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

export function ProductTemplateSelectorModal({
  isOpen,
  onClose,
  userId,
  userName,
}: ProductTemplateSelectorModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen, userId]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      // Fetch product quotes for this merchant
      const { data: quotesData, error: quotesError } = await supabase
        .from('product_quotes')
        .select('id, product_name, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (quotesError) throw quotesError;

      // For each quote, count templates
      const quotesWithCounts = await Promise.all(
        (quotesData || []).map(async (quote) => {
          const { count } = await supabase
            .from('email_response_templates')
            .select('*', { count: 'exact', head: true })
            .eq('product_id', quote.id);

          return {
            id: quote.id,
            name: quote.product_name,
            sku: null,
            status: quote.status,
            created_at: quote.created_at,
            template_count: count || 0,
          };
        })
      );

      setProducts(quotesWithCounts);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowTemplateEditor(true);
  };

  const handleCloseTemplateEditor = () => {
    setShowTemplateEditor(false);
    setSelectedProduct(null);
    fetchProducts(); // Refresh counts
  };

  if (showTemplateEditor && selectedProduct) {
    return (
      <TemplateEditorModal
        isOpen={true}
        onClose={() => {
          handleCloseTemplateEditor();
          onClose();
        }}
        userId={userId}
        productId={selectedProduct.id}
        productName={selectedProduct.name}
      />
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-2xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-[#3a3a3a] pb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Email Templates
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Select a product to manage its email templates for {userName}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              No products found for this merchant
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Products will appear here after the merchant submits a quote
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => handleSelectProduct(product)}
                className="w-full p-4 border border-gray-200 dark:border-[#3a3a3a] rounded-lg hover:border-rose-300 dark:hover:border-rose-600 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-gray-100 dark:bg-dark rounded-lg group-hover:bg-rose-100 dark:group-hover:bg-rose-900/20 transition-colors">
                      <Package className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-rose-600 dark:group-hover:text-rose-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {product.name}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          product.status === 'approved'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : product.status === 'pending'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                            : 'bg-gray-100 dark:bg-[#3a3a3a] text-gray-700 dark:text-gray-400'
                        }`}>
                          {product.status}
                        </span>
                      </div>
                      {product.sku && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          SKU: {product.sku}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {product.template_count} {product.template_count === 1 ? 'template' : 'templates'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
