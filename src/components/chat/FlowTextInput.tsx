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
        className="flex-1 px-4 py-2 border-2 border-gray-200 dark:border-[#3a3a3a] rounded-lg focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none bg-white dark:bg-dark text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim() || disabled}
        className="btn btn-primary"
        title="Submit"
      >
        <Send className="btn-icon w-4 h-4" />
      </button>
    </div>
  );
}
