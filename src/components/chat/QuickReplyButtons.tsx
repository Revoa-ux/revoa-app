import { useState } from 'react';
import { Check, ArrowRight } from 'lucide-react';
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
                className={`relative flex items-center gap-3 px-3 py-2 rounded-lg border transition-all text-left ${
                  isSelected
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-rose-400 dark:hover:border-rose-500 bg-white dark:bg-gray-800'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${
                  isSelected
                    ? 'border-rose-500 bg-rose-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${
                    isSelected
                      ? 'text-rose-900 dark:text-rose-100'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {option.label}
                  </div>
                  {option.description && (
                    <div className={`text-xs mt-0.5 ${
                      isSelected
                        ? 'text-rose-700 dark:text-rose-300'
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
          className="group w-full px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg font-medium transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <span>Continue {selectedValues.size > 0 && `(${selectedValues.size} selected)`}</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
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
          className={`group flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:border-rose-500 dark:hover:border-rose-500 bg-white dark:bg-gray-800 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all ${
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
