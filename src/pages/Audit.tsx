import React, { useState, useEffect, useRef } from 'react';
import { Facebook, AlertTriangle, RefreshCw, Filter, Check } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useClickOutside } from '@/lib/useClickOutside';
import { FilterButton } from '@/components/FilterButton';
import { UnifiedAdManager } from '@/components/reports/UnifiedAdManager';
import { AIInsightsSidebar } from '@/components/reports/AIInsightsSidebar';
import AdReportsTimeSelector, { TimeOption } from '@/components/reports/AdReportsTimeSelector';
import { getAdReportsMetrics, getCreativePerformance, getCampaignPerformance, getAdSetPerformance } from '@/lib/adReportsService';
import { useConnectionStore } from '@/lib/connectionStore';
import { rexSuggestionService } from '@/lib/rexSuggestionService';
import { AdvancedRexIntelligence } from '@/lib/advancedRexIntelligence';
import { automationRulesService } from '@/lib/automationRulesService';
import { useAuth } from '@/contexts/AuthContext';
import { useAdDataCache } from '@/lib/adDataCache';
import type { RexSuggestionWithPerformance } from '@/types/rex';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

export default function Audit() {
  const { user } = useAuth();
  const { getCachedData, setCachedData } = useAdDataCache();
  const [selectedTime, setSelectedTime] = useState<TimeOption>('28d');
  const [isFacebookConnecting, setIsFacebookConnecting] = useState(false);
  const initialEndDate = new Date();
  initialEndDate.setHours(23, 59, 59, 999);
  const initialStartDate = new Date(initialEndDate);
  initialStartDate.setDate(initialStartDate.getDate() - 28);
  initialStartDate.setHours(0, 0, 0, 0);

  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: initialStartDate,
    endDate: initialEndDate
  });
  const [isLoading, setIsLoading] = useState(false);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [creatives, setCreatives] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [adSets, setAdSets] = useState<any[]>([]);
  const [rexSuggestions, setRexSuggestions] = useState<Map<string, RexSuggestionWithPerformance>>(new Map());
  const [topDisplayedSuggestionIds, setTopDisplayedSuggestionIds] = useState<Set<string>>(new Set());
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['all']);
  const [showPlatformFilter, setShowPlatformFilter] = useState(false);
  const platformFilterRef = useRef<HTMLDivElement>(null);
  const lastRegenerationTime = useRef<number>(0);
  const REGENERATION_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

  useClickOutside(platformFilterRef, () => setShowPlatformFilter(false));

  const { facebook } = useConnectionStore();

  const platforms = [
    { id: 'all', name: 'All Platforms', icon: Filter },
    { id: 'facebook', name: 'Facebook', icon: Facebook },
  ];

  const handlePlatformFilter = (platformId: string) => {
    if (platformId === 'all') {
      setSelectedPlatforms(['all']);
    } else {
      const newPlatforms = selectedPlatforms.filter(p => p !== 'all');
      if (newPlatforms.includes(platformId)) {
        const filtered = newPlatforms.filter(p => p !== platformId);
        setSelectedPlatforms(filtered.length === 0 ? ['all'] : filtered);
      } else {
        setSelectedPlatforms([...newPlatforms, platformId]);
      }
    }
  };

  // Helper: Get top 3 pending suggestions for display
  const getTopPendingSuggestions = (allSuggestions: Map<string, RexSuggestionWithPerformance>): Set<string> => {
    const pendingSuggestions = Array.from(allSuggestions.values())
      .filter(s => s.status === 'pending' || s.status === 'viewed')
      .sort((a, b) => b.priority_score - a.priority_score)
      .slice(0, 3);

    return new Set(pendingSuggestions.map(s => s.entity_id));
  };

  // Load existing Rex suggestions from database
  const loadRexSuggestions = async (
    currentCreatives?: any[],
    currentCampaigns?: any[],
    currentAdSets?: any[],
    shouldExpireOld: boolean = false
  ) => {
    if (!user) return;

    // Use provided data or fall back to state
    const creativesToAnalyze = currentCreatives || creatives;
    const campaignsToAnalyze = currentCampaigns || campaigns;
    const adSetsToAnalyze = currentAdSets || adSets;

    console.log('[Rex] loadRexSuggestions called with data:', {
      creatives: creativesToAnalyze.length,
      campaigns: campaignsToAnalyze.length,
      adSets: adSetsToAnalyze.length,
      shouldExpireOld
    });

    try {
      // STEP 1: Only expire pending/viewed suggestions when manually refreshing
      // When using cached data, preserve existing suggestions to avoid rate limit issues
      if (shouldExpireOld) {
        console.log('[Rex] Expiring old pending/viewed suggestions before regeneration...');
        const expiredCount = await rexSuggestionService.expireUserPendingSuggestions(user.id);
        console.log(`[Rex] Expired ${expiredCount} suggestions to make way for fresh analysis`);
      } else {
        console.log('[Rex] Using cached data - preserving existing suggestions');
      }

      // STEP 2: Load remaining suggestions (dismissed and applied suggestions persist)
      const suggestions = await rexSuggestionService.getSuggestions(user.id);
      console.log('[DEBUG Rex] Loaded suggestions from DB:', suggestions.length);

      const suggestionsMap = new Map<string, RexSuggestionWithPerformance>();

      await Promise.all(
        suggestions.map(async (suggestion) => {
          // Skip expired or dismissed suggestions - they shouldn't be highlighted
          if (suggestion.status === 'expired' || suggestion.status === 'dismissed') {
            return;
          }

          const performance = await rexSuggestionService.getPerformance(suggestion.id);
          const suggestionWithPerf = {
            ...suggestion,
            performance: performance || undefined
          };

          suggestionsMap.set(suggestion.entity_id, suggestionWithPerf);

          if (suggestion.platform_entity_id && suggestion.platform_entity_id !== suggestion.entity_id) {
            suggestionsMap.set(suggestion.platform_entity_id, suggestionWithPerf);
          }
        })
      );

      console.log('[DEBUG Rex] Suggestions map created:', {
        size: suggestionsMap.size,
        mapKeys: Array.from(suggestionsMap.keys()).slice(0, 5),
        sampleSuggestions: Array.from(suggestionsMap.values()).slice(0, 3).map(s => ({
          entity_type: s.entity_type,
          entity_id: s.entity_id,
          platform_entity_id: s.platform_entity_id,
          status: s.status,
          bothKeysInMap: suggestionsMap.has(s.entity_id) && suggestionsMap.has(s.platform_entity_id || '')
        }))
      });

      setRexSuggestions(suggestionsMap);

      const topIds = getTopPendingSuggestions(suggestionsMap);
      setTopDisplayedSuggestionIds(topIds);

      // STEP 3: Generate fresh suggestions based on current data
      await generateRexSuggestions(suggestionsMap, true, creativesToAnalyze, campaignsToAnalyze, adSetsToAnalyze);
    } catch (error) {
      console.error('[Audit] Error loading Rex suggestions:', error);
    }
  };

  // Helper function to check if entity has valid data
  const hasValidData = (metrics: any) => {
    return (
      metrics.impressions > 0 ||
      metrics.clicks > 0 ||
      metrics.spend > 0
    );
  };

  // Generate new Rex suggestions for ads/campaigns/ad sets using ADVANCED AI
  const generateRexSuggestions = async (
    existingSuggestions: Map<string, RexSuggestionWithPerformance>,
    forceRegenerate: boolean = false,
    creativesToAnalyze?: any[],
    campaignsToAnalyze?: any[],
    adSetsToAnalyze?: any[]
  ) => {
    if (!user || isGeneratingSuggestions) return;

    // Check if we have valid ad account
    if (facebook.adAccounts.length === 0) {
      console.log('[Audit] Skipping Rex suggestions - no ad accounts');
      return;
    }

    // Use provided data or fall back to state
    const dataCreatives = creativesToAnalyze || creatives;
    const dataCampaigns = campaignsToAnalyze || campaigns;
    const dataAdSets = adSetsToAnalyze || adSets;

    // If we have creatives/campaigns/adSets data, we can analyze it regardless of sync status
    const hasData = dataCreatives.length > 0 || dataCampaigns.length > 0 || dataAdSets.length > 0;
    if (!hasData) {
      console.log('[Audit] Skipping Rex suggestions - no ad data available yet');
      return;
    }

    // DEBOUNCING: Skip regeneration if last refresh was less than 5 minutes ago (unless forced)
    const now = Date.now();
    const timeSinceLastRegeneration = now - lastRegenerationTime.current;
    if (!forceRegenerate && timeSinceLastRegeneration < REGENERATION_COOLDOWN_MS) {
      const minutesRemaining = Math.ceil((REGENERATION_COOLDOWN_MS - timeSinceLastRegeneration) / 60000);
      console.log(`[Rex] Skipping regeneration - last refresh was ${Math.floor(timeSinceLastRegeneration / 1000)}s ago (cooldown: ${minutesRemaining} min)`);
      toast.info(`Revoa AI suggestions were recently updated. Next refresh available in ${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''}.`, {
        duration: 3000
      });
      return;
    }

    console.log(`[Rex] Starting suggestion generation...`);
    console.log(`[Rex] - Creatives: ${dataCreatives.length}, Campaigns: ${dataCampaigns.length}, Ad Sets: ${dataAdSets.length}`);
    console.log(`[Rex] - Existing suggestions: ${existingSuggestions.size}`);
    console.log(`[Rex] - Force regenerate: ${forceRegenerate}`);

    // Show progress message
    toast.info('Revoa AI is analyzing your ads...', { duration: 2000 });

    setIsGeneratingSuggestions(true);
    try {
      // Initialize Advanced Rex Intelligence with ALL AI engines
      const advancedRex = new AdvancedRexIntelligence(user.id);
      const newSuggestions: any[] = [];
      let skippedCount = 0;
      let regeneratedCount = 0;

      // Date range for analysis
      const startDate = dateRange.startDate.toISOString().split('T')[0];
      const endDate = dateRange.endDate.toISOString().split('T')[0];

      // Generate suggestions for ads using ADVANCED AI
      for (const creative of dataCreatives) {
        // Skip if no valid data
        if (!hasValidData(creative.metrics)) {
          skippedCount++;
          continue;
        }

        // Generate if forcing regeneration OR if no existing suggestion OR if existing is expired/dismissed
        const existing = existingSuggestions.get(creative.id);
        const shouldGenerate = forceRegenerate || !existing || existing.status === 'expired' || existing.status === 'dismissed';

        if (shouldGenerate) {
          if (existing && forceRegenerate) {
            regeneratedCount++;
          }

          const entityData = {
            id: creative.id,
            name: creative.adName || creative.name,
            platform: creative.platform || 'facebook',
            platformId: creative.platformId || creative.id,
            metrics: {
              spend: creative.metrics.spend,
              revenue: creative.metrics.revenue || creative.metrics.conversions * creative.metrics.cpa,
              profit: creative.metrics.profit || 0,
              roas: creative.metrics.roas || 0,
              conversions: creative.metrics.conversions,
              cpa: creative.metrics.cpa,
              impressions: creative.metrics.impressions,
              clicks: creative.metrics.clicks,
              ctr: creative.metrics.ctr
            },
            performance: creative.performance
          };

          // Use Advanced AI with Campaign Structure, Profit, Funnel, and Pattern Intelligence
          const suggestions = await advancedRex.analyzeEntity('ad', entityData, startDate, endDate);
          newSuggestions.push(...suggestions);
        }
      }

      // Generate suggestions for campaigns using ADVANCED AI
      for (const campaign of dataCampaigns) {
        // Skip if no valid data
        if (!hasValidData(campaign.metrics || {})) {
          skippedCount++;
          continue;
        }

        const existingCampaign = existingSuggestions.get(campaign.id);
        const shouldGenerateCampaign = forceRegenerate || !existingCampaign || existingCampaign.status === 'expired' || existingCampaign.status === 'dismissed';

        if (shouldGenerateCampaign) {
          if (existingCampaign && forceRegenerate) {
            regeneratedCount++;
          }
          const entityData = {
            id: campaign.id,
            name: campaign.name,
            platform: campaign.platform || 'facebook',
            platformId: campaign.platformId || campaign.id,
            metrics: {
              spend: campaign.metrics?.spend || 0,
              revenue: campaign.metrics?.revenue || 0,
              profit: campaign.metrics?.profit || 0,
              roas: campaign.metrics?.roas || 0,
              conversions: campaign.metrics?.conversions || 0,
              cpa: campaign.metrics?.cpa || 0,
              impressions: campaign.metrics?.impressions || 0,
              clicks: campaign.metrics?.clicks || 0,
              ctr: campaign.metrics?.ctr || 0
            },
            performance: campaign.performance
          };

          // Debug: Log campaign IDs for first suggestion
          if (newSuggestions.length === 0) {
            console.log('[Rex] Sample campaign IDs:', {
              id: campaign.id,
              platformId: campaign.platformId,
              hasPlatformId: !!campaign.platformId
            });
          }

          // Use Advanced AI with Campaign Structure, Profit, Funnel, and Pattern Intelligence
          const suggestions = await advancedRex.analyzeEntity('campaign', entityData, startDate, endDate);
          newSuggestions.push(...suggestions);
        }
      }

      // Generate suggestions for ad sets using ADVANCED AI
      for (const adSet of dataAdSets) {
        // Skip if no valid data
        if (!hasValidData(adSet.metrics || {})) {
          skippedCount++;
          continue;
        }

        const existingAdSet = existingSuggestions.get(adSet.id);
        const shouldGenerateAdSet = forceRegenerate || !existingAdSet || existingAdSet.status === 'expired' || existingAdSet.status === 'dismissed';

        if (shouldGenerateAdSet) {
          if (existingAdSet && forceRegenerate) {
            regeneratedCount++;
          }
          const entityData = {
            id: adSet.id,
            name: adSet.name,
            platform: adSet.platform || 'facebook',
            platformId: adSet.platformId || adSet.id,
            metrics: {
              spend: adSet.metrics?.spend || 0,
              revenue: adSet.metrics?.revenue || 0,
              profit: adSet.metrics?.profit || 0,
              roas: adSet.metrics?.roas || 0,
              conversions: adSet.metrics?.conversions || 0,
              cpa: adSet.metrics?.cpa || 0,
              impressions: adSet.metrics?.impressions || 0,
              clicks: adSet.metrics?.clicks || 0,
              ctr: adSet.metrics?.ctr || 0
            },
            performance: adSet.performance
          };

          // Use Advanced AI with Campaign Structure, Profit, Funnel, and Pattern Intelligence
          const suggestions = await advancedRex.analyzeEntity('ad_set', entityData, startDate, endDate);
          newSuggestions.push(...suggestions);
        }
      }

      // Create suggestions in database
      console.log(`[Rex] Analysis complete. Generated ${newSuggestions.length} suggestions`);
      console.log(`[Rex] - Regenerated: ${regeneratedCount}, Skipped (no data): ${skippedCount}`);

      if (newSuggestions.length > 0) {
        const createdSuggestions = await Promise.all(
          newSuggestions.map(s => rexSuggestionService.createSuggestion(s))
        );

        // Sort by priority - ALL suggestions are displayed (no limit!)
        const sortedSuggestions = createdSuggestions.sort((a, b) => b.priority_score - a.priority_score);

        // Add ALL suggestions to map - every entity with a suggestion gets the row gradient
        const updatedMap = new Map(existingSuggestions);
        sortedSuggestions.forEach(suggestion => {
          updatedMap.set(suggestion.entity_id, suggestion);
        });
        setRexSuggestions(updatedMap);

        // No more "top 3 only" - all suggestions are treated equally
        // topDisplayedSuggestionIds is deprecated (can remove later)
        setTopDisplayedSuggestionIds(new Set());

        console.log(`[Rex] Suggestions map now has ${updatedMap.size} entries`);
        console.log(`[Rex] All ${updatedMap.size} entities will show row highlight`);

        const message = sortedSuggestions.length === 1
          ? `Revoa AI found 1 optimization opportunity!`
          : `Revoa AI found ${sortedSuggestions.length} optimization opportunities!`;
        toast.success(message);

        // Update last regeneration timestamp
        lastRegenerationTime.current = Date.now();
      } else {
        console.log(`[Rex] No new suggestions generated. Skipped ${skippedCount} entities without valid data`);
        toast.info('Revoa AI analyzed your ads but found no new optimization opportunities');

        // Still update timestamp even if no suggestions were found
        lastRegenerationTime.current = Date.now();
      }
    } catch (error) {
      console.error('[Rex] Error generating suggestions:', error);
      toast.error('Failed to generate AI suggestions');
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  // Handle accepting a suggestion (create automation rule)
  const handleAcceptSuggestion = async (suggestion: RexSuggestionWithPerformance) => {
    if (!user || !suggestion.recommended_rule) return;

    try {
      // Create the automation rule
      const rule = await automationRulesService.createRule(user.id, suggestion.recommended_rule);

      // Link suggestion to rule and mark as applied
      await rexSuggestionService.linkToAutomationRule(suggestion.id, rule.id);

      // Create performance baseline
      const entityData = [...creatives, ...campaigns, ...adSets].find(e => e.id === suggestion.entity_id);
      if (entityData && entityData.metrics) {
        await rexSuggestionService.createPerformanceBaseline(suggestion.id, {
          spend: entityData.metrics.spend,
          revenue: entityData.metrics.revenue || entityData.metrics.conversions * entityData.metrics.cpa,
          profit: entityData.metrics.profit || 0,
          roas: entityData.metrics.roas || 0,
          conversions: entityData.metrics.conversions,
          cpa: entityData.metrics.cpa,
          impressions: entityData.metrics.impressions,
          clicks: entityData.metrics.clicks,
          ctr: entityData.metrics.ctr,
          periodStart: dateRange.startDate,
          periodEnd: dateRange.endDate
        });
      }

      // Log interaction
      await rexSuggestionService.logInteraction(suggestion.id, user.id, 'rule_created', {
        rule_id: rule.id,
        rule_name: rule.name
      });

      // Reload suggestions
      await loadRexSuggestions();

      toast.success(`Revoa AI automation rule "${rule.name}" is now active!`);
    } catch (error) {
      console.error('[Audit] Error accepting suggestion:', error);
      toast.error('Failed to create automation rule');
    }
  };

  // Handle dismissing a suggestion
  const handleDismissSuggestion = async (suggestion: RexSuggestionWithPerformance, reason?: string) => {
    if (!user) return;

    try {
      await rexSuggestionService.dismissSuggestion(suggestion.id, user.id, reason);

      // Remove from map
      const updatedMap = new Map(rexSuggestions);
      updatedMap.delete(suggestion.entity_id);
      setRexSuggestions(updatedMap);

      // Update top 3 displayed suggestions (next one will surface)
      const topIds = getTopPendingSuggestions(updatedMap);
      setTopDisplayedSuggestionIds(topIds);

      toast.success('Suggestion dismissed');
    } catch (error) {
      console.error('[Audit] Error dismissing suggestion:', error);
      toast.error('Failed to dismiss suggestion');
    }
  };

  // Handle viewing a suggestion (mark as viewed)
  const handleViewSuggestion = async (suggestion: RexSuggestionWithPerformance) => {
    if (!user) return;

    try {
      await rexSuggestionService.markAsViewed(suggestion.id, user.id);
    } catch (error) {
      console.error('[Audit] Error marking suggestion as viewed:', error);
    }
  };

  const handleTimeChange = (time: TimeOption) => {
    setSelectedTime(time);
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (time) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '7d':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '14d':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 14);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '28d':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 28);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        return;
    }

    setDateRange({ startDate, endDate });
  };

  // Helper: Convert time option to Facebook date preset
  const getDatePreset = (time: TimeOption): string => {
    const presetMap: Record<TimeOption, string> = {
      '7d': 'last_7d',
      '14d': 'last_14d',
      '28d': 'last_28d',
      '90d': 'last_90d',
      'custom': 'last_28d', // fallback for custom
    };
    return presetMap[time] || 'last_28d';
  };

  const refreshData = async (showSuccessToast = false) => {
    if (!facebook.isConnected) {
      return;
    }

    setIsLoading(true);
    try {
      // Use quick refresh for fast stats updates
      if (facebook.accounts && facebook.accounts.length > 0) {
        const { facebookAdsService } = await import('@/lib/facebookAds');
        const datePreset = getDatePreset(selectedTime);

        let needsFullSync = false;

        // Try quick refresh for all accounts
        await Promise.all(
          facebook.accounts.map(async account => {
            try {
              const result = await facebookAdsService.quickRefresh(
                account.platform_account_id,
                datePreset
              );

              if (result.needsFullSync) {
                needsFullSync = true;
                toast.info('New campaigns detected. Running full sync...');
                // Run full sync if new items detected
                const syncResult = await facebookAdsService.syncAdAccount(account.platform_account_id, undefined, undefined, true);

                // Show detailed sync results
                if (syncResult.data) {
                  const { campaigns, adSets, ads, metrics } = syncResult.data;
                  toast.success(
                    `Full sync complete! ${campaigns} campaigns, ${adSets} ad sets, ${ads} ads, ${metrics} metrics`,
                    { duration: 5000 }
                  );
                }
              }
            } catch (err) {
              console.error('[Audit] Quick refresh failed:', err);
            }
          })
        );

        // Refresh account data to update last_synced_at in UI
        await facebookAdsService.getAdAccounts('facebook');
      }

      const startDate = dateRange.startDate.toISOString().split('T')[0];
      const endDate = dateRange.endDate.toISOString().split('T')[0];

      const [metrics, creativesData, campaignsData, adSetsData] = await Promise.all([
        getAdReportsMetrics(startDate, endDate),
        getCreativePerformance(startDate, endDate),
        getCampaignPerformance(startDate, endDate),
        getAdSetPerformance(startDate, endDate)
      ]);

      setPerformanceData(metrics);
      setCreatives(creativesData);
      setCampaigns(campaignsData);
      setAdSets(adSetsData);

      // Cache the fetched data
      setCachedData({
        performanceData: metrics,
        creatives: creativesData,
        campaigns: campaignsData,
        adSets: adSetsData,
        dateRange: { startDate, endDate }
      });

      // DEBUG: Log what Audit receives and passes down
      console.log('[DEBUG Audit] Fetched data:', {
        creativesCount: creativesData.length,
        campaignsCount: campaignsData.length,
        adSetsCount: adSetsData.length,
        sampleCreative: creativesData[0] ? {
          id: creativesData[0].id,
          name: creativesData[0].adName,
          metrics: creativesData[0].metrics
        } : null
      });

      // Load existing suggestions and generate new ones from REAL data
      // CRITICAL: Pass data directly to avoid React state timing issues
      // When manually refreshing, expire old suggestions to regenerate from fresh data
      await loadRexSuggestions(creativesData, campaignsData, adSetsData, true);

      if (showSuccessToast) {
        toast.success('Data refreshed successfully');
      }
    } catch (error) {
      console.error('[Audit] Error refreshing data:', error);
      toast.error('Failed to refresh ad data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!facebook.isConnected) return;

    const startDate = dateRange.startDate.toISOString().split('T')[0];
    const endDate = dateRange.endDate.toISOString().split('T')[0];

    // Check cache first
    const cachedResult = getCachedData({ startDate, endDate });

    // SCENARIO 1: Cache is fresh (< 15 min) - use immediately, no loading, NO refresh
    if (cachedResult.data && !cachedResult.isStale && cachedResult.dateRangeMatches) {
      console.log(`[Audit] Using fresh cache (${cachedResult.age} min old)`);
      setPerformanceData(cachedResult.data.performanceData);
      setCreatives(cachedResult.data.creatives);
      setCampaigns(cachedResult.data.campaigns);
      setAdSets(cachedResult.data.adSets);

      // Load Rex suggestions in background - preserve existing suggestions (don't expire)
      loadRexSuggestions(undefined, undefined, undefined, false);
      return;
    }

    // SCENARIO 2: Cache exists but is stale (15-30 min) - use it, DON'T auto-refresh
    // User must manually click refresh button to update
    if (cachedResult.data && !cachedResult.isVeryStale && cachedResult.dateRangeMatches) {
      console.log(`[Audit] Using stale cache (${cachedResult.age} min old). User must manually refresh.`);

      setPerformanceData(cachedResult.data.performanceData);
      setCreatives(cachedResult.data.creatives);
      setCampaigns(cachedResult.data.campaigns);
      setAdSets(cachedResult.data.adSets);

      // Load Rex suggestions from existing data - preserve existing suggestions (don't expire)
      loadRexSuggestions(undefined, undefined, undefined, false);
      return;
    }

    // SCENARIO 3: No cache or very stale (> 30 min) - DON'T auto-refresh
    // User must manually click refresh button to load/update data
    if (cachedResult.data) {
      console.log(`[Audit] Using very stale cache (${cachedResult.age} min old). User must manually refresh.`);
      setPerformanceData(cachedResult.data.performanceData);
      setCreatives(cachedResult.data.creatives);
      setCampaigns(cachedResult.data.campaigns);
      setAdSets(cachedResult.data.adSets);
      // Load Rex suggestions from existing data - preserve existing suggestions (don't expire)
      loadRexSuggestions(undefined, undefined, undefined, false);
    } else {
      // No cached data at all - show empty state, user must click refresh
      console.log('[Audit] No cache available. User must manually refresh to load data.');
      setPerformanceData(null);
      setCreatives([]);
      setCampaigns([]);
      setAdSets([]);
    }
  }, [facebook.isConnected, dateRange.startDate.getTime(), dateRange.endDate.getTime()]);

  // Expire old suggestions periodically
  useEffect(() => {
    if (!user) return;

    const expireInterval = setInterval(async () => {
      try {
        await rexSuggestionService.expireOldSuggestions();
        await loadRexSuggestions();
      } catch (error) {
        console.error('[Audit] Error expiring suggestions:', error);
      }
    }, 60000 * 60); // Every hour

    return () => clearInterval(expireInterval);
  }, [user]);

  const handleConnectFacebook = async () => {
    if (!user?.id) {
      toast.error('Please log in to connect Facebook Ads');
      return;
    }

    try {
      setIsFacebookConnecting(true);
      const { facebookAdsService } = await import('@/lib/facebookAds');
      const oauthUrl = await facebookAdsService.connectFacebookAds();

      const width = 800;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        oauthUrl,
        'facebook-oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'facebook-oauth-success') {
          toast.success('Facebook Ads connected successfully!');
          window.removeEventListener('message', handleMessage);
          setIsFacebookConnecting(false);
          refreshData();
        } else if (event.data.type === 'facebook-oauth-error') {
          toast.error(event.data.error || 'Failed to connect Facebook Ads');
          window.removeEventListener('message', handleMessage);
          setIsFacebookConnecting(false);
        }
      };

      window.addEventListener('message', handleMessage);

      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          setIsFacebookConnecting(false);
        }
      }, 1000);
    } catch (error) {
      console.error('[Audit] Error connecting Facebook:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect Facebook Ads');
      setIsFacebookConnecting(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 overflow-hidden">
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2 flex items-center gap-3">
          <span>Cross-Platform Ad Manager</span>
          <span className="px-3 py-1 text-xs font-normal bg-red-500/15 text-red-600 dark:text-red-400 rounded-full backdrop-blur-sm">
            <span className="sm:hidden">AI</span>
            <span className="hidden sm:inline">Infused with Revoa AI</span>
          </span>
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-start sm:items-center gap-2">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 sm:mt-0 flex-shrink-0"></span>
          {(() => {
            const connected = [];
            if (facebook.isConnected && facebook.accounts && facebook.accounts.length > 0) {
              connected.push('Meta Ads');
            }
            // Placeholder for future integrations
            // if (google.isConnected) connected.push('Google Ads');
            // if (tiktok.isConnected) connected.push('TikTok Ads');

            if (connected.length === 0) {
              return 'No ad platforms connected';
            }

            const platformText = connected.join(' - ') + ' Connected';

            // Get last sync time from accounts
            const lastSyncedAccount = facebook.accounts
              ?.filter(acc => acc.last_synced_at)
              .sort((a, b) => new Date(b.last_synced_at!).getTime() - new Date(a.last_synced_at!).getTime())[0];

            let timeText = '';
            if (lastSyncedAccount?.last_synced_at) {
              timeText = ` - Updated ${formatDistanceToNow(new Date(lastSyncedAccount.last_synced_at), { addSuffix: true })}`;
            }

            return platformText + timeText;
          })()}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-start sm:justify-end gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Platform Filter */}
          <div className="relative" ref={platformFilterRef}>
            <FilterButton
              icon={Filter}
              label="Platform"
              selectedLabel={
                selectedPlatforms.includes('all')
                  ? 'All'
                  : selectedPlatforms.length === 1
                    ? platforms.find(p => p.id === selectedPlatforms[0])?.name || selectedPlatforms[0]
                    : `(${selectedPlatforms.length})`
              }
              onClick={() => setShowPlatformFilter(!showPlatformFilter)}
              isActive={!selectedPlatforms.includes('all')}
              activeCount={!selectedPlatforms.includes('all') ? selectedPlatforms.length : 0}
              hideLabel="md"
              disabled={!facebook.isConnected}
              isOpen={showPlatformFilter}
            />
            {showPlatformFilter && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-50">
                {platforms.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => handlePlatformFilter(platform.id)}
                    className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <platform.icon className="w-4 h-4" />
                      <span>{platform.name}</span>
                    </div>
                    {(selectedPlatforms.includes(platform.id) || (platform.id === 'all' && selectedPlatforms.includes('all'))) && (
                      <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => refreshData(true)}
            disabled={isLoading || !facebook.isConnected}
            className="flex items-center gap-2 px-3 h-[38px] text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Refresh</span>
          </button>

          <AdReportsTimeSelector
            selectedTime={selectedTime}
            onTimeChange={handleTimeChange}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onApply={refreshData}
          />
        </div>
      </div>

      {!facebook.loading && !facebook.isConnected && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 sm:px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg flex-shrink-0">
                <svg className="w-6 h-6 text-gray-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Connect Ad Platform</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  Connect Facebook to start tracking performance
                </p>
              </div>
            </div>
            <button
              onClick={handleConnectFacebook}
              disabled={isFacebookConnecting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              {isFacebookConnecting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <span>Connect</span>
              )}
            </button>
          </div>
        </div>
      )}

      {facebook.isConnected && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex-1 flex flex-col min-h-0 min-w-0">
          <UnifiedAdManager
            creatives={creatives}
            campaigns={campaigns}
            adSets={adSets}
            isLoading={isLoading}
            rexSuggestions={rexSuggestions}
            topDisplayedSuggestionIds={topDisplayedSuggestionIds}
            onViewSuggestion={handleViewSuggestion}
            onAcceptSuggestion={handleAcceptSuggestion}
            onDismissSuggestion={handleDismissSuggestion}
            selectedPlatforms={selectedPlatforms}
          />
        </div>
      )}
    </div>
  );
}
