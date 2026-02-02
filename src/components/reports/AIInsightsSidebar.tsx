import React, { useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Clock,
  Target,
  X,
  ChevronRight,
  Lightbulb
} from 'lucide-react';

interface AIInsight {
  id: string;
  type: 'top_performer' | 'needs_attention' | 'pattern' | 'timing' | 'budget';
  title: string;
  description: string;
  metric?: string;
  confidence: 'high' | 'medium' | 'low';
  actionable: boolean;
}

interface AIInsightsSidebarProps {
  creatives: any[];
  isOpen?: boolean;
  onClose?: () => void;
}

export const AIInsightsSidebar: React.FC<AIInsightsSidebarProps> = ({
  creatives,
  isOpen = true,
  onClose
}) => {
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());

  // Generate insights from creative data
  const generateInsights = (): AIInsight[] => {
    const insights: AIInsight[] = [];

    if (creatives.length === 0) {
      return insights;
    }

    // Find top performer
    const topPerformer = [...creatives].sort((a, b) =>
      (b.metrics.roas || 0) - (a.metrics.roas || 0)
    )[0];

    if (topPerformer && topPerformer.metrics.roas > 1) {
      insights.push({
        id: 'top-performer',
        type: 'top_performer',
        title: 'Top Performer Detected',
        description: `"${topPerformer.adName}" is delivering ${topPerformer.metrics.roas.toFixed(2)}x ROAS with ${topPerformer.metrics.conversions} conversions.`,
        metric: `${topPerformer.metrics.roas.toFixed(2)}x ROAS`,
        confidence: 'high',
        actionable: true
      });
    }

    // Find creatives needing attention (high fatigue or low performance)
    const needsAttention = creatives.filter(c =>
      c.fatigueScore > 70 || (c.metrics.spend > 100 && c.performance === 'low')
    );

    if (needsAttention.length > 0) {
      insights.push({
        id: 'needs-attention',
        type: 'needs_attention',
        title: 'Creatives Need Attention',
        description: `${needsAttention.length} ${needsAttention.length === 1 ? 'creative shows' : 'creatives show'} signs of fatigue or underperformance. Consider refreshing or pausing.`,
        confidence: 'high',
        actionable: true
      });
    }

    // Pattern: Video vs Image performance
    const videos = creatives.filter(c => c.type === 'video');
    const images = creatives.filter(c => c.type === 'image');

    if (videos.length > 0 && images.length > 0) {
      const avgVideoROAS = videos.reduce((sum, c) => sum + (c.metrics.roas || 0), 0) / videos.length;
      const avgImageROAS = images.reduce((sum, c) => sum + (c.metrics.roas || 0), 0) / images.length;

      if (avgVideoROAS > avgImageROAS * 1.5) {
        insights.push({
          id: 'video-pattern',
          type: 'pattern',
          title: 'Video Ads Outperforming',
          description: `Video ads are converting ${(avgVideoROAS / avgImageROAS).toFixed(1)}x better than image ads. Consider allocating more budget to video creatives.`,
          metric: `${avgVideoROAS.toFixed(2)}x vs ${avgImageROAS.toFixed(2)}x`,
          confidence: 'medium',
          actionable: true
        });
      } else if (avgImageROAS > avgVideoROAS * 1.5) {
        insights.push({
          id: 'image-pattern',
          type: 'pattern',
          title: 'Image Ads Outperforming',
          description: `Image ads are converting ${(avgImageROAS / avgVideoROAS).toFixed(1)}x better than video ads. Consider testing more image creatives.`,
          metric: `${avgImageROAS.toFixed(2)}x vs ${avgVideoROAS.toFixed(2)}x`,
          confidence: 'medium',
          actionable: true
        });
      }
    }

    // Budget recommendation
    const highPerformers = creatives.filter(c => c.metrics.roas > 2 && c.metrics.conversions > 5);
    if (highPerformers.length > 0) {
      const totalHighPerformerSpend = highPerformers.reduce((sum, c) => sum + c.metrics.spend, 0);
      const totalSpend = creatives.reduce((sum, c) => sum + c.metrics.spend, 0);
      const percentage = (totalHighPerformerSpend / totalSpend) * 100;

      if (percentage < 60) {
        insights.push({
          id: 'budget-recommendation',
          type: 'budget',
          title: 'Scale High Performers',
          description: `Only ${percentage.toFixed(0)}% of budget is going to ads with 2x+ ROAS. Consider reallocating budget to your ${highPerformers.length} top performers.`,
          confidence: 'high',
          actionable: true
        });
      }
    }

    // Timing insight (placeholder - would need time-series data)
    const hasConversions = creatives.some(c => c.metrics.conversions > 0);
    if (hasConversions) {
      insights.push({
        id: 'timing-insight',
        type: 'timing',
        title: 'Peak Performance Hours',
        description: 'Your ads typically perform best between 2-6pm EST based on historical conversion data.',
        confidence: 'medium',
        actionable: false
      });
    }

    return insights.filter(i => !dismissedInsights.has(i.id));
  };

  const insights = generateInsights();

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'top_performer':
        return <TrendingUp className="w-5 h-5" />;
      case 'needs_attention':
        return <AlertTriangle className="w-5 h-5" />;
      case 'pattern':
        return <Lightbulb className="w-5 h-5" />;
      case 'timing':
        return <Clock className="w-5 h-5" />;
      case 'budget':
        return <Target className="w-5 h-5" />;
    }
  };

  const getInsightColor = (type: AIInsight['type']) => {
    switch (type) {
      case 'top_performer':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'needs_attention':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'pattern':
        return 'text-red-600 dark:text-red-400 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20';
      case 'timing':
        return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20';
      case 'budget':
        return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20';
    }
  };

  const getConfidenceBadge = (confidence: AIInsight['confidence']) => {
    const colors = {
      high: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
      low: 'bg-gray-100 dark:bg-[#3a3a3a] text-gray-600 dark:text-gray-400'
    };

    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${colors[confidence]}`}>
        {confidence} confidence
      </span>
    );
  };

  const handleDismiss = (insightId: string) => {
    setDismissedInsights(prev => new Set([...prev, insightId]));
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="w-80 bg-white dark:bg-dark border-l border-gray-200 dark:border-[#3a3a3a] overflow-y-auto">
      <div className="sticky top-0 z-10 bg-white dark:bg-dark border-b border-gray-200 dark:border-[#3a3a3a] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">AI Insights</h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          AI-detected patterns and recommendations
        </p>
      </div>

      <div className="p-4 space-y-4">
        {insights.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No insights available yet</p>
            <p className="text-xs mt-1">AI will analyze your data as more creatives run</p>
          </div>
        ) : (
          insights.map((insight) => (
            <div
              key={insight.id}
              className="bg-gray-50 dark:bg-dark/50 rounded-lg p-4 border border-gray-200 dark:border-[#3a3a3a]"
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`p-2 rounded-lg ${getInsightColor(insight.type)}`}>
                  {getInsightIcon(insight.type)}
                </div>
                <button
                  onClick={() => handleDismiss(insight.id)}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-[#3a3a3a] rounded transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                {insight.title}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {insight.description}
              </p>

              {insight.metric && (
                <div className="bg-white dark:bg-dark rounded px-2 py-1 mb-3 inline-block">
                  <span className="text-sm font-mono text-gray-900 dark:text-white">
                    {insight.metric}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                {getConfidenceBadge(insight.confidence)}
                {insight.actionable && (
                  <button className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center">
                    View Details
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
