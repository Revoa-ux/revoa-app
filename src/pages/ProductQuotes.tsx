import React, { useState, useEffect } from 'react';
import { Quote } from '@/types/quotes';
import { QuoteForm } from '@/components/quotes/QuoteForm';
import { QuoteFilters } from '@/components/quotes/QuoteFilters';
import { QuoteTable } from '@/components/quotes/QuoteTable';
import { ShopifyConnectModal } from '@/components/quotes/ShopifyConnectModal';
import { QuoteComparisonModal } from '@/components/quotes/QuoteComparisonModal';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
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
  const { user, isLoading: authLoading } = useAuth();
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showShopifyModal, setShowShopifyModal] = useState(false);
  const [shopifySyncMethod, setShopifySyncMethod] = useState<'new' | 'existing' | null>(null);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewQuoteId, setReviewQuoteId] = useState<string | null>(null);
  const [quotePendingReview, setQuotePendingReview] = useState<any>(null);

  // Load quotes on mount and check URL for review parameter
  useEffect(() => {
    // Wait for auth to load before fetching quotes
    if (!authLoading && user) {
      loadQuotes();
    } else if (!authLoading && !user) {
      // If auth is done loading but no user, stop loading
      setIsLoading(false);
    }

    // Check if URL has review parameter
    const params = new URLSearchParams(window.location.search);
    const reviewId = params.get('review');
    if (reviewId) {
      setReviewQuoteId(reviewId);
    }
  }, [authLoading, user]);

  // Fetch quote details when reviewQuoteId is set
  useEffect(() => {
    if (reviewQuoteId) {
      fetchQuoteForReview(reviewQuoteId);
    }
  }, [reviewQuoteId]);

  const fetchQuoteForReview = async (quoteId: string) => {
    try {
      const { data, error } = await supabase
        .from('product_quotes')
        .select('*')
        .eq('id', quoteId)
        .eq('status', 'pending_reacceptance')
        .single();

      if (error) throw error;
      if (data) {
        setQuotePendingReview(data);
      }
    } catch (error) {
      console.error('Error fetching quote for review:', error);
    }
  };

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
        ? []
        : [quoteId]
    );
  };

  const handleAcceptQuote = async (quote: Quote) => {
    if (quote.status !== 'quoted' && quote.status !== 'pending_reacceptance') return;

    console.log('📝 [ProductQuotes] Accepting quote:', {
      id: quote.id,
      status: quote.status,
      hasVariants: !!quote.variants,
      variantsCount: quote.variants?.length
    });

    try {
      const updatedQuote = await acceptQuote(quote.id);
      setQuotes(prev => prev.map(q =>
        q.id === quote.id ? updatedQuote : q
      ));

      setSelectedQuote(updatedQuote);
      setShowShopifyModal(true);

      toast.success('Quote accepted successfully');
    } catch (error) {
      console.error('Error accepting quote:', error);
      toast.error('Failed to accept quote');
    }
  };

  const handleShopifyConnect = async (quoteId: string) => {
    try {
      // Find the quote to check its status
      const quote = quotes.find(q => q.id === quoteId);

      // If quote is pending (quote_pending), accept it first
      if (quote?.status === 'quote_pending') {
        const acceptedQuote = await acceptQuote(quoteId);
        setQuotes(prev => prev.map(q =>
          q.id === quoteId ? acceptedQuote : q
        ));
        toast.success('Quote accepted and synced with Shopify');
      } else {
        // The shopify product ID will be set by the ShopifyConnectModal after creating the product
        const updatedQuote = await updateShopifySync(quoteId, 'pending');
        setQuotes(prev => prev.map(q =>
          q.id === quoteId ? updatedQuote : q
        ));
        toast.success('Product successfully synced with Shopify');
      }

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
      toast.success('Quote cancelled successfully');
    } catch (error) {
      console.error('Error cancelling quote:', error);
      toast.error('Failed to cancel quote');
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

  const pendingReacceptanceCount = quotes.filter(q => q.status === 'pending_reacceptance').length;

  if (authLoading || isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-8"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Authentication Required
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Please sign in to view your quotes.
          </p>
        </div>
      </div>
    );
  }

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

      {/* Reacceptance Banner */}
      {pendingReacceptanceCount > 0 && (
        <div className="flex items-start space-x-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {pendingReacceptanceCount} quote{pendingReacceptanceCount > 1 ? 's' : ''} updated by admin - Review required
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Please review and accept the changes to activate {pendingReacceptanceCount > 1 ? 'these quotes' : 'this quote'}.
            </p>
          </div>
        </div>
      )}

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
        {filteredQuotes.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {quotes.length === 0 ? 'No quotes yet' : 'No quotes found'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {quotes.length === 0
                  ? 'Submit a product link to receive competitive pricing from our team.'
                  : 'Try adjusting your search or filters to find what you\'re looking for.'}
              </p>
              {quotes.length === 0 && (
                <button
                  onClick={() => setShowQuoteForm(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                >
                  Request your first quote
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ) : (
          <QuoteTable
            quotes={filteredQuotes}
            expandedQuotes={expandedQuotes}
            onToggleExpand={toggleQuoteExpansion}
            onAcceptQuote={handleAcceptQuote}
            onConnectShopify={(quote, method) => {
              setSelectedQuote(quote);
              setShopifySyncMethod(method || null);
              setShowShopifyModal(true);
            }}
            onDeleteQuote={handleDeleteQuote}
          />
        )}
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
          initialMethod={shopifySyncMethod}
          onClose={() => {
            setShowShopifyModal(false);
            setSelectedQuote(null);
            setShopifySyncMethod(null);
          }}
          onConnect={handleShopifyConnect}
        />
      )}

      {/* Quote Comparison Modal */}
      {quotePendingReview && user && (
        <QuoteComparisonModal
          quote={quotePendingReview}
          userId={user.id}
          onClose={() => {
            setQuotePendingReview(null);
            setReviewQuoteId(null);
            // Clear URL parameter
            window.history.replaceState({}, '', window.location.pathname);
          }}
          onSuccess={() => {
            loadQuotes();
          }}
        />
      )}
    </div>
  );
}