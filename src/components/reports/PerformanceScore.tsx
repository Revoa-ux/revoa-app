import React from 'react';

interface PerformanceScoreProps {
  score: number;
}

const PerformanceScore: React.FC<PerformanceScoreProps> = ({ score }) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Performance Score</h3>
      <div className="flex items-center justify-center">
        <div className={`text-6xl font-bold ${getScoreColor(score)}`}>
          {score || 0}
        </div>
      </div>
      <div className="text-center mt-2 text-sm text-gray-600">
        Out of 100
      </div>
    </div>
  );
};

export default PerformanceScore;
