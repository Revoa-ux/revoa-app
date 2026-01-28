import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Quote } from '@/types/quotes';
import { QuoteForm } from '@/components/quotes/QuoteForm';
import { QuoteFilters } from '@/components/quotes/QuoteFilters';
import { QuoteTable } from '@/components/quotes/QuoteTable';
import { ShopifyConnectModal } from '@/components/quotes/ShopifyConnectModal';
import { QuoteComparisonModal } from '@/components/quotes/QuoteComparisonModal';
import { AlertCircle, FileText } from 'lucide-react';
import { StatusIcon } from '@/components/StatusIcon';
import { toast } from '../lib/toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { SubscriptionPageWrapper } from '@/components/subscription/SubscriptionPageWrapper';
import { useIsBlocked } from '@/components/subscription/SubscriptionGate';
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
  const isBlocked = useIsBlocked();
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showShopifyModal, setShowShopifyModal] = useState(false);
  const [shopifySyncMethod, setShopifySyncMethod] = useState<'new' | 'existing' | null>(null);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewQuoteId, setReviewQuoteId] = useState<string | null>(null);
  const [quotePendingReview, setQuotePendingReview] = useState<any>(null);

  useEffect(() => {
    if (isBlocked) {
      setIsLoading(false);
      return;
    }
    if (!authLoading && user) {
      loadQuotes();
    } else if (!authLoading && !user) {
      setIsLoading(false);
    }

    const params = new URLSearchParams(window.location.search);
    const reviewId = params.get('review');
    if (reviewId) {
      setReviewQuoteId(reviewId);
    }
  }, [authLoading, user, isBlocked]);

  useEffect(() => {
    if (isBlocked) return;
    if (reviewQuoteId) {
      fetchQuoteForReview(reviewQuoteId);
    }
  }, [reviewQuoteId, isBlocked]);

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

  if ((authLoading || isLoading) && !isBlocked) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
            Quotes & Product Mapping
          </h1>
          <div className="flex items-start sm:items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 sm:mt-0 flex-shrink-0"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Loading quotes...
            </p>
          </div>
        </div>

        {/* Request New Quote Card Skeleton */}
        <div className="w-full px-6 py-4 bg-white dark:bg-dark border border-gray-200 dark:border-[#333333] rounded-xl">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-5 w-36 bg-gray-200 dark:bg-[#2a2a2a] rounded animate-pulse"></div>
              <div className="h-4 w-52 bg-gray-200 dark:bg-[#2a2a2a] rounded animate-pulse"></div>
            </div>
            <div className="w-6 h-6 bg-gray-200 dark:bg-[#2a2a2a] rounded animate-pulse"></div>
          </div>
        </div>

        {/* Quote History Section Skeleton */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white whitespace-nowrap">Quote History</h2>
            <div className="flex items-stretch gap-3 w-full sm:w-auto">
              {/* Search Input Skeleton */}
              <div className="relative flex-[2] sm:w-[280px] sm:flex-initial">
                <div className="w-full h-[38px] bg-white dark:bg-dark border border-gray-200 dark:border-[#333333] rounded-lg"></div>
              </div>
              {/* Filter Button Skeleton */}
              <div className="h-[38px] w-[100px] bg-white dark:bg-dark border border-gray-200 dark:border-[#333333] rounded-lg"></div>
            </div>
          </div>

          {/* Table Skeleton */}
          <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#333333] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#2a2a2a]/50 border-b border-gray-200 dark:border-[#333333]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-[#333333]">
                {Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="bg-white dark:bg-dark">
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-200 dark:bg-[#2a2a2a] rounded-lg animate-pulse" style={{ animationDelay: `${index * 0.1}s` }}></div>
                        <div className="space-y-2">
                          <div className="h-4 w-32 bg-gray-200 dark:bg-[#2a2a2a] rounded animate-pulse" style={{ animationDelay: `${index * 0.1}s` }}></div>
                          <div className="h-3 w-20 bg-gray-200 dark:bg-[#2a2a2a] rounded animate-pulse" style={{ animationDelay: `${index * 0.1}s` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <div className="h-6 w-20 bg-gray-200 dark:bg-[#2a2a2a] rounded-full animate-pulse" style={{ animationDelay: `${index * 0.1}s` }}></div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <div className="h-4 w-24 bg-gray-200 dark:bg-[#2a2a2a] rounded animate-pulse" style={{ animationDelay: `${index * 0.1}s` }}></div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="h-4 w-16 bg-gray-200 dark:bg-[#2a2a2a] rounded animate-pulse ml-auto" style={{ animationDelay: `${index * 0.1}s` }}></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
    <SubscriptionPageWrapper>
      <Helmet>
        <title>My Quotes | Revoa</title>
      </Helmet>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
            Quotes & Product Mapping
          </h1>
          <div className="flex items-start sm:items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 sm:mt-0 flex-shrink-0"></div>
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
        className="w-full px-6 py-4 bg-white dark:bg-dark border border-gray-200 dark:border-[#333333] rounded-xl hover:border-primary-500 dark:hover:border-primary-500 transition-colors text-left"
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white whitespace-nowrap">Quote History</h2>
          <QuoteFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
        </div>

        {/* Quotes Table */}
        {isBlocked ? (
          <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#333333] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#2a2a2a]/50 border-b border-gray-200 dark:border-[#333333]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-[#333333]">
                {Array.from({ length: 4 }).map((_, index) => (
                  <tr key={index} className="bg-white dark:bg-dark">
                    <td className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">...</td>
                    <td className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500 hidden sm:table-cell">...</td>
                    <td className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500 hidden md:table-cell">...</td>
                    <td className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500 text-right">...</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#333333] p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="flex justify-center mb-4">
                <StatusIcon variant="neutral" size="xl" icon={FileText} />
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
                  className="btn btn-secondary"
                >
                  Request your first quote
                  <svg className="btn-icon btn-icon-arrow w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    </SubscriptionPageWrapper>
  );
}
