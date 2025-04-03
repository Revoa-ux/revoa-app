import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AlertTriangle, RefreshCw, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { handleError } from '@/lib/errorTracking';
import { isConnectionError, isChatError } from '@/lib/errors';

interface FallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ChatErrorFallback: React.FC<FallbackProps> = ({ error, resetErrorBoundary }) => {
  const isConnectionIssue = isConnectionError(error);
  const isChatIssue = isChatError(error);

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-red-100 mx-auto mb-4 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {isConnectionIssue
            ? 'Connection Error'
            : isChatIssue
            ? 'Chat Error'
            : 'Something went wrong'}
        </h3>
        
        <p className="text-sm text-gray-600 mb-6">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>

        <div className="space-y-3">
          <button
            onClick={resetErrorBoundary}
            className="w-full px-4 py-2 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </button>

          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Reload Chat
          </button>
        </div>
      </div>
    </div>
  );
};

interface ChatErrorBoundaryProps {
  children: React.ReactNode;
}

export const ChatErrorBoundary: React.FC<ChatErrorBoundaryProps> = ({ children }) => {
  const handleError = (error: Error) => {
    console.error('Chat error:', error);
    
    // Report error to monitoring service
    handleError(error);

    // Show user-friendly toast
    toast.error(
      isConnectionError(error)
        ? 'Connection lost. Please check your internet connection.'
        : isChatError(error)
        ? error.message
        : 'An unexpected error occurred'
    );
  };

  return (
    <ErrorBoundary
      FallbackComponent={ChatErrorFallback}
      onError={handleError}
      onReset={() => {
        // Reset any chat state here
      }}
    >
      {children}
    </ErrorBoundary>
  );
};