import React, { useState } from 'react';
import { Plus, X, Package, ChevronDown, ChevronRight } from 'lucide-react';
import { ProductAttribute } from '@/types/quotes';

interface ProductVariantsEditorProps {
  attributes: ProductAttribute[];
  onChange: (attributes: ProductAttribute[]) => void;
  disabled?: boolean;
}

interface VariantGroup {
  type: string;
  values: string[];
}

export const ProductVariantsEditor: React.FC<ProductVariantsEditorProps> = ({
  attributes,
  onChange,
  disabled = false
}) => {
  const [newVariantType, setNewVariantType] = useState('');
  const [editingValues, setEditingValues] = useState<{ [key: string]: string }>({});
  const [collapsedTypes, setCollapsedTypes] = useState<Set<string>>(new Set());

  // Group attributes by type
  const getVariantGroups = (): VariantGroup[] => {
    const groups: { [key: string]: Set<string> } = {};

    attributes.forEach(attr => {
      if (!groups[attr.name]) {
        groups[attr.name] = new Set();
      }
      groups[attr.name].add(attr.value);
    });

    return Object.entries(groups).map(([type, values]) => ({
      type,
      values: Array.from(values)
    }));
  };

  const variantGroups = getVariantGroups();

  /**
   * FIX #1: Add Type button now properly creates a variant type
   * Creates the type with an empty placeholder value that will be shown in the UI
   */
  const addVariantType = () => {
    const trimmed = newVariantType.trim();
    if (!trimmed) return;

    // Check if type already exists
    if (variantGroups.find(g => g.type.toLowerCase() === trimmed.toLowerCase())) {
      return;
    }

    // Create a placeholder attribute to establish the type
    // This makes the type appear in the UI immediately
    const placeholderAttribute: ProductAttribute = {
      name: trimmed,
      value: '__PLACEHOLDER__' // Temporary marker
    };

    onChange([...attributes, placeholderAttribute]);
    setEditingValues({ ...editingValues, [trimmed]: '' });
    setNewVariantType('');
  };

  /**
   * Add a value to an existing type
   * If adding the first real value, removes the placeholder
   */
  const addValueToType = (type: string) => {
    const value = editingValues[type]?.trim();
    if (!value) return;

    const newAttribute: ProductAttribute = {
      name: type,
      value: value
    };

    // Remove placeholder if it exists when adding first real value
    const filteredAttributes = attributes.filter(
      attr => !(attr.name === type && attr.value === '__PLACEHOLDER__')
    );

    onChange([...filteredAttributes, newAttribute]);
    setEditingValues({ ...editingValues, [type]: '' });
  };

  const removeValue = (type: string, value: string) => {
    const remainingValues = attributes.filter(
      attr => !(attr.name === type && attr.value === value)
    );

    // If no values left for this type, remove all traces
    const hasOtherValues = remainingValues.some(attr => attr.name === type);
    if (!hasOtherValues) {
      const newEditingValues = { ...editingValues };
      delete newEditingValues[type];
      setEditingValues(newEditingValues);
    }

    onChange(remainingValues);
  };

  const removeVariantType = (type: string) => {
    onChange(attributes.filter(attr => attr.name !== type));
    const newEditingValues = { ...editingValues };
    delete newEditingValues[type];
    setEditingValues(newEditingValues);
  };

  const toggleCollapse = (type: string) => {
    const newCollapsed = new Set(collapsedTypes);
    if (newCollapsed.has(type)) {
      newCollapsed.delete(type);
    } else {
      newCollapsed.add(type);
    }
    setCollapsedTypes(newCollapsed);
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        <Package className="w-4 h-4" />
        <span>Product Variants</span>
        <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">(Optional)</span>
      </div>

      {/* Existing Variant Groups */}
      {variantGroups.length > 0 && (
        <div className="space-y-2">
          {variantGroups.map((group) => {
            const isCollapsed = collapsedTypes.has(group.type);
            // Filter out placeholder values from display
            const realValues = group.values.filter(v => v !== '__PLACEHOLDER__');

            return (
              <div
                key={group.type}
                className="bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg overflow-hidden"
              >
                {/* Variant Type Header */}
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-dark/50">
                  <button
                    type="button"
                    onClick={() => toggleCollapse(group.type)}
                    className="flex items-center space-x-2 flex-1 text-left"
                    disabled={disabled}
                  >
                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {group.type}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                      ({realValues.length} {realValues.length === 1 ? 'value' : 'values'})
                    </span>
                  </button>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => removeVariantType(group.type)}
                      className="btn btn-ghost p-1 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      title={`Remove ${group.type} variant`}
                    >
                      <X className="btn-icon w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Variant Values */}
                {!isCollapsed && (
                  <div className="p-3 space-y-2">
                    {realValues.length > 0 ? (
                      realValues.map((value) => (
                        <div
                          key={value}
                          className="flex items-center space-x-2"
                        >
                          {!disabled && (
                            <button
                              type="button"
                              onClick={() => removeValue(group.type, value)}
                              className="btn btn-ghost p-1 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                            >
                              <X className="btn-icon w-3.5 h-3.5" />
                            </button>
                          )}
                          <div className="flex-1 px-3 py-2 bg-gray-50 dark:bg-dark/30 rounded border border-gray-200 dark:border-[#3a3a3a]">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {value}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic px-7">
                        Add values for this variant type below
                      </p>
                    )}

                    {/* Add New Value to This Type */}
                    {!disabled && (
                      <div className="flex items-center space-x-2 pt-1">
                        <div className="w-7 flex-shrink-0"></div>
                        <input
                          type="text"
                          value={editingValues[group.type] || ''}
                          onChange={(e) => setEditingValues({ ...editingValues, [group.type]: e.target.value })}
                          onKeyPress={(e) => handleKeyPress(e, () => addValueToType(group.type))}
                          placeholder={`Add ${group.type} value`}
                          className="flex-1 px-3 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => addValueToType(group.type)}
                          disabled={!editingValues[group.type]?.trim()}
                          className="btn btn-ghost p-2 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="btn-icon w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add New Variant Type */}
      {!disabled && (
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newVariantType}
            onChange={(e) => setNewVariantType(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, addVariantType)}
            placeholder="Variant type (e.g., Size, Color, Material)"
            className="flex-1 px-3 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={addVariantType}
            disabled={!newVariantType.trim()}
            className="btn btn-secondary whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Type
          </button>
        </div>
      )}

      {variantGroups.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
          Add variant types like Size, Color, Material, etc. Each type can have multiple values.
        </p>
      )}
    </div>
  );
};
