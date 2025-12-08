import { ShoppingBag } from 'lucide-react';
import type { ShopifyVariant, ShopifyProductOption } from '@/types/quotes';

interface ShopifyVariantCardProps {
  variant: ShopifyVariant;
  productOptions?: ShopifyProductOption[];
  productTitle: string;
  showPrice?: boolean;
}

export function ShopifyVariantCard({
  variant,
  productOptions,
  productTitle,
  showPrice = true,
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

  return (
    <div className="flex items-center gap-2.5 w-full">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-600 to-teal-600 flex items-center justify-center flex-shrink-0">
        <ShoppingBag className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-medium text-sm text-gray-900 dark:text-white flex-1 min-w-0">
            {displayTitle}
          </h4>
          {showPrice && (
            <span className="text-sm font-semibold text-gray-900 dark:text-white flex-shrink-0">
              ${parseFloat(variant.price).toFixed(2)}
            </span>
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
