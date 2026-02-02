// Base error class for application-specific errors
export class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'unknown',
    public status: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Authentication errors
export class AuthError extends AppError {
  constructor(
    message: string,
    code: string = 'auth/unknown',
    status: number = 401,
    details?: any
  ) {
    super(message, code, status, details);
    this.name = 'AuthError';
  }
}

// Network errors
export class NetworkError extends AppError {
  constructor(
    message: string = 'Network error occurred',
    code: string = 'network/error',
    status: number = 503,
    details?: any
  ) {
    super(message, code, status, details);
    this.name = 'NetworkError';
  }
}

// Validation errors
export class ValidationError extends AppError {
  constructor(
    message: string,
    public field?: string,
    details?: any
  ) {
    super(message, 'validation/invalid', 400, details);
    this.name = 'ValidationError';
  }
}

// Error type guards
export const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError;
};

export const isAuthError = (error: unknown): error is AuthError => {
  return error instanceof AuthError;
};

export const isNetworkError = (error: unknown): error is NetworkError => {
  return error instanceof NetworkError;
};

export const isValidationError = (error: unknown): error is ValidationError => {
  return error instanceof ValidationError;
};
