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
  const [openUpward, setOpenUpward] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const canAccept = (quote.status === 'quoted' || quote.status === 'pending_reacceptance') &&
                     quote.variants && quote.variants.length > 0;
  const canSync = quote.status === 'accepted' || quote.status === 'synced_with_shopify';

  const getDeclineButtonText = () => {
    if (quote.status === 'quoted' || quote.status === 'pending_reacceptance') {
      return 'Decline Quote';
    }
    return 'Cancel Quote';
  };

  // Calculate dropdown position
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({});

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    const updatePosition = () => {
      if (showMenu && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const dropdownHeight = 150;
        const shouldOpenUpward = spaceBelow < dropdownHeight;

        setOpenUpward(shouldOpenUpward);

        // Calculate fixed position
        if (shouldOpenUpward) {
          setDropdownStyle({
            position: 'fixed',
            top: rect.top - dropdownHeight - 8,
            right: window.innerWidth - rect.right,
          });
        } else {
          setDropdownStyle({
            position: 'fixed',
            top: rect.bottom + 8,
            right: window.innerWidth - rect.right,
          });
        }
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
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
          ref={buttonRef}
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className={`p-2 hover:bg-gray-200 dark:hover:bg-[#4a4a4a] rounded-lg transition-colors ${showMenu ? 'bg-gray-200 dark:bg-[#4a4a4a]' : ''}`}
          title="Actions"
        >
          <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>

        {showMenu && (
          <div
            style={dropdownStyle}
            className="w-48 bg-white dark:bg-dark rounded-lg shadow-lg border border-gray-200 dark:border-[#3a3a3a] z-[9999] overflow-hidden"
          >
            {canAccept && (
              <button
                onClick={handleAccept}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors"
              >
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span>{quote.status === 'pending_reacceptance' ? 'Review & Accept' : 'Accept Quote'}</span>
              </button>
            )}

            {canSync && (
              <button
                onClick={handleSync}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors"
              >
                <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{quote.status === 'synced_with_shopify' ? 'Sync Again' : 'Sync to Shopify'}</span>
              </button>
            )}

            <button
              onClick={handleDecline}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
            className="btn btn-secondary flex-1"
          >
            Keep Quote
          </button>
          <button
            onClick={confirmDecline}
            className="btn btn-danger flex-1"
          >
            {getDeclineButtonText()}
          </button>
        </div>
      </Modal>
    </>
  );
};
