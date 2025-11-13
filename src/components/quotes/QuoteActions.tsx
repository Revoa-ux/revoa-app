import React from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Eye, Download, Trash2, CheckCircle, ShoppingBag, AlertTriangle } from 'lucide-react';
import { Quote } from '@/types/quotes';
import Modal from '../Modal';

interface QuoteActionsProps {
  quote: Quote;
  onAcceptQuote?: (quote: Quote) => void;
  onConnectShopify?: (quote: Quote) => void;
  onDeleteQuote?: (quoteId: string) => void;
}

export const QuoteActions: React.FC<QuoteActionsProps> = ({
  quote,
  onAcceptQuote,
  onConnectShopify,
  onDeleteQuote
}) => {
  const [showMenu, setShowMenu] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = React.useState({ top: 0, left: 0, openUpward: false });

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!showMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUpward = spaceBelow < 300 && spaceAbove > spaceBelow;

      setMenuPosition({
        top: openUpward ? rect.top - 8 : rect.bottom + 8,
        left: rect.right - 192, // 192px = w-48
        openUpward
      });
    }

    setShowMenu(!showMenu);
  };

  const menuContent = showMenu && (
    <>
      <div
        className="fixed inset-0 z-10"
        onClick={() => setShowMenu(false)}
      />
      <div
        className="fixed w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20"
        style={{
          top: menuPosition.openUpward ? 'auto' : `${menuPosition.top}px`,
          bottom: menuPosition.openUpward ? `${window.innerHeight - menuPosition.top}px` : 'auto',
          left: `${menuPosition.left}px`,
        }}
      >
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

            {quote.status === 'quoted' && quote.variants && quote.variants.length > 0 && onAcceptQuote && (
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
                setShowMenu(false);
                setShowDeleteModal(true);
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 border-t border-gray-200 dark:border-gray-700"
            >
              <Trash2 className="w-4 h-4" />
              Delete Quote
            </button>
          </div>
        </>
  );

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleToggleMenu}
        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
      >
        <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      </button>
      {menuContent && createPortal(menuContent, document.body)}

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        maxWidth="max-w-md"
      >
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Delete Quote
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to delete this quote? This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setShowDeleteModal(false)}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (onDeleteQuote) {
                onDeleteQuote(quote.id);
              }
              setShowDeleteModal(false);
            }}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </Modal>
    </>
  );
};
