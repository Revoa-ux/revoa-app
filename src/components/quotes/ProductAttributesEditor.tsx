import React, { useState } from 'react';
import { Plus, X, Package } from 'lucide-react';
import { ProductAttribute } from '@/types/quotes';

interface ProductAttributesEditorProps {
  attributes: ProductAttribute[];
  onChange: (attributes: ProductAttribute[]) => void;
  disabled?: boolean;
}

export const ProductAttributesEditor: React.FC<ProductAttributesEditorProps> = ({
  attributes,
  onChange,
  disabled = false
}) => {
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');

  const addAttribute = () => {
    if (!newAttrName.trim() || !newAttrValue.trim()) return;

    const newAttribute: ProductAttribute = {
      name: newAttrName.trim(),
      value: newAttrValue.trim()
    };

    onChange([...attributes, newAttribute]);
    setNewAttrName('');
    setNewAttrValue('');
  };

  const removeAttribute = (index: number) => {
    onChange(attributes.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addAttribute();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2 text-xs font-medium text-gray-700 dark:text-gray-300">
        <Package className="w-4 h-4" />
        <span>Product Variants</span>
        <span className="text-gray-500 dark:text-gray-400">(Optional)</span>
      </div>

      {/* Existing Attributes */}
      {attributes.length > 0 && (
        <div className="space-y-2">
          {attributes.map((attr, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg"
            >
              <div className="flex items-center space-x-2 flex-1">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {attr.name}:
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {attr.value}
                </span>
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeAttribute(index)}
                  className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add New Attribute */}
      {!disabled && (
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newAttrName}
            onChange={(e) => setNewAttrName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Variant (e.g., Size)"
            className="flex-1 px-3 py-1.5 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-xs text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={newAttrValue}
            onChange={(e) => setNewAttrValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Value (e.g., Large)"
            className="flex-1 px-3 py-1.5 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-xs text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={addAttribute}
            disabled={!newAttrName.trim() || !newAttrValue.trim()}
            className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}

      {attributes.length === 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
          Add product variants like Size, Color, Material, etc.
        </p>
      )}
    </div>
  );
};
