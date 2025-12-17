import { useState } from 'react';
import { Check } from 'lucide-react';
import type { FlowResponseOption } from '../../types/conversationalFlows';

interface QuickReplyButtonsProps {
  options: FlowResponseOption[];
  onSelect: (value: any) => void;
  multiSelect?: boolean;
  disabled?: boolean;
}

export function QuickReplyButtons({
  options,
  onSelect,
  multiSelect = false,
  disabled = false,
}: QuickReplyButtonsProps) {
  const [selectedValues, setSelectedValues] = useState<Set<string>>(new Set());

  const handleSingleSelect = (value: string) => {
    if (disabled) return;
    onSelect(value);
  };

  const handleMultiSelect = (value: string) => {
    if (disabled) return;

    const newSelected = new Set(selectedValues);
    if (newSelected.has(value)) {
      newSelected.delete(value);
    } else {
      newSelected.add(value);
    }
    setSelectedValues(newSelected);
  };

  const handleMultiSelectSubmit = () => {
    if (disabled || selectedValues.size === 0) return;
    onSelect(Array.from(selectedValues));
  };

  if (multiSelect) {
    return (
      <div className="space-y-2 mt-3">
        <div className="grid grid-cols-1 gap-2">
          {options.map((option) => {
            const isSelected = selectedValues.has(option.value);
            return (
              <button
                key={option.id}
                onClick={() => handleMultiSelect(option.value)}
                disabled={disabled}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 bg-white dark:bg-gray-800'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${
                    isSelected
                      ? 'text-blue-900 dark:text-blue-100'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {option.label}
                  </div>
                  {option.description && (
                    <div className={`text-xs mt-0.5 ${
                      isSelected
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {option.description}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleMultiSelectSubmit}
          disabled={disabled || selectedValues.size === 0}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
        >
          Continue {selectedValues.size > 0 && `(${selectedValues.size} selected)`}
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
      {options.map((option) => (
        <button
          key={option.id}
          onClick={() => handleSingleSelect(option.value)}
          disabled={disabled}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          {option.icon && <span>{option.icon}</span>}
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {option.label}
          </span>
        </button>
      ))}
    </div>
  );
}
