import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Filter,
  ChevronDown,
  Check,
  X,
  ExternalLink,
  Plus,
  Minus,
  DollarSign,
  Truck,
  Globe,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { useClickOutside } from '@/lib/useClickOutside';
import Modal from '@/components/Modal';
import { supabase } from '@/lib/supabase';
import { ProductVariantsEditor } from '@/components/quotes/ProductVariantsEditor';
import { CountrySelector, COMMON_COUNTRIES } from '@/components/quotes/CountrySelector';

interface ProductAttribute {
  name: string;
  value: string;
}

interface QuoteVariant {
  quantity: number;
  sku: string;
  attributes?: ProductAttribute[];
  costPerItem: number;
  shippingCosts: {
    [countryCode: string]: number;
    _default: number;
  };
}

interface Quote {
  id: string;
  productUrl: string;
  platform: 'aliexpress' | 'amazon';
  productName: string;
  requestDate: string;
  status: 'quote_pending' | 'quoted' | 'rejected' | 'expired' | 'accepted';
  variants?: QuoteVariant[];
  expiresIn?: number;
}

interface ProcessQuoteModalProps {
  quote: Quote;
  onClose: () => void;
  onSubmit: (quote: Quote) => void;
}


const ProcessQuoteModal: React.FC<ProcessQuoteModalProps> = ({
  quote,
  onClose,
  onSubmit
}) => {
  const [variants, setVariants] = useState<QuoteVariant[]>([
    { quantity: 1, sku: '', attributes: [], costPerItem: 0, shippingCosts: { _default: 5.0 } },
    { quantity: 2, sku: '', attributes: [], costPerItem: 0, shippingCosts: { _default: 5.0 } },
    { quantity: 3, sku: '', attributes: [], costPerItem: 0, shippingCosts: { _default: 5.0 } }
  ]);
  const [expandedShipping, setExpandedShipping] = useState<number | null>(null);

  const [customQuantity, setCustomQuantity] = useState<number>(0);

  const addVariant = () => {
    if (customQuantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    if (variants.some(v => v.quantity === customQuantity)) {
      toast.error('This quantity already exists');
      return;
    }

    setVariants(prev => [
      ...prev,
      { quantity: customQuantity, sku: '', attributes: [], costPerItem: 0, shippingCosts: { _default: 5.0 } }
    ]);
    setCustomQuantity(0);
  };

  const removeVariant = (index: number) => {
    // Don't allow removing the first three fixed options
    if (index < 3) {
      toast.error('Cannot remove fixed quantity options');
      return;
    }
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, updates: Partial<QuoteVariant>) => {
    setVariants(prev => prev.map((variant, i) => {
      if (i === index) {
        return { ...variant, ...updates };
      }
      return variant;
    }));
  };

  const addCountryShipping = (variantIndex: number, countryCode: string, cost: number) => {
    setVariants(prev => prev.map((variant, i) => {
      if (i === variantIndex) {
        return {
          ...variant,
          shippingCosts: {
            ...variant.shippingCosts,
            [countryCode]: cost
          }
        };
      }
      return variant;
    }));
  };

  const removeCountryShipping = (variantIndex: number, countryCode: string) => {
    if (countryCode === '_default') {
      toast.error('Cannot remove default shipping cost');
      return;
    }
    setVariants(prev => prev.map((variant, i) => {
      if (i === variantIndex) {
        const newShipping = { ...variant.shippingCosts };
        delete newShipping[countryCode];
        return { ...variant, shippingCosts: newShipping };
      }
      return variant;
    }));
  };

  const getTotalCostExample = (variant: QuoteVariant) => {
    return (variant.costPerItem + variant.shippingCosts._default) * variant.quantity;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all variants have SKU
    const missingSkus = variants.filter(v => !v.sku.trim());
    if (missingSkus.length > 0) {
      toast.error('Please enter SKU for all variants');
      return;
    }

    // Validate all variants have default shipping
    const missingDefaultShipping = variants.filter(v => !v.shippingCosts._default || v.shippingCosts._default <= 0);
    if (missingDefaultShipping.length > 0) {
      toast.error('Please enter default shipping cost for all variants');
      return;
    }

    onSubmit({
      ...quote,
      status: 'quoted',
      variants,
      expiresIn: 7
    });
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Process Quote Request"
    >
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Product Details</h3>
          <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{quote.productName}</p>
            <a
              href={
                quote.shopifyProductId && quote.shopDomain
                  ? `https://${quote.shopDomain}/admin/products/${quote.shopifyProductId}`
                  : quote.productUrl
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center mt-1"
            >
              View Product
              <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </a>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Pricing Options</h3>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="1"
                value={customQuantity}
                onChange={(e) => setCustomQuantity(parseInt(e.target.value))}
                className="w-24 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-200 dark:border-gray-700"
                placeholder="Quantity"
              />
              <button
                onClick={addVariant}
                className="text-xs text-primary-600 hover:text-primary-700 flex items-center"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Option
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {variants.map((variant, index) => (
              <div key={index} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {variant.quantity} Unit{variant.quantity > 1 ? 's' : ''}
                  </h4>
                  {index >= 3 && (
                    <button
                      onClick={() => removeVariant(index)}
                      className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* SKU Input */}
                <div className="mb-4">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    SKU <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={variant.sku}
                    onChange={(e) => updateVariant(index, { sku: e.target.value })}
                    placeholder="e.g., PROD-SKU-001"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Product Variants */}
                <div className="mb-4">
                  <ProductVariantsEditor
                    attributes={variant.attributes || []}
                    onChange={(attributes) => updateVariant(index, { attributes })}
                  />
                </div>

                {/* Cost per Item */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Cost per Item <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={variant.costPerItem}
                        onChange={(e) => updateVariant(index, { costPerItem: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Example Total</label>
                    <div className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white font-medium">
                      ${getTotalCostExample(variant).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Shipping Costs by Country */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <button
                    onClick={() => setExpandedShipping(expandedShipping === index ? null : index)}
                    className="w-full flex items-center justify-between text-sm font-medium text-gray-900 dark:text-white mb-3 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <Globe className="w-4 h-4" />
                      <span>Shipping Costs by Country</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({Object.keys(variant.shippingCosts).length} countries)
                      </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform ${expandedShipping === index ? 'rotate-180' : ''}`} />
                  </button>

                  {expandedShipping === index && (
                    <div className="space-y-3 bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                      {/* Default Shipping */}
                      <div className="flex items-start space-x-2">
                        <div className="flex-1 pt-1">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            Default (All Other Countries)
                          </span>
                        </div>
                        <div className="relative w-32">
                          <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={variant.shippingCosts._default || 0}
                            onChange={(e) => {
                              const newShipping = { ...variant.shippingCosts, _default: parseFloat(e.target.value) || 0 };
                              updateVariant(index, { shippingCosts: newShipping });
                            }}
                            className="w-full pl-6 pr-2 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      </div>

                      {/* Existing Country-Specific Costs */}
                      {Object.entries(variant.shippingCosts)
                        .filter(([code]) => code !== '_default')
                        .map(([countryCode, cost]) => {
                          const country = COMMON_COUNTRIES.find(c => c.code === countryCode);
                          return (
                            <div key={countryCode} className="flex items-start space-x-2">
                              <div className="flex-1 pt-1">
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  {country?.name || countryCode}
                                </span>
                              </div>
                              <div className="relative w-32">
                                <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">$</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={cost}
                                  onChange={(e) => addCountryShipping(index, countryCode, parseFloat(e.target.value) || 0)}
                                  className="w-full pl-6 pr-2 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </div>
                              <button
                                onClick={() => removeCountryShipping(index, countryCode)}
                                className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}

                      {/* Add New Country */}
                      <CountrySelector
                        label="Add Country"
                        availableCountries={COMMON_COUNTRIES.filter(c => !variant.shippingCosts[c.code])}
                        onSelect={(code) => addCountryShipping(index, code, variant.shippingCosts._default || 5.0)}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Submit Quote
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default function AdminQuotes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Quote['status'] | 'all'>('all');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  useClickOutside(statusDropdownRef, () => setShowStatusDropdown(false));

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(true);

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    try {
      setIsLoadingQuotes(true);
      const { data, error } = await supabase
        .from('product_quotes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedQuotes: Quote[] = (data || []).map(quote => ({
        id: quote.id,
        productUrl: quote.product_url || '',
        platform: (quote.platform as 'aliexpress' | 'amazon' | 'other') || 'other',
        productName: quote.product_name || 'Unknown Product',
        requestDate: quote.created_at ? new Date(quote.created_at).toLocaleDateString() : '',
        status: (quote.status as 'quote_pending' | 'quoted' | 'accepted' | 'declined') || 'quote_pending',
        variants: []
      }));

      setQuotes(transformedQuotes);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      toast.error('Failed to load quotes');
    } finally {
      setIsLoadingQuotes(false);
    }
  };

  const _mockQuotes: Quote[] = [
    {
      id: 'QT-2024-001',
      productUrl: 'https://www.aliexpress.com/item/123456789.html',
      platform: 'aliexpress',
      productName: 'Wireless Earbuds Pro Max',
      requestDate: '2024-03-15',
      status: 'quote_pending'
    },
    {
      id: 'QT-2024-002',
      productUrl: 'https://www.amazon.com/dp/B0123456789',
      platform: 'amazon',
      productName: 'Smart Home Security Camera',
      requestDate: '2024-03-14',
      status: 'quoted',
      variants: [
        { quantity: 2, costPerItem: 45.99, shippingCost: 8.99, totalCost: 100.97 },
        { quantity: 4, costPerItem: 42.99, shippingCost: 12.99, totalCost: 184.95 },
        { quantity: 8, costPerItem: 39.99, shippingCost: 15.99, totalCost: 335.91 }
      ],
      expiresIn: 5
    }
  ];

  const handleProcessQuote = async (processedQuote: Quote) => {
    try {
      const { error } = await supabase
        .from('product_quotes')
        .update({
          status: 'quoted',
          variants: processedQuote.variants,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', processedQuote.id);

      if (error) throw error;

      toast.success('Quote processed successfully');
      setSelectedQuote(null);
      fetchQuotes();
    } catch (error) {
      console.error('Error processing quote:', error);
      toast.error('Failed to process quote');
    }
  };

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = 
      quote.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-[1050px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-normal text-gray-900 dark:text-gray-100 mb-2">
          Quote Requests
        </h1>
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Process and manage customer quote requests
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search quotes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-200 dark:border-gray-700"
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

          <div className="relative" ref={statusDropdownRef}>
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 dark:bg-gray-900/50 transition-colors flex items-center space-x-2"
            >
              <Filter className="w-4 h-4 text-gray-400" />
              <span>Status: {statusFilter === 'all' ? 'All' : statusFilter.replace('_', ' ')}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            
            {showStatusDropdown && (
              <div className="absolute z-50 w-48 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1">
                {(['all', 'quote_pending', 'quoted', 'accepted', 'rejected', 'expired'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      setShowStatusDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 dark:bg-gray-900/50"
                  >
                    <span>{status === 'all' ? 'All' : status.replace('_', ' ')}</span>
                    {statusFilter === status && <Check className="w-4 h-4 text-primary-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 first:rounded-tl-xl">Request ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 last:rounded-tr-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredQuotes.map((quote) => (
                <tr key={quote.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 dark:bg-gray-900/50">
                  <td className="px-6 py-4">
                    <span className="text-xs text-gray-900 dark:text-gray-100">{quote.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={
                        quote.shopifyProductId && quote.shopDomain
                          ? `https://${quote.shopDomain}/admin/products/${quote.shopifyProductId}`
                          : quote.productUrl
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary-600 hover:text-primary-700 flex items-center"
                    >
                      {quote.productName}
                      <ExternalLink className="w-3 h-3 ml-1.5" />
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(quote.requestDate).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      quote.status === 'quote_pending'
                        ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                        : quote.status === 'quoted'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : quote.status === 'accepted'
                        ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : quote.status === 'rejected'
                        ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        : 'bg-gray-50 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300'
                    }`}>
                      {quote.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {quote.status === 'quote_pending' ? (
                      <button
                        onClick={() => setSelectedQuote(quote)}
                        className="text-xs text-primary-600 hover:text-primary-700"
                      >
                        Process
                      </button>
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {quote.status === 'quoted' ? `Expires in ${quote.expiresIn}d` : '-'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedQuote && (
        <ProcessQuoteModal
          quote={selectedQuote}
          onClose={() => setSelectedQuote(null)}
          onSubmit={handleProcessQuote}
        />
      )}
    </div>
  );
}