import { toast as sonnerToast, ExternalToast } from 'sonner';

const TOAST_THEMES = [
  { bg: '#f0fefa', border: 'rgba(153, 246, 228, 0.6)', text: '#0f766e' },
  { bg: '#fef2f1', border: 'rgba(254, 202, 202, 0.7)', text: '#be3a34' },
  { bg: '#fdf2f8', border: 'rgba(251, 207, 232, 0.7)', text: '#9d174d' },
  { bg: '#fff3f2', border: 'rgba(254, 202, 202, 0.7)', text: '#be3a34' },
  { bg: '#fff7ec', border: 'rgba(253, 230, 138, 0.7)', text: '#b45309' },
] as const;

const getRandomTheme = () => TOAST_THEMES[Math.floor(Math.random() * TOAST_THEMES.length)];

const createStyledOptions = (options?: ExternalToast): ExternalToast => {
  const theme = getRandomTheme();
  return {
    ...options,
    style: {
      background: theme.bg,
      border: `1px solid ${theme.border}`,
      boxShadow: 'inset 0 -1px 2px rgba(0, 0, 0, 0.1)',
      borderRadius: '8px',
      color: theme.text,
      fontWeight: 500,
      padding: '12px 16px',
      fontSize: '14px',
      ...options?.style,
    },
  };
};

export const toast = Object.assign(
  (message: string | React.ReactNode, options?: ExternalToast) => {
    return sonnerToast(message, createStyledOptions(options));
  },
  {
    success: (message: string | React.ReactNode, options?: ExternalToast) => {
      return sonnerToast(message, createStyledOptions(options));
    },
    error: (message: string | React.ReactNode, options?: ExternalToast) => {
      return sonnerToast(message, createStyledOptions(options));
    },
    warning: (message: string | React.ReactNode, options?: ExternalToast) => {
      return sonnerToast(message, createStyledOptions(options));
    },
    info: (message: string | React.ReactNode, options?: ExternalToast) => {
      return sonnerToast(message, createStyledOptions(options));
    },
    loading: (message: string | React.ReactNode, options?: ExternalToast) => {
      return sonnerToast.loading(message, createStyledOptions(options));
    },
    promise: sonnerToast.promise,
    dismiss: sonnerToast.dismiss,
    custom: (jsx: (id: number | string) => React.ReactNode, options?: ExternalToast) => {
      return sonnerToast.custom(jsx, createStyledOptions(options));
    },
    message: (message: string | React.ReactNode, options?: ExternalToast) => {
      return sonnerToast.message(message, createStyledOptions(options));
    },
  }
);
