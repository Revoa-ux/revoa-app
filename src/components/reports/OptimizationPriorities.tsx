import React from 'react';
import { AlertTriangle, TrendingUp, Clock } from 'lucide-react';

interface Priority {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

interface OptimizationPrioritiesProps {
  priorities?: Priority[];
}

const OptimizationPriorities: React.FC<OptimizationPrioritiesProps> = ({ priorities = [] }) => {
  const defaultPriorities: Priority[] = [
    {
      title: 'Optimize Images',
      description: 'Compress and resize images to improve load times',
      impact: 'high'
    },
    {
      title: 'Reduce JavaScript Bundle Size',
      description: 'Remove unused code and implement code splitting',
      impact: 'high'
    },
    {
      title: 'Enable Caching',
      description: 'Implement browser and server-side caching strategies',
      impact: 'medium'
    }
  ];

  const displayPriorities = priorities.length > 0 ? priorities : defaultPriorities;

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getIcon = (impact: string) => {
    switch (impact) {
      case 'high':
        return <AlertTriangle className="w-5 h-5" />;
      case 'medium':
        return <TrendingUp className="w-5 h-5" />;
      case 'low':
        return <Clock className="w-5 h-5" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Optimization Priorities</h3>
      <div className="space-y-3">
        {displayPriorities.map((priority, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className={`p-2 rounded-lg ${getImpactColor(priority.impact)}`}>
              {getIcon(priority.impact)}
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{priority.title}</h4>
              <p className="text-sm text-gray-600 mt-1">{priority.description}</p>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${getImpactColor(priority.impact)}`}>
              {priority.impact.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export { OptimizationPriorities };
export default OptimizationPriorities;
