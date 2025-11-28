import React, { useState, useEffect } from 'react';
import { Quote } from '@/types/quotes';
import { QuoteForm } from '@/components/quotes/QuoteForm';
import { QuoteFilters } from '@/components/quotes/QuoteFilters';
import { QuoteTable } from '@/components/quotes/QuoteTable';
import { ShopifyConnectModal } from '@/components/quotes/ShopifyConnectModal';
import { toast } from 'sonner';
import {
  createQuoteRequest,
  getUserQuotes,
  acceptQuote,
  updateShopifySync,
  deleteQuote
} from '@/lib/quotes';

export default function ProductQuotes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Quote['status'] | 'all'>('all');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [expandedQuotes, setExpandedQuotes] = useState<string[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showShopifyModal, setShowShopifyModal] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load quotes on mount
  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    try {
      setIsLoading(true);
      const data = await getUserQuotes();
      setQuotes(data);
    } catch (error) {
      console.error('Error loading quotes:', error);
      toast.error('Failed to load quotes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitQuote = async (newQuote: Omit<Quote, 'id' | 'requestDate' | 'status'>) => {
    try {
      const quote = await createQuoteRequest({
        productUrl: newQuote.productUrl,
        productName: newQuote.productName,
        platform: newQuote.platform,
      });

      setQuotes([quote, ...quotes]);
      setShowQuoteForm(false);
      toast.success('Quote request submitted successfully');
    } catch (error) {
      console.error('Error submitting quote:', error);
      toast.error('Failed to submit quote request');
    }
  };

  const toggleQuoteExpansion = (quoteId: string) => {
    setExpandedQuotes(prev => 
      prev.includes(quoteId)
        ? prev.filter(id => id !== quoteId)
        : [...prev, quoteId]
    );
  };

  const handleAcceptQuote = async (quote: Quote) => {
    if (quote.status !== 'quoted') return;

    try {
      const updatedQuote = await acceptQuote(quote.id);
      setQuotes(prev => prev.map(q =>
        q.id === quote.id ? updatedQuote : q
      ));

      setSelectedQuote(updatedQuote);
      setShowShopifyModal(true);
    } catch (error) {
      console.error('Error accepting quote:', error);
      toast.error('Failed to accept quote');
    }
  };

  const handleShopifyConnect = async (quoteId: string) => {
    try {
      // The shopify product ID will be set by the ShopifyConnectModal after creating the product
      // For now, we'll update the status
      const updatedQuote = await updateShopifySync(quoteId, 'pending');
      setQuotes(prev => prev.map(q =>
        q.id === quoteId ? updatedQuote : q
      ));

      toast.success('Product successfully synced with Shopify');
      setShowShopifyModal(false);
    } catch (error) {
      console.error('Error syncing with Shopify:', error);
      toast.error('Failed to sync with Shopify');
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    try {
      await deleteQuote(quoteId);
      setQuotes(prev => prev.filter(q => q.id !== quoteId));
      toast.success('Quote deleted successfully');
    } catch (error) {
      console.error('Error deleting quote:', error);
      toast.error('Failed to delete quote');
    }
  };

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = 
      quote.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.productUrl.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
          Quotes
        </h1>
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Submit product links to receive competitive quotes
          </p>
        </div>
      </div>

      {/* New Quote Button */}
      <button
        onClick={() => setShowQuoteForm(true)}
        className="w-full px-6 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-500 dark:hover:border-primary-500 transition-colors text-left"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
              Request New Quote
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Get competitive pricing for your products
            </p>
          </div>
          <div className="text-primary-500">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        </div>
      </button>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Quote History</h2>
          <QuoteFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
        </div>

        {/* Quotes Table */}
        <QuoteTable
          quotes={filteredQuotes}
          expandedQuotes={expandedQuotes}
          onToggleExpand={toggleQuoteExpansion}
          onAcceptQuote={handleAcceptQuote}
          onConnectShopify={(quote) => {
            setSelectedQuote(quote);
            setShowShopifyModal(true);
          }}
          onDeleteQuote={handleDeleteQuote}
        />
      </div>

      {/* Quote Form Modal */}
      {showQuoteForm && (
        <QuoteForm
          onSubmit={handleSubmitQuote}
          onCancel={() => setShowQuoteForm(false)}
        />
      )}

      {/* Shopify Connect Modal */}
      {showShopifyModal && selectedQuote && (
        <ShopifyConnectModal
          quote={selectedQuote}
          onClose={() => {
            setShowShopifyModal(false);
            setSelectedQuote(null);
          }}
          onConnect={handleShopifyConnect}
        />
      )}
    </div>
  );
}