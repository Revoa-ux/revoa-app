import React, { useState } from 'react';
import { ChevronRight, ExternalLink, LayoutGrid, List, ShoppingBag } from 'lucide-react';
import { Package, Calendar, Truck, Shield, Globe, CheckSquare, Square } from 'lucide-react';
import { Quote } from '@/types/quotes';
import { QuoteStatus } from './QuoteStatus';
import { QuoteActions } from './QuoteActions';
import { ProductAttributesBadge } from './ProductAttributesBadge';
import { QuoteDetailsModal } from './QuoteDetailsModal';
import {
  analyzeShippingVariance,
  getVariantDisplayData,
  formatCurrency,
  getQuoteDisplayMode,
  setQuoteDisplayMode
} from '@/lib/quoteDisplayUtils';

interface QuoteTableProps {
  quotes: Quote[];
  expandedQuotes: string[];
  onToggleExpand: (quoteId: string) => void;
  onAcceptQuote: (quote: Quote) => void;
  onConnectShopify: (quote: Quote) => void;
  onDeleteQuote?: (quoteId: string) => void;
}

export const QuoteTable: React.FC<QuoteTableProps> = ({
  quotes,
  expandedQuotes,
  onToggleExpand,
  onAcceptQuote,
  onConnectShopify,
  onDeleteQuote
}) => {
  const [viewMode, setViewMode] = useState<'modal' | 'expanded'>(() => getQuoteDisplayMode());
  const [modalQuote, setModalQuote] = useState<Quote | null>(null);

  const handleViewModeChange = (mode: 'modal' | 'expanded') => {
    setViewMode(mode);
    setQuoteDisplayMode(mode);
  };

  const handleRowClick = (quote: Quote, canExpand: boolean) => {
    if (!canExpand) return;

    if (viewMode === 'modal') {
      setModalQuote(quote);
    } else {
      onToggleExpand(quote.id);
    }
  };
  // Check if a quote has expandable content
  const isExpandable = (quote: Quote): boolean => {
    // Has multiple variants
    if (quote.variants && quote.variants.length > 1) return true;

    // Has policies or coverage
    if (quote.warrantyDays || quote.coversLostItems || quote.coversDamagedItems || quote.coversLateDelivery) return true;

    // Has advanced shipping
    if (quote.variants?.[0]?.finalVariants?.[0] &&
        Object.keys(quote.variants[0].finalVariants[0].shippingCosts).length > 1) return true;

    // Has at least one variant (quoted status)
    if (quote.status !== 'quote_pending' && quote.variants && quote.variants.length > 0) return true;

    // Is pending with no variants (show pending message)
    if (quote.status === 'quote_pending' && (!quote.variants || quote.variants.length === 0)) return true;

    return false;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {modalQuote && (
        <QuoteDetailsModal
          quote={modalQuote}
          onClose={() => setModalQuote(null)}
        />
      )}

      <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-end items-center gap-2 bg-gray-50 dark:bg-gray-900/50">
        <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">View Mode:</span>
        <button
          onClick={() => handleViewModeChange('modal')}
          className={`p-2 rounded-lg transition-colors ${
            viewMode === 'modal'
              ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          title="Card View (Modal)"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleViewModeChange('expanded')}
          className={`p-2 rounded-lg transition-colors ${
            viewMode === 'expanded'
              ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          title="Table View (Expanded)"
        >
          <List className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Request Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {quotes.map((quote) => {
              const canExpand = isExpandable(quote);

              return (
              <React.Fragment key={quote.id}>
                <tr
                  className={`${canExpand ? 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer' : ''} ${
                    expandedQuotes.includes(quote.id) && viewMode === 'expanded' ? 'bg-gray-50 dark:bg-gray-700' : ''
                  }`}
                  onClick={() => handleRowClick(quote, canExpand)}
                >
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-gray-900 dark:text-white flex items-center">
                        {quote.productName}
                        {canExpand && viewMode === 'expanded' && (
                          <ChevronRight
                            className={`w-4 h-4 ml-2 text-gray-400 transition-transform ${
                              expandedQuotes.includes(quote.id) ? 'rotate-90' : ''
                            }`}
                          />
                        )}
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <a
                          href={
                            quote.shopifyProductId && quote.shopDomain
                              ? `https://${quote.shopDomain}/admin/products/${quote.shopifyProductId}`
                              : quote.productUrl
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center hover:text-primary-500"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Product <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(quote.requestDate).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <QuoteStatus status={quote.status} expiresIn={quote.expiresIn} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm relative">
                    <div className="flex justify-end">
                      <QuoteActions
                        quote={quote}
                        onAcceptQuote={onAcceptQuote}
                        onConnectShopify={onConnectShopify}
                        onDeleteQuote={onDeleteQuote}
                      />
                    </div>
                  </td>
                </tr>
                {expandedQuotes.includes(quote.id) && viewMode === 'expanded' && (() => {
                  const shippingAnalysis = analyzeShippingVariance(quote);
                  const variantData = getVariantDisplayData(quote, shippingAnalysis);
                  const hasProtection = !!(
                    quote.warrantyDays ||
                    quote.coversLostItems ||
                    quote.coversDamagedItems ||
                    quote.coversLateDelivery
                  );

                  return (
                  <>
                    {/* Variants Table Style */}
                    {variantData.length > 0 && (
                      <tr className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-600">
                        <td colSpan={4} className="px-6 py-6">
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Package className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Product Variants</h4>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 dark:text-gray-400">Variant Name</th>
                                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-600 dark:text-gray-400">Unit Price</th>
                                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-600 dark:text-gray-400">Shipping</th>
                                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-600 dark:text-gray-400">Total (1 unit)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {variantData.map((variant, index) => (
                                    <React.Fragment key={index}>
                                      <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800">
                                        <td className="py-2 px-3">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900 dark:text-white">{variant.name}</span>
                                            {variant.attributes.length > 0 && (
                                              <ProductAttributesBadge attributes={variant.attributes} />
                                            )}
                                          </div>
                                        </td>
                                        <td className="py-2 px-3 text-right font-medium text-gray-900 dark:text-white">
                                          {formatCurrency(variant.pricePerUnit)}
                                        </td>
                                        <td className="py-2 px-3 text-right font-medium text-gray-900 dark:text-white">
                                          {formatCurrency(variant.standardShipping)}
                                        </td>
                                        <td className="py-2 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                                          {formatCurrency(variant.totalCost)}
                                        </td>
                                      </tr>
                                      {variant.hasUniqueShipping && Object.keys(variant.countryShipping).length > 0 && (
                                        <tr>
                                          <td colSpan={4} className="py-2 px-3 bg-gray-50 dark:bg-gray-800">
                                            <div className="text-xs">
                                              <span className="font-medium text-gray-600 dark:text-gray-400 mr-2">Shipping Cost by Country:</span>
                                              <span className="text-gray-700 dark:text-gray-300">
                                                {Object.entries(variant.countryShipping)
                                                  .sort(([a], [b]) => a.localeCompare(b))
                                                  .map(([country, cost]) => `${country.toUpperCase()}: ${formatCurrency(cost)}`)
                                                  .join(' • ')}
                                              </span>
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Pending Quote Message */}
                    {quote.status === 'quote_pending' && (!quote.variants || quote.variants.length === 0) && (
                      <tr className="bg-blue-50/50 dark:bg-blue-900/10 border-t border-blue-200 dark:border-blue-800">
                        <td colSpan={4} className="px-6 py-8 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <ShoppingBag className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">Quote Pending</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                We're working on getting you the best pricing from our suppliers
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Product Protection & Shipping Details */}
                    {(hasProtection || (shippingAnalysis.hasCountryShipping && !shippingAnalysis.hasVariance)) && (
                      <tr className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-600">
                        <td colSpan={4} className="px-6 py-6">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Product Protection */}
                            {hasProtection && (
                              <div>
                                <div className="flex items-center gap-2 mb-3">
                                  <Shield className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Protection Included</h4>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                  Based on the factory and logistics company
                                </p>

                                <div className="space-y-2">
                                  {quote.warrantyDays && (
                                    <div className="p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Calendar className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                                        <p className="text-xs font-medium text-gray-900 dark:text-white">Warranty Coverage</p>
                                      </div>
                                      <p className="text-xs text-gray-600 dark:text-gray-400">
                                        Protected for {quote.warrantyDays} days if you receive defective items
                                      </p>
                                    </div>
                                  )}

                                  {(quote.coversLostItems || quote.coversDamagedItems || quote.coversLateDelivery) && (
                                    <div className="p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Truck className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                                        <p className="text-xs font-medium text-gray-900 dark:text-white">Shipping Protection</p>
                                      </div>
                                      <div className="space-y-1">
                                        {quote.coversLostItems && (
                                          <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                            <CheckSquare className="w-3 h-3 text-green-600 dark:text-green-400" />
                                            Lost packages replaced/refunded
                                          </p>
                                        )}
                                        {quote.coversDamagedItems && (
                                          <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                            <CheckSquare className="w-3 h-3 text-green-600 dark:text-green-400" />
                                            Damaged items covered
                                          </p>
                                        )}
                                        {quote.coversLateDelivery && (
                                          <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                            <CheckSquare className="w-3 h-3 text-green-600 dark:text-green-400" />
                                            Delay compensation
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Common Shipping Costs */}
                            {shippingAnalysis.hasCountryShipping && !shippingAnalysis.hasVariance && shippingAnalysis.commonShipping && (
                              <div>
                                <div className="flex items-center gap-2 mb-3">
                                  <Globe className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Shipping Cost by Country</h4>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                  Same rates apply to all variants
                                </p>
                                <div className="space-y-1.5">
                                  {Object.entries(shippingAnalysis.commonShipping)
                                    .sort(([a], [b]) => a.localeCompare(b))
                                    .map(([country, cost]) => (
                                      <div
                                        key={country}
                                        className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-xs"
                                      >
                                        <span className="font-medium text-gray-700 dark:text-gray-300">
                                          {country.toUpperCase()}
                                        </span>
                                        <span className="font-semibold text-gray-900 dark:text-white">
                                          {formatCurrency(cost)}
                                        </span>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}

                  </>
                  );
                })()}
              </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};