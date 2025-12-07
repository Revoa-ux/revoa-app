import React from 'react';
import { ChevronRight, ExternalLink, ArrowUp, ArrowDown, ArrowUpDown, ShoppingBag, Calendar, Truck, Shield, Globe, Package, AlertCircle } from 'lucide-react';
import { Quote } from '@/types/quotes';
import { QuoteStatus } from './QuoteStatus';
import { QuoteActions } from './QuoteActions';
import { ProductAttributesBadge } from './ProductAttributesBadge';

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
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 first:rounded-tl-xl">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Request Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Item</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Shipping</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Total</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 last:rounded-tr-xl">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {quotes.map((quote) => {
              const canExpand = isExpandable(quote);

              return (
              <React.Fragment key={quote.id}>
                <tr
                  className={`${canExpand ? 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer' : ''} ${
                    expandedQuotes.includes(quote.id) ? 'bg-gray-50 dark:bg-gray-700' : ''
                  }`}
                  onClick={canExpand ? () => onToggleExpand(quote.id) : undefined}
                >
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-gray-900 dark:text-white flex items-center">
                        {quote.productName}
                        {canExpand && (
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
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                    {quote.variants?.[0]?.costPerItem != null
                      ? `$${quote.variants[0].costPerItem.toFixed(2)}`
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                    {quote.variants?.[0]?.shippingCost != null
                      ? `$${quote.variants[0].shippingCost.toFixed(2)}`
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                    {quote.variants?.[0]?.totalCost != null
                      ? `$${quote.variants[0].totalCost.toFixed(2)}`
                      : '-'}
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
                {expandedQuotes.includes(quote.id) && (
                  <>
                    {/* Additional Variants */}
                    {quote.variants && quote.variants.slice(1).map((variant) => (
                      <tr
                        key={`${quote.id}-${variant.quantity}`}
                        className="bg-gray-50/95 dark:bg-gray-700/95 border-t border-gray-100 dark:border-gray-600"
                      >
                        <td className="px-6 py-3 pl-12">
                          <div className="space-y-1">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {variant.quantity} Pack Option
                            </div>
                            {variant.attributes && variant.attributes.length > 0 && (
                              <ProductAttributesBadge attributes={variant.attributes} />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3" />
                        <td className="px-6 py-3" />
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                          {variant.costPerItem != null ? `$${variant.costPerItem.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                          {variant.shippingCost != null ? `$${variant.shippingCost.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                          {variant.totalCost != null ? `$${variant.totalCost.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-6 py-3" />
                      </tr>
                    ))}

                    {/* Pending Quote Message */}
                    {quote.status === 'quote_pending' && (!quote.variants || quote.variants.length === 0) && (
                      <tr className="bg-blue-50/50 dark:bg-blue-900/10 border-t border-blue-200 dark:border-blue-800">
                        <td colSpan={7} className="px-6 py-8 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <ShoppingBag className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">Quote Pending</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                Waiting for pricing and variant details from supplier
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Product Policies & Advanced Shipping Section */}
                    {(quote.warrantyDays || quote.coversLostItems || quote.coversDamagedItems || quote.coversLateDelivery ||
                      (quote.variants?.[0]?.finalVariants?.[0] && Object.keys(quote.variants[0].finalVariants[0].shippingCosts).length > 1)) && (
                      <tr className="bg-gradient-to-br from-gray-50/95 to-gray-100/95 dark:from-gray-700/95 dark:to-gray-800/95 border-t border-gray-200 dark:border-gray-600">
                        <td colSpan={7} className="px-6 py-6">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Product Policies */}
                            {(quote.warrantyDays || quote.coversLostItems || quote.coversDamagedItems || quote.coversLateDelivery) && (
                              <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <Shield className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Product Policies</h4>
                                </div>

                                <div className="space-y-3">
                                  {/* Warranty */}
                                  {quote.warrantyDays && (
                                    <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                      <Calendar className="w-4 h-4 text-rose-500 dark:text-rose-400 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">Factory Warranty</p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                          {quote.warrantyDays} days coverage for defects from delivery
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Shipping Coverage */}
                                  {(quote.coversLostItems || quote.coversDamagedItems || quote.coversLateDelivery) && (
                                    <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                      <Truck className="w-4 h-4 text-rose-500 dark:text-rose-400 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1.5">Logistics Coverage</p>
                                        <div className="space-y-1">
                                          {quote.coversLostItems && (
                                            <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                              <span className="w-1 h-1 rounded-full bg-green-500 flex-shrink-0"></span>
                                              Covers lost items in transit
                                            </p>
                                          )}
                                          {quote.coversDamagedItems && (
                                            <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                              <span className="w-1 h-1 rounded-full bg-green-500 flex-shrink-0"></span>
                                              Covers damaged items in transit
                                            </p>
                                          )}
                                          {quote.coversLateDelivery && (
                                            <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                              <span className="w-1 h-1 rounded-full bg-green-500 flex-shrink-0"></span>
                                              Covers late delivery
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Advanced Shipping */}
                            {quote.variants?.[0]?.finalVariants?.[0] && (() => {
                              const shippingCosts = quote.variants[0].finalVariants[0].shippingCosts;
                              const countries = Object.keys(shippingCosts).filter(k => k !== '_default');
                              return countries.length > 0 && (
                                <div className="space-y-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Globe className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Advanced Shipping</h4>
                                  </div>

                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between p-2.5 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Default (Global)</span>
                                      <span className="text-xs font-semibold text-gray-900 dark:text-white">
                                        {shippingCosts._default != null ? `$${shippingCosts._default.toFixed(2)}` : '-'}
                                      </span>
                                    </div>

                                    {countries.map(country => (
                                      <div key={country} className="flex items-center justify-between p-2.5 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{country.toUpperCase()}</span>
                                        <span className="text-xs font-semibold text-gray-900 dark:text-white">
                                          {shippingCosts[country] != null ? `$${shippingCosts[country].toFixed(2)}` : '-'}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Fallback: Basic Quote Details (when no advanced settings exist) */}
                    {(!quote.variants || quote.variants.length <= 1) &&
                      quote.status !== 'quote_pending' &&
                      !quote.warrantyDays &&
                      !quote.coversLostItems &&
                      !quote.coversDamagedItems &&
                      !quote.coversLateDelivery &&
                      !(quote.variants?.[0]?.finalVariants?.[0] && Object.keys(quote.variants[0].finalVariants[0].shippingCosts).length > 1) && (
                      <tr className="bg-gray-50/50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
                        <td colSpan={7} className="px-6 py-6">
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Package className="w-4 h-4 text-gray-400" />
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Quote Details</h4>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {quote.variants?.[0] && (
                                <>
                                  <div className="p-3 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Quantity</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{quote.variants[0].quantity} units</p>
                                  </div>

                                  <div className="p-3 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Unit Cost</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                      {quote.variants[0].costPerItem != null ? `$${quote.variants[0].costPerItem.toFixed(2)}` : '-'}
                                    </p>
                                  </div>

                                  <div className="p-3 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Cost</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                      {quote.variants[0].totalCost != null ? `$${quote.variants[0].totalCost.toFixed(2)}` : '-'}
                                    </p>
                                  </div>
                                </>
                              )}

                              {quote.productUrl && (
                                <div className="p-3 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 md:col-span-2 lg:col-span-3">
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Source URL</p>
                                  <a
                                    href={quote.productUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-rose-600 dark:text-rose-400 hover:underline break-all"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {quote.productUrl}
                                  </a>
                                </div>
                              )}
                            </div>

                            {!quote.variants?.[0] && (
                              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <AlertCircle className="w-4 h-4 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-xs font-medium text-gray-900 dark:text-white">Standard Quote</p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                    This is a standard quote without additional policies or advanced shipping options.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};