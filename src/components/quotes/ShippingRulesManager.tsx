import React, { useState } from 'react';
import { Plus, Trash2, Globe, Package, AlertCircle } from 'lucide-react';
import { ShippingRules, QuantityTier } from '@/types/quotes';
import { CountrySelector, COMMON_COUNTRIES } from './CountrySelector';
import { toast } from '../../lib/toast';

interface ShippingRulesManagerProps {
  rules: ShippingRules;
  onRulesChange: (rules: ShippingRules) => void;
  variantName?: string;
}

export const ShippingRulesManager: React.FC<ShippingRulesManagerProps> = ({
  rules,
  onRulesChange,
  variantName
}) => {
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [countryRate, setCountryRate] = useState('');

  const [showQuantityTiers, setShowQuantityTiers] = useState(false);
  const [newTierMinQty, setNewTierMinQty] = useState('');
  const [newTierCost, setNewTierCost] = useState('');

  const updateDefaultShipping = (value: string) => {
    if (value === '') {
      onRulesChange({ ...rules, default: 0 });
      return;
    }
    const cost = parseFloat(value);
    if (!isNaN(cost) && cost >= 0) {
      onRulesChange({ ...rules, default: cost });
    }
  };

  const addCountryRate = () => {
    if (!selectedCountry || !countryRate) {
      toast.error('Please select a country and enter a rate');
      return;
    }

    const cost = parseFloat(countryRate);
    if (isNaN(cost) || cost < 0) {
      toast.error('Please enter a valid shipping cost');
      return;
    }

    onRulesChange({
      ...rules,
      byCountry: {
        ...rules.byCountry,
        [selectedCountry]: cost
      }
    });

    setSelectedCountry('');
    setCountryRate('');
  };

  const removeCountryRate = (countryCode: string) => {
    const newByCountry = { ...rules.byCountry };
    delete newByCountry[countryCode];
    onRulesChange({ ...rules, byCountry: newByCountry });
  };

  const addQuantityTier = () => {
    const minQty = parseInt(newTierMinQty);
    const discount = parseFloat(newTierCost);

    if (isNaN(minQty) || minQty < 1) {
      toast.error('Please enter a valid minimum quantity');
      return;
    }

    if (isNaN(discount) || discount < 0) {
      toast.error('Please enter a valid discount amount');
      return;
    }

    const newTiers = [...(rules.byQuantity || []), { minQty, discountAmount: discount }];
    newTiers.sort((a, b) => a.minQty - b.minQty);

    onRulesChange({
      ...rules,
      byQuantity: newTiers
    });

    setNewTierMinQty('');
    setNewTierCost('');
  };

  const removeQuantityTier = (index: number) => {
    const newTiers = [...(rules.byQuantity || [])];
    newTiers.splice(index, 1);
    onRulesChange({
      ...rules,
      byQuantity: newTiers.length > 0 ? newTiers : undefined
    });
  };

  const getCountryName = (code: string) => {
    return COMMON_COUNTRIES.find(c => c.code === code)?.name || code;
  };

  const availableCountries = COMMON_COUNTRIES.filter(
    c => !rules.byCountry[c.code]
  );

  return (
    <div className="space-y-4">
      {variantName && (
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <Package className="w-4 h-4" />
          <span>Shipping rules for: <strong className="text-gray-900 dark:text-white">{variantName}</strong></span>
        </div>
      )}

      <div className="p-4 bg-white dark:bg-dark rounded-lg border border-gray-200 dark:border-[#3a3a3a]">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-900 dark:text-white">
            Default Shipping Cost
          </label>
          <AlertCircle className="w-4 h-4 text-gray-400" title="Applied when no other rules match" />
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
            $
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={rules.default === 0 ? '' : rules.default}
            onChange={(e) => updateDefaultShipping(e.target.value)}
            placeholder="0"
            className="w-full pl-7 pr-3 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>
      </div>

      <div className="p-4 bg-white dark:bg-dark rounded-lg border border-gray-200 dark:border-[#3a3a3a]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Country-Specific Rates
            </h4>
          </div>
          <button
            type="button"
            onClick={() => setShowCountrySelector(!showCountrySelector)}
            className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-medium"
          >
            {showCountrySelector ? 'Hide' : 'Add Country'}
          </button>
        </div>

        {Object.keys(rules.byCountry).length > 0 ? (
          <div className="space-y-2 mb-3">
            {Object.entries(rules.byCountry).map(([code, cost]) => (
              <div
                key={code}
                className="flex items-center justify-between gap-3 p-2 bg-gray-50 dark:bg-dark/50 rounded-lg"
              >
                <span className="text-sm text-gray-900 dark:text-white flex-shrink-0">
                  {getCountryName(code)}
                </span>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cost}
                      onChange={(e) => {
                        const newCost = parseFloat(e.target.value);
                        if (!isNaN(newCost) && newCost >= 0) {
                          onRulesChange({
                            ...rules,
                            byCountry: {
                              ...rules.byCountry,
                              [code]: newCost
                            }
                          });
                        }
                      }}
                      className="w-20 pl-5 pr-2 py-1 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCountryRate(code)}
                    className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            No country-specific rates. Default rate applies to all countries.
          </p>
        )}

        {showCountrySelector && availableCountries.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-gray-200 dark:border-[#3a3a3a]">
            <CountrySelector
              label="Select a country"
              availableCountries={availableCountries}
              onSelect={setSelectedCountry}
              selectedValue={selectedCountry}
            />
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={countryRate}
                  onChange={(e) => setCountryRate(e.target.value)}
                  placeholder="Shipping cost"
                  className="w-full pl-7 pr-3 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCountryRate();
                    }
                  }}
                />
              </div>
              <button
                type="button"
                onClick={addCountryRate}
                disabled={!selectedCountry || !countryRate}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white dark:bg-dark rounded-lg border border-gray-200 dark:border-[#3a3a3a]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Package className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Shipping Quantity Discounts
            </h4>
          </div>
          <button
            type="button"
            onClick={() => setShowQuantityTiers(!showQuantityTiers)}
            className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-medium"
          >
            {showQuantityTiers ? 'Hide' : 'Add Tier'}
          </button>
        </div>

        {rules.byQuantity && rules.byQuantity.length > 0 ? (
          <div className="space-y-2 mb-3">
            {rules.byQuantity.map((tier, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-3 p-2 bg-gray-50 dark:bg-dark/50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={tier.minQty}
                    onChange={(e) => {
                      const newMinQty = parseInt(e.target.value);
                      if (!isNaN(newMinQty) && newMinQty >= 1) {
                        const newTiers = [...(rules.byQuantity || [])];
                        newTiers[index] = { ...tier, minQty: newMinQty };
                        newTiers.sort((a, b) => a.minQty - b.minQty);
                        onRulesChange({
                          ...rules,
                          byQuantity: newTiers
                        });
                      }
                    }}
                    className="w-16 px-2 py-1 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">+ units</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">
                      -$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={tier.discountAmount}
                      onChange={(e) => {
                        const newDiscount = parseFloat(e.target.value);
                        if (!isNaN(newDiscount) && newDiscount >= 0) {
                          const newTiers = [...(rules.byQuantity || [])];
                          newTiers[index] = { ...tier, discountAmount: newDiscount };
                          onRulesChange({
                            ...rules,
                            byQuantity: newTiers
                          });
                        }
                      }}
                      className="w-20 pl-6 pr-2 py-1 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded text-sm text-green-600 dark:text-green-400 focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                    />
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">discount</span>
                  <button
                    type="button"
                    onClick={() => removeQuantityTier(index)}
                    className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            No quantity discounts configured. Same shipping rate applies regardless of order quantity.
          </p>
        )}

        {showQuantityTiers && (
          <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-[#3a3a3a]">
            <p className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
              Discount formula: (Base rate × Quantity) - Discount amount
            </p>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="1"
                value={newTierMinQty}
                onChange={(e) => setNewTierMinQty(e.target.value)}
                placeholder="Min units ordered"
                className="px-3 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newTierCost}
                  onChange={(e) => setNewTierCost(e.target.value)}
                  placeholder="Discount amount"
                  className="w-full pl-7 pr-3 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addQuantityTier();
                    }
                  }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={addQuantityTier}
              disabled={!newTierMinQty || !newTierCost}
              className="w-full py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Add Tier</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
