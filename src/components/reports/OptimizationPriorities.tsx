import React from 'react';
import { AlertTriangle, TrendingUp, Clock, ChevronRight } from 'lucide-react';

interface Priority {
  id: string;
  title: string;
  points: number;
  description: string;
  recommendations: string[];
}

interface OptimizationPrioritiesProps {
  priorities?: Priority[];
}

const OptimizationPriorities: React.FC<OptimizationPrioritiesProps> = ({ priorities = [] }) => {
  const getPointsColor = (points: number) => {
    if (points >= 15) return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30';
    if (points >= 10) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30';
    return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30';
  };

  const getIcon = (points: number) => {
    if (points >= 15) return <AlertTriangle className="w-5 h-5" />;
    if (points >= 10) return <TrendingUp className="w-5 h-5" />;
    return <Clock className="w-5 h-5" />;
  };

  return (
    <>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Optimization Priorities</h3>
      {priorities.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No optimization priorities at this time
        </div>
      ) : (
        <div className="space-y-4">
          {priorities.map((priority) => (
            <div
              key={priority.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={`p-2 rounded-lg ${getPointsColor(priority.points)}`}>
                  {getIcon(priority.points)}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">{priority.title}</h4>
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getPointsColor(priority.points)}`}>
                      +{priority.points} pts
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{priority.description}</p>
                </div>
              </div>
              {priority.recommendations && priority.recommendations.length > 0 && (
                <div className="mt-3 pl-11 space-y-1.5">
                  {priority.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export { OptimizationPriorities };
export default OptimizationPriorities;
