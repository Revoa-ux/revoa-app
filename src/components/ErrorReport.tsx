import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { isAuthError, isNetworkError, isValidationError } from '../lib/errors';
import { StatusIcon } from './StatusIcon';

interface ErrorReportProps {
  error: Error;
  resetError?: () => void;
}

export const ErrorReport: React.FC<ErrorReportProps> = ({ error, resetError }) => {
  const getErrorMessage = () => {
    if (isAuthError(error)) {
      return 'Authentication error. Please sign in again.';
    }
    if (isNetworkError(error)) {
      return 'Network error. Please check your connection.';
    }
    if (isValidationError(error)) {
      return 'Invalid input. Please check your data.';
    }
    return error.message || 'An unexpected error occurred';
  };

  const handleRetry = () => {
    if (resetError) {
      resetError();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundColor: '#fafafa',
        backgroundImage: `repeating-linear-gradient(
          -45deg,
          transparent,
          transparent 4px,
          rgba(0, 0, 0, 0.03) 4px,
          rgba(0, 0, 0, 0.03) 5px
        )`
      }}
    >
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 max-w-md w-full">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <StatusIcon variant="error" size="lg" icon={AlertTriangle} />
          </div>
          <h2 className="text-xl font-medium text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-600 mb-6">
            {getErrorMessage()}
          </p>
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="btn btn-primary w-full flex items-center justify-center"
            >
              <RefreshCw className="btn-icon w-4 h-4 mr-2" />
              Try Again
            </button>
            <button
              onClick={handleGoHome}
              className="btn btn-secondary w-full flex items-center justify-center"
            >
              <Home className="btn-icon w-4 h-4 mr-2" />
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};