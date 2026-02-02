import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface CustomSelectOption {
  value: string | number;
  label: string;
}

interface CustomSelectProps {
  value: string | number;
  onChange: (value: string | number) => void;
  options: CustomSelectOption[];
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  className = '',
  disabled = false,
  placeholder = 'Select an option',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full h-[38px] px-3 pr-8 border border-gray-200 dark:border-[#3a3a3a] rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white focus:ring-1 focus:ring-gray-300 focus:border-gray-300 text-left transition-all text-sm ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50'
        }`}
      >
        <span className={`truncate block ${selectedOption ? '' : 'text-gray-500 dark:text-gray-400'}`}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg shadow-lg max-h-60 overflow-y-auto overflow-hidden">
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`w-full px-3 py-2.5 text-left text-sm transition-colors flex items-center justify-between whitespace-nowrap ${
                index === 0 ? 'rounded-t-lg' : ''
              } ${
                index === options.length - 1 ? 'rounded-b-lg' : ''
              } ${
                option.value === value
                  ? 'bg-gray-100 dark:bg-[#3a3a3a] text-gray-900 dark:text-white font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a]'
              }`}
            >
              <span className="truncate">{option.label}</span>
              {option.value === value && (
                <Check className="w-4 h-4 text-rose-500 dark:text-rose-400 flex-shrink-0 ml-2" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
