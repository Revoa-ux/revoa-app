import React from 'react';
import { Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'default' | 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  showArrow?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  default: 'bg-gray-700 text-white hover:bg-gray-800 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-600 dark:hover:bg-gray-700',
  primary: 'bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed',
  secondary: 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed',
  danger: 'bg-red-600 text-white hover:bg-red-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed dark:bg-red-700 dark:hover:bg-red-800',
  ghost: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed shadow-none',
  outline: 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1 text-xs gap-1.5',
  md: 'px-5 py-1.5 text-sm gap-2',
  lg: 'px-6 py-2 text-base gap-2.5',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'default',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  showArrow = false,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}) => {
  const isDisabled = disabled || loading;

  const iconSizeStyles = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <button
      className={cn(
        'group inline-flex items-center justify-center font-medium rounded-lg transition-all shadow-sm',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {loading && <Loader2 className={cn(iconSizeStyles[size], 'animate-spin')} />}
      {!loading && icon && iconPosition === 'left' && icon}
      {children}
      {!loading && showArrow && (
        <ArrowRight className={cn(iconSizeStyles[size], 'group-hover:translate-x-0.5 transition-transform')} />
      )}
      {!loading && icon && iconPosition === 'right' && !showArrow && icon}
    </button>
  );
};

export default Button;
