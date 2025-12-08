import React from 'react';
import { CheckCircle, X, AlertTriangle, MoreVertical, RefreshCw } from 'lucide-react';
import { Quote } from '@/types/quotes';
import Modal from '../Modal';

interface QuoteActionsProps {
  quote: Quote;
  onAcceptQuote?: (quote: Quote) => void;
  onConnectShopify?: (quote: Quote, method?: 'new' | 'existing') => void;
  onDeleteQuote?: (quoteId: string) => void;
}

export const QuoteActions: React.FC<QuoteActionsProps> = ({
  quote,
  onAcceptQuote,
  onConnectShopify,
  onDeleteQuote
}) => {
  const [showDeclineModal, setShowDeclineModal] = React.useState(false);
  const [showMenu, setShowMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const canAccept = (quote.status === 'quoted' || quote.status === 'pending_reacceptance') &&
                     quote.variants && quote.variants.length > 0;
  const canSync = quote.status === 'accepted' || quote.status === 'synced_with_shopify';

  const getDeclineButtonText = () => {
    if (quote.status === 'quoted' || quote.status === 'pending_reacceptance') {
      return 'Decline Quote';
    }
    return 'Cancel Quote';
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleAccept = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (onAcceptQuote) {
      console.log('🔍 [QuoteActions] Accepting quote:', {
        id: quote.id,
        status: quote.status,
        hasVariants: !!quote.variants,
        variantsCount: quote.variants?.length
      });
      onAcceptQuote(quote);
    }
  };

  const handleDecline = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    setShowDeclineModal(true);
  };

  const handleSync = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (onConnectShopify) {
      onConnectShopify(quote);
    }
  };

  const confirmDecline = () => {
    if (onDeleteQuote) {
      onDeleteQuote(quote.id);
    }
    setShowDeclineModal(false);
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Actions"
        >
          <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>

        {showMenu && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-[9999]">
            {canAccept && (
              <button
                onClick={handleAccept}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 first:rounded-t-lg transition-colors"
              >
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span>{quote.status === 'pending_reacceptance' ? 'Review & Accept' : 'Accept Quote'}</span>
              </button>
            )}

            {canSync && (
              <button
                onClick={handleSync}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Sync to Shopify</span>
              </button>
            )}

            <button
              onClick={handleDecline}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 last:rounded-b-lg transition-colors"
            >
              <X className="w-4 h-4" />
              <span>{getDeclineButtonText()}</span>
            </button>
          </div>
        )}
      </div>

      <Modal
        isOpen={showDeclineModal}
        onClose={() => setShowDeclineModal(false)}
        maxWidth="max-w-md"
      >
        <div className="text-center px-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {getDeclineButtonText()}
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 break-words">
              {quote.status === 'quoted' || quote.status === 'pending_reacceptance'
                ? 'Are you sure you want to decline this quote? The admin will be notified and you can request a new quote if needed.'
                : 'Are you sure you want to cancel this quote? The admin will be notified and you can submit a new quote request if needed.'}
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-3 px-4">
          <button
            onClick={() => setShowDeclineModal(false)}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Keep Quote
          </button>
          <button
            onClick={confirmDecline}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            {getDeclineButtonText()}
          </button>
        </div>
      </Modal>
    </>
  );
};
