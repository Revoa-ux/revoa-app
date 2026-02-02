import React, { useState } from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { VariantType } from '@/types/quotes';
import { VariantCombinationMatrix } from './VariantCombinationMatrix';

interface GuidedModeStep1Props {
  hasVariants: boolean;
  variantTypes: VariantType[];
  onHasVariantsChange: (value: boolean) => void;
  onVariantTypesChange: (types: VariantType[]) => void;
  selectedCombinations: Set<string>;
  onSelectedCombinationsChange: (combinations: Set<string>) => void;
  combinationAttributes: Map<string, any[]>;
  onCombinationAttributesChange: (map: Map<string, any[]>) => void;
}

const COMMON_VARIANT_TYPES = [
  'Color',
  'Size',
  'Material',
  'Style',
  'Pattern',
  'Finish',
  'Custom'
];

export const GuidedModeStep1: React.FC<GuidedModeStep1Props> = ({
  hasVariants,
  variantTypes,
  onHasVariantsChange,
  onVariantTypesChange,
  selectedCombinations,
  onSelectedCombinationsChange,
  combinationAttributes,
  onCombinationAttributesChange
}) => {
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeValues, setNewTypeValues] = useState('');

  const addVariantType = () => {
    if (!newTypeName.trim()) return;

    const values = newTypeValues
      .split(',')
      .map(v => v.trim())
      .filter(v => v);

    if (values.length === 0) return;

    const newType: VariantType = {
      id: `vt_${Date.now()}`,
      name: newTypeName.trim(),
      values
    };

    onVariantTypesChange([...variantTypes, newType]);
    setNewTypeName('');
    setNewTypeValues('');
  };

  const removeVariantType = (id: string) => {
    onVariantTypesChange(variantTypes.filter(t => t.id !== id));
    onSelectedCombinationsChange(new Set());
    onCombinationAttributesChange(new Map());
  };

  const updateVariantType = (id: string, updates: Partial<VariantType>) => {
    onVariantTypesChange(
      variantTypes.map(t => t.id === id ? { ...t, ...updates } : t)
    );
    onSelectedCombinationsChange(new Set());
    onCombinationAttributesChange(new Map());
  };

  const handleToggleCombination = (key: string, attributes: any[]) => {
    const newSelected = new Set(selectedCombinations);
    const newAttributes = new Map(combinationAttributes);

    if (newSelected.has(key)) {
      newSelected.delete(key);
      newAttributes.delete(key);
    } else {
      newSelected.add(key);
      newAttributes.set(key, attributes);
    }

    onSelectedCombinationsChange(newSelected);
    onCombinationAttributesChange(newAttributes);
  };

  const handleSelectAll = () => {
    if (variantTypes.length === 0) return;

    const newSelected = new Set<string>();
    const newAttributes = new Map<string, any[]>();

    if (variantTypes.length === 1) {
      const type = variantTypes[0];
      type.values.forEach(value => {
        const key = value;
        const attrs = [{ name: type.name, value }];
        newSelected.add(key);
        newAttributes.set(key, attrs);
      });
    } else if (variantTypes.length === 2) {
      const [typeA, typeB] = variantTypes;
      typeA.values.forEach(valueA => {
        typeB.values.forEach(valueB => {
          const key = `${valueA}__${valueB}`;
          const attrs = [
            { name: typeA.name, value: valueA },
            { name: typeB.name, value: valueB }
          ];
          newSelected.add(key);
          newAttributes.set(key, attrs);
        });
      });
    } else {
      const generate = (index: number, current: any[], labels: string[]) => {
        if (index === variantTypes.length) {
          const key = labels.join('__');
          newSelected.add(key);
          newAttributes.set(key, [...current]);
          return;
        }

        const type = variantTypes[index];
        for (const value of type.values) {
          generate(
            index + 1,
            [...current, { name: type.name, value }],
            [...labels, value]
          );
        }
      };

      generate(0, [], []);
    }

    onSelectedCombinationsChange(newSelected);
    onCombinationAttributesChange(newAttributes);
  };

  const handleDeselectAll = () => {
    onSelectedCombinationsChange(new Set());
    onCombinationAttributesChange(new Map());
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Step 1: Product Variants
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Does this product have different variations like colors, sizes, or materials?
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={() => onHasVariantsChange(false)}
            className={`
              flex-1 p-4 rounded-lg border-2 transition-all
              ${!hasVariants
                ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                : 'border-gray-200 dark:border-[#333333] bg-white dark:bg-dark hover:border-gray-300 dark:hover:border-[#4a4a4a]'
              }
            `}
          >
            <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              No Variants
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Single product, no variations
            </div>
          </button>

          <button
            type="button"
            onClick={() => onHasVariantsChange(true)}
            className={`
              flex-1 p-4 rounded-lg border-2 transition-all
              ${hasVariants
                ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                : 'border-gray-200 dark:border-[#333333] bg-white dark:bg-dark hover:border-gray-300 dark:hover:border-[#4a4a4a]'
              }
            `}
          >
            <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              Has Variants
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Multiple colors, sizes, etc.
            </div>
          </button>
        </div>

        {hasVariants && (
          <div className="space-y-4 p-6 bg-gray-50 dark:bg-dark/30 rounded-lg border border-gray-200 dark:border-[#333333]">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Define Variant Types
              </h4>

              {variantTypes.map((type) => (
                <div key={type.id} className="mb-4 p-4 bg-white dark:bg-dark rounded-lg border border-gray-200 dark:border-[#333333]">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={type.name}
                        onChange={(e) => updateVariantType(type.id, { name: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                        placeholder="Variant type (e.g., Color, Size)"
                      />
                      <textarea
                        value={type.values.join(', ')}
                        onChange={(e) => {
                          const values = e.target.value.split(',').map(v => v.trim()).filter(v => v);
                          updateVariantType(type.id, { values });
                        }}
                        rows={2}
                        className="w-full px-3 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                        placeholder="Values separated by commas (e.g., Black, White, Yellow)"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVariantType(type.id)}
                      className="ml-3 p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {type.values.length} value{type.values.length !== 1 ? 's' : ''} defined
                  </div>
                </div>
              ))}

              <div className="space-y-2">
                <select
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="">Select or type variant type...</option>
                  {COMMON_VARIANT_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>

                <input
                  type="text"
                  value={newTypeValues}
                  onChange={(e) => setNewTypeValues(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="Values separated by commas (e.g., Small, Medium, Large)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addVariantType();
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={addVariantType}
                  disabled={!newTypeName.trim() || !newTypeValues.trim()}
                  className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-[#4a4a4a] rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-[#555555] hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Variant Type</span>
                </button>
              </div>
            </div>

            {variantTypes.length > 0 && variantTypes.every(t => t.values.length > 0) && (
              <div className="pt-6 border-t border-gray-200 dark:border-[#333333]">
                <VariantCombinationMatrix
                  variantTypes={variantTypes}
                  selectedCombinations={selectedCombinations}
                  onToggleCombination={handleToggleCombination}
                  onSelectAll={handleSelectAll}
                  onDeselectAll={handleDeselectAll}
                />

                {selectedCombinations.size > 0 && (
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-green-700 dark:text-green-300">
                      <strong>{selectedCombinations.size} variant{selectedCombinations.size !== 1 ? 's' : ''}</strong> will be created. You'll set pricing and shipping for each in the next steps.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
