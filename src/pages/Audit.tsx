import React, { useState, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
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
import { useSyncStore } from '@/lib/syncStore';
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
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
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

  const { facebook, shopify, tiktok, google } = useConnectionStore();

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

  // PHASE 1: Load existing Rex suggestions from database (FAST - non-blocking)
  const loadExistingRexSuggestions = async (shouldExpireOld: boolean = false) => {
    if (!user) return;

    try {
      // Only expire pending/viewed suggestions when manually refreshing
      if (shouldExpireOld) {
        await rexSuggestionService.expireUserPendingSuggestions(user.id);
      }

      // Load remaining suggestions (dismissed and applied suggestions persist)
      const suggestions = await rexSuggestionService.getSuggestions(user.id);
      const suggestionsMap = new Map<string, RexSuggestionWithPerformance>();

      await Promise.all(
        suggestions.map(async (suggestion) => {
          // Skip expired, dismissed, applied, or completed suggestions
          if (suggestion.status === 'expired' || suggestion.status === 'dismissed' || suggestion.status === 'applied' || suggestion.status === 'completed') {
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

      setRexSuggestions(suggestionsMap);
      const topIds = getTopPendingSuggestions(suggestionsMap);
      setTopDisplayedSuggestionIds(topIds);

      // Enhanced logging with entity type breakdown
      const entityTypeBreakdown = Array.from(suggestionsMap.values()).reduce((acc, s) => {
        acc[s.entity_type] = (acc[s.entity_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('[Rex] Loaded existing suggestions:', {
        total: suggestionsMap.size,
        byEntityType: entityTypeBreakdown,
        byStatus: Array.from(suggestionsMap.values()).reduce((acc, s) => {
          acc[s.status] = (acc[s.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      });
      return suggestionsMap;
    } catch (error) {
      console.error('[Audit] Error loading existing Rex suggestions:', error);
      return new Map();
    }
  };

  // PHASE 2: Generate NEW Rex suggestions using AI (SLOW - runs in background)
  const generateNewRexSuggestions = async (
    existingSuggestions: Map<string, RexSuggestionWithPerformance>,
    creativesToAnalyze: any[],
    campaignsToAnalyze: any[],
    adSetsToAnalyze: any[]
  ) => {
    if (!user || isGeneratingSuggestions) return;

    // Check if we have valid ad account
    if (facebook.adAccounts.length === 0) {
      console.log('[Audit] Skipping Rex suggestions - no ad accounts');
      return;
    }

    const hasData = creativesToAnalyze.length > 0 || campaignsToAnalyze.length > 0 || adSetsToAnalyze.length > 0;
    if (!hasData) {
      console.log('[Audit] Skipping Rex suggestions - no ad data available yet');
      return;
    }

    // NOTE: Cooldown removed - manual refresh should always regenerate suggestions
    // The UI already handles rate limiting through the refresh button state

    console.log('[Rex] Starting AI analysis in background...');
    // Use flushSync to ensure the UI updates immediately (badge shows "AI Analyzing...")
    flushSync(() => {
      setIsGeneratingAI(true);
      setIsGeneratingSuggestions(true);
    });

    // Track start time to ensure minimum display duration for the badge
    const analysisStartTime = Date.now();
    const MIN_DISPLAY_MS = 1500; // Show "AI Analyzing..." for at least 1.5 seconds

    // Create a timeout promise (2 minutes max for AI generation)
    const AI_TIMEOUT_MS = 2 * 60 * 1000;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI analysis timed out')), AI_TIMEOUT_MS);
    });

    try {
      // Race between AI generation and timeout
      // Pass skipGuardCheck=true since we already set isGeneratingSuggestions above
      await Promise.race([
        generateRexSuggestions(existingSuggestions, true, creativesToAnalyze, campaignsToAnalyze, adSetsToAnalyze, true),
        timeoutPromise
      ]);

      // Reload suggestions from database after generation
      const updatedSuggestions = await rexSuggestionService.getSuggestions(user.id);
      const updatedMap = new Map<string, RexSuggestionWithPerformance>();

      await Promise.all(
        updatedSuggestions.map(async (suggestion) => {
          if (suggestion.status === 'expired' || suggestion.status === 'dismissed' || suggestion.status === 'applied' || suggestion.status === 'completed') {
            return;
          }

          const performance = await rexSuggestionService.getPerformance(suggestion.id);
          const suggestionWithPerf = {
            ...suggestion,
            performance: performance || undefined
          };

          updatedMap.set(suggestion.entity_id, suggestionWithPerf);

          if (suggestion.platform_entity_id && suggestion.platform_entity_id !== suggestion.entity_id) {
            updatedMap.set(suggestion.platform_entity_id, suggestionWithPerf);
          }
        })
      );

      console.log('[Rex] Reloaded from DB - suggestions by type:',
        updatedSuggestions.reduce((acc, s) => {
          acc[s.entity_type] = (acc[s.entity_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      );
      console.log('[Rex] Map keys added:', {
        totalKeys: updatedMap.size,
        sampleKeys: Array.from(updatedMap.keys()).slice(0, 5),
        campaignSuggestions: updatedSuggestions.filter(s => s.entity_type === 'campaign').map(s => ({
          entity_id: s.entity_id,
          platform_entity_id: s.platform_entity_id,
          entity_name: s.entity_name
        }))
      });

      setRexSuggestions(updatedMap);
      const updatedTopIds = getTopPendingSuggestions(updatedMap);
      setTopDisplayedSuggestionIds(updatedTopIds);

      console.log('[Rex] AI analysis complete:', updatedMap.size, 'suggestions');
    } catch (error) {
      console.error('[Rex] Error generating AI suggestions:', error);

      // Provide specific error messages based on error type
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('timed out')) {
        console.warn('[Rex] AI analysis timed out - this is normal for large ad accounts');
        toast.info('AI analysis is taking longer than expected. Check back in a few minutes.');
      } else if (errorMessage.includes('rate limit')) {
        console.warn('[Rex] Hit API rate limit');
        toast.warning('AI analysis rate limit reached. Try again in a few minutes.');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        console.warn('[Rex] Network error during AI analysis');
        toast.error('Network error during AI analysis. Please check your connection.');
      } else {
        console.error('[Rex] Unexpected AI error:', errorMessage);
        toast.error('AI analysis encountered an issue. Your metrics are still available.');
      }
    } finally {
      // Ensure the badge stays visible for minimum duration
      const elapsed = Date.now() - analysisStartTime;
      const remainingTime = Math.max(0, MIN_DISPLAY_MS - elapsed);
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      setIsGeneratingAI(false);
      setIsGeneratingSuggestions(false);
    }
  };

  // Legacy wrapper for backward compatibility
  const loadRexSuggestions = async (
    currentCreatives?: any[],
    currentCampaigns?: any[],
    currentAdSets?: any[],
    shouldExpireOld: boolean = false
  ) => {
    const existingSuggestions = await loadExistingRexSuggestions(shouldExpireOld);

    const creativesToAnalyze = currentCreatives || creatives;
    const campaignsToAnalyze = currentCampaigns || campaigns;
    const adSetsToAnalyze = currentAdSets || adSets;

    await generateNewRexSuggestions(
      existingSuggestions,
      creativesToAnalyze,
      campaignsToAnalyze,
      adSetsToAnalyze
    );
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
    adSetsToAnalyze?: any[],
    skipGuardCheck: boolean = false
  ) => {
    if (!user || (!skipGuardCheck && isGeneratingSuggestions)) return;

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

    // Reduced logging for better performance

    setIsGeneratingSuggestions(true);
    try {
      // Initialize Advanced Rex Intelligence with ALL AI engines
      // CRITICAL: Pass ad account ID so campaign-level suggestions can be generated
      const adAccountId = facebook.adAccounts[0]?.id;
      console.log('[Rex] Initializing AdvancedRexIntelligence with:', {
        userId: user.id,
        adAccountId,
        adAccountsLength: facebook.adAccounts.length,
        firstAccount: facebook.adAccounts[0],
        platform: 'facebook'
      });
      const advancedRex = new AdvancedRexIntelligence(user.id, adAccountId, 'facebook');
      const newSuggestions: any[] = [];
      let skippedCount = 0;
      let regeneratedCount = 0;

      // Date range for analysis
      const startDate = dateRange.startDate.toISOString().split('T')[0];
      const endDate = dateRange.endDate.toISOString().split('T')[0];

      // ===== INTELLIGENT SAMPLING: Only analyze top performers to prevent system overload =====
      const MAX_ENTITIES_TO_ANALYZE = 30; // Limit to prevent database/API overload
      const BATCH_SIZE = 5; // Process in small batches
      const BATCH_DELAY_MS = 500; // Delay between batches to prevent rate limiting

      // Helper to process entities in batches
      const processBatch = async (items: any[], processor: (item: any) => Promise<void>) => {
        for (let i = 0; i < items.length; i += BATCH_SIZE) {
          const batch = items.slice(i, i + BATCH_SIZE);
          await Promise.all(batch.map(processor));

          // Delay between batches (except for last batch)
          if (i + BATCH_SIZE < items.length) {
            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
          }
        }
      };

      // Sort and limit entities by spend (only analyze top performers)
      const topCreatives = dataCreatives
        .filter(c => hasValidData(c.metrics))
        .sort((a, b) => (b.metrics?.spend || 0) - (a.metrics?.spend || 0))
        .slice(0, MAX_ENTITIES_TO_ANALYZE);

      const topCampaigns = dataCampaigns
        .filter(c => hasValidData(c.metrics))
        .sort((a, b) => (b.metrics?.spend || 0) - (a.metrics?.spend || 0))
        .slice(0, MAX_ENTITIES_TO_ANALYZE);

      const topAdSets = dataAdSets
        .filter(a => hasValidData(a.metrics))
        .sort((a, b) => (b.metrics?.spend || 0) - (a.metrics?.spend || 0))
        .slice(0, MAX_ENTITIES_TO_ANALYZE);

      console.log(`[Rex] Analyzing top ${topCreatives.length} ads, ${topCampaigns.length} campaigns, ${topAdSets.length} ad sets (out of ${dataCreatives.length}/${dataCampaigns.length}/${dataAdSets.length} total)`);
      console.log('[Rex] Sample campaigns to analyze:', topCampaigns.slice(0, 3).map(c => ({
        id: c.id,
        platformId: c.platformId,
        name: c.name,
        spend: c.metrics?.spend
      })));
      console.log('[Rex] Top campaigns to analyze:', topCampaigns.map(c => ({
        id: c.id,
        name: c.name,
        roas: c.metrics?.roas,
        spend: c.metrics?.spend,
        profit: c.metrics?.profit,
        conversions: c.metrics?.conversions,
        revenue: c.metrics?.revenue
      })));

      // Generate suggestions for ads using ADVANCED AI (in batches)
      await processBatch(topCreatives, async (creative) => {
        try {
          // Generate if forcing regeneration OR if no existing suggestion OR if existing is expired/dismissed
          const existing = existingSuggestions.get(creative.id);
          const shouldGenerate = forceRegenerate || !existing || existing.status === 'expired' || existing.status === 'dismissed' || existing.status === 'applied' || existing.status === 'completed';

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
          } else {
            skippedCount++;
          }
        } catch (error) {
          console.error(`[Rex] Error analyzing ad ${creative.id}:`, error);
          skippedCount++;
          // Continue with next ad - don't let one failure stop the entire process
        }
      });

      // Generate suggestions for campaigns using ADVANCED AI (in batches)
      await processBatch(topCampaigns, async (campaign) => {
        try {
          const existingCampaign = existingSuggestions.get(campaign.id);
          const shouldGenerateCampaign = forceRegenerate || !existingCampaign || existingCampaign.status === 'expired' || existingCampaign.status === 'dismissed' || existingCampaign.status === 'applied' || existingCampaign.status === 'completed';

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

            // Use Advanced AI with Campaign Structure, Profit, Funnel, and Pattern Intelligence
            const suggestions = await advancedRex.analyzeEntity('campaign', entityData, startDate, endDate);
            newSuggestions.push(...suggestions);
          } else {
            skippedCount++;
          }
        } catch (error) {
          console.error(`[Rex] Error analyzing campaign ${campaign.id}:`, error);
          skippedCount++;
          // Continue with next campaign - don't let one failure stop the entire process
        }
      });

      // Generate suggestions for ad sets using ADVANCED AI (in batches)
      await processBatch(topAdSets, async (adSet) => {
        try {
          const existingAdSet = existingSuggestions.get(adSet.id);
          const shouldGenerateAdSet = forceRegenerate || !existingAdSet || existingAdSet.status === 'expired' || existingAdSet.status === 'dismissed' || existingAdSet.status === 'applied' || existingAdSet.status === 'completed';

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
          } else {
            skippedCount++;
          }
        } catch (error) {
          console.error(`[Rex] Error analyzing ad set ${adSet.id}:`, error);
          skippedCount++;
          // Continue with next ad set - don't let one failure stop the entire process
        }
      });

      console.log('[Rex] Total new suggestions generated:', newSuggestions.length);
      console.log('[Rex] Suggestions breakdown:', newSuggestions.map(s => ({
        entity_type: s.entity_type,
        entity_id: s.entity_id,
        entity_name: s.entity_name,
        suggestion_type: s.suggestion_type,
        priority_score: s.priority_score
      })));

      // Log breakdown by entity type
      const suggestionsByType = {
        campaign: newSuggestions.filter(s => s.entity_type === 'campaign').length,
        ad_set: newSuggestions.filter(s => s.entity_type === 'ad_set').length,
        ad: newSuggestions.filter(s => s.entity_type === 'ad').length
      };
      console.log('[Rex] Suggestions by entity type:', suggestionsByType);

      // Create suggestions in database
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

        console.log('[Rex] Suggestions Map - Total entries:', updatedMap.size);
        console.log('[Rex] Campaign IDs in suggestions map:',
          Array.from(updatedMap.values())
            .filter(s => s.entity_type === 'campaign')
            .map(s => ({ entity_id: s.entity_id, entity_name: s.entity_name }))
        );
        console.log('[Rex] Sample campaign IDs from campaigns array:',
          dataCampaigns.slice(0, 3).map(c => ({ id: c.id, name: c.name }))
        );

        setRexSuggestions(updatedMap);

        // No more "top 3 only" - all suggestions are treated equally
        // topDisplayedSuggestionIds is deprecated (can remove later)
        setTopDisplayedSuggestionIds(new Set());

        const message = sortedSuggestions.length === 1
          ? `Revoa AI found 1 optimization opportunity!`
          : `Revoa AI found ${sortedSuggestions.length} optimization opportunities!`;
        toast.success(message);

        // Update last regeneration timestamp
        lastRegenerationTime.current = Date.now();
      } else {
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

      // Reload existing suggestions (don't generate new ones)
      await loadExistingRexSuggestions(false);

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
    // Check if any platform is connected
    const anyPlatformConnected = facebook.isConnected || shopify.isConnected || tiktok.isConnected || google.isConnected;
    if (!anyPlatformConnected) {
      return;
    }

    const syncStore = useSyncStore.getState();
    const adDataCache = useAdDataCache.getState();

    setIsLoading(true);
    let syncStarted = false;

    try {
      // ===== PHASE 1: DATA SYNC AND DISPLAY (FAST - Must complete quickly) =====
      console.log('[Refresh] Phase 1: Starting data sync...');
      const syncStartTime = Date.now();

      const syncPromises: Promise<any>[] = [];
      syncStarted = syncStore.startSync('audit');

      if (syncStarted) {
        const datePreset = getDatePreset(selectedTime);

        // Facebook Ads sync
        if (facebook.accounts && facebook.accounts.length > 0) {
          const { facebookAdsService } = await import('@/lib/facebookAds');

          const facebookSync = Promise.all(
            facebook.accounts.map(async account => {
              try {
                const result = await facebookAdsService.quickRefresh(
                  account.platform_account_id,
                  datePreset
                );

                if (result.needsFullSync) {
                  toast.info('New Facebook campaigns detected. Running full sync...');
                  await facebookAdsService.syncAdAccount(account.platform_account_id, undefined, undefined, true);
                }
              } catch (err) {
                console.error('[Audit] Facebook quick refresh failed:', err);
              }
            })
          );
          syncPromises.push(facebookSync);
        }

        // TikTok Ads sync (incremental from last sync)
        if (tiktok.accounts && tiktok.accounts.length > 0) {
          const { tiktokAdsService } = await import('@/lib/tiktokAds');

          const tiktokSync = Promise.all(
            tiktok.accounts.map(async account => {
              try {
                await tiktokAdsService.syncAdAccount(account.platform_account_id, undefined, undefined, true);
              } catch (err) {
                console.error('[Audit] TikTok sync failed:', err);
              }
            })
          );
          syncPromises.push(tiktokSync);
        }

        // Google Ads sync (incremental from last sync)
        if (google.accounts && google.accounts.length > 0) {
          const { googleAdsService } = await import('@/lib/googleAds');

          const googleSync = Promise.all(
            google.accounts.map(async account => {
              try {
                await googleAdsService.syncAdAccount(account.platform_account_id, undefined, undefined, true);
              } catch (err) {
                console.error('[Audit] Google sync failed:', err);
              }
            })
          );
          syncPromises.push(googleSync);
        }

        // Shopify orders sync
        if (shopify.isConnected && user) {
          const { manualSync } = await import('@/lib/shopifyAutoSync');

          const shopifySync = manualSync(user.id).catch(err => {
            console.error('[Audit] Shopify sync failed:', err);
          });
          syncPromises.push(shopifySync);
        }

        // Wait for all syncs to complete
        await Promise.all(syncPromises);

        adDataCache.markStale();
        syncStore.completeSync();
      }

      const syncDuration = Date.now() - syncStartTime;
      console.log(`[Refresh] Phase 1: Sync completed in ${syncDuration}ms`);

      // Fetch metrics immediately after sync
      const fetchStartTime = Date.now();
      const startDate = dateRange.startDate.toISOString().split('T')[0];
      const endDate = dateRange.endDate.toISOString().split('T')[0];

      const [metrics, creativesData, campaignsData, adSetsData] = await Promise.all([
        getAdReportsMetrics(startDate, endDate),
        getCreativePerformance(startDate, endDate),
        getCampaignPerformance(startDate, endDate),
        getAdSetPerformance(startDate, endDate)
      ]);

      const fetchDuration = Date.now() - fetchStartTime;
      console.log(`[Refresh] Phase 1: Data fetched in ${fetchDuration}ms`);

      // Update state immediately - this makes metrics visible
      setPerformanceData(metrics);
      setCreatives(creativesData);
      setCampaigns(campaignsData);
      setAdSets(adSetsData);

      setCachedData({
        performanceData: metrics,
        creatives: creativesData,
        campaigns: campaignsData,
        adSets: adSetsData,
        dateRange: { startDate, endDate }
      });

      // Exit loading state immediately - table is now interactive
      setIsLoading(false);

      // Show success toast immediately
      if (showSuccessToast) {
        toast.success('Data refreshed successfully');
      }

      const totalPhase1Duration = Date.now() - syncStartTime;
      console.log(`[Refresh] Phase 1 complete: ${totalPhase1Duration}ms total`);

      // ===== PHASE 2: AI ANALYSIS (SLOW - Runs in background without blocking) =====
      const hasData = creativesData.length > 0 || campaignsData.length > 0 || adSetsData.length > 0;
      if (hasData) {
        console.log('[Refresh] Phase 2: Starting background AI analysis...');

        // Run AI analysis in background (non-blocking)
        // Use setTimeout to ensure it runs after the current call stack completes
        setTimeout(async () => {
          const aiStartTime = Date.now();
          try {
            // Load existing suggestions first (fast)
            const existingSuggestions = await loadExistingRexSuggestions(true);

            // Generate new suggestions in background (slow)
            await generateNewRexSuggestions(
              existingSuggestions,
              creativesData,
              campaignsData,
              adSetsData
            );

            const aiDuration = Date.now() - aiStartTime;
            console.log(`[Refresh] Phase 2: AI analysis completed in ${aiDuration}ms`);
          } catch (error) {
            console.error('[Refresh] Phase 2: AI analysis failed:', error);
            // Don't throw - AI failure shouldn't break the app
          }
        }, 0);
      } else {
        console.log('[Refresh] Phase 2: Skipped - no ad data to analyze');
      }

    } catch (error) {
      console.error('[Audit] Error refreshing data:', error);
      toast.error('Failed to refresh ad data');
      if (syncStarted) {
        useSyncStore.getState().completeSync(error instanceof Error ? error.message : 'Refresh failed');
      }
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!facebook.isConnected) return;

    const startDate = dateRange.startDate.toISOString().split('T')[0];
    const endDate = dateRange.endDate.toISOString().split('T')[0];

    const cachedResult = getCachedData({ startDate, endDate });

    if (cachedResult.data && cachedResult.dateRangeMatches) {
      const cacheAge = cachedResult.age || 0;
      const cacheStatus = cachedResult.isVeryStale ? 'very stale' : cachedResult.isStale ? 'stale' : 'fresh';
      console.log(`[Audit] Using ${cacheStatus} cache (${cacheAge} min old)`);

      // Display cached data immediately
      setPerformanceData(cachedResult.data.performanceData);
      setCreatives(cachedResult.data.creatives);
      setCampaigns(cachedResult.data.campaigns);
      setAdSets(cachedResult.data.adSets);

      const hasData = cachedResult.data.creatives.length > 0 ||
                      cachedResult.data.campaigns.length > 0 ||
                      cachedResult.data.adSets.length > 0;

      if (hasData) {
        // Load existing suggestions immediately (fast)
        // DON'T run AI analysis when loading cached data - only run during actual refresh
        console.log('[Audit] Loading cached data - displaying existing Rex suggestions only (no new analysis)');
        loadExistingRexSuggestions(false);
      } else {
        console.log('[Audit] Cache exists but has no ad data - auto-refreshing to fetch data');
        refreshData();
      }
    } else {
      console.log('[Audit] No matching cache - auto-refreshing to fetch data');
      setPerformanceData(null);
      setCreatives([]);
      setCampaigns([]);
      setAdSets([]);
      refreshData();
    }
  }, [facebook.isConnected, dateRange.startDate.getTime(), dateRange.endDate.getTime()]);

  // Expire old suggestions periodically
  useEffect(() => {
    if (!user) return;

    const expireInterval = setInterval(async () => {
      try {
        // Just expire and reload existing suggestions - don't generate new ones
        await rexSuggestionService.expireOldSuggestions();
        await loadExistingRexSuggestions(false);
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
          {isGeneratingAI ? (
            <span className="flex items-center gap-2 px-3 py-1 text-xs font-normal bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-full backdrop-blur-sm animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span className="hidden sm:inline">AI Analyzing...</span>
              <span className="sm:hidden">Analyzing...</span>
            </span>
          ) : (
            <span className="px-3 py-1 text-xs font-normal bg-red-500/15 text-red-600 dark:text-red-400 rounded-full backdrop-blur-sm">
              <span className="sm:hidden">AI</span>
              <span className="hidden sm:inline">Infused with Revoa AI</span>
            </span>
          )}
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
