import { toast as sonnerToast, ExternalToast } from 'sonner';

const TOAST_THEMES = [
  { bg: '#f0fefa', border: '#99e6d3', text: '#0d7363' },
  { bg: '#fef2f1', border: '#f5c4c0', text: '#be3a34' },
  { bg: '#fdf2f8', border: '#f5c6e0', text: '#9d174d' },
  { bg: '#fff3f2', border: '#f5c4c0', text: '#be3a34' },
  { bg: '#fff7ec', border: '#fcd49a', text: '#b45309' },
] as const;

const getRandomTheme = () => TOAST_THEMES[Math.floor(Math.random() * TOAST_THEMES.length)];

const createStyledOptions = (options?: ExternalToast): ExternalToast => {
  const theme = getRandomTheme();
  return {
    ...options,
    style: {
      background: theme.bg,
      border: `1.5px solid ${theme.border}`,
      boxShadow: 'inset 0 -1px 2px rgba(0, 0, 0, 0.08)',
      borderRadius: '8px',
      color: theme.text,
      fontWeight: 500,
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
