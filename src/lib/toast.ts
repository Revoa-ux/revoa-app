import { toast as sonnerToast, Toaster, ExternalToast } from 'sonner';

export { Toaster };

const TOAST_THEMES = [
  { bg: '#f0fdf4', border: 'rgba(134, 239, 172, 0.5)', text: '#166534' },
  { bg: '#eff6ff', border: 'rgba(147, 197, 253, 0.5)', text: '#1e40af' },
  { bg: '#fdf4ff', border: 'rgba(240, 171, 252, 0.5)', text: '#86198f' },
  { bg: '#fff7ed', border: 'rgba(253, 186, 116, 0.5)', text: '#9a3412' },
  { bg: '#f0fdfa', border: 'rgba(94, 234, 212, 0.5)', text: '#115e59' },
  { bg: '#fef2f2', border: 'rgba(252, 165, 165, 0.5)', text: '#991b1b' },
] as const;

let themeIndex = 0;
const getNextTheme = () => {
  const theme = TOAST_THEMES[themeIndex];
  themeIndex = (themeIndex + 1) % TOAST_THEMES.length;
  return theme;
};

const createStyledOptions = (options?: ExternalToast): ExternalToast => {
  const theme = getNextTheme();
  return {
    ...options,
    closeButton: true,
    style: {
      background: theme.bg,
      border: `1px solid ${theme.border}`,
      boxShadow: 'inset 0 -2px 0 rgba(0, 0, 0, 0.06)',
      borderRadius: '10px',
      color: theme.text,
      fontWeight: 600,
      padding: '8px 12px',
      fontSize: '13px',
      lineHeight: '1.3',
      minHeight: 'unset',
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
