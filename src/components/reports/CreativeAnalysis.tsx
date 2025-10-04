import React from 'react';

interface CreativeItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  headline: string;
  description: string;
  adCopy: string;
  ctaText: string;
  metrics: {
    impressions: number;
    clicks: number;
    ctr: number;
    cpa: number;
    spend: number;
    conversions: number;
    roas: number;
    cpc: number;
  };
  performance: 'high' | 'medium' | 'low';
  fatigueScore: number;
  adName: string;
  platform: string;
  pageProfile: {
    name: string;
    imageUrl: string;
  };
}

interface CreativeAnalysisProps {
  creatives?: CreativeItem[];
  selectedTime?: string;
  onTimeChange?: (time: string) => void;
}

const CreativeAnalysis: React.FC<CreativeAnalysisProps> = ({ creatives = [] }) => {
  const getPerformanceBadge = (performance: 'high' | 'medium' | 'low') => {
    const styles = {
      high: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      low: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    };
    return styles[performance];
  };

  return (
    <>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Creative Analysis</h3>
      {creatives.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No creative data available
        </div>
      ) : (
        <div className="space-y-4">
          {creatives.map((creative) => (
            <div
              key={creative.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-start gap-4">
                <img
                  src={creative.type === 'video' ? creative.thumbnail : creative.url}
                  alt={creative.headline}
                  className="w-24 h-24 object-cover rounded-lg"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">{creative.headline}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPerformanceBadge(creative.performance)}`}>
                      {creative.performance}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{creative.description}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Impressions</div>
                      <div className="font-medium text-gray-900 dark:text-white">{creative.metrics.impressions.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">CTR</div>
                      <div className="font-medium text-gray-900 dark:text-white">{creative.metrics.ctr}%</div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">ROAS</div>
                      <div className="font-medium text-gray-900 dark:text-white">{creative.metrics.roas.toFixed(2)}x</div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Spend</div>
                      <div className="font-medium text-gray-900 dark:text-white">${creative.metrics.spend}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export { CreativeAnalysis };
export default CreativeAnalysis;
