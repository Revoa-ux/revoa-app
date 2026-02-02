interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md';
}

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
      translate: checked ? 'translate-x-[18px]' : 'translate-x-0.5'
    },
    md: {
      container: 'w-11 h-6',
      circle: 'w-5 h-5',
      translate: checked ? 'translate-x-[22px]' : 'translate-x-0.5'
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
        relative inline-flex items-center ${sizes.container} flex-shrink-0 cursor-pointer rounded-full
        transition-all duration-200 ease-in-out focus:outline-none
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${loading ? 'cursor-wait animate-pulse' : ''}
        ${checked
          ? 'bg-rose-500'
          : 'bg-gray-300 dark:bg-[#4a4a4a]'
        }
      `}
      style={checked ? {
        boxShadow: 'inset 0px 2px 4px rgba(0,0,0,0.15), inset 0px -1px 2px rgba(255,255,255,0.2)'
      } : {
        boxShadow: 'inset 0px 1px 2px rgba(0,0,0,0.1)'
      }}
    >
      <span className="sr-only">Toggle switch</span>
      <span
        aria-hidden="true"
        className={`
          ${sizes.translate}
          pointer-events-none ${sizes.circle} rounded-full
          bg-white transition duration-200 ease-in-out
        `}
        style={{
          boxShadow: '0px 1px 3px rgba(0,0,0,0.2), 0px 1px 1px rgba(0,0,0,0.1)'
        }}
      />
    </button>
  );
}
