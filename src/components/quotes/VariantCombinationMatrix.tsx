import React from 'react';
import { Check, X } from 'lucide-react';
import { VariantType, ProductAttribute } from '@/types/quotes';

interface VariantCombinationMatrixProps {
  variantTypes: VariantType[];
  selectedCombinations: Set<string>;
  onToggleCombination: (combinationKey: string, attributes: ProductAttribute[]) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export const VariantCombinationMatrix: React.FC<VariantCombinationMatrixProps> = ({
  variantTypes,
  selectedCombinations,
  onToggleCombination,
  onSelectAll,
  onDeselectAll
}) => {
  if (variantTypes.length === 0) {
    return null;
  }

  if (variantTypes.length === 1) {
    const type = variantTypes[0];
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Select Available {type.name} Options
          </h4>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onSelectAll}
              className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300"
            >
              Select All
            </button>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <button
              type="button"
              onClick={onDeselectAll}
              className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Deselect All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {type.values.map((value) => {
            const key = value;
            const attributes: ProductAttribute[] = [{ name: type.name, value }];
            const isSelected = selectedCombinations.has(key);

            return (
              <button
                key={key}
                type="button"
                onClick={() => onToggleCombination(key, attributes)}
                className={`
                  relative p-3 rounded-lg border-2 text-sm font-medium transition-all
                  ${isSelected
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300'
                    : 'border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-dark text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-[#4a4a4a]'
                  }
                `}
              >
                {value}
                {isSelected && (
                  <div className="absolute top-1 right-1 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (variantTypes.length === 2) {
    const [typeA, typeB] = variantTypes;
    const totalCombinations = typeA.values.length * typeB.values.length;
    const selectedCount = selectedCombinations.size;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Select Available Combinations
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
              ({selectedCount} of {totalCombinations} selected)
            </span>
          </h4>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onSelectAll}
              className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300"
            >
              Select All
            </button>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <button
              type="button"
              onClick={onDeselectAll}
              className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Deselect All
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-[#3a3a3a]">
                  {typeA.name} / {typeB.name}
                </th>
                {typeB.values.map((valueB) => (
                  <th
                    key={valueB}
                    className="p-2 text-center text-xs font-medium text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-[#3a3a3a]"
                  >
                    {valueB}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {typeA.values.map((valueA) => (
                <tr key={valueA}>
                  <td className="p-2 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-[#3a3a3a]">
                    {valueA}
                  </td>
                  {typeB.values.map((valueB) => {
                    const key = `${valueA}__${valueB}`;
                    const attributes: ProductAttribute[] = [
                      { name: typeA.name, value: valueA },
                      { name: typeB.name, value: valueB }
                    ];
                    const isSelected = selectedCombinations.has(key);

                    return (
                      <td
                        key={key}
                        className="p-2 border-b border-gray-200 dark:border-[#3a3a3a]"
                      >
                        <button
                          type="button"
                          onClick={() => onToggleCombination(key, attributes)}
                          className={`
                            w-full px-5 py-1.5 rounded-lg border-2 transition-all flex items-center justify-center
                            ${isSelected
                              ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                              : 'border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-dark hover:border-gray-300 dark:hover:border-gray-600'
                            }
                          `}
                        >
                          {isSelected ? (
                            <Check className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                          ) : (
                            <X className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const generateCombinations = (): Array<{ key: string; attributes: ProductAttribute[]; label: string }> => {
    const combinations: Array<{ key: string; attributes: ProductAttribute[]; label: string }> = [];

    const generate = (index: number, current: ProductAttribute[], labels: string[]) => {
      if (index === variantTypes.length) {
        const key = labels.join('__');
        const label = labels.join(' - ');
        combinations.push({ key, attributes: [...current], label });
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
    return combinations;
  };

  const combinations = generateCombinations();
  const selectedCount = selectedCombinations.size;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Select Available Combinations
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            ({selectedCount} of {combinations.length} selected)
          </span>
        </h4>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onSelectAll}
            className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300"
          >
            Select All
          </button>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <button
            type="button"
            onClick={onDeselectAll}
            className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Deselect All
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto space-y-2 p-2 bg-gray-50 dark:bg-dark/30 rounded-lg border border-gray-200 dark:border-[#3a3a3a]">
        {combinations.map(({ key, attributes, label }) => {
          const isSelected = selectedCombinations.has(key);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggleCombination(key, attributes)}
              className={`
                w-full p-3 rounded-lg border-2 text-sm font-medium transition-all flex items-center justify-between
                ${isSelected
                  ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300'
                  : 'border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-dark text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
            >
              <span>{label}</span>
              {isSelected && <Check className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
