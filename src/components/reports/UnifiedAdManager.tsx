import React, { useState } from 'react';
import { CreativeAnalysisEnhanced } from './CreativeAnalysisEnhanced';
import type { RexSuggestionWithPerformance } from '@/types/rex';

interface UnifiedAdManagerProps {
  creatives?: any[];
  campaigns?: any[];
  adSets?: any[];
  isLoading?: boolean;
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
  rexSuggestions = new Map(),
  topDisplayedSuggestionIds = new Set(),
  onViewSuggestion,
  onAcceptSuggestion,
  onDismissSuggestion
}) => {
  const [viewLevel, setViewLevel] = useState<ViewLevel>('campaigns');
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [selectedAdSet, setSelectedAdSet] = useState<string | null>(null);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [selectedAdSets, setSelectedAdSets] = useState<Set<string>>(new Set());
  const [selectedAds, setSelectedAds] = useState<Set<string>>(new Set());

  const tabs = [
    {
      id: 'campaigns' as ViewLevel,
      label: 'Campaigns',
      count: campaigns.length
    },
    {
      id: 'adsets' as ViewLevel,
      label: 'Ad Sets',
      count: adSets.length
    },
    {
      id: 'ads' as ViewLevel,
      label: 'Ads',
      count: creatives.length
    }
  ];

  // Filter data based on drill-down or checkbox selection
  const getFilteredData = () => {
    if (viewLevel === 'campaigns') {
      return campaigns;
    } else if (viewLevel === 'adsets') {
      // If viewing after drill-down
      if (selectedCampaign) {
        return adSets.filter(adSet => adSet.campaignId === selectedCampaign);
      }
      // If campaigns are selected via checkbox, filter ad sets by those campaigns
      if (selectedCampaigns.size > 0) {
        return adSets.filter(adSet => selectedCampaigns.has(adSet.campaignId));
      }
      return adSets;
    } else {
      // If viewing after drill-down
      if (selectedAdSet) {
        return creatives.filter(ad => ad.adSetId === selectedAdSet);
      } else if (selectedCampaign) {
        const campaignAdSetIds = adSets
          .filter(adSet => adSet.campaignId === selectedCampaign)
          .map(adSet => adSet.adSetId);
        return creatives.filter(ad => campaignAdSetIds.includes(ad.adSetId));
      }
      // If ad sets are selected via checkbox, filter ads by those ad sets
      if (selectedAdSets.size > 0) {
        return creatives.filter(ad => selectedAdSets.has(ad.adSetId));
      }
      // If campaigns are selected via checkbox (but no ad sets), show ads from those campaigns
      if (selectedCampaigns.size > 0) {
        const campaignAdSetIds = adSets
          .filter(adSet => selectedCampaigns.has(adSet.campaignId))
          .map(adSet => adSet.adSetId);
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
    <div className="h-full flex flex-col overflow-hidden">
      {/* Modern Tabs */}
      <div className="flex items-center gap-1 px-6 pt-3 pb-3 flex-shrink-0 bg-white dark:bg-gray-800 border-t border-r border-gray-200 dark:border-gray-700 rounded-tr-xl">
        {tabs.map((tab) => {
          const isActive = viewLevel === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-3 px-5 py-3 transition-all whitespace-nowrap relative ${
                isActive
                  ? 'text-gray-900 dark:text-white font-medium'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <span className="text-sm">{tab.label}</span>
              <span
                className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                  isActive
                    ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                {tab.count}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 dark:bg-red-500 rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-gray-800">
        <div className="p-4 sm:p-6 flex-1 min-h-0 flex flex-col gap-4">
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
              showAIInsights={false}
              viewLevel={viewLevel}
              onDrillDown={handleDrillDown}
              selectedItems={
                viewLevel === 'campaigns' ? selectedCampaigns :
                viewLevel === 'adsets' ? selectedAdSets :
                selectedAds
              }
              onToggleSelect={(id: string) => {
                if (viewLevel === 'campaigns') {
                  const newSet = new Set(selectedCampaigns);
                  if (newSet.has(id)) {
                    newSet.delete(id);
                  } else {
                    newSet.add(id);
                  }
                  setSelectedCampaigns(newSet);
                } else if (viewLevel === 'adsets') {
                  const newSet = new Set(selectedAdSets);
                  if (newSet.has(id)) {
                    newSet.delete(id);
                  } else {
                    newSet.add(id);
                  }
                  setSelectedAdSets(newSet);
                } else {
                  const newSet = new Set(selectedAds);
                  if (newSet.has(id)) {
                    newSet.delete(id);
                  } else {
                    newSet.add(id);
                  }
                  setSelectedAds(newSet);
                }
              }}
              rexSuggestions={rexSuggestions}
              topDisplayedSuggestionIds={topDisplayedSuggestionIds}
              onViewSuggestion={onViewSuggestion}
              onAcceptSuggestion={onAcceptSuggestion}
              onDismissSuggestion={onDismissSuggestion}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
