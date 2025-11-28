import React, { useState } from 'react';
import { Plus, Trash2, Copy, Settings, AlertCircle } from 'lucide-react';
import { NewQuoteVariant, ShippingRules } from '@/types/quotes';
import { ShippingRulesManager } from './ShippingRulesManager';
import Modal from '@/components/Modal';
import { toast } from 'sonner';

interface QuickModeBulkEditorProps {
  variants: NewQuoteVariant[];
  onVariantsChange: (variants: NewQuoteVariant[]) => void;
}

export const QuickModeBulkEditor: React.FC<QuickModeBulkEditorProps> = ({
  variants,
  onVariantsChange
}) => {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [shippingModalVariant, setShippingModalVariant] = useState<string | null>(null);

  const addRow = () => {
    const newVariant: NewQuoteVariant = {
      id: `var_${Date.now()}`,
      sku: '',
      name: `Variant ${variants.length + 1}`,
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

  const selectedVariant = shippingModalVariant
    ? variants.find(v => v.id === shippingModalVariant)
    : null;

  const allValid = variants.every(v => v.sku.trim() && v.costPerItem > 0 && v.shippingRules.default >= 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Quick Mode: Bulk Editor
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Add and edit variants in spreadsheet style
          </p>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Row</span>
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

      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
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
                Default Shipping
              </th>
              <th className="w-24 p-3 text-xs font-medium text-gray-700 dark:text-gray-300">
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
                    border-b border-gray-100 dark:border-gray-800
                    ${isSelected ? 'bg-blue-50 dark:bg-blue-900/10' : 'bg-white dark:bg-gray-800'}
                  `}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRowSelection(variant.id)}
                      className="w-4 h-4 text-rose-600 rounded border-gray-300 focus:ring-rose-500"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="text"
                      value={variant.name}
                      onChange={(e) => updateVariant(variant.id, { name: e.target.value })}
                      className="w-full px-2 py-1 bg-transparent border border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-rose-500 rounded text-sm text-gray-900 dark:text-white focus:outline-none"
                      placeholder="Variant name"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="text"
                      value={variant.sku}
                      onChange={(e) => updateVariant(variant.id, { sku: e.target.value })}
                      className="w-full px-2 py-1 bg-transparent border border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-rose-500 rounded text-sm text-gray-900 dark:text-white focus:outline-none"
                      placeholder="SKU-123"
                    />
                  </td>
                  <td className="p-3">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-xs">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={variant.costPerItem || ''}
                        onChange={(e) => updateVariant(variant.id, { costPerItem: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-5 pr-2 py-1 bg-transparent border border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-rose-500 rounded text-sm text-gray-900 dark:text-white focus:outline-none"
                        placeholder="0.00"
                      />
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center space-x-1">
                      <div className="relative flex-1">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-xs">
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={variant.shippingRules.default || ''}
                          onChange={(e) => {
                            const cost = parseFloat(e.target.value) || 0;
                            updateVariant(variant.id, {
                              shippingRules: { ...variant.shippingRules, default: cost }
                            });
                          }}
                          className="w-full pl-5 pr-2 py-1 bg-transparent border border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-rose-500 rounded text-sm text-gray-900 dark:text-white focus:outline-none"
                          placeholder="0.00"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShippingModalVariant(variant.id)}
                        className="p-1 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
                        title="Advanced shipping rules"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end space-x-1">
                      <button
                        type="button"
                        onClick={() => duplicateRow(variant.id)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                        title="Duplicate row"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteRow(variant.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Delete row"
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
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          <p className="text-sm mb-4">No variants added yet</p>
          <button
            type="button"
            onClick={addRow}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center space-x-2"
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
              Please complete all required fields (SKU, Cost, Shipping) for all variants.
            </div>
          </div>
        )
      )}

      {selectedVariant && (
        <Modal
          isOpen={true}
          onClose={() => setShippingModalVariant(null)}
          title={`Advanced Shipping Rules: ${selectedVariant.name}`}
        >
          <ShippingRulesManager
            rules={selectedVariant.shippingRules}
            onRulesChange={(rules) => {
              updateVariant(selectedVariant.id, { shippingRules: rules });
            }}
            variantName={selectedVariant.name}
          />
          <div className="flex justify-end mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShippingModalVariant(null)}
              className="px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
