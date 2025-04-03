import React from 'react';
import { useLoading } from '@/contexts/LoadingContext';

interface LoadingStateProps {
  children: React.ReactNode;
  skeleton: React.ReactNode;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ children, skeleton }) => {
  const { isLoading } = useLoading();
  return isLoading ? skeleton : children;
};