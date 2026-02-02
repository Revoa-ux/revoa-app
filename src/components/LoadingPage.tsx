import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export const LoadingPage = () => {
  const { effectiveTheme } = useTheme();

  return (
    <div className={`fixed inset-0 flex items-center justify-center transition-colors duration-200 ${
      effectiveTheme === 'dark' ? 'bg-[#171717]' : 'bg-white'
    }`}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-6 h-6">
          <svg
            className="w-6 h-6 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="spinner-gradient-react" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E11D48" />
                <stop offset="40%" stopColor="#EC4899" />
                <stop offset="70%" stopColor="#F87171" />
                <stop offset="100%" stopColor="#E8795A" />
              </linearGradient>
            </defs>
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="url(#spinner-gradient-react)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="45 15"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
