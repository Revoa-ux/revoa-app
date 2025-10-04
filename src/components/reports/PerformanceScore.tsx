import React from 'react';

interface ScoreProps {
  percentage: number;
  color: string;
  icon: React.ReactNode;
  label: string;
}

const ScoreCircle: React.FC<ScoreProps> = ({ percentage, color, icon, label }) => (
  <div className="flex flex-col items-center">
    <div className="relative w-24 h-24">
      <svg className="w-24 h-24 transform -rotate-90">
        <circle
          cx="48"
          cy="48"
          r="36"
          stroke="transparent"
          strokeWidth="8"
          fill="transparent"
        />
        <circle
          cx="48"
          cy="48"
          r="36"
          stroke={color}
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={`${2 * Math.PI * 36}`}
          strokeDashoffset={`${2 * Math.PI * 36 * (1 - percentage / 100)}`}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-semibold text-gray-900 dark:text-white">{percentage}%</span>
      </div>
    </div>
    <div className="mt-4 text-gray-400">{icon}</div>
    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">{label}</div>
  </div>
);

interface PerformanceScoreProps {
  scores: {
    performance: number;
    audience: number;
    optimization: number;
  };
}

export const PerformanceScore: React.FC<PerformanceScoreProps> = ({ scores }) => {
  return (
    <div className="grid grid-cols-3 gap-8">
      <div>
        <h3 className="text-lg font-medium text-pink-500 mb-1">Performance Score</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">(scroll down to see more)</p>
        <ScoreCircle
          percentage={scores.performance}
          color="url(#performanceGradient)"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="m3 12 6-6 4 10 3-4 5 5"/></svg>}
          label="Performance Score"
        />
        <svg width="0" height="0">
          <defs>
            <linearGradient id="performanceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F43F5E" />
              <stop offset="100%" stopColor="#E8795A" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div>
        <h3 className="text-lg font-medium text-pink-500 mb-1">Audience Score</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">(scroll down to see more)</p>
        <ScoreCircle
          percentage={scores.audience}
          color="url(#audienceGradient)"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          label="Audience Score"
        />
        <svg width="0" height="0">
          <defs>
            <linearGradient id="audienceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F43F5E" />
              <stop offset="100%" stopColor="#E8795A" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div>
        <h3 className="text-lg font-medium text-pink-500 mb-1">Optimization Score</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">(scroll down to see more)</p>
        <ScoreCircle
          percentage={scores.optimization}
          color="url(#optimizationGradient)"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>}
          label="Optimization Score"
        />
        <svg width="0" height="0">
          <defs>
            <linearGradient id="optimizationGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F43F5E" />
              <stop offset="100%" stopColor="#E8795A" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};

export default PerformanceScore;
