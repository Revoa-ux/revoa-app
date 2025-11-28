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
  const [newVariantValue, setNewVariantValue] = useState('');
  const [editingType, setEditingType] = useState<string | null>(null);
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

  const addVariantType = () => {
    if (!newVariantType.trim()) return;
    setEditingType(newVariantType.trim());
    setNewVariantType('');
  };

  const addValueToType = (type: string, value: string) => {
    if (!value.trim()) return;

    const newAttribute: ProductAttribute = {
      name: type,
      value: value.trim()
    };

    onChange([...attributes, newAttribute]);
  };

  const addNewValue = () => {
    if (!editingType || !newVariantValue.trim()) return;
    addValueToType(editingType, newVariantValue);
    setNewVariantValue('');
  };

  const removeValue = (type: string, value: string) => {
    onChange(attributes.filter(attr => !(attr.name === type && attr.value === value)));
  };

  const removeVariantType = (type: string) => {
    onChange(attributes.filter(attr => attr.name !== type));
    if (editingType === type) {
      setEditingType(null);
    }
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
      <div className="flex items-center space-x-2 text-xs font-medium text-gray-700 dark:text-gray-300">
        <Package className="w-4 h-4" />
        <span>Product Variants</span>
        <span className="text-gray-500 dark:text-gray-400">(Optional)</span>
      </div>

      {/* Existing Variant Groups */}
      {variantGroups.length > 0 && (
        <div className="space-y-2">
          {variantGroups.map((group) => {
            const isCollapsed = collapsedTypes.has(group.type);
            const isEditing = editingType === group.type;

            return (
              <div
                key={group.type}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
              >
                {/* Variant Type Header */}
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-900/50">
                  <button
                    type="button"
                    onClick={() => toggleCollapse(group.type)}
                    className="flex items-center space-x-2 flex-1 text-left"
                    disabled={disabled}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    )}
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {group.type}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({group.values.length} {group.values.length === 1 ? 'value' : 'values'})
                    </span>
                  </button>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => removeVariantType(group.type)}
                      className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title={`Remove ${group.type} variant`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Variant Values */}
                {!isCollapsed && (
                  <div className="p-3 space-y-2">
                    {group.values.map((value) => (
                      <div
                        key={value}
                        className="flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-900/30 rounded border border-gray-200 dark:border-gray-700"
                      >
                        <span className="text-xs text-gray-700 dark:text-gray-300">
                          {value}
                        </span>
                        {!disabled && (
                          <button
                            type="button"
                            onClick={() => removeValue(group.type, value)}
                            className="p-0.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}

                    {/* Add New Value to This Type */}
                    {!disabled && isEditing && (
                      <div className="flex items-center space-x-2 pt-2">
                        <input
                          type="text"
                          value={newVariantValue}
                          onChange={(e) => setNewVariantValue(e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, addNewValue)}
                          placeholder={`Add ${group.type} value (e.g., Large)`}
                          className="flex-1 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={addNewValue}
                          disabled={!newVariantValue.trim()}
                          className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {!disabled && !isEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingType(group.type);
                          setNewVariantValue('');
                        }}
                        className="w-full px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded border border-dashed border-gray-300 dark:border-gray-600 transition-colors"
                      >
                        + Add {group.type} value
                      </button>
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
        <div className="space-y-2">
          {!editingType || !variantGroups.find(g => g.type === editingType) ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newVariantType}
                onChange={(e) => setNewVariantType(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, addVariantType)}
                placeholder="Variant type (e.g., Size, Color, Material)"
                className="flex-1 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addVariantType}
                disabled={!newVariantType.trim()}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300 dark:border-gray-600"
              >
                Add Type
              </button>
            </div>
          ) : null}
        </div>
      )}

      {variantGroups.length === 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
          Add variant types like Size, Color, Material, etc. Each type can have multiple values.
        </p>
      )}
    </div>
  );
};
