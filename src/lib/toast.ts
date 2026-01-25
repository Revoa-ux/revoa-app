import { toast as sonnerToast, ExternalToast } from 'sonner';

const TOAST_COLORS = ['#f0fefa', '#fef2f1', '#fdf2f8', '#fff3f2'] as const;

const getRandomColor = () => TOAST_COLORS[Math.floor(Math.random() * TOAST_COLORS.length)];

const createStyledOptions = (options?: ExternalToast): ExternalToast => ({
  ...options,
  style: {
    background: getRandomColor(),
    border: '1px solid rgba(0, 0, 0, 0.05)',
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
