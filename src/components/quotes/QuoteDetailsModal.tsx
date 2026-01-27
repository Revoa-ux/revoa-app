import React from 'react';
import { X, Package, Shield, Globe, Calendar, Truck, CheckSquare, Square } from 'lucide-react';
import Modal from '@/components/Modal';
import { Quote } from '@/types/quotes';
import { ProductAttributesBadge } from './ProductAttributesBadge';
import {
  analyzeShippingVariance,
  getVariantDisplayData,
  formatCurrency,
  VariantDisplayData
} from '@/lib/quoteDisplayUtils';

interface QuoteDetailsModalProps {
  quote: Quote;
  onClose: () => void;
}

export const QuoteDetailsModal: React.FC<QuoteDetailsModalProps> = ({ quote, onClose }) => {
  const shippingAnalysis = analyzeShippingVariance(quote);
  const variantData = getVariantDisplayData(quote, shippingAnalysis);

  const hasProtection = !!(
    quote.warrantyDays ||
    quote.coversLostItems ||
    quote.coversDamagedItems ||
    quote.coversLateDelivery
  );

  return (
    <Modal isOpen={true} onClose={onClose} maxWidth="max-w-5xl" title="">
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#3a3a3a] pb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {quote.productName}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Quote Details
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {variantData.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-rose-500 dark:text-rose-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Product Variants
              </h3>
            </div>

            <div className="space-y-4">
              {variantData.map((variant, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-dark rounded-lg border border-gray-200 dark:border-[#3a3a3a] p-5"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                        {variant.name}
                      </h4>
                      {variant.attributes.length > 0 && (
                        <ProductAttributesBadge attributes={variant.attributes} />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Price per Unit
                      </p>
                      <p className="text-base font-bold text-gray-900 dark:text-white">
                        {formatCurrency(variant.pricePerUnit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Standard Shipping
                      </p>
                      <p className="text-base font-bold text-gray-900 dark:text-white">
                        {formatCurrency(variant.standardShipping)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Total Cost (1 unit)
                      </p>
                      <p className="text-base font-bold text-rose-600 dark:text-rose-400">
                        {formatCurrency(variant.totalCost)}
                      </p>
                    </div>
                  </div>

                  {variant.hasUniqueShipping && Object.keys(variant.countryShipping).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[#3a3a3a]">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Shipping Cost by Country
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {Object.entries(variant.countryShipping)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([country, cost]) => (
                            <div
                              key={country}
                              className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-[#3a3a3a]/50 rounded text-xs"
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
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {shippingAnalysis.hasCountryShipping && !shippingAnalysis.hasVariance && shippingAnalysis.commonShipping && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                  Shipping Cost by Country
                </h4>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Same rates apply to all variants
              </p>
              <div className="space-y-2">
                {Object.entries(shippingAnalysis.commonShipping)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([country, cost]) => (
                    <div
                      key={country}
                      className="flex items-center justify-between p-3 bg-white dark:bg-dark rounded-lg border border-gray-200 dark:border-[#3a3a3a]"
                    >
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {country.toUpperCase()}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(cost)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {hasProtection && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                  Protection Included
                </h4>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Based on the factory and logistics company
              </p>

              <div className="space-y-3">
                {quote.warrantyDays && (
                  <div className="p-4 bg-white dark:bg-dark rounded-lg border border-gray-200 dark:border-[#3a3a3a]">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <h5 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Warranty Coverage
                      </h5>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Protected for {quote.warrantyDays} days if you receive defective items
                    </p>
                  </div>
                )}

                {(quote.coversLostItems || quote.coversDamagedItems || quote.coversLateDelivery) && (
                  <div className="p-4 bg-white dark:bg-dark rounded-lg border border-gray-200 dark:border-[#3a3a3a]">
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <h5 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Shipping Protection
                      </h5>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs">
                        {quote.coversLostItems ? (
                          <CheckSquare className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-gray-400" />
                        )}
                        <span className="text-gray-700 dark:text-gray-300">
                          Lost packages will be replaced or refunded
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {quote.coversDamagedItems ? (
                          <CheckSquare className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-gray-400" />
                        )}
                        <span className="text-gray-700 dark:text-gray-300">
                          Damaged items during shipping are covered
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {quote.coversLateDelivery ? (
                          <CheckSquare className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-gray-400" />
                        )}
                        <span className="text-gray-700 dark:text-gray-300">
                          Compensation for significant delays
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
