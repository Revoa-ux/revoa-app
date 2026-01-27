import React from 'react';
import { Check } from 'lucide-react';

interface CustomCheckboxProps {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

export const CustomCheckbox: React.FC<CustomCheckboxProps> = ({
  checked,
  onChange,
  className = ''
}) => {
  return (
    <label className={`relative inline-flex items-center cursor-pointer ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only peer"
      />
      <div className={`
        w-4 h-4 rounded border transition-all
        ${checked
          ? 'bg-gradient-to-br from-gray-700 to-gray-800 dark:from-[#4a4a4a] dark:to-[#3a3a3a] border-gray-700 dark:border-[#4a4a4a]'
          : 'bg-white dark:bg-dark border-gray-300 dark:border-[#4a4a4a] hover:border-gray-400 dark:hover:border-gray-500'
        }
      `}>
        {checked && (
          <Check className="w-3 h-3 text-white absolute top-0.5 left-0.5" strokeWidth={3} />
        )}
      </div>
    </label>
  );
};
