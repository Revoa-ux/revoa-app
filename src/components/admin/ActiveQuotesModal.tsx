import React, { useState, useEffect } from 'react';
import { X, Package, DollarSign, Globe, ExternalLink, AlertCircle, CreditCard as Edit } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '../../lib/toast';
import Modal from '@/components/Modal';
import { EditQuoteModal } from './EditQuoteModal';
import { useAuth } from '@/contexts/AuthContext';

interface QuoteVariant {
  quantity: number;
  sku: string;
  costPerItem: number;
  shippingCosts: {
    [countryCode: string]: number;
    _default: number;
  };
}

interface ActiveQuote {
  id: string;
  product_name: string;
  product_url: string;
  platform: string;
  variants: QuoteVariant[];
  created_at: string;
  expires_at: string | null;
  shopify_product_id: string | null;
  shopify_status: string | null;
}

interface ActiveQuotesModalProps {
  userId: string;
  userName: string;
  onClose: () => void;
}

export const ActiveQuotesModal: React.FC<ActiveQuotesModalProps> = ({
  userId,
  userName,
  onClose
}) => {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<ActiveQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<ActiveQuote | null>(null);
  const [editingQuote, setEditingQuote] = useState<ActiveQuote | null>(null);

  useEffect(() => {
    fetchActiveQuotes();
  }, [userId]);

  const fetchActiveQuotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('product_quotes')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error('Error fetching active quotes:', error);
      toast.error('Failed to load active quotes');
    } finally {
      setLoading(false);
    }
  };

  const getCountryName = (code: string) => {
    const countries: { [key: string]: string } = {
      US: 'United States',
      CA: 'Canada',
      GB: 'United Kingdom',
      AU: 'Australia',
      DE: 'Germany',
      FR: 'France',
      IT: 'Italy',
      ES: 'Spain',
      NL: 'Netherlands',
      BE: 'Belgium',
      SE: 'Sweden',
      NO: 'Norway',
      DK: 'Denmark',
      FI: 'Finland',
      CH: 'Switzerland',
      AT: 'Austria',
      IE: 'Ireland',
      NZ: 'New Zealand',
      SG: 'Singapore',
      JP: 'Japan'
    };
    return countries[code] || code;
  };

  if (selectedQuote) {
    return (
      <Modal isOpen={true} onClose={() => setSelectedQuote(null)} title="Quote Details">
        <div className="space-y-6">
          {/* Product Info */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Product</h3>
            <div className="p-4 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {selectedQuote.product_name}
              </p>
              <a
                href={
                  selectedQuote.shopify_product_id && selectedQuote.shop_domain
                    ? `https://${selectedQuote.shop_domain}/admin/products/${selectedQuote.shopify_product_id}`
                    : selectedQuote.product_url
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center mt-1"
              >
                View Product <ExternalLink className="w-3 h-3 ml-1" />
              </a>
              <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                <span>Platform: {selectedQuote.platform}</span>
                {selectedQuote.shopify_status === 'synced' && (
                  <span className="text-green-600 dark:text-green-400">✓ Synced to Shopify</span>
                )}
              </div>
            </div>
          </div>

          {/* Variants */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Product Variants</h3>
            <div className="space-y-3">
              {selectedQuote.variants.map((variant, idx) => {
                const finalVariant = variant.finalVariants?.[0] || variant;
                const variantName = finalVariant.attributes && finalVariant.attributes.length > 0
                  ? finalVariant.attributes.map((a: any) => a.value).join(' - ')
                  : `Variant ${idx + 1}`;
                const sku = finalVariant.sku || variant.sku;
                const cost = finalVariant.costPerItem || variant.costPerItem;
                const shippingCosts = finalVariant.shippingCosts || variant.shippingCosts;

                return (
                  <div key={idx} className="p-4 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg border border-gray-200 dark:border-[#333333]">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {variantName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          SKU: {sku}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          ${cost.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          per unit
                        </div>
                      </div>
                    </div>

                    {/* Shipping Costs */}
                    <div className="border-t border-gray-200 dark:border-[#333333] pt-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          Shipping Costs
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(shippingCosts).map(([code, cost]) => (
                          <div key={code} className="text-xs text-gray-600 dark:text-gray-400">
                            <span className="font-medium">
                              {code === '_default' ? 'Default' : getCountryName(code)}:
                            </span>{' '}
                            ${(cost as number).toFixed(2)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-[#3a3a3a]/50 px-6 py-4 -mx-6 -mb-6">
            <button
              onClick={() => {
                setEditingQuote(selectedQuote);
                setSelectedQuote(null);
              }}
              className="btn btn-primary"
            >
              Edit Quote
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // Show edit modal
  if (editingQuote && user) {
    return (
      <EditQuoteModal
        quoteId={editingQuote.id}
        quoteName={editingQuote.product_name}
        currentVariants={editingQuote.variants}
        adminId={user.id}
        onClose={() => {
          setEditingQuote(null);
          setSelectedQuote(null);
        }}
        onSuccess={async () => {
          await fetchActiveQuotes();
          setEditingQuote(null);
          setSelectedQuote(null);
          toast.success('Quote updated successfully');
        }}
      />
    );
  }

  return (
    <Modal isOpen={true} onClose={onClose} title={`Active Quotes - ${userName}`}>
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Loading active quotes...
          </div>
        ) : quotes.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No active quotes found
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {quotes.map((quote) => (
              <button
                key={quote.id}
                onClick={() => setSelectedQuote(quote)}
                className="w-full p-4 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg border border-gray-200 dark:border-[#333333] hover:border-blue-500 dark:hover:border-blue-500 transition-colors text-left"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      {quote.product_name}
                    </h4>
                    <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                      <span>{quote.variants.length} pricing option{quote.variants.length > 1 ? 's' : ''}</span>
                      <span>•</span>
                      <span>{quote.variants.reduce((sum, v) => sum + Object.keys(v.shippingCosts).length, 0)} countries</span>
                      {quote.shopify_status === 'synced' && (
                        <>
                          <span>•</span>
                          <span className="text-green-600 dark:text-green-400">Synced</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        )}

        {quotes.length > 0 && (
          <div className="pt-6 border-t border-gray-200 dark:border-[#333333]">
            <div className="flex items-start space-x-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-800 dark:text-blue-300">
                These quotes are actively being used for invoice generation. SKUs from orders matching these quotes will be automatically invoiced.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-[#3a3a3a]/50 px-6 py-4 -mx-6 -mb-6">
          <button
            onClick={onClose}
            className="btn btn-primary"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
