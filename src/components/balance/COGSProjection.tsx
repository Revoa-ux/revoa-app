import React from 'react';

interface COGSData {
  period: string;
  total: number;
  percentageChange: number;
}

interface COGSProjectionProps {
  data: {
    [key in '7d' | '14d' | '30d']: COGSData;
  };
  selectedPeriod?: '7d' | '14d' | '30d';
  onPeriodChange?: (period: '7d' | '14d' | '30d') => void;
}

export const COGSProjection: React.FC<COGSProjectionProps> = ({ 
  data, 
  selectedPeriod = '7d',
  onPeriodChange
}) => {
  const currentData = data[selectedPeriod];

  return (
    <>
      <div className="flex items-end space-x-3 mb-4">
        <span className="text-3xl font-semibold text-gray-900 dark:text-white">${currentData.total.toLocaleString()}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">USD</span>
      </div>

      <div className="mb-5 pb-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Suggested Top-up</span>
          <span className="font-medium text-gray-900 dark:text-white">${(currentData.total - 24892).toLocaleString()}</span>
        </div>
      </div>

      <div className="inline-flex items-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1 relative z-10">
        <button
          onClick={() => onPeriodChange?.('7d')}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors focus:outline-none ${
            selectedPeriod === '7d'
              ? 'bg-gray-900 dark:bg-gray-700 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          7d
        </button>
        <button
          onClick={() => onPeriodChange?.('14d')}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors focus:outline-none ${
            selectedPeriod === '14d'
              ? 'bg-gray-900 dark:bg-gray-700 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          14d
        </button>
        <button
          onClick={() => onPeriodChange?.('30d')}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors focus:outline-none ${
            selectedPeriod === '30d'
              ? 'bg-gray-900 dark:bg-gray-700 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          30d
        </button>
      </div>
    </>
  );
};