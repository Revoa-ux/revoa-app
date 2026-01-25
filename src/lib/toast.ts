import { toast as sonnerToast, ExternalToast } from 'sonner';

const createStyledOptions = (options?: ExternalToast): ExternalToast => ({
  ...options,
  style: {
    background: '#f0fdfa',
    border: '1px solid rgba(153, 246, 228, 0.6)',
    boxShadow: 'inset 0 -1px 2px rgba(0, 0, 0, 0.1)',
    borderRadius: '8px',
    color: '#0f766e',
    ...options?.style,
  },
});

export const toast = Object.assign(
  (message: string | React.ReactNode, options?: ExternalToast) => {
    return sonnerToast(message, createStyledOptions(options));
  },
  {
    success: (message: string | React.ReactNode, options?: ExternalToast) => {
      return sonnerToast.success(message, createStyledOptions(options));
    },
    error: (message: string | React.ReactNode, options?: ExternalToast) => {
      return sonnerToast.error(message, createStyledOptions(options));
    },
    warning: (message: string | React.ReactNode, options?: ExternalToast) => {
      return sonnerToast.warning(message, createStyledOptions(options));
    },
    info: (message: string | React.ReactNode, options?: ExternalToast) => {
      return sonnerToast.info(message, createStyledOptions(options));
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
