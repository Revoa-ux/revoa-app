import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface LoadingState {
  isLoading: boolean;
  loadingMessage?: string;
  progress?: number;
}

interface LoadingContextType {
  loadingState: LoadingState;
  setLoading: (loading: boolean, message?: string, progress?: number) => void;
  updateProgress: (progress: number) => void;
  clearLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    loadingMessage: undefined,
    progress: undefined,
  });

  const setLoading = useCallback((loading: boolean, message?: string, progress?: number) => {
    setLoadingState({
      isLoading: loading,
      loadingMessage: message,
      progress,
    });
  }, []);

  const updateProgress = useCallback((progress: number) => {
    setLoadingState(prev => ({
      ...prev,
      progress,
    }));
  }, []);

  const clearLoading = useCallback(() => {
    setLoadingState({
      isLoading: false,
      loadingMessage: undefined,
      progress: undefined,
    });
  }, []);

  const value: LoadingContextType = {
    loadingState,
    setLoading,
    updateProgress,
    clearLoading,
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};