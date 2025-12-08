import React from 'react';
import { ChevronRight, ExternalLink, ArrowUp, ArrowDown, ArrowUpDown, ShoppingBag, Calendar, Truck, Shield, Globe, Package, AlertCircle, CheckSquare, Square } from 'lucide-react';
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
                    {/* Variants */}
                    {quote.variants && quote.variants.length > 0 && (
                      <tr className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 border-t border-gray-200 dark:border-gray-600">
                        <td colSpan={4} className="px-6 py-6">
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-4">
                              <Package className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                              <h4 className="text-base font-semibold text-gray-900 dark:text-white">Product Variants</h4>
                            </div>

                            <div className="grid gap-3">
                              {(() => {
                                // Deduplicate variants by pricing (costPerItem + shippingCost + attributes)
                                const uniquePricingMap = new Map();

                                quote.variants.forEach((variant) => {
                                  const finalVariant = variant.finalVariants?.[0];
                                  const costPerItem = finalVariant?.costPerItem;
                                  const shippingCost = finalVariant?.shippingCosts?._default;
                                  const attributesKey = finalVariant?.attributes
                                    ? JSON.stringify(finalVariant.attributes.sort())
                                    : '';

                                  // Create unique key based on pricing and attributes
                                  const pricingKey = `${costPerItem}-${shippingCost}-${attributesKey}`;

                                  if (!uniquePricingMap.has(pricingKey)) {
                                    uniquePricingMap.set(pricingKey, {
                                      variant,
                                      finalVariant,
                                      costPerItem,
                                      shippingCost,
                                      packSizes: [variant.packSize]
                                    });
                                  } else {
                                    // Add this pack size to existing pricing group
                                    uniquePricingMap.get(pricingKey).packSizes.push(variant.packSize);
                                  }
                                });

                                return Array.from(uniquePricingMap.values()).map((group, index) => {
                                  const { variant, finalVariant, costPerItem, shippingCost, packSizes } = group;
                                  // Use smallest pack size for total cost calculation
                                  const smallestPackSize = Math.min(...packSizes);
                                  const totalCost = costPerItem && shippingCost ? (costPerItem * smallestPackSize + shippingCost) : null;

                                  return (
                                    <div
                                      key={`${quote.id}-pricing-${index}`}
                                      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                                    >
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-3 mb-3">
                                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                              {packSizes.length === 1
                                                ? `${packSizes[0]} ${packSizes[0] === 1 ? 'Unit' : 'Units'}`
                                                : `${Math.min(...packSizes)}-${Math.max(...packSizes)} Units`
                                              }
                                            </span>
                                            {finalVariant?.attributes && finalVariant.attributes.length > 0 && (
                                              <ProductAttributesBadge attributes={finalVariant.attributes} />
                                            )}
                                          </div>

                                          <div className="grid grid-cols-3 gap-4">
                                            <div>
                                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Price per Unit</p>
                                              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {costPerItem != null ? `$${costPerItem.toFixed(2)}` : '-'}
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Shipping Cost</p>
                                              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {shippingCost != null ? `$${shippingCost.toFixed(2)}` : '-'}
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Cost</p>
                                              <p className="text-base font-bold text-rose-600 dark:text-rose-400">
                                                {totalCost != null ? `$${totalCost.toFixed(2)}` : '-'}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
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
                    {(quote.warrantyDays || quote.coversLostItems || quote.coversDamagedItems || quote.coversLateDelivery ||
                      (quote.variants?.[0]?.finalVariants?.[0] && Object.keys(quote.variants[0].finalVariants[0].shippingCosts).length > 1)) && (
                      <tr className="bg-gradient-to-br from-gray-50/95 to-gray-100/95 dark:from-gray-700/95 dark:to-gray-800/95 border-t border-gray-200 dark:border-gray-600">
                        <td colSpan={4} className="px-6 py-6">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Product Protection */}
                            {(quote.warrantyDays || quote.coversLostItems || quote.coversDamagedItems || quote.coversLateDelivery) && (
                              <div className="space-y-4">
                                <div className="mb-4">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Shield className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                                    <h4 className="text-base font-semibold text-gray-900 dark:text-white">Protection Included</h4>
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Based on the factory and logistics company
                                  </p>
                                </div>

                                <div className="space-y-3">
                                  {/* Warranty */}
                                  {quote.warrantyDays && (
                                    <div className="p-4 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                      <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Warranty Coverage</p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                          Protected for {quote.warrantyDays} days if you receive defective items
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Shipping Protection */}
                                  <div className="p-4 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Shipping Protection</p>
                                      <div className="space-y-1.5">
                                        <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                          {quote.coversLostItems ? (
                                            <CheckSquare className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300 flex-shrink-0" />
                                          ) : (
                                            <Square className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                          )}
                                          Lost packages will be replaced or refunded
                                        </p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                          {quote.coversDamagedItems ? (
                                            <CheckSquare className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300 flex-shrink-0" />
                                          ) : (
                                            <Square className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                          )}
                                          Damaged items during shipping are covered
                                        </p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                          {quote.coversLateDelivery ? (
                                            <CheckSquare className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300 flex-shrink-0" />
                                          ) : (
                                            <Square className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                          )}
                                          Compensation for significant delays
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* International Shipping */}
                            {quote.variants?.[0]?.finalVariants?.[0] && (() => {
                              const shippingCosts = quote.variants[0].finalVariants[0].shippingCosts;
                              const countries = Object.keys(shippingCosts).filter(k => k !== '_default');
                              return countries.length > 0 && (
                                <div className="space-y-4">
                                  <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Globe className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                                      <h4 className="text-base font-semibold text-gray-900 dark:text-white">Shipping Cost By Country</h4>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      Different shipping rates apply based on destination
                                    </p>
                                  </div>

                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Standard Shipping</span>
                                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {shippingCosts._default != null ? `$${shippingCosts._default.toFixed(2)}` : '-'}
                                      </span>
                                    </div>

                                    {countries.map(country => (
                                      <div key={country} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{country.toUpperCase()}</span>
                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
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