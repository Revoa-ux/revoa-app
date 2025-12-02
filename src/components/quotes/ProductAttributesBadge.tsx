import React from 'react';
import { Package } from 'lucide-react';
import { ProductAttribute } from '@/types/quotes';

interface ProductAttributesBadgeProps {
  attributes: ProductAttribute[];
  className?: string;
}

export const ProductAttributesBadge: React.FC<ProductAttributesBadgeProps> = ({
  attributes,
  className = ''
}) => {
  if (!attributes || attributes.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center flex-wrap gap-1.5 ${className}`}>
      <Package className="w-3.5 h-3.5 text-gray-400" />
      {attributes.map((attr, index) => (
        <span
          key={index}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
        >
          {attr.name}: {attr.value}
        </span>
      ))}
    </div>
  );
};
