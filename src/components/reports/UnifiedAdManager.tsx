import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
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
  selectedPlatforms?: string[];
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
  onDismissSuggestion,
  selectedPlatforms = ['all']
}) => {
  const [viewLevel, setViewLevel] = useState<ViewLevel>('campaigns');
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [selectedAdSet, setSelectedAdSet] = useState<string | null>(null);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [selectedAdSets, setSelectedAdSets] = useState<Set<string>>(new Set());
  const [selectedAds, setSelectedAds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // Calculate dynamic counts based on selections or drill-down
  const getTabCounts = () => {
    // When drilled down to a specific ad set
    if (selectedAdSet) {
      const adsInAdSet = creatives.filter(ad => ad.adSetId === selectedAdSet);
      return {
        campaigns: 1,
        adsets: 1,
        ads: adsInAdSet.length
      };
    }

    // When drilled down to a specific campaign (but not ad set)
    if (selectedCampaign) {
      const adSetsInCampaign = adSets.filter(adSet => adSet.campaignId === selectedCampaign);
      const adSetIds = adSetsInCampaign.map(adSet => adSet.adSetId);
      const adsInCampaign = creatives.filter(ad => adSetIds.includes(ad.adSetId));

      return {
        campaigns: 1,
        adsets: adSetsInCampaign.length,
        ads: adsInCampaign.length
      };
    }

    // When campaigns are selected via checkbox
    if (selectedCampaigns.size > 0) {
      const selectedAdSetIds = adSets
        .filter(adSet => selectedCampaigns.has(adSet.campaignId))
        .map(adSet => adSet.adSetId);
      const selectedAdCount = creatives.filter(ad => selectedAdSetIds.includes(ad.adSetId)).length;

      return {
        campaigns: selectedCampaigns.size,
        adsets: selectedAdSetIds.length,
        ads: selectedAdCount
      };
    }

    // When ad sets are selected via checkbox
    if (selectedAdSets.size > 0) {
      const selectedAdCount = creatives.filter(ad => selectedAdSets.has(ad.adSetId)).length;

      return {
        campaigns: campaigns.length,
        adsets: selectedAdSets.size,
        ads: selectedAdCount
      };
    }

    // When ads are selected via checkbox
    if (selectedAds.size > 0) {
      return {
        campaigns: campaigns.length,
        adsets: adSets.length,
        ads: selectedAds.size
      };
    }

    // Default: show totals
    return {
      campaigns: campaigns.length,
      adsets: adSets.length,
      ads: creatives.length
    };
  };

  const tabCounts = getTabCounts();

  const tabs = [
    {
      id: 'campaigns' as ViewLevel,
      label: 'Campaigns',
      count: tabCounts.campaigns
    },
    {
      id: 'adsets' as ViewLevel,
      label: 'Ad Sets',
      count: tabCounts.adsets
    },
    {
      id: 'ads' as ViewLevel,
      label: 'Ads',
      count: tabCounts.ads
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
      {/* Clean tab layout without gradient borders */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        {/* Tabs and Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 pt-4 pb-3 flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center sm:justify-start gap-1 overflow-x-auto">
            {tabs.map((tab, index) => {
              const isActive = viewLevel === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-1.5 sm:gap-2.5 px-3 sm:px-5 py-2 transition-all whitespace-nowrap rounded-lg focus:outline-none ${
                    isActive
                      ? 'text-gray-900 dark:text-white font-semibold bg-gray-100 dark:bg-gray-700'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <span className="text-xs sm:text-sm">{tab.label}</span>
                  <span
                    className={`px-1.5 sm:px-2 py-0.5 text-xs font-bold rounded-full ${
                      isActive
                        ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search - responsive */}
          <div className="relative w-full sm:w-[280px] lg:w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={`Search ${viewLevel === 'campaigns' ? 'campaigns' : viewLevel === 'adsets' ? 'ad sets' : 'ads'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Content area - no gradient border */}
        <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-gray-800">
          <div className="flex-1 min-h-0 flex flex-col">
          {/* Breadcrumb Navigation */}
          {(selectedCampaign || selectedAdSet) && (
            <div className="flex items-center gap-2 text-sm flex-wrap flex-shrink-0 px-6 pt-4">
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
              embedded={true}
              searchTerm={searchTerm}
              hideSearch={true}
              selectedPlatforms={selectedPlatforms}
              hidePlatformFilter={true}
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
    </div>
  );
};
