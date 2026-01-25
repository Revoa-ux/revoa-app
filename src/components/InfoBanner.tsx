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
  outerBorder: string;
  outerBg: string;
  innerBorder: string;
  gradient: string;
  gradientDark: string;
  iconColor: string;
  DefaultIcon: LucideIcon;
}> = {
  info: {
    outerBorder: 'border-blue-200 dark:border-blue-900/50',
    outerBg: 'bg-blue-50 dark:bg-blue-950/30',
    innerBorder: 'border-blue-300 dark:border-blue-800/60',
    gradient: 'linear-gradient(to bottom, rgba(239, 246, 255, 1), rgba(219, 234, 254, 1))',
    gradientDark: 'linear-gradient(to bottom, rgba(30, 58, 138, 0.15), rgba(30, 58, 138, 0.25))',
    iconColor: 'text-blue-600 dark:text-blue-400',
    DefaultIcon: Info,
  },
  warning: {
    outerBorder: 'border-amber-200 dark:border-amber-900/50',
    outerBg: 'bg-amber-50 dark:bg-amber-950/30',
    innerBorder: 'border-amber-300 dark:border-amber-800/60',
    gradient: 'linear-gradient(to bottom, rgba(255, 251, 235, 1), rgba(254, 243, 199, 1))',
    gradientDark: 'linear-gradient(to bottom, rgba(120, 53, 15, 0.15), rgba(120, 53, 15, 0.25))',
    iconColor: 'text-amber-600 dark:text-amber-400',
    DefaultIcon: AlertTriangle,
  },
  error: {
    outerBorder: 'border-red-200 dark:border-red-900/50',
    outerBg: 'bg-red-50 dark:bg-red-950/30',
    innerBorder: 'border-red-300 dark:border-red-800/60',
    gradient: 'linear-gradient(to bottom, rgba(254, 242, 242, 1), rgba(254, 226, 226, 1))',
    gradientDark: 'linear-gradient(to bottom, rgba(127, 29, 29, 0.15), rgba(127, 29, 29, 0.25))',
    iconColor: 'text-red-600 dark:text-red-400',
    DefaultIcon: AlertCircle,
  },
  success: {
    outerBorder: 'border-emerald-200 dark:border-emerald-900/50',
    outerBg: 'bg-emerald-50 dark:bg-emerald-950/30',
    innerBorder: 'border-emerald-300 dark:border-emerald-800/60',
    gradient: 'linear-gradient(to bottom, rgba(236, 253, 245, 1), rgba(209, 250, 229, 1))',
    gradientDark: 'linear-gradient(to bottom, rgba(6, 78, 59, 0.15), rgba(6, 78, 59, 0.25))',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    DefaultIcon: CheckCircle,
  },
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

  return (
    <div className={`rounded-xl p-0.5 border ${styles.outerBorder} ${styles.outerBg} ${className}`}>
      <div
        className={`rounded-lg border ${styles.innerBorder} px-4 py-3 info-banner-inner-${uniqueId.replace(/:/g, '')}`}
        style={{ background: styles.gradient }}
      >
        <style>{`
          .dark .info-banner-inner-${uniqueId.replace(/:/g, '')} {
            background: ${styles.gradientDark} !important;
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

  return (
    <div className={`rounded-lg p-0.5 border ${styles.outerBorder} ${styles.outerBg} ${className}`}>
      <div
        className={`rounded-md border ${styles.innerBorder} px-3 py-2 info-banner-compact-${uniqueId.replace(/:/g, '')}`}
        style={{ background: styles.gradient }}
      >
        <style>{`
          .dark .info-banner-compact-${uniqueId.replace(/:/g, '')} {
            background: ${styles.gradientDark} !important;
          }
        `}</style>
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 flex-shrink-0 ${styles.iconColor}`} />
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
