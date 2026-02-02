import { useState, useRef } from 'react';
import { ChevronDown, Check, Minus } from 'lucide-react';
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, () => setIsOpen(false));

  const selectedVariant = value !== null && value !== undefined ? quoteVariants[value] : null;
  const selectedName = selectedVariant
    ? isNewQuoteVariant(selectedVariant)
      ? selectedVariant.name
      : selectedVariant.variantName || 'Unnamed Variant'
    : null;

  const handleSelect = (index: number) => {
    onChange(index);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2.5 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-sm text-left text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500 dark:focus:ring-rose-400 focus:border-transparent transition-all flex items-center justify-between gap-2"
      >
        <span className="flex items-center gap-2 flex-1 min-w-0">
          {selectedName ? (
            <>
              <Check className="w-4 h-4 flex-shrink-0 text-gray-400" />
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
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {/* No mapping option */}
          <button
            type="button"
            onClick={handleClear}
            className="w-full px-3 py-2.5 text-left text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] transition-colors border-b border-gray-100 dark:border-[#3a3a3a]"
          >
            No mapping
          </button>

          {/* Variant List */}
          {quoteVariants.map((variant, index) => {
            const name = isNewQuoteVariant(variant)
              ? variant.name
              : variant.variantName || 'Unnamed Variant';
            const cost = isNewQuoteVariant(variant)
              ? variant.costPerItem
              : variant.costPerItem;

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleSelect(index)}
                className={`w-full px-3 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-[#3a3a3a] transition-colors ${
                  value === index
                    ? 'bg-gray-100 dark:bg-[#3a3a3a]'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex-1 font-medium truncate text-gray-700 dark:text-gray-300">{name}</span>
                  <span className="text-gray-600 dark:text-gray-400 flex-shrink-0">
                    ${cost.toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                  SKU: {variant.sku}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
