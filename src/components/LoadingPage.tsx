import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export const LoadingPage = () => {
  const { effectiveTheme } = useTheme();

  return (
    <div className={`fixed inset-0 flex items-center justify-center transition-colors duration-200 ${
      effectiveTheme === 'dark' ? 'bg-gray-900' : 'bg-white'
    }`}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <svg
            className="w-16 h-16 animate-spin"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="spinner-gradient-react" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="40%" stopColor="#E11D48" />
                <stop offset="80%" stopColor="#EC4899" />
                <stop offset="100%" stopColor="#E8795A" />
              </linearGradient>
            </defs>
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="url(#spinner-gradient-react)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="140 44"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
