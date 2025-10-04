import React from 'react';

interface TotalScoreProps {
  score: number;
  total: number;
  maxScore: number;
}

const TotalScore: React.FC<TotalScoreProps> = ({ score, total, maxScore }) => {
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'from-green-500 to-green-600';
    if (score >= 50) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };

  const getScoreText = (score: number) => {
    if (score >= 70) return 'text-green-600 dark:text-green-400';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const percentage = Math.min(100, Math.max(0, score));

  return (
    <>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Overall Score</h3>
      <div className="flex flex-col items-center justify-center py-4">
        <div className="relative w-40 h-40">
          <svg className="transform -rotate-90 w-40 h-40">
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke="currentColor"
              strokeWidth="12"
              fill="transparent"
              className="text-gray-200 dark:text-gray-700"
            />
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke="url(#gradient)"
              strokeWidth="12"
              fill="transparent"
              strokeDasharray={`${2 * Math.PI * 70}`}
              strokeDashoffset={`${2 * Math.PI * 70 * (1 - percentage / 100)}`}
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" className={`${getScoreColor(score).split(' ')[0].replace('from-', 'stop-color-')}`} />
                <stop offset="100%" className={`${getScoreColor(score).split(' ')[1].replace('to-', 'stop-color-')}`} />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold ${getScoreText(score)}`}>{Math.round(score)}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">/ 100</span>
          </div>
        </div>
        <div className="mt-6 space-y-2 w-full">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Current</span>
            <span className="font-semibold text-gray-900 dark:text-white">{total}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Max Potential</span>
            <span className="font-semibold text-gray-900 dark:text-white">{maxScore}</span>
          </div>
        </div>
      </div>
    </>
  );
};

export { TotalScore };
export default TotalScore;
