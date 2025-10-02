import React from 'react';
import { Image, Video, FileText } from 'lucide-react';

interface CreativeItem {
  id: string;
  type: 'image' | 'video' | 'text';
  title: string;
  performance: number;
  impressions: number;
  clicks: number;
}

interface CreativeAnalysisProps {
  creatives?: CreativeItem[];
}

const CreativeAnalysis: React.FC<CreativeAnalysisProps> = ({ creatives = [] }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="w-5 h-5" />;
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'text':
        return <FileText className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getPerformanceColor = (performance: number) => {
    if (performance >= 80) return 'text-green-600';
    if (performance >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Creative Analysis</h3>
      {creatives.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No creative data available
        </div>
      ) : (
        <div className="space-y-3">
          {creatives.map((creative) => (
            <div
              key={creative.id}
              className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="p-2 bg-gray-100 rounded-lg">
                {getIcon(creative.type)}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{creative.title}</h4>
                <div className="flex gap-4 mt-1 text-sm text-gray-600">
                  <span>{creative.impressions.toLocaleString()} impressions</span>
                  <span>{creative.clicks.toLocaleString()} clicks</span>
                </div>
              </div>
              <div className={`text-2xl font-bold ${getPerformanceColor(creative.performance)}`}>
                {creative.performance}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export { CreativeAnalysis };
export default CreativeAnalysis;
