import React, { useState } from 'react';
import { Plus, X, Trash2, Globe, ChevronDown, Package2, DollarSign } from 'lucide-react';
import { ProductAttribute, FinalVariant } from '@/types/quotes';
import { CountrySelector, COMMON_COUNTRIES } from './CountrySelector';

interface PackSizeEditorProps {
  packSize: number;
  skuPrefix: string;
  finalVariants: FinalVariant[];
  onPackSizeChange: (packSize: number) => void;
  onSkuPrefixChange: (skuPrefix: string) => void;
  onFinalVariantsChange: (variants: FinalVariant[]) => void;
  disabled?: boolean;
}

export const PackSizeEditor: React.FC<PackSizeEditorProps> = ({
  packSize,
  skuPrefix,
  finalVariants,
  onPackSizeChange,
  onSkuPrefixChange,
  onFinalVariantsChange,
  disabled = false
}) => {
  const [expandedShipping, setExpandedShipping] = useState<number | null>(null);
  const [newAttribute, setNewAttribute] = useState({ name: '', value: '' });

  const addFinalVariant = () => {
    if (!newAttribute.name.trim() || !newAttribute.value.trim()) return;

    const newVariant: FinalVariant = {
      sku: `${skuPrefix}-${newAttribute.value.toUpperCase().replace(/\s+/g, '-')}`,
      attributes: [{ name: newAttribute.name, value: newAttribute.value }],
      costPerItem: 0,
      shippingCosts: { _default: 0 }
    };

    onFinalVariantsChange([...finalVariants, newVariant]);
    setNewAttribute({ name: '', value: '' });
  };

  const removeFinalVariant = (index: number) => {
    onFinalVariantsChange(finalVariants.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, updates: Partial<FinalVariant>) => {
    const updated = [...finalVariants];
    updated[index] = { ...updated[index], ...updates };
    onFinalVariantsChange(updated);
  };

  const updateShippingCost = (variantIndex: number, countryCode: string, cost: number) => {
    const updated = [...finalVariants];
    updated[variantIndex] = {
      ...updated[variantIndex],
      shippingCosts: {
        ...updated[variantIndex].shippingCosts,
        [countryCode]: cost
      }
    };
    onFinalVariantsChange(updated);
  };

  const addShippingCountry = (variantIndex: number, countryCode: string) => {
    const updated = [...finalVariants];
    const defaultCost = updated[variantIndex].shippingCosts._default || 0;
    updated[variantIndex] = {
      ...updated[variantIndex],
      shippingCosts: {
        ...updated[variantIndex].shippingCosts,
        [countryCode]: defaultCost
      }
    };
    onFinalVariantsChange(updated);
  };

  const removeShippingCountry = (variantIndex: number, countryCode: string) => {
    const updated = [...finalVariants];
    const { [countryCode]: removed, ...rest } = updated[variantIndex].shippingCosts;
    updated[variantIndex] = {
      ...updated[variantIndex],
      shippingCosts: rest
    };
    onFinalVariantsChange(updated);
  };

  const getAvailableCountries = (variantIndex: number) => {
    const usedCodes = Object.keys(finalVariants[variantIndex].shippingCosts).filter(
      (code) => code !== '_default'
    );
    return COMMON_COUNTRIES.filter((country) => !usedCodes.includes(country.code));
  };

  return (
    <div className="space-y-6">
      {/* Pack Configuration */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Pack Size (Units) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            value={packSize}
            onChange={(e) => onPackSizeChange(parseInt(e.target.value) || 1)}
            disabled={disabled}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            SKU Prefix <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={skuPrefix}
            onChange={(e) => onSkuPrefixChange(e.target.value)}
            disabled={disabled}
            placeholder="e.g., SUN-SINGLE or SUN-5PACK"
            className="w-full px-3 py-2 text-sm bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50"
          />
        </div>
      </div>

      {/* Variants in this Pack */}
      <div>
        <div className="flex items-center space-x-2 mb-3">
          <Package2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Variants in this Pack
          </span>
        </div>

        {finalVariants.length === 0 ? (
          <div className="p-4 bg-gray-50 dark:bg-dark/50 rounded-lg border border-dashed border-gray-300 dark:border-[#3a3a3a]">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              No variants added yet. Add variants like different colors or sizes below.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {finalVariants.map((variant, index) => (
              <div
                key={index}
                className="bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg overflow-hidden"
              >
                {/* Variant Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-dark/50 border-b border-gray-200 dark:border-[#3a3a3a]">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {variant.attributes.map(a => a.value).join(' / ')}
                    </span>
                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-dark px-2 py-1 rounded">
                      {variant.sku}
                    </span>
                  </div>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => removeFinalVariant(index)}
                      className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Variant Details */}
                <div className="p-4 space-y-4">
                  {/* SKU - Editable */}
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Final SKU
                    </label>
                    <input
                      type="text"
                      value={variant.sku}
                      onChange={(e) => updateVariant(index, { sku: e.target.value })}
                      disabled={disabled}
                      className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50"
                    />
                  </div>

                  {/* Cost */}
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Cost per Item <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={variant.costPerItem}
                        onChange={(e) => updateVariant(index, { costPerItem: parseFloat(e.target.value) || 0 })}
                        disabled={disabled}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Shipping */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setExpandedShipping(expandedShipping === index ? null : index)}
                      className="w-full flex items-center justify-between text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors mb-2"
                    >
                      <div className="flex items-center space-x-2">
                        <Globe className="w-3.5 h-3.5" />
                        <span>Shipping Costs</span>
                        <span className="text-gray-500 dark:text-gray-400 font-normal">
                          ({Object.keys(variant.shippingCosts).length} countries)
                        </span>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedShipping === index ? 'rotate-180' : ''}`} />
                    </button>

                    {expandedShipping === index && (
                      <div className="space-y-2 bg-gray-50 dark:bg-dark/50 p-3 rounded-lg border border-gray-200 dark:border-[#3a3a3a]">
                        {/* Default Shipping */}
                        <div className="flex items-center space-x-2">
                          <div className="flex-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Default (All Other Countries)
                            </span>
                          </div>
                          <div className="relative w-24">
                            <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={variant.shippingCosts._default}
                              onChange={(e) => updateShippingCost(index, '_default', parseFloat(e.target.value) || 0)}
                              disabled={disabled}
                              className="w-full pl-6 pr-2 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded text-xs text-gray-900 dark:text-white disabled:opacity-50"
                            />
                          </div>
                        </div>

                        {/* Country-Specific Shipping */}
                        {Object.entries(variant.shippingCosts)
                          .filter(([code]) => code !== '_default')
                          .map(([code, cost]) => (
                            <div key={code} className="flex items-center space-x-2">
                              {!disabled && (
                                <button
                                  type="button"
                                  onClick={() => removeShippingCountry(index, code)}
                                  className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors flex-shrink-0"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                              <div className="flex-1">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {COMMON_COUNTRIES.find((c) => c.code === code)?.name || code}
                                </span>
                              </div>
                              <div className="relative w-24">
                                <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">$</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={cost}
                                  onChange={(e) => updateShippingCost(index, code, parseFloat(e.target.value) || 0)}
                                  disabled={disabled}
                                  className="w-full pl-6 pr-2 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded text-xs text-gray-900 dark:text-white disabled:opacity-50"
                                />
                              </div>
                            </div>
                          ))}

                        {/* Add Country */}
                        {!disabled && (
                          <CountrySelector
                            label="Add Country"
                            availableCountries={getAvailableCountries(index)}
                            onSelect={(code) => addShippingCountry(index, code)}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New Variant */}
        {!disabled && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-dark/50 rounded-lg border border-gray-200 dark:border-[#3a3a3a]">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newAttribute.name}
                onChange={(e) => setNewAttribute({ ...newAttribute, name: e.target.value })}
                placeholder="Attribute (e.g., Color)"
                className="w-1/3 px-3 py-2 text-sm bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <input
                type="text"
                value={newAttribute.value}
                onChange={(e) => setNewAttribute({ ...newAttribute, value: e.target.value })}
                placeholder="Value (e.g., White)"
                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <button
                type="button"
                onClick={addFinalVariant}
                disabled={!newAttribute.name.trim() || !newAttribute.value.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
