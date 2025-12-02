import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Filter,
  ChevronDown,
  Check,
  X,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { useClickOutside } from '@/lib/useClickOutside';
import { supabase } from '@/lib/supabase';
import { NewProcessQuoteModal } from '@/components/admin/NewProcessQuoteModal';
import { QuoteVariant } from '@/types/quotes';
import { getStatusText } from '@/components/quotes/QuoteStatus';

interface Quote {
  id: string;
  productUrl: string;
  platform: 'aliexpress' | 'amazon';
  productName: string;
  requestDate: string;
  status: 'quote_pending' | 'quoted' | 'rejected' | 'expired' | 'accepted';
  variants?: QuoteVariant[];
  expiresIn?: number;
  shopifyProductId?: string;
  shopDomain?: string;
}

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
        variants: [],
        shopifyProductId: quote.shopify_product_id,
        shopDomain: quote.shop_domain
      }));

      setQuotes(transformedQuotes);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      toast.error('Failed to load quotes');
    } finally {
      setIsLoadingQuotes(false);
    }
  };

  const handleProcessQuote = async (variants: QuoteVariant[]) => {
    if (!selectedQuote) return;

    try {
      const { error } = await supabase
        .from('product_quotes')
        .update({
          status: 'quoted',
          variants: variants,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', selectedQuote.id);

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
              className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center space-x-2"
            >
              <Filter className="w-4 h-4 text-gray-400" />
              <span>Status: {statusFilter === 'all' ? 'All' : getStatusText(statusFilter)}</span>
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
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <span>{status === 'all' ? 'All' : getStatusText(status)}</span>
                    {statusFilter === status && <Check className="w-4 h-4 text-rose-500" />}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 first:rounded-tl-xl">Request ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 last:rounded-tr-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredQuotes.map((quote, index) => (
                <tr key={quote.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className={`px-6 py-4 ${index === filteredQuotes.length - 1 ? 'rounded-bl-xl' : ''}`}>
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
                      className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 flex items-center"
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
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs whitespace-nowrap ${
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
                      {quote.status === 'synced_with_shopify' ? 'Synced' : quote.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-right ${index === filteredQuotes.length - 1 ? 'rounded-br-xl' : ''}`}>
                    {quote.status === 'quote_pending' ? (
                      <button
                        onClick={() => setSelectedQuote(quote)}
                        className="text-xs text-gray-900 hover:text-gray-700 dark:text-gray-100 dark:hover:text-gray-300 underline hover:no-underline"
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
        <NewProcessQuoteModal
          quote={selectedQuote}
          onClose={() => setSelectedQuote(null)}
          onSubmit={handleProcessQuote}
        />
      )}
    </div>
  );
}
