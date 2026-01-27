import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface Priority {
  id: string;
  title: string;
  points: number;
  description?: string;
  recommendations?: string[];
}

interface OptimizationPrioritiesProps {
  priorities: Priority[];
}

export const OptimizationPriorities: React.FC<OptimizationPrioritiesProps> = ({ priorities }) => {
  const [expandedPriority, setExpandedPriority] = useState<string | null>(null);

  // Simplified toggle function
  const togglePriority = (id: string) => {
    setExpandedPriority(prev => prev === id ? null : id);
  };

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Your Top Optimization Priorities</h2>
      
      <div className="space-y-4">
        {priorities.map((priority) => (
          <div key={priority.id} className="border-b border-gray-200 dark:border-[#333333] last:border-0">
            <button
              onClick={() => togglePriority(priority.id)}
              className="w-full py-4 flex items-center justify-between text-left focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              style={{ outline: 'none' }}
            >
              <div className="flex items-center space-x-4">
                <div className="w-6 h-6 flex items-center justify-center">
                  <span className="text-red-500 text-xl">!</span>
                </div>
                <span className="text-gray-900 dark:text-white">{priority.title}</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-gray-600 dark:text-gray-400">+{priority.points} points</span>
                <ChevronDown 
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    expandedPriority === priority.id ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>
            
            {expandedPriority === priority.id && priority.description && (
              <div className="pb-4 px-10 space-y-4">
                <p className="text-gray-600 dark:text-gray-400">{priority.description}</p>
                {priority.recommendations && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Recommendations:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {priority.recommendations.map((rec, index) => (
                        <li key={index} className="text-gray-600 dark:text-gray-400">{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};