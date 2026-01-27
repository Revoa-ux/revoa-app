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
          {options.map((option, index) => {
            const isSelected = selectedValues.has(option.value);
            return (
              <button
                key={option.id}
                onClick={() => handleMultiSelect(option.value)}
                disabled={disabled}
                className={`relative flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-left overflow-hidden ${
                  isSelected
                    ? 'border-rose-400 dark:border-rose-500 bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-900/20 dark:to-rose-900/10'
                    : 'border-gray-200 dark:border-[#4a4a4a] bg-gradient-to-br from-gray-50 to-white dark:from-[#2a2a2a] dark:to-[#2a2a2a]/50 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-sm'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {!isSelected && (
                  <div
                    className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(107,114,128,0.04)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(156,163,175,0.06)_0%,transparent_50%)]"
                    style={{
                      background: index % 2 === 0
                        ? 'radial-gradient(circle at 30% 20%, rgba(107,114,128,0.04) 0%, transparent 50%)'
                        : 'radial-gradient(circle at 70% 20%, rgba(107,114,128,0.04) 0%, transparent 50%)'
                    }}
                  />
                )}
                <div className={`relative flex-shrink-0 w-3.5 h-3.5 rounded border flex items-center justify-center ${
                  isSelected
                    ? 'border-rose-500 bg-rose-500'
                    : 'border-gray-300 dark:border-[#4a4a4a]'
                }`}>
                  {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                </div>

                <div className="relative flex-1 min-w-0">
                  <div className={`text-xs font-medium ${
                    isSelected
                      ? 'text-rose-900 dark:text-rose-100'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {option.label}
                  </div>
                  {option.description && (
                    <div className={`text-[10px] mt-0.5 ${
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

        <div className="flex justify-end">
          <button
            onClick={handleMultiSelectSubmit}
            disabled={disabled || selectedValues.size === 0}
            className="btn btn-primary group"
          >
            <span>Continue {selectedValues.size > 0 && `(${selectedValues.size})`}</span>
            <ArrowRight className="btn-icon btn-icon-arrow w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
      {options.map((option, index) => (
        <button
          key={option.id}
          onClick={() => handleSingleSelect(option.value)}
          disabled={disabled}
          className={`relative group flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#4a4a4a] rounded-lg bg-gradient-to-br from-gray-50 to-white dark:from-[#2a2a2a] dark:to-[#2a2a2a]/50 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-sm transition-all overflow-hidden whitespace-nowrap ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(107,114,128,0.04)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(156,163,175,0.06)_0%,transparent_50%)]"
            style={{
              background: index % 2 === 0
                ? 'radial-gradient(circle at 30% 20%, rgba(107,114,128,0.04) 0%, transparent 50%)'
                : 'radial-gradient(circle at 70% 20%, rgba(107,114,128,0.04) 0%, transparent 50%)'
            }}
          />
          {option.icon && <span className="relative text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors text-sm">{option.icon}</span>}
          <span className="relative">
            {option.label}
          </span>
        </button>
      ))}
    </div>
  );
}
