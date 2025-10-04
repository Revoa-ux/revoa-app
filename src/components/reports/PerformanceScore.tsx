import React from 'react';

interface PerformanceScoreProps {
  scores: {
    performance: number;
    audience: number;
    optimization: number;
  };
}

const PerformanceScore: React.FC<PerformanceScoreProps> = ({ scores }) => {
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 dark:text-green-400';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Performance Scores</h3>
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Performance</span>
            <span className={`text-sm font-semibold ${getScoreColor(scores.performance)}`}>
              {scores.performance}/100
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all"
              style={{ width: `${scores.performance}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Audience</span>
            <span className={`text-sm font-semibold ${getScoreColor(scores.audience)}`}>
              {scores.audience}/100
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${scores.audience}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Optimization</span>
            <span className={`text-sm font-semibold ${getScoreColor(scores.optimization)}`}>
              {scores.optimization}/100
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all"
              style={{ width: `${scores.optimization}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export { PerformanceScore };
export default PerformanceScore;
