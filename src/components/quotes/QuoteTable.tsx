import React from 'react';
import { ChevronRight, ExternalLink } from 'lucide-react'; // eslint-disable-line @typescript-eslint/no-unused-vars
import { Quote } from '@/types/quotes';
import { QuoteStatus } from './QuoteStatus';
import { QuoteActions } from './QuoteActions';

interface QuoteTableProps {
  quotes: Quote[];
  expandedQuotes: string[];
  onToggleExpand: (quoteId: string) => void;
  onAcceptQuote: (quote: Quote) => void;
  onConnectShopify: (quote: Quote) => void;
}

export const QuoteTable: React.FC<QuoteTableProps> = ({
  quotes,
  expandedQuotes,
  onToggleExpand,
  onAcceptQuote,
  onConnectShopify
}) => {
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
            {quotes.map((quote) => (
              <React.Fragment key={quote.id}>
                <tr 
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                    expandedQuotes.includes(quote.id) ? 'bg-gray-50 dark:bg-gray-700' : ''
                  }`}
                  onClick={() => quote.variants && onToggleExpand(quote.id)}
                >
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-gray-900 dark:text-white flex items-center">
                        {quote.productName}
                        {quote.variants && (
                          <ChevronRight 
                            className={`w-4 h-4 ml-2 text-gray-400 transition-transform ${
                              expandedQuotes.includes(quote.id) ? 'rotate-90' : ''
                            }`}
                          />
                        )}
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <a
                          href={quote.productUrl}
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
                    {quote.variants?.[0]
                      ? `$${quote.variants[0].costPerItem.toFixed(2)}`
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                    {quote.variants?.[0]
                      ? `$${quote.variants[0].shippingCost.toFixed(2)}`
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                    {quote.variants?.[0]
                      ? `$${quote.variants[0].totalCost.toFixed(2)}`
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex justify-end">
                      <QuoteActions
                        quote={quote}
                        onAcceptQuote={onAcceptQuote}
                        onConnectShopify={onConnectShopify}
                      />
                    </div>
                  </td>
                </tr>
                {quote.variants && expandedQuotes.includes(quote.id) && (
                  quote.variants.slice(1).map((variant) => (
                    <tr 
                      key={`${quote.id}-${variant.quantity}`} 
                      className="bg-gray-50/95 dark:bg-gray-700/95 border-t border-gray-100 dark:border-gray-600"
                    >
                      <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400 pl-12">
                        {variant.quantity} Pack Option
                      </td>
                      <td className="px-6 py-3" />
                      <td className="px-6 py-3" />
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                        ${variant.costPerItem.toFixed(2)}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                        ${variant.shippingCost.toFixed(2)}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                        ${variant.totalCost.toFixed(2)}
                      </td>
                      <td className="px-6 py-3" />
                    </tr>
                  ))
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};