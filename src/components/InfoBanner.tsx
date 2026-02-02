import React from 'react';
import { Info, AlertTriangle, AlertCircle, CheckCircle, LucideIcon } from 'lucide-react';

type BannerVariant = 'info' | 'warning' | 'error' | 'success';

interface InfoBannerProps {
  variant?: BannerVariant;
  title?: string;
  children: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
  action?: React.ReactNode;
}

const variantStyles: Record<BannerVariant, {
  border: string;
  boxShadow: string;
  gradient: string;
  gradientDark: string;
  iconColor: string;
  DefaultIcon: LucideIcon;
}> = {
  info: {
    border: '#93c5fd',
    boxShadow: '0 0 0 2px #dbeafe',
    gradient: 'linear-gradient(to bottom, #eff6ff, white)',
    gradientDark: 'linear-gradient(to bottom, rgba(30, 64, 175, 0.35), rgba(30, 58, 138, 0.2))',
    iconColor: 'text-blue-600 dark:text-blue-400',
    DefaultIcon: Info,
  },
  warning: {
    border: '#fcd34d',
    boxShadow: '0 0 0 2px #fef9c3',
    gradient: 'linear-gradient(to bottom, #fefce8, white)',
    gradientDark: 'linear-gradient(to bottom, rgba(146, 64, 14, 0.35), rgba(113, 63, 18, 0.2))',
    iconColor: 'text-amber-600 dark:text-amber-400',
    DefaultIcon: AlertTriangle,
  },
  error: {
    border: '#fca5a5',
    boxShadow: '0 0 0 2px #fee2e2',
    gradient: 'linear-gradient(to bottom, #fef2f2, white)',
    gradientDark: 'linear-gradient(to bottom, rgba(153, 27, 27, 0.35), rgba(127, 29, 29, 0.2))',
    iconColor: 'text-red-600 dark:text-red-400',
    DefaultIcon: AlertCircle,
  },
  success: {
    border: '#6ee7b7',
    boxShadow: '0 0 0 2px #dcfce7',
    gradient: 'linear-gradient(to bottom, #f0fdf4, white)',
    gradientDark: 'linear-gradient(to bottom, rgba(22, 101, 52, 0.35), rgba(20, 83, 45, 0.2))',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    DefaultIcon: CheckCircle,
  },
};

const darkBorderColors: Record<BannerVariant, string> = {
  info: 'rgba(59, 130, 246, 0.4)',
  warning: 'rgba(234, 179, 8, 0.4)',
  error: 'rgba(239, 68, 68, 0.4)',
  success: 'rgba(34, 197, 94, 0.4)',
};

const darkBoxShadows: Record<BannerVariant, string> = {
  info: '0 0 0 2px rgba(59, 130, 246, 0.15)',
  warning: '0 0 0 2px rgba(234, 179, 8, 0.15)',
  error: '0 0 0 2px rgba(239, 68, 68, 0.15)',
  success: '0 0 0 2px rgba(34, 197, 94, 0.15)',
};

export function InfoBanner({
  variant = 'info',
  title,
  children,
  icon: CustomIcon,
  className = '',
  action,
}: InfoBannerProps) {
  const styles = variantStyles[variant];
  const Icon = CustomIcon || styles.DefaultIcon;
  const uniqueId = React.useId();
  const safeId = uniqueId.replace(/:/g, '');

  return (
    <div
      className={`info-banner-${safeId} rounded-xl px-4 py-3 ${className}`}
      style={{
        background: styles.gradient,
        border: `1px solid ${styles.border}`,
        boxShadow: styles.boxShadow,
      }}
    >
      <style>{`
        .dark .info-banner-${safeId} {
          background: ${styles.gradientDark} !important;
          border-color: ${darkBorderColors[variant]} !important;
          box-shadow: ${darkBoxShadows[variant]} !important;
        }
      `}</style>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${styles.iconColor}`} />
        <div className="flex-1 min-w-0">
          {title && (
            <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
              {title}
            </p>
          )}
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {children}
          </div>
        </div>
        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}

export function InfoBannerCompact({
  variant = 'info',
  children,
  icon: CustomIcon,
  className = '',
}: Omit<InfoBannerProps, 'title' | 'action'>) {
  const styles = variantStyles[variant];
  const Icon = CustomIcon || styles.DefaultIcon;
  const uniqueId = React.useId();
  const safeId = uniqueId.replace(/:/g, '');

  return (
    <div
      className={`info-banner-compact-${safeId} rounded-lg px-3 py-2 ${className}`}
      style={{
        background: styles.gradient,
        border: `1px solid ${styles.border}`,
        boxShadow: styles.boxShadow,
      }}
    >
      <style>{`
        .dark .info-banner-compact-${safeId} {
          background: ${styles.gradientDark} !important;
          border-color: ${darkBorderColors[variant]} !important;
          box-shadow: ${darkBoxShadows[variant]} !important;
        }
      `}</style>
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 flex-shrink-0 ${styles.iconColor}`} />
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {children}
        </div>
      </div>
    </div>
  );
}
