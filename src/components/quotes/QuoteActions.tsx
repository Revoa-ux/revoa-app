import React, { useState, useRef, useEffect } from 'react';
import { 
  MoreVertical, 
  Check, 
  Store, 
  ExternalLink, 
  Copy, 
  Archive 
} from 'lucide-react';
import { toast } from 'sonner';
import { Quote } from '@/types/quotes';
import { useClickOutside } from '@/lib/useClickOutside';

interface QuoteActionsProps {
  quote: Quote;
  onAcceptQuote: (quote: Quote) => void;
  onConnectShopify: (quote: Quote) => void;
}

export const QuoteActions: React.FC<QuoteActionsProps> = ({
  quote,
  onAcceptQuote,
  onConnectShopify
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  useClickOutside(menuRef, () => setIsOpen(false), [buttonRef]);

  useEffect(() => {
    if (!isOpen || !buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    const menuHeight = 280; // Approximate height of dropdown menu

    setDropdownPosition(spaceBelow >= menuHeight || spaceBelow >= spaceAbove ? 'bottom' : 'top');
  }, [isOpen]);

  const handleAction = (action: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button 
        ref={buttonRef}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-200"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {isOpen && (
        <div 
          ref={menuRef}
          className="fixed z-50 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1"
          style={{
            ...(dropdownPosition === 'bottom' ? {
              top: buttonRef.current?.getBoundingClientRect().bottom,
            } : {
              bottom: window.innerHeight - (buttonRef.current?.getBoundingClientRect().top || 0),
            }),
            right: window.innerWidth - (buttonRef.current?.getBoundingClientRect().right || 0),
            transformOrigin: dropdownPosition === 'bottom' ? 'top right' : 'bottom right',
            animation: 'dropdown-in 0.2s ease-out'
          }}
        >
          {quote.status === 'quoted' && (
            <button
              onClick={handleAction(() => onAcceptQuote(quote))}
              className="flex items-center w-full px-4 py-2.5 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors relative group"
            >
              <Check className="w-4 h-4 mr-3" />
              Accept Quote
            </button>
          )}
          
          {quote.status === 'accepted' && !quote.shopifyConnected && (
            <button
              onClick={handleAction(() => onConnectShopify(quote))}
              className="flex items-center w-full px-4 py-2.5 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 transition-colors relative group"
            >
              <Store className="w-4 h-4 mr-3" />
              Connect to Shopify
            </button>
          )}
          
          <a
            href={quote.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center w-full px-4 py-2.5 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors relative group"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-4 h-4 mr-3" />
            View Product
          </a>
          
          <button
            onClick={handleAction(() => {
              navigator.clipboard.writeText(quote.id);
              toast.success('Quote ID copied to clipboard');
            })}
            className="flex items-center w-full px-4 py-2.5 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors relative group"
          >
            <Copy className="w-4 h-4 mr-3" />
            Copy Quote ID
          </button>
          
          <div className="h-px bg-gray-200 dark:bg-gray-700 mx-3 my-1"></div>
          
          <button
            onClick={handleAction(() => {
              toast.success('Quote archived');
            })}
            className="flex items-center w-full px-4 py-2.5 text-sm text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors relative group"
          >
            <Archive className="w-4 h-4 mr-3" />
            Archive Quote
          </button>
        </div>
      )}
    </div>
  );
};

export default QuoteActions;