import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { CreativeAnalysisEnhanced } from './CreativeAnalysisEnhanced';
import type { RexSuggestionWithPerformance } from '@/types/rex';
import { toast } from '../../lib/toast';

const BRAND_GRADIENT = 'linear-gradient(135deg, #E11D48 0%, #EC4899 40%, #F87171 70%, #E8795A 100%)';

interface SelectionCounts {
  campaigns: number;
  adsets: number;
  ads: number;
}

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
  onExecuteAction?: (suggestion: RexSuggestionWithPerformance, actionType: string, parameters: any) => Promise<{ success: boolean; message: string }>;
  selectedPlatforms?: string[];
  selectedProducts?: string[];
  filterBySelection?: boolean;
  onSelectionChange?: (counts: SelectionCounts, viewLevel: 'campaigns' | 'adsets' | 'ads') => void;
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
  onExecuteAction,
  selectedPlatforms = ['all'],
  selectedProducts = ['all'],
  filterBySelection = false,
  onSelectionChange
}) => {
  const [viewLevel, setViewLevel] = useState<ViewLevel>('campaigns');
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [selectedAdSet, setSelectedAdSet] = useState<string | null>(null);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [selectedAdSets, setSelectedAdSets] = useState<Set<string>>(new Set());
  const [selectedAds, setSelectedAds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    onSelectionChange?.({
      campaigns: selectedCampaigns.size,
      adsets: selectedAdSets.size,
      ads: selectedAds.size
    }, viewLevel);
  }, [selectedCampaigns.size, selectedAdSets.size, selectedAds.size, viewLevel, onSelectionChange]);

  // Debug: Log data structure on mount and when data changes
  React.useEffect(() => {
    if (campaigns.length > 0 || adSets.length > 0 || creatives.length > 0) {
      const adsPerAdSet = new Map<string, number>();
      creatives.forEach(ad => {
        const count = adsPerAdSet.get(ad.adSetId) || 0;
        adsPerAdSet.set(ad.adSetId, count + 1);
      });

      console.log('[UnifiedAdManager] Data received:', {
        campaigns: campaigns.length,
        adSets: adSets.length,
        creatives: creatives.length,
        adsPerAdSet: Object.fromEntries(adsPerAdSet),
        sampleAdSet: adSets[0] ? { id: adSets[0].id, adSetId: adSets[0].adSetId, name: adSets[0].name } : null,
        sampleCreative: creatives[0] ? { id: creatives[0].id, adSetId: creatives[0].adSetId, name: creatives[0].adName } : null
      });
    }
  }, [campaigns, adSets, creatives]);

  // Extract product names from URLs
  const extractProductFromUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      // Extract from path like /products/product-name
      const match = urlObj.pathname.match(/\/products\/([^/]+)/);
      if (match) {
        return match[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
    } catch (e) {
      // Invalid URL
    }
    return null;
  };

  // Get unique products from all creatives
  const uniqueProducts = React.useMemo(() => {
    const productSet = new Set<string>();
    creatives.forEach(c => {
      const destinationUrl = c.creative_data?.link_url || c.destinationUrl || c.link_url;
      const product = extractProductFromUrl(destinationUrl);
      if (product) productSet.add(product);
    });
    return Array.from(productSet).sort();
  }, [creatives]);

  const getCreativeProduct = (creative: any): string | null => {
    const destinationUrl = creative.creative_data?.link_url || creative.destinationUrl || creative.link_url;
    return extractProductFromUrl(destinationUrl);
  };

  // Calculate dynamic counts based on selections or drill-down
  // Priority: checkbox selections > drill-down context > defaults
  const getTabCounts = () => {
    // HIGHEST PRIORITY: When ads are selected via checkbox
    if (selectedAds.size > 0) {
      return {
        campaigns: campaigns.length,
        adsets: adSets.length,
        ads: selectedAds.size
      };
    }

    // When ad sets are selected via checkbox (takes precedence over campaign drill-down)
    if (selectedAdSets.size > 0) {
      const matchingAds = creatives.filter(ad => selectedAdSets.has(ad.adSetId));

      // Get unique campaigns that contain the selected ad sets
      const uniqueCampaignIds = new Set(
        adSets.filter(adSet => selectedAdSets.has(adSet.adSetId)).map(adSet => adSet.campaignId)
      );

      return {
        campaigns: uniqueCampaignIds.size,
        adsets: selectedAdSets.size,
        ads: matchingAds.length
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

    // When drilled down to a specific ad set (via clicking on it)
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

    // Default: show totals
    return {
      campaigns: campaigns.length,
      adsets: adSets.length,
      ads: creatives.length
    };
  };

  // Debug: Log incoming data
  console.log('[UnifiedAdManager] Data received:', {
    campaignsCount: campaigns?.length ?? 'undefined',
    adSetsCount: adSets?.length ?? 'undefined',
    creativesCount: creatives?.length ?? 'undefined',
    selectedPlatforms,
    viewLevel,
    isLoading,
    campaignPlatforms: campaigns?.map(c => c.platform) || []
  });

  // Filter data based on drill-down or checkbox selection - MOVED BEFORE tabCounts
  const getFilteredData = () => {
    let data: any[];

    if (viewLevel === 'campaigns') {
      data = campaigns || [];
    } else if (viewLevel === 'adsets') {
      const safeAdSets = adSets || [];
      // If viewing after drill-down
      if (selectedCampaign) {
        data = safeAdSets.filter(adSet => adSet.campaignId === selectedCampaign);
      }
      // If campaigns are selected via checkbox, filter ad sets by those campaigns
      else if (selectedCampaigns.size > 0) {
        data = safeAdSets.filter(adSet => selectedCampaigns.has(adSet.campaignId));
      }
      else {
        data = safeAdSets;
      }
    } else {
      const safeCreatives = creatives || [];
      const safeAdSets = adSets || [];
      // If viewing after drill-down to specific ad set
      if (selectedAdSet) {
        data = safeCreatives.filter(ad => ad.adSetId === selectedAdSet);
      }
      // If viewing after drill-down to campaign (but not specific ad set)
      else if (selectedCampaign) {
        const campaignAdSetIds = safeAdSets
          .filter(adSet => adSet.campaignId === selectedCampaign)
          .map(adSet => adSet.adSetId);
        data = safeCreatives.filter(ad => campaignAdSetIds.includes(ad.adSetId));
      }
      // If ad sets are selected via checkbox
      else if (selectedAdSets.size > 0) {
        data = safeCreatives.filter(ad => selectedAdSets.has(ad.adSetId));
      }
      // If campaigns are selected via checkbox (but no ad sets)
      else if (selectedCampaigns.size > 0) {
        const campaignAdSetIds = safeAdSets
          .filter(adSet => selectedCampaigns.has(adSet.campaignId))
          .map(adSet => adSet.adSetId);
        data = safeCreatives.filter(ad => campaignAdSetIds.includes(ad.adSetId));
      }
      else {
        data = safeCreatives;
      }
    }

    // Apply platform filter if not 'all'
    if (!selectedPlatforms.includes('all') && selectedPlatforms.length > 0) {
      console.log('[UnifiedAdManager] Applying platform filter:', { selectedPlatforms, beforeCount: data.length });
      data = data.filter((item: any) => {
        const itemPlatform = item.platform || item.adAccount?.platform || 'facebook';
        return selectedPlatforms.includes(itemPlatform);
      });
      console.log('[UnifiedAdManager] After platform filter:', data.length);
    }

    console.log('[UnifiedAdManager] getFilteredData returning:', { count: data.length, viewLevel });
    return data;
  };

  // Get the currently filtered data for display
  let filteredData = getFilteredData();

  // Apply product filter if not 'all'
  if (!selectedProducts.includes('all') && selectedProducts.length > 0 && viewLevel === 'ads') {
    filteredData = filteredData.filter((item: any) => {
      const product = getCreativeProduct(item);
      return product && selectedProducts.includes(product);
    });
  }

  // Apply "filter by selection" if enabled
  if (filterBySelection) {
    if (viewLevel === 'campaigns' && selectedCampaigns.size > 0) {
      filteredData = filteredData.filter((item: any) => selectedCampaigns.has(item.id || item.campaignId));
    } else if (viewLevel === 'adsets' && selectedAdSets.size > 0) {
      filteredData = filteredData.filter((item: any) => selectedAdSets.has(item.id || item.adSetId));
    } else if (viewLevel === 'ads' && selectedAds.size > 0) {
      filteredData = filteredData.filter((item: any) => selectedAds.has(item.id || item.adId));
    }
  }

  // Calculate tab counts - use filtered data for the current view level
  const tabCounts = (() => {
    const baseCount = getTabCounts();

    // Override the current view level's count with the actual filtered data length
    if (viewLevel === 'campaigns') {
      return { ...baseCount, campaigns: filteredData.length };
    } else if (viewLevel === 'adsets') {
      return { ...baseCount, adsets: filteredData.length };
    } else {
      return { ...baseCount, ads: filteredData.length };
    }
  })();

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

  const handleTabChange = (level: ViewLevel) => {
    setViewLevel(level);
    // Clear drill-down selections when changing tabs
    if (level === 'campaigns') {
      setSelectedCampaign(null);
      setSelectedAdSet(null);
    } else if (level === 'adsets') {
      setSelectedAdSet(null);
    } else if (level === 'ads') {
      // When switching to ads tab, clear ad set selection to show all ads in campaign
      setSelectedAdSet(null);
    }
  };

  const handleDrillDown = (item: any) => {
    if (viewLevel === 'campaigns') {
      setSelectedCampaign(item.id);
      setViewLevel('adsets');
    } else if (viewLevel === 'adsets') {
      // Always set selectedAdSet when drilling down from an ad set
      // This ensures the ads tab badge updates to show only ads in that specific ad set
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 pt-4 pb-3 flex-shrink-0 border-b border-gray-200 dark:border-[#3a3a3a]">
          <div className="flex items-center justify-center sm:justify-start gap-1 overflow-x-auto">
            {tabs.map((tab, index) => {
              const isActive = viewLevel === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-1.5 sm:gap-2.5 px-3 sm:px-5 py-2 transition-all whitespace-nowrap rounded-lg focus:outline-none ${
                    isActive
                      ? 'text-gray-900 dark:text-white font-semibold bg-gray-100 dark:bg-[#3a3a3a]'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]/50'
                  }`}
                >
                  <span className="text-xs sm:text-sm">{tab.label}</span>
                  <span
                    className={`px-1.5 sm:px-2 py-0.5 text-xs font-bold rounded-full ${
                      isActive
                        ? 'text-white'
                        : 'bg-gray-200 dark:bg-[#3a3a3a] text-gray-600 dark:text-gray-400'
                    }`}
                    style={isActive ? { background: BRAND_GRADIENT } : undefined}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-[280px] lg:w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={`Search ${viewLevel === 'campaigns' ? 'campaigns' : viewLevel === 'adsets' ? 'ad sets' : 'ads'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 text-sm bg-gray-50 dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-[#3a3a3a] rounded-full transition-colors"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Content area - no gradient border */}
        <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-dark">
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
              creatives={filteredData}
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
                    // Unselecting a campaign - also clear child ad sets and ads
                    newSet.delete(id);

                    // Clear ad sets that belong to this campaign
                    const childAdSetIds = adSets
                      .filter(adSet => adSet.campaignId === id)
                      .map(adSet => adSet.adSetId);
                    setSelectedAdSets(prev => {
                      const next = new Set(prev);
                      childAdSetIds.forEach(adSetId => next.delete(adSetId));
                      return next;
                    });

                    // Clear ads that belong to these ad sets
                    setSelectedAds(prev => {
                      const next = new Set(prev);
                      creatives
                        .filter(ad => childAdSetIds.includes(ad.adSetId))
                        .forEach(ad => next.delete(ad.id));
                      return next;
                    });
                  } else {
                    newSet.add(id);
                  }
                  setSelectedCampaigns(newSet);
                } else if (viewLevel === 'adsets') {
                  const newSet = new Set(selectedAdSets);
                  if (newSet.has(id)) {
                    // Unselecting an ad set - also clear child ads
                    newSet.delete(id);

                    // Clear ads that belong to this ad set
                    setSelectedAds(prev => {
                      const next = new Set(prev);
                      creatives
                        .filter(ad => ad.adSetId === id)
                        .forEach(ad => next.delete(ad.id));
                      return next;
                    });
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
              onBulkSelect={(ids: string[], selectAll: boolean) => {
                if (viewLevel === 'campaigns') {
                  setSelectedCampaigns(selectAll ? new Set(ids) : new Set());
                } else if (viewLevel === 'adsets') {
                  setSelectedAdSets(selectAll ? new Set(ids) : new Set());
                } else {
                  setSelectedAds(selectAll ? new Set(ids) : new Set());
                }
              }}
              rexSuggestions={rexSuggestions}
              topDisplayedSuggestionIds={topDisplayedSuggestionIds}
              onViewSuggestion={onViewSuggestion}
              onAcceptSuggestion={onAcceptSuggestion}
              onDismissSuggestion={onDismissSuggestion}
              onExecuteAction={onExecuteAction}
            />
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
