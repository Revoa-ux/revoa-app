import React from 'react';

interface TotalScoreProps {
  score: number;
  total: number;
  maxScore: number;
}

export const TotalScore: React.FC<TotalScoreProps> = ({ score, total, maxScore }) => {
  const percentage = (total / maxScore) * 100;
  
  return (
    <div className="text-center">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Your Total Score</h2>
      
      <div className="relative w-48 h-48 mx-auto">
        <svg className="w-48 h-48 transform -rotate-90">
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F43F5E" />
              <stop offset="50%" stopColor="#FB7185" />
              <stop offset="100%" stopColor="#E8795A" />
            </linearGradient>
          </defs>
          
          <circle
            cx="96"
            cy="96"
            r="90"
            stroke="transparent"
            strokeWidth="12"
            fill="transparent"
          />
          <circle
            cx="96"
            cy="96"
            r="90"
            stroke="url(#scoreGradient)"
            strokeWidth="12"
            fill="transparent"
            strokeDasharray={`${2 * Math.PI * 90}`}
            strokeDashoffset={`${2 * Math.PI * 90 * (1 - percentage / 100)}`}
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold text-gray-900 dark:text-white">{score}%</span>
          <span className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {total} of {maxScore}
          </span>
        </div>
      </div>

      <p className="text-base text-gray-600 dark:text-gray-400 mt-4 max-w-md mx-auto">
        Not a bad score. There are a few opportunities to improve & boost your advertising ROI.
      </p>

      <button className="mt-4 px-6 py-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg hover:opacity-90 transition-colors">
        Schedule a meeting
      </button>
    </div>
  );
};