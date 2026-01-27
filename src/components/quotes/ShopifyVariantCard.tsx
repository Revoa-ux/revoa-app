import { ShoppingBag } from 'lucide-react';
import type { ShopifyVariant, ShopifyProductOption } from '@/types/quotes';

interface ShopifyVariantCardProps {
  variant: ShopifyVariant;
  productOptions?: ShopifyProductOption[];
  productTitle: string;
  showPrice?: boolean;
  marginPercent?: number;
}

export function ShopifyVariantCard({
  variant,
  productOptions,
  productTitle,
  showPrice = true,
  marginPercent,
}: ShopifyVariantCardProps) {
  const hasOptions = variant.selectedOptions && variant.selectedOptions.length > 0;
  const displayTitle = variant.title === 'Default Title' ? productTitle : variant.title;

  const groupedOptions = hasOptions && productOptions
    ? productOptions.map(option => {
        const selectedOption = variant.selectedOptions?.find(so => so.name === option.name);
        return {
          name: option.name,
          value: selectedOption?.value || '',
        };
      }).filter(opt => opt.value)
    : null;

  // Determine color based on margin percentage
  const getPriceColorClass = () => {
    if (marginPercent === undefined) return 'text-gray-900 dark:text-white';
    if (marginPercent < 30) return 'text-red-600 dark:text-red-400';
    if (marginPercent < 40) return 'text-amber-600 dark:text-amber-400';
    return 'text-green-600 dark:text-green-400';
  };

  return (
    <div className="flex items-center gap-2.5 w-full">
      <div className="w-7 h-7 rounded-lg bg-gray-200/50 dark:bg-[#3a3a3a]/50 flex items-center justify-center flex-shrink-0">
        <ShoppingBag className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-normal text-sm text-gray-700 dark:text-gray-300 flex-1 min-w-0">
            {displayTitle}
          </h4>
          {showPrice && (
            <div className="flex-shrink-0 flex flex-col items-end">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Current Price</div>
              <span className={`text-sm font-semibold px-2 py-0.5 rounded ${getPriceColorClass()} ${marginPercent !== undefined ? (marginPercent < 30 ? 'bg-red-100 dark:bg-red-900/30' : marginPercent < 40 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-green-100 dark:bg-green-900/30') : ''}`}>
                ${parseFloat(variant.price).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {variant.sku && (
          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
            SKU: {variant.sku}
          </p>
        )}
      </div>
    </div>
  );
}

// Export grouped options for external use
export function getVariantOptions(variant: ShopifyVariant, productOptions?: ShopifyProductOption[]): string | null {
  const hasOptions = variant.selectedOptions && variant.selectedOptions.length > 0;

  if (hasOptions && productOptions) {
    const groupedOptions = productOptions.map(option => {
      const selectedOption = variant.selectedOptions?.find(so => so.name === option.name);
      return {
        name: option.name,
        value: selectedOption?.value || '',
      };
    }).filter(opt => opt.value);

    if (groupedOptions.length > 0) {
      return groupedOptions.map(opt => opt.name).join(' • ');
    }
  }

  return null;
}
