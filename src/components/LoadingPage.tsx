import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { SpinningLogo3D } from './SpinningLogo3D';

export const LoadingPage = () => {
  const { effectiveTheme } = useTheme();

  return (
    <div className={`fixed inset-0 flex items-center justify-center transition-colors duration-200 ${
      effectiveTheme === 'dark' ? 'bg-gray-900' : 'bg-white'
    }`}>
      <SpinningLogo3D size={120} />
    </div>
  );
};
