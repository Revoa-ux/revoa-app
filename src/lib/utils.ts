import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge'; // eslint-disable-line @typescript-eslint/no-unused-vars

export function cn(...inputs: ClassValue[]) {
  // Use a Set to deduplicate class names
  const classNames = new Set<string>();

  // Process all inputs
  const combined = clsx(inputs);

  // Split the combined string and add each class to the Set
  combined.split(' ').forEach(className => {
    if (className) classNames.add(className);
  });

  // Convert Set back to string
  return Array.from(classNames).join(' ');
}

// Format number with thousand separators
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

// Format currency with thousand separators
export function formatCurrency(value: number, decimals: number = 0, currencyCode: string = 'USD'): string {
  const localeMap: Record<string, string> = {
    'USD': 'en-US',
    'EUR': 'de-DE',
    'GBP': 'en-GB',
    'CAD': 'en-CA',
    'AUD': 'en-AU',
    'JPY': 'ja-JP',
    'CNY': 'zh-CN'
  };

  const locale = localeMap[currencyCode] || 'en-US';
  const effectiveDecimals = currencyCode === 'JPY' ? 0 : decimals;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: effectiveDecimals,
    maximumFractionDigits: effectiveDecimals
  }).format(value);
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const target = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - target.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  const isToday = target.toDateString() === now.toDateString();

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60 && isToday) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24 && isToday) {
    return `${diffHours}h ago`;
  } else {
    return target.toLocaleDateString();
  }
}