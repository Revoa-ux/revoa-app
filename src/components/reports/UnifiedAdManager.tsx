import React, { useState } from 'react';
import { Layers, Target, Zap, X } from 'lucide-react';
import { CreativeAnalysisEnhanced } from './CreativeAnalysisEnhanced';
import type { RexSuggestionWithPerformance } from '@/types/rex';

interface UnifiedAdManagerProps {
  creatives?: any[];
  campaigns?: any[];
  adSets?: any[];
  selectedTime?: string;
  onTimeChange?: (time: string) => void;
  showAIInsights?: boolean;
  rexSuggestions?: Map<string, RexSuggestionWithPerformance>;
  onViewSuggestion?: (suggestion: RexSuggestionWithPerformance) => void;
  onAcceptSuggestion?: (suggestion: RexSuggestionWithPerformance) => Promise<void>;
  onDismissSuggestion?: (suggestion: RexSuggestionWithPerformance, reason?: string) => Promise<void>;
}

type ViewLevel = 'campaigns' | 'adsets' | 'ads';

export const UnifiedAdManager: React.FC<UnifiedAdManagerProps> = ({
  creatives = [],
  campaigns = [],
  adSets = [],
  selectedTime,
  onTimeChange,
  showAIInsights = true,
  rexSuggestions = new Map(),
  onViewSuggestion,
  onAcceptSuggestion,
  onDismissSuggestion
}) => {
  const [viewLevel, setViewLevel] = useState<ViewLevel>('ads');
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [selectedAdSet, setSelectedAdSet] = useState<string | null>(null);

  const tabs = [
    {
      id: 'campaigns' as ViewLevel,
      label: 'Campaigns',
      icon: Layers,
      count: campaigns.length
    },
    {
      id: 'adsets' as ViewLevel,
      label: 'Ad Sets',
      icon: Target,
      count: adSets.length
    },
    {
      id: 'ads' as ViewLevel,
      label: 'Ads',
      icon: Zap,
      count: creatives.length
    }
  ];

  // Filter data based on drill-down selection
  const getFilteredData = () => {
    if (viewLevel === 'campaigns') {
      return campaigns;
    } else if (viewLevel === 'adsets') {
      if (selectedCampaign) {
        return adSets.filter(adSet => adSet.campaignId === selectedCampaign);
      }
      return adSets;
    } else {
      if (selectedAdSet) {
        return creatives.filter(ad => ad.adSetId === selectedAdSet);
      } else if (selectedCampaign) {
        const campaignAdSetIds = adSets
          .filter(adSet => adSet.campaignId === selectedCampaign)
          .map(adSet => adSet.id);
        return creatives.filter(ad => campaignAdSetIds.includes(ad.adSetId));
      }
      return creatives;
    }
  };

  const handleTabChange = (level: ViewLevel) => {
    setViewLevel(level);
    // Clear drill-down selections when changing tabs
    if (level === 'campaigns') {
      setSelectedCampaign(null);
      setSelectedAdSet(null);
    } else if (level === 'adsets') {
      setSelectedAdSet(null);
    }
  };

  const handleDrillDown = (item: any) => {
    if (viewLevel === 'campaigns') {
      setSelectedCampaign(item.id);
      setViewLevel('adsets');
    } else if (viewLevel === 'adsets') {
      setSelectedAdSet(item.id);
      setViewLevel('ads');
    }
  };

  const handleBreadcrumbClick = (level: ViewLevel) => {
    if (level === 'campaigns') {
      setSelectedCampaign(null);
      setSelectedAdSet(null);
      setViewLevel('campaigns');
    } else if (level === 'adsets') {
      setSelectedAdSet(null);
      setViewLevel('adsets');
    }
  };

  // Get current data for AI insights
  const currentData = getFilteredData();
  const needsAttentionCount = currentData.filter(item => item.performance === 'low').length;

  return (
    <div className="space-y-4">
      {/* AI Insights - Above everything */}
      {showAIInsights && needsAttentionCount > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                {viewLevel === 'campaigns' ? 'Campaigns' : viewLevel === 'adsets' ? 'Ad Sets' : 'Ads'} Need Attention
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {needsAttentionCount} {viewLevel === 'campaigns' ? 'campaigns' : viewLevel === 'adsets' ? 'ad sets' : 'creatives'} show signs of underperformance or negative profitability. Consider pausing or optimizing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Level Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = viewLevel === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                isActive
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium">{tab.label}</span>
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${
                  isActive
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Breadcrumb Navigation */}
      {(selectedCampaign || selectedAdSet) && (
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => handleBreadcrumbClick('campaigns')}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            All Campaigns
          </button>
          {selectedCampaign && (
            <>
              <span className="text-gray-400">/</span>
              {selectedAdSet ? (
                <button
                  onClick={() => handleBreadcrumbClick('adsets')}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {campaigns.find(c => c.id === selectedCampaign)?.name || 'Campaign'}
                </button>
              ) : (
                <span className="text-gray-900 dark:text-white">
                  {campaigns.find(c => c.id === selectedCampaign)?.name || 'Campaign'}
                </span>
              )}
            </>
          )}
          {selectedAdSet && (
            <>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 dark:text-white">
                {adSets.find(a => a.id === selectedAdSet)?.name || 'Ad Set'}
              </span>
            </>
          )}
        </div>
      )}

      {/* Data Table */}
      <CreativeAnalysisEnhanced
        creatives={getFilteredData()}
        selectedTime={selectedTime}
        onTimeChange={onTimeChange}
        showAIInsights={false}
        viewLevel={viewLevel}
        onDrillDown={handleDrillDown}
        rexSuggestions={rexSuggestions}
        onViewSuggestion={onViewSuggestion}
        onAcceptSuggestion={onAcceptSuggestion}
        onDismissSuggestion={onDismissSuggestion}
      />
    </div>
  );
};
