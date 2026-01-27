import React, { useState } from 'react';
import { Plus, Trash2, Copy, Settings, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { NewQuoteVariant, ShippingRules } from '@/types/quotes';
import { ShippingRulesManager } from './ShippingRulesManager';
import Modal from '@/components/Modal';
import { CustomCheckbox } from '@/components/CustomCheckbox';
import { toast } from '../../lib/toast';

interface QuickModeBulkEditorProps {
  variants: NewQuoteVariant[];
  onVariantsChange: (variants: NewQuoteVariant[]) => void;
  productName?: string;
}

export const QuickModeBulkEditor: React.FC<QuickModeBulkEditorProps> = ({
  variants,
  onVariantsChange,
  productName = ''
}) => {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [advancedSettingsVariantId, setAdvancedSettingsVariantId] = useState<string | null>(null);

  const generateSKU = (variantName: string): string => {
    if (!variantName.trim()) return '';
    const productPrefix = productName.slice(0, 3).toUpperCase();
    const variantSlug = variantName.toLowerCase().replace(/\s+/g, '-');
    return `${productPrefix}-${variantSlug}`;
  };

  const addRow = () => {
    const newVariant: NewQuoteVariant = {
      id: `var_${Date.now()}`,
      sku: '',
      name: '',
      attributes: [],
      costPerItem: 0,
      shippingRules: {
        default: 0,
        byCountry: {},
        byQuantity: undefined
      },
      enabled: true
    };
    onVariantsChange([...variants, newVariant]);
  };

  const duplicateRow = (id: string) => {
    const source = variants.find(v => v.id === id);
    if (!source) return;

    const newVariant: NewQuoteVariant = {
      ...source,
      id: `var_${Date.now()}`,
      sku: `${source.sku}-copy`,
      name: `${source.name} (Copy)`,
      attributes: source.attributes.map(attr => ({ ...attr })),
      shippingRules: {
        ...source.shippingRules,
        byCountry: { ...source.shippingRules.byCountry },
        byQuantity: source.shippingRules.byQuantity ? [...source.shippingRules.byQuantity] : undefined
      }
    };
    onVariantsChange([...variants, newVariant]);
    toast.success('Row duplicated');
  };

  const deleteRow = (id: string) => {
    if (variants.length === 1) {
      toast.error('At least one variant is required');
      return;
    }
    onVariantsChange(variants.filter(v => v.id !== id));
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const moveRow = (id: string, direction: 'up' | 'down') => {
    const index = variants.findIndex(v => v.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === variants.length - 1) return;

    const newVariants = [...variants];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newVariants[index], newVariants[targetIndex]] = [newVariants[targetIndex], newVariants[index]];
    onVariantsChange(newVariants);
  };

  const updateVariant = (id: string, updates: Partial<NewQuoteVariant>) => {
    onVariantsChange(
      variants.map(v => v.id === id ? { ...v, ...updates } : v)
    );
  };

  const toggleRowSelection = (id: string) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const bulkUpdateCost = () => {
    if (selectedRows.size === 0) {
      toast.error('Please select rows to update');
      return;
    }

    const cost = prompt('Enter cost to apply to selected rows:');
    if (!cost) return;

    const parsedCost = parseFloat(cost);
    if (isNaN(parsedCost) || parsedCost < 0) {
      toast.error('Invalid cost');
      return;
    }

    onVariantsChange(
      variants.map(v =>
        selectedRows.has(v.id) ? { ...v, costPerItem: parsedCost } : v
      )
    );
    toast.success(`Updated ${selectedRows.size} variants`);
    setSelectedRows(new Set());
  };

  const bulkUpdateShipping = () => {
    if (selectedRows.size === 0) {
      toast.error('Please select rows to update');
      return;
    }

    const shipping = prompt('Enter default shipping cost to apply to selected rows:');
    if (!shipping) return;

    const parsedShipping = parseFloat(shipping);
    if (isNaN(parsedShipping) || parsedShipping < 0) {
      toast.error('Invalid shipping cost');
      return;
    }

    onVariantsChange(
      variants.map(v =>
        selectedRows.has(v.id)
          ? { ...v, shippingRules: { ...v.shippingRules, default: parsedShipping } }
          : v
      )
    );
    toast.success(`Updated ${selectedRows.size} variants`);
    setSelectedRows(new Set());
  };

  const selectedVariant = advancedSettingsVariantId
    ? variants.find(v => v.id === advancedSettingsVariantId)
    : null;

  const allValid = variants.every(v => v.sku.trim() && v.costPerItem > 0 && v.shippingRules.default >= 0);

  const getShippingDisplay = (variant: NewQuoteVariant): string => {
    const parts: string[] = [];

    parts.push(`$${variant.shippingRules.default.toFixed(2)}`);

    const countryCount = Object.keys(variant.shippingRules.byCountry).length;
    if (countryCount > 0) {
      parts.push(`${countryCount} ${countryCount === 1 ? 'country' : 'countries'}`);
    }

    const tierCount = variant.shippingRules.byQuantity?.length || 0;
    if (tierCount > 0) {
      parts.push(`${tierCount} ${tierCount === 1 ? 'tier' : 'tiers'}`);
    }

    return parts.join(' • ');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Product Variants
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Add and configure all product variants with pricing and shipping
          </p>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="px-4 py-2 bg-dark hover:bg-gray-800 dark:bg-[#3a3a3a] dark:hover:bg-[#4a4a4a] text-white text-sm font-medium rounded-lg transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Variant</span>
        </button>
      </div>

      {selectedRows.size > 0 && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 flex items-center justify-between">
          <span className="text-sm text-blue-900 dark:text-blue-300">
            {selectedRows.size} row{selectedRows.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={bulkUpdateCost}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              Set Cost
            </button>
            <button
              type="button"
              onClick={bulkUpdateShipping}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              Set Shipping
            </button>
            <button
              type="button"
              onClick={() => setSelectedRows(new Set())}
              className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto border border-gray-200 dark:border-[#3a3a3a] rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-dark border-b border-gray-200 dark:border-[#3a3a3a]">
            <tr>
              <th className="w-10 p-3"></th>
              <th className="text-left p-3 text-xs font-medium text-gray-700 dark:text-gray-300">
                Variant Name
              </th>
              <th className="text-left p-3 text-xs font-medium text-gray-700 dark:text-gray-300">
                SKU
              </th>
              <th className="text-left p-3 text-xs font-medium text-gray-700 dark:text-gray-300">
                Cost per Item
              </th>
              <th className="text-left p-3 text-xs font-medium text-gray-700 dark:text-gray-300">
                Shipping
              </th>
              <th className="w-32 p-3 text-xs font-medium text-gray-700 dark:text-gray-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {variants.map((variant, index) => {
              const isSelected = selectedRows.has(variant.id);

              return (
                <tr
                  key={variant.id}
                  className={`
                    border-b border-gray-100 dark:border-[#2a2a2a]
                    ${isSelected ? 'bg-blue-50 dark:bg-blue-900/10' : 'bg-white dark:bg-dark'}
                  `}
                >
                  <td className="p-3">
                    <CustomCheckbox
                      checked={isSelected}
                      onChange={() => toggleRowSelection(variant.id)}
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="text"
                      value={variant.name}
                      onChange={(e) => {
                        const newName = e.target.value;
                        const newSKU = generateSKU(newName);
                        updateVariant(variant.id, { name: newName, sku: newSKU });
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                      placeholder="color/size/material"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="text"
                      value={variant.sku}
                      onChange={(e) => updateVariant(variant.id, { sku: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 hover:border-gray-400 dark:hover:border-gray-500 transition-colors font-mono"
                      placeholder="Auto-generated"
                    />
                  </td>
                  <td className="p-3">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-xs">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={variant.costPerItem || ''}
                        onChange={(e) => updateVariant(variant.id, { costPerItem: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-7 pr-3 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                        placeholder="0.00"
                      />
                    </div>
                  </td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => setAdvancedSettingsVariantId(variant.id)}
                      className="w-full px-3 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-sm text-gray-900 dark:text-white hover:border-gray-400 dark:hover:border-gray-500 transition-colors text-left flex items-center justify-between group"
                    >
                      <span className="text-xs truncate">{getShippingDisplay(variant)}</span>
                      <Settings className="w-4 h-4 text-gray-400 group-hover:text-rose-500 flex-shrink-0 ml-2" />
                    </button>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end space-x-1">
                      <button
                        type="button"
                        onClick={() => moveRow(variant.id, 'up')}
                        disabled={index === 0}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveRow(variant.id, 'down')}
                        disabled={index === variants.length - 1}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicateRow(variant.id)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteRow(variant.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {variants.length === 0 && (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-[#4a4a4a] rounded-lg">
          <p className="text-sm mb-4">No variants added yet</p>
          <button
            type="button"
            onClick=  {addRow}
            className="px-4 py-2 bg-dark hover:bg-gray-800 dark:bg-[#3a3a3a] dark:hover:bg-[#4a4a4a] text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Variant</span>
          </button>
        </div>
      )}

      {variants.length > 0 && (
        allValid ? (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-green-700 dark:text-green-300">
              All variants configured! Ready to submit.
            </div>
          </div>
        ) : (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-700 dark:text-amber-300">
              Please complete all required fields (Variant Name, SKU, Cost, Shipping) for all variants.
            </div>
          </div>
        )
      )}

      {selectedVariant && (
        <Modal
          isOpen={true}
          onClose={() => setAdvancedSettingsVariantId(null)}
          title="Advanced Settings"
          maxWidth="max-w-2xl"
        >
          <div className="mb-4 p-3 bg-gray-50 dark:bg-dark/50 rounded-lg border border-gray-200 dark:border-[#3a3a3a]">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {selectedVariant.name}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              SKU: {selectedVariant.sku || 'Not set'}
            </div>
          </div>

          <ShippingRulesManager
            rules={selectedVariant.shippingRules}
            onRulesChange={(rules) => {
              updateVariant(selectedVariant.id, { shippingRules: rules });
            }}
          />

          <div className="flex justify-end mt-6 pt-4 border-t border-gray-200 dark:border-[#3a3a3a]">
            <button
              onClick={() => setAdvancedSettingsVariantId(null)}
              className="px-4 py-2 bg-dark hover:bg-gray-800 dark:bg-[#3a3a3a] dark:hover:bg-[#4a4a4a] text-white text-sm font-medium rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
