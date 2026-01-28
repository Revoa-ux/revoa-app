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
  currentBalance?: number;
}

export const COGSProjection: React.FC<COGSProjectionProps> = ({
  data,
  selectedPeriod = '7d',
  onPeriodChange,
  currentBalance = 0
}) => {
  const currentData = data[selectedPeriod];
  const suggestedBuffer = currentData.total * 1.5;
  const suggestedTopUp = Math.max(0, suggestedBuffer - currentBalance);

  return (
    <>
      <div className="flex items-end space-x-3 mb-4">
        <span className="text-3xl font-semibold text-gray-900 dark:text-white">${currentData.total.toLocaleString()}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">USD</span>
      </div>

      <div className="mb-5 pb-4 border-b border-gray-100 dark:border-[#3a3a3a]">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Suggested Top-up</span>
          <span className="font-medium text-gray-900 dark:text-white">${suggestedTopUp.toLocaleString()}</span>
        </div>
      </div>

      <div className="inline-flex items-center bg-white dark:bg-dark rounded-lg border border-gray-200 dark:border-[#3a3a3a] p-1 relative z-10">
        <button
          onClick={() => onPeriodChange?.('7d')}
          className={`${selectedPeriod === '7d' ? 'btn btn-primary' : 'btn btn-ghost'}`}
        >
          7d
        </button>
        <button
          onClick={() => onPeriodChange?.('14d')}
          className={`${selectedPeriod === '14d' ? 'btn btn-primary' : 'btn btn-ghost'}`}
        >
          14d
        </button>
        <button
          onClick={() => onPeriodChange?.('30d')}
          className={`${selectedPeriod === '30d' ? 'btn btn-primary' : 'btn btn-ghost'}`}
        >
          30d
        </button>
      </div>
    </>
  );
};