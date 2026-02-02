import React from 'react';
import { Check, X, AlertTriangle, Loader2, Info, Circle, LucideIcon } from 'lucide-react';

type StatusVariant = 'success' | 'error' | 'warning' | 'loading' | 'info' | 'neutral';
type StatusSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface StatusIconProps {
  variant: StatusVariant;
  size?: StatusSize;
  icon?: LucideIcon;
  className?: string;
}

const VARIANT_STYLES: Record<StatusVariant, {
  bg: string;
  glow: string;
  iconColor: string;
  DefaultIcon: LucideIcon;
}> = {
  success: {
    bg: 'bg-emerald-500',
    glow: 'bg-emerald-500/15',
    iconColor: 'text-white',
    DefaultIcon: Check,
  },
  error: {
    bg: 'bg-rose-500',
    glow: 'bg-rose-500/15',
    iconColor: 'text-white',
    DefaultIcon: X,
  },
  warning: {
    bg: 'bg-amber-500',
    glow: 'bg-amber-500/15',
    iconColor: 'text-white',
    DefaultIcon: AlertTriangle,
  },
  loading: {
    bg: 'bg-sky-500',
    glow: 'bg-sky-500/15',
    iconColor: 'text-white',
    DefaultIcon: Loader2,
  },
  info: {
    bg: 'bg-blue-500',
    glow: 'bg-blue-500/15',
    iconColor: 'text-white',
    DefaultIcon: Info,
  },
  neutral: {
    bg: 'bg-gray-400',
    glow: 'bg-gray-400/15',
    iconColor: 'text-white',
    DefaultIcon: Circle,
  },
};

const SIZE_STYLES: Record<StatusSize, {
  container: string;
  icon: string;
  shadowLarge: string;
  shadowSmall: string;
}> = {
  xs: {
    container: 'w-6 h-6',
    icon: 'w-3 h-3',
    shadowLarge: 'inset 0px 2px 6px 0px rgba(255,255,255,0.4), inset 0px -1px 2px 0px rgba(0,0,0,0.2)',
    shadowSmall: 'inset 0px 2px 6px 0px rgba(255,255,255,0.4), inset 0px -1px 2px 0px rgba(0,0,0,0.2)',
  },
  sm: {
    container: 'w-8 h-8',
    icon: 'w-4 h-4',
    shadowLarge: 'inset 0px 2px 8px 0px rgba(255,255,255,0.4), inset 0px -1px 3px 0px rgba(0,0,0,0.2)',
    shadowSmall: 'inset 0px 2px 8px 0px rgba(255,255,255,0.4), inset 0px -1px 3px 0px rgba(0,0,0,0.2)',
  },
  md: {
    container: 'w-10 h-10',
    icon: 'w-5 h-5',
    shadowLarge: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)',
    shadowSmall: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)',
  },
  lg: {
    container: 'w-12 h-12',
    icon: 'w-5 h-5',
    shadowLarge: 'inset 0px 4px 12px 0px rgba(255,255,255,0.45), inset 0px -2px 4px 0px rgba(0,0,0,0.25)',
    shadowSmall: 'inset 0px 4px 12px 0px rgba(255,255,255,0.45), inset 0px -2px 4px 0px rgba(0,0,0,0.25)',
  },
  xl: {
    container: 'w-14 h-14',
    icon: 'w-6 h-6',
    shadowLarge: 'inset 0px 4px 12px 0px rgba(255,255,255,0.45), inset 0px -2px 4px 0px rgba(0,0,0,0.25)',
    shadowSmall: 'inset 0px 4px 12px 0px rgba(255,255,255,0.45), inset 0px -2px 4px 0px rgba(0,0,0,0.25)',
  },
};

export const StatusIcon: React.FC<StatusIconProps> = ({
  variant,
  size = 'lg',
  icon,
  className = '',
}) => {
  const variantStyle = VARIANT_STYLES[variant];
  const sizeStyle = SIZE_STYLES[size];
  const Icon = icon || variantStyle.DefaultIcon;
  const isLoading = variant === 'loading';

  return (
    <div className={`inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm ${variantStyle.glow} ${className}`}>
      <div
        className={`${sizeStyle.container} rounded-full ${variantStyle.bg} flex items-center justify-center`}
        style={{ boxShadow: sizeStyle.shadowLarge }}
      >
        <Icon
          className={`${sizeStyle.icon} ${variantStyle.iconColor} ${isLoading ? 'animate-spin' : ''}`}
          strokeWidth={2.5}
        />
      </div>
    </div>
  );
};

export const SuccessIcon: React.FC<Omit<StatusIconProps, 'variant'>> = (props) => (
  <StatusIcon variant="success" {...props} />
);

export const ErrorIcon: React.FC<Omit<StatusIconProps, 'variant'>> = (props) => (
  <StatusIcon variant="error" {...props} />
);

export const WarningIcon: React.FC<Omit<StatusIconProps, 'variant'>> = (props) => (
  <StatusIcon variant="warning" {...props} />
);

export const LoadingIcon: React.FC<Omit<StatusIconProps, 'variant'>> = (props) => (
  <StatusIcon variant="loading" {...props} />
);

export const InfoIcon: React.FC<Omit<StatusIconProps, 'variant'>> = (props) => (
  <StatusIcon variant="info" {...props} />
);

export const NeutralIcon: React.FC<Omit<StatusIconProps, 'variant'>> = (props) => (
  <StatusIcon variant="neutral" {...props} />
);

export default StatusIcon;
