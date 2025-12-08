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
    <div className="bg-white dark:bg-gray-800/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
          <ShoppingBag className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-1">
            {displayTitle}
          </h4>

          {groupedOptions && groupedOptions.length > 0 ? (
            <div className="space-y-1.5 mb-2">
              {groupedOptions.map((option, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    {option.name}:
                  </span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {option.value}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {variant.sku && (
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              SKU: {variant.sku}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
