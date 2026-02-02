import React, { useState } from 'react';
import { ChevronRight, ExternalLink, ShoppingBag, Package, Check, X, Info } from 'lucide-react';
import { Quote } from '@/types/quotes';
import { QuoteStatus } from './QuoteStatus';
import { QuoteActions } from './QuoteActions';
import { ProductAttributesBadge } from './ProductAttributesBadge';
import {
  analyzeShippingVariance,
  getVariantDisplayData,
  formatCurrency
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
  const [showStatusTooltip, setShowStatusTooltip] = useState(false);
  const handleRowClick = (quote: Quote, canExpand: boolean) => {
    if (!canExpand) return;
    onToggleExpand(quote.id);
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
    <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a]">
      <div className="overflow-x-auto rounded-xl">
        <table className="w-full table-fixed">
        <thead>
          <tr className="bg-gray-50 dark:bg-[#3a3a3a] border-b border-gray-200 dark:border-[#4a4a4a]">
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap w-[40%]">Product</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap w-[20%]">
                <span className="hidden sm:inline">Request Date</span>
                <span className="sm:hidden">Date</span>
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap w-[20%]">
                <div className="flex items-center gap-1.5 relative">
                  <span>Status</span>
                  <div
                    className="relative hidden sm:block"
                    onMouseEnter={() => setShowStatusTooltip(true)}
                    onMouseLeave={() => setShowStatusTooltip(false)}
                  >
                    <Info className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 cursor-help" />
                    {showStatusTooltip && (
                      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-56 px-3 py-2 text-xs font-normal text-gray-700 dark:text-gray-200 bg-white dark:bg-[#3a3a3a] border border-gray-200 dark:border-[#4a4a4a] rounded-lg shadow-lg z-50">
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white dark:bg-[#3a3a3a] border-l border-t border-gray-200 dark:border-[#4a4a4a] rotate-45"></div>
                        Quotes are valid for 7 days from the date they are provided. Please accept before expiration.
                      </div>
                    )}
                  </div>
                </div>
              </th>
              <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap w-[20%]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-[#3a3a3a]">
            {quotes.map((quote) => {
              const canExpand = isExpandable(quote);

              return (
              <React.Fragment key={quote.id}>
                <tr
                  className={`${canExpand ? 'hover:bg-gray-50 dark:hover:bg-[#3a3a3a] cursor-pointer' : ''} ${
                    expandedQuotes.includes(quote.id) ? 'bg-gray-50 dark:bg-[#3a3a3a]' : ''
                  }`}
                  onClick={() => handleRowClick(quote, canExpand)}
                >
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <div className="overflow-hidden">
                      <div className="text-xs sm:text-sm text-gray-900 dark:text-white flex items-center">
                        <span className="break-words line-clamp-1">{quote.productName}</span>
                        {canExpand && (
                          <ChevronRight
                            className={`w-4 h-4 ml-1.5 text-gray-400 transition-transform flex-shrink-0 ${
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
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(quote.requestDate).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <QuoteStatus status={quote.status} expiresIn={quote.expiresIn} />
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-right text-sm">
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
                {expandedQuotes.includes(quote.id) && (() => {
                  // Collect all unique countries and quantity tiers
                  const allCountries = new Set<string>();
                  const allQuantityTiers = new Set<number>();
                  const variantDetails: Array<{
                    name: string;
                    sku: string;
                    attributes: any[];
                    unitPrice: number;
                    defaultShipping: number;
                    countryShipping: { [key: string]: number };
                    quantityTiers?: Array<{ minQty: number; discountAmount: number }>;
                  }> = [];

                  quote.variants?.forEach(variant => {
                    variant.finalVariants.forEach((fv, idx) => {
                      // Collect country codes
                      Object.keys(fv.shippingCosts).forEach(key => {
                        if (key !== '_default') allCountries.add(key);
                      });

                      // Collect quantity tiers
                      if (fv.quantityTiers && fv.quantityTiers.length > 0) {
                        fv.quantityTiers.forEach(tier => allQuantityTiers.add(tier.minQty));
                      }

                      variantDetails.push({
                        name: fv.variantName || fv.attributes.map(a => a.value).join(' - ') || `Variant ${idx + 1}`,
                        sku: fv.sku,
                        attributes: fv.attributes,
                        unitPrice: fv.costPerItem,
                        defaultShipping: fv.shippingCosts._default,
                        countryShipping: Object.fromEntries(
                          Object.entries(fv.shippingCosts).filter(([k]) => k !== '_default')
                        ),
                        quantityTiers: fv.quantityTiers
                      });
                    });
                  });

                  const sortedCountries = Array.from(allCountries).sort();
                  const sortedQuantityTiers = Array.from(allQuantityTiers).sort((a, b) => a - b);
                  const hasProtection = !!(
                    quote.warrantyDays ||
                    quote.coversLostItems ||
                    quote.coversDamagedItems ||
                    quote.coversLateDelivery
                  );

                  return (
                  <>
                    {/* Variants Table */}
                    {variantDetails.length > 0 && (
                      <tr className="bg-gray-50 dark:bg-[#3a3a3a]/50 border-t border-gray-200 dark:border-[#4a4a4a]">
                        <td colSpan={4} className="p-0">
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                              <thead>
                                <tr className="bg-gray-100 dark:bg-dark border-b border-gray-200 dark:border-[#3a3a3a]">
                                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 sticky left-0 bg-gray-100 dark:bg-dark z-10 min-w-[200px] whitespace-nowrap">
                                    Variant
                                  </th>
                                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 min-w-[120px] whitespace-nowrap">
                                    SKU
                                  </th>
                                  <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 min-w-[100px] whitespace-nowrap">
                                    Unit Price
                                  </th>
                                  <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 min-w-[120px] whitespace-nowrap">
                                    Default Ship
                                  </th>
                                  {sortedCountries.map(country => (
                                    <th key={country} className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 min-w-[100px] whitespace-nowrap">
                                      {country.toUpperCase()} Ship
                                    </th>
                                  ))}
                                  {sortedQuantityTiers.map(minQty => (
                                    <th key={`discount-${minQty}`} className="text-right py-3 px-4 font-semibold text-amber-600 dark:text-amber-400 min-w-[90px] whitespace-nowrap">
                                      {minQty}+ Disc
                                    </th>
                                  ))}
                                  {sortedQuantityTiers.map(minQty => (
                                    <th key={`total-${minQty}`} className="text-right py-3 px-4 font-semibold text-green-600 dark:text-green-400 min-w-[100px] whitespace-nowrap">
                                      {minQty}+ Total
                                    </th>
                                  ))}
                                  <th className="text-right py-3 px-4 font-semibold text-rose-600 dark:text-rose-400 min-w-[100px] whitespace-nowrap">
                                    Total (1)
                                  </th>
                                  {quote.warrantyDays && (
                                    <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 min-w-[90px] whitespace-nowrap">
                                      Warranty
                                    </th>
                                  )}
                                  {(quote.coversLostItems !== undefined || quote.coversDamagedItems !== undefined || quote.coversLateDelivery !== undefined) && (
                                    <>
                                      <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 min-w-[80px] whitespace-nowrap">
                                        Lost
                                      </th>
                                      <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 min-w-[90px] whitespace-nowrap">
                                        Damaged
                                      </th>
                                      <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 min-w-[120px] whitespace-nowrap">
                                        Late Delivery
                                      </th>
                                    </>
                                  )}
                                </tr>
                              </thead>
                              <tbody>
                                {variantDetails.map((variant, index) => (
                                  <tr key={index} className="border-b border-gray-200 dark:border-[#3a3a3a] group hover:bg-gray-100 dark:hover:bg-[#2a2a2a]">
                                    <td className="py-3 px-4 sticky left-0 bg-gray-50 dark:bg-[#3a3a3a]/50 group-hover:bg-gray-100 dark:group-hover:bg-[#2a2a2a] z-10 transition-colors">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900 dark:text-white">{variant.name}</span>
                                        {variant.attributes.length > 0 && (
                                          <ProductAttributesBadge attributes={variant.attributes} />
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400 font-mono text-xs">
                                      {variant.sku}
                                    </td>
                                    <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-white">
                                      {formatCurrency(variant.unitPrice)}
                                    </td>
                                    <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-white">
                                      {formatCurrency(variant.defaultShipping)}
                                    </td>
                                    {sortedCountries.map(country => (
                                      <td key={country} className="py-3 px-4 text-right font-medium text-gray-900 dark:text-white">
                                        {variant.countryShipping[country] !== undefined
                                          ? formatCurrency(variant.countryShipping[country])
                                          : '-'}
                                      </td>
                                    ))}
                                    {sortedQuantityTiers.map(minQty => {
                                      const tier = variant.quantityTiers?.find(t => t.minQty === minQty);
                                      return (
                                        <td key={`discount-${minQty}`} className="py-3 px-4 text-right font-medium text-amber-600 dark:text-amber-400">
                                          {tier ? `-${formatCurrency(tier.discountAmount)}` : '-'}
                                        </td>
                                      );
                                    })}
                                    {sortedQuantityTiers.map(minQty => {
                                      const tier = variant.quantityTiers?.find(t => t.minQty === minQty);
                                      const totalCost = tier
                                        ? (variant.unitPrice * minQty) + (variant.defaultShipping * minQty) - tier.discountAmount
                                        : (variant.unitPrice + variant.defaultShipping) * minQty;
                                      return (
                                        <td key={`total-${minQty}`} className="py-3 px-4 text-right font-bold text-green-600 dark:text-green-400">
                                          {formatCurrency(totalCost)}
                                        </td>
                                      );
                                    })}
                                    <td className="py-3 px-4 text-right font-bold text-rose-600 dark:text-rose-400">
                                      {formatCurrency(variant.unitPrice + variant.defaultShipping)}
                                    </td>
                                    {quote.warrantyDays && (
                                      <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400 text-xs">
                                        {quote.warrantyDays}d
                                      </td>
                                    )}
                                    {(quote.coversLostItems !== undefined || quote.coversDamagedItems !== undefined || quote.coversLateDelivery !== undefined) && (
                                      <>
                                        <td className="py-3 px-4 text-center">
                                          {quote.coversLostItems ? (
                                            <Check className="w-4 h-4 text-green-500 mx-auto" />
                                          ) : (
                                            <X className="w-4 h-4 text-gray-300 dark:text-gray-600 mx-auto" />
                                          )}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                          {quote.coversDamagedItems ? (
                                            <Check className="w-4 h-4 text-green-500 mx-auto" />
                                          ) : (
                                            <X className="w-4 h-4 text-gray-300 dark:text-gray-600 mx-auto" />
                                          )}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                          {quote.coversLateDelivery ? (
                                            <Check className="w-4 h-4 text-green-500 mx-auto" />
                                          ) : (
                                            <X className="w-4 h-4 text-gray-300 dark:text-gray-600 mx-auto" />
                                          )}
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Pending Quote Message */}
                    {quote.status === 'quote_pending' && (!quote.variants || quote.variants.length === 0) && (
                      <tr className="bg-gray-50/50 dark:bg-dark/50 border-t border-gray-200 dark:border-[#3a3a3a]">
                        <td colSpan={4} className="px-6 py-8 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <ShoppingBag className="w-8 h-8 text-gray-500 dark:text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">Quote Pending</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                We're working on getting you the best pricing from our fulfillment network
                              </p>
                            </div>
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