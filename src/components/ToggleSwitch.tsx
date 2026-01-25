interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md';
}

const BRAND_GRADIENT = 'linear-gradient(135deg, #E11D48 0%, #EC4899 40%, #F87171 70%, #E8795A 100%)';

export default function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  loading = false,
  size = 'sm'
}: ToggleSwitchProps) {
  const sizeClasses = {
    sm: {
      container: 'w-9 h-5',
      circle: 'w-4 h-4',
      translate: checked ? 'translate-x-4' : 'translate-x-0.5'
    },
    md: {
      container: 'w-11 h-6',
      circle: 'w-5 h-5',
      translate: checked ? 'translate-x-5' : 'translate-x-0.5'
    }
  };

  const sizes = sizeClasses[size];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled || loading}
      onClick={() => !disabled && !loading && onChange(!checked)}
      className={`
        relative inline-flex ${sizes.container} flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${loading ? 'cursor-wait animate-pulse' : ''}
        ${!checked ? 'bg-gray-300 dark:bg-gray-600' : ''}
      `}
      style={checked ? { background: BRAND_GRADIENT } : undefined}
    >
      <span className="sr-only">Toggle switch</span>
      <span
        aria-hidden="true"
        className={`
          ${sizes.translate}
          pointer-events-none inline-block ${sizes.circle} transform rounded-full
          bg-white shadow ring-0 transition duration-200 ease-in-out
        `}
      />
    </button>
  );
}
