import React from 'react';
import { MoreVertical, Eye, Download, Trash2, CheckCircle, ShoppingBag } from 'lucide-react';
import { Quote } from '@/types/quotes';

interface QuoteActionsProps {
  quote: Quote;
  onAcceptQuote?: (quote: Quote) => void;
  onConnectShopify?: (quote: Quote) => void;
}

export const QuoteActions: React.FC<QuoteActionsProps> = ({
  quote,
  onAcceptQuote,
  onConnectShopify
}) => {
  const [showMenu, setShowMenu] = React.useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
      >
        <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(quote.productUrl, '_blank');
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              View Product
            </button>

            {quote.status === 'accepted' && quote.variants && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Generate CSV or download quote
                  const csvContent = `Quantity,Cost Per Item,Shipping,Total\n${
                    quote.variants.map(v => `${v.quantity},$${v.costPerItem},$${v.shippingCost},$${v.totalCost}`).join('\n')
                  }`;
                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `quote-${quote.id}.csv`;
                  a.click();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Quote
              </button>
            )}

            {quote.status === 'quote_pending' && onAcceptQuote && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAcceptQuote(quote);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-green-600 dark:text-green-400 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Accept Quote
              </button>
            )}

            {quote.status === 'accepted' && !quote.shopifyConnected && onConnectShopify && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onConnectShopify(quote);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 border-t border-gray-200 dark:border-gray-700"
              >
                <ShoppingBag className="w-4 h-4" />
                Add to Shopify
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this quote?')) {
                  // Handle delete
                  console.log('Delete quote:', quote.id);
                }
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 border-t border-gray-200 dark:border-gray-700"
            >
              <Trash2 className="w-4 h-4" />
              Delete Quote
            </button>
          </div>
        </>
      )}
    </div>
  );
};
