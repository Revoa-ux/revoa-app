import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Package, Minus } from 'lucide-react';
import { useClickOutside } from '@/lib/useClickOutside';
import type { NewQuoteVariant, FinalVariant } from '@/types/quotes';

interface QuoteVariantDropdownProps {
  value: number | null;
  onChange: (value: number | null) => void;
  quoteVariants: NewQuoteVariant[] | FinalVariant[];
  isNewQuoteVariant: (variant: any) => variant is NewQuoteVariant;
}

export function QuoteVariantDropdown({
  value,
  onChange,
  quoteVariants,
  isNewQuoteVariant,
}: QuoteVariantDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useClickOutside(dropdownRef, () => setIsOpen(false));

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const selectedVariant = value !== null && value !== undefined ? quoteVariants[value] : null;
  const selectedName = selectedVariant
    ? isNewQuoteVariant(selectedVariant)
      ? selectedVariant.name
      : selectedVariant.variantName || 'Unnamed Variant'
    : null;

  const filteredVariants = quoteVariants.filter((variant, index) => {
    const name = isNewQuoteVariant(variant) ? variant.name : variant.variantName || 'Unnamed Variant';
    const sku = variant.sku;
    const searchLower = searchTerm.toLowerCase();
    return (
      name.toLowerCase().includes(searchLower) ||
      sku.toLowerCase().includes(searchLower)
    );
  });

  const handleSelect = (index: number) => {
    onChange(index);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    onChange(null);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-left text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-400 focus:border-transparent transition-all flex items-center justify-between gap-2"
      >
        <span className="flex items-center gap-2 flex-1 min-w-0">
          {selectedName ? (
            <>
              <Package className="w-4 h-4 flex-shrink-0 text-gray-400" />
              <span className="truncate">{selectedName}</span>
            </>
          ) : (
            <>
              <Minus className="w-4 h-4 flex-shrink-0 text-gray-400" />
              <span className="text-gray-400">No mapping</span>
            </>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search variants..."
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-400"
              />
            </div>
          </div>

          {/* Variant List */}
          <div className="max-h-64 overflow-y-auto">
            {/* No mapping option */}
            <button
              type="button"
              onClick={handleClear}
              className="w-full px-3 py-2.5 text-left text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700"
            >
              No mapping
            </button>

            {filteredVariants.length > 0 ? (
              filteredVariants.map((variant, index) => {
                const actualIndex = quoteVariants.indexOf(variant);
                const name = isNewQuoteVariant(variant)
                  ? variant.name
                  : variant.variantName || 'Unnamed Variant';
                const cost = isNewQuoteVariant(variant)
                  ? variant.costPerItem
                  : variant.costPerItem;

                return (
                  <button
                    key={actualIndex}
                    type="button"
                    onClick={() => handleSelect(actualIndex)}
                    className={`w-full px-3 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      value === actualIndex
                        ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex-1 font-medium truncate">{name}</span>
                      <span className="text-gray-600 dark:text-gray-400 flex-shrink-0">
                        ${cost.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                      SKU: {variant.sku}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                No variants found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
