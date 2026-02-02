import React from 'react';

interface CustomRadioProps {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  value: string;
  name: string;
  disabled?: boolean;
  className?: string;
}

export const CustomRadio: React.FC<CustomRadioProps> = ({
  checked,
  onChange,
  value,
  name,
  disabled = false,
  className = ''
}) => {
  return (
    <label className={`relative inline-flex items-center cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only peer"
      />
      <div className={`
        w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center
        peer-focus:ring-1 peer-focus:ring-gray-900 dark:peer-focus:ring-gray-100 peer-focus:ring-offset-2
        ${checked
          ? 'border-gray-700 dark:border-gray-400'
          : 'border-gray-300 dark:border-[#4a4a4a] hover:border-gray-400 dark:hover:border-gray-500'
        }
      `}>
        {checked && (
          <div className="w-2 h-2 rounded-full bg-gray-700 dark:bg-gray-400" />
        )}
      </div>
    </label>
  );
};
