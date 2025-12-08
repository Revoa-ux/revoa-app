import { ShoppingBag } from 'lucide-react';
import type { ShopifyVariant, ShopifyProductOption } from '@/types/quotes';

interface ShopifyVariantCardProps {
  variant: ShopifyVariant;
  productOptions?: ShopifyProductOption[];
  productTitle: string;
}

export function ShopifyVariantCard({
  variant,
  productOptions,
  productTitle,
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
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-600 to-teal-600 flex items-center justify-center flex-shrink-0">
        <ShoppingBag className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-0.5">
          {displayTitle}
        </h4>

        {groupedOptions && groupedOptions.length > 0 && (
          <div className="space-y-0.5 mb-1">
            {groupedOptions.map((option, index) => (
              <div key={index} className="flex items-center gap-1.5 text-xs">
                <span className="text-gray-500 dark:text-gray-400">
                  {option.name}:
                </span>
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  {option.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {variant.sku && (
          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
            SKU: {variant.sku}
          </p>
        )}
      </div>
    </div>
  );
}
