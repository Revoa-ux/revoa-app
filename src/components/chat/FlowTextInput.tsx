import { useState, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface FlowTextInputProps {
  placeholder?: string;
  type?: 'text' | 'number';
  onSubmit: (value: string | number) => void;
  disabled?: boolean;
}

export function FlowTextInput({
  placeholder = 'Type your response...',
  type = 'text',
  onSubmit,
  disabled = false,
}: FlowTextInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (!value.trim() || disabled) return;

    const submitValue = type === 'number' ? parseFloat(value) : value.trim();
    onSubmit(submitValue);
    setValue('');
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex gap-2 mt-3">
      <input
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim() || disabled}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2"
        title="Submit"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
}
