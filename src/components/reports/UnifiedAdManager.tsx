import React, { useState } from 'react';
import { Layers, Target, Zap, X } from 'lucide-react';
import { CreativeAnalysisEnhanced } from './CreativeAnalysisEnhanced';
import type { RexSuggestionWithPerformance } from '@/types/rex';

interface UnifiedAdManagerProps {
  creatives?: any[];
  campaigns?: any[];
  adSets?: any[];
  isLoading?: boolean;
  selectedTime?: string;
  onTimeChange?: (time: string) => void;
  rexSuggestions?: Map<string, RexSuggestionWithPerformance>;
  topDisplayedSuggestionIds?: Set<string>;
  onViewSuggestion?: (suggestion: RexSuggestionWithPerformance) => void;
  onAcceptSuggestion?: (suggestion: RexSuggestionWithPerformance) => Promise<void>;
  onDismissSuggestion?: (suggestion: RexSuggestionWithPerformance, reason?: string) => Promise<void>;
}

type ViewLevel = 'campaigns' | 'adsets' | 'ads';

export const UnifiedAdManager: React.FC<UnifiedAdManagerProps> = ({
  creatives = [],
  campaigns = [],
  adSets = [],
  isLoading = false,
  selectedTime,
  onTimeChange,
  rexSuggestions = new Map(),
  topDisplayedSuggestionIds = new Set(),
  onViewSuggestion,
  onAcceptSuggestion,
  onDismissSuggestion
}) => {
  const [viewLevel, setViewLevel] = useState<ViewLevel>('campaigns');
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

  return (
    <div className="h-full flex flex-col gap-4 p-4 sm:p-6 overflow-hidden">
      {/* Title */}
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex-shrink-0">
        Ad Manager
      </h2>

      {/* Level Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto scrollbar-thin flex-shrink-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = viewLevel === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-red-600 text-red-600 dark:text-red-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium">{tab.label}</span>
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${
                  isActive
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
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
        <div className="flex items-center gap-2 text-sm flex-wrap flex-shrink-0">
          <button
            onClick={() => handleBreadcrumbClick('campaigns')}
            className="text-red-600 dark:text-red-400 hover:underline"
          >
            All Campaigns
          </button>
          {selectedCampaign && (
            <>
              <span className="text-gray-400">/</span>
              {selectedAdSet ? (
                <button
                  onClick={() => handleBreadcrumbClick('adsets')}
                  className="text-red-600 dark:text-red-400 hover:underline"
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
      <div className="flex-1 min-h-0">
        <CreativeAnalysisEnhanced
        creatives={getFilteredData()}
        isLoading={isLoading}
        selectedTime={selectedTime}
        onTimeChange={onTimeChange}
        showAIInsights={false}
        viewLevel={viewLevel}
        onDrillDown={handleDrillDown}
        rexSuggestions={rexSuggestions}
        topDisplayedSuggestionIds={topDisplayedSuggestionIds}
        onViewSuggestion={onViewSuggestion}
        onAcceptSuggestion={onAcceptSuggestion}
        onDismissSuggestion={onDismissSuggestion}
      />
      </div>
    </div>
  );
};
