import React, { useState, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { Helmet } from 'react-helmet-async';
import { Facebook, AlertTriangle, RefreshCw, Filter, Check, Plus, ExternalLink, Package, ChevronDown } from 'lucide-react';
import { Button } from '@/components/Button';
import { toast } from '../lib/toast';
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
import { RexOrchestrationService } from '@/lib/rexOrchestrationService';
import { useAuth } from '@/contexts/AuthContext';
import { useAdDataCache } from '@/lib/adDataCache';
import { useSyncStore } from '@/lib/syncStore';
import { SubscriptionPageWrapper } from '@/components/subscription/SubscriptionPageWrapper';
import { SoftWarningBanner } from '@/components/subscription/SoftWarningBanner';
import { useIsBlocked } from '@/components/subscription/SubscriptionGate';
import type { RexSuggestionWithPerformance } from '@/types/rex';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

export default function Audit() {
  const { user } = useAuth();
  const { getCachedData, setCachedData } = useAdDataCache();
  const isBlocked = useIsBlocked();
  const [selectedTime, setSelectedTime] = useState<TimeOption>('28d');
  const [isFacebookConnecting, setIsFacebookConnecting] = useState(false);
  const [isTikTokConnecting, setIsTikTokConnecting] = useState(false);
  const [isGoogleConnecting, setIsGoogleConnecting] = useState(false);
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
  const [showAddPlatform, setShowAddPlatform] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>(['all']);
  const [showProductFilter, setShowProductFilter] = useState(false);
  const [filterBySelection, setFilterBySelection] = useState(false);
  const [selectionCounts, setSelectionCounts] = useState({ campaigns: 0, adsets: 0, ads: 0 });
  const [currentViewLevel, setCurrentViewLevel] = useState<'campaigns' | 'adsets' | 'ads'>('campaigns');
  const platformFilterRef = useRef<HTMLDivElement>(null);
  const addPlatformRef = useRef<HTMLDivElement>(null);
  const productFilterRef = useRef<HTMLDivElement>(null);
  const lastRegenerationTime = useRef<number>(0);
  const REGENERATION_COOLDOWN_MS = 5 * 60 * 1000;

  useClickOutside(platformFilterRef, () => setShowPlatformFilter(false));
  useClickOutside(addPlatformRef, () => setShowAddPlatform(false));
  useClickOutside(productFilterRef, () => setShowProductFilter(false));

  const extractProductFromUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      const match = urlObj.pathname.match(/\/products\/([^/]+)/);
      if (match) {
        return match[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
    } catch {
      return null;
    }
    return null;
  };

  const uniqueProducts = React.useMemo(() => {
    const productSet = new Set<string>();
    creatives.forEach(c => {
      const destinationUrl = c.creative_data?.link_url || c.destinationUrl || c.link_url;
      const product = extractProductFromUrl(destinationUrl);
      if (product) productSet.add(product);
    });
    return Array.from(productSet).sort();
  }, [creatives]);

  const handleProductFilter = (productName: string) => {
    if (productName === 'all') {
      setSelectedProducts(['all']);
    } else {
      const newProducts = selectedProducts.filter(p => p !== 'all');
      if (newProducts.includes(productName)) {
        const filtered = newProducts.filter(p => p !== productName);
        setSelectedProducts(filtered.length === 0 ? ['all'] : filtered);
      } else {
        setSelectedProducts([...newProducts, productName]);
      }
    }
    setShowProductFilter(false);
  };

  const handleSelectionChange = useCallback((counts: { campaigns: number; adsets: number; ads: number }, viewLevel: 'campaigns' | 'adsets' | 'ads') => {
    setSelectionCounts(counts);
    setCurrentViewLevel(viewLevel);
    if (counts.campaigns === 0 && counts.adsets === 0 && counts.ads === 0) {
      setFilterBySelection(false);
    }
  }, []);

  const getCurrentSelectionCount = () => {
    if (currentViewLevel === 'campaigns') return selectionCounts.campaigns;
    if (currentViewLevel === 'adsets') return selectionCounts.adsets;
    return selectionCounts.ads;
  };

  const getSelectionLabel = () => {
    const count = getCurrentSelectionCount();
    if (filterBySelection) {
      return count > 0 ? `${count} selected` : 'All';
    }
    return count > 0 ? `${count} selected` : 'All';
  };

  const { facebook, shopify, tiktok, google } = useConnectionStore();

  const platforms = [
    { id: 'all', name: 'All Platforms', icon: Filter },
    { id: 'facebook', name: 'Meta Ads', icon: Facebook },
    {
      id: 'tiktok',
      name: 'TikTok Ads',
      icon: () => (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
        </svg>
      )
    },
    {
      id: 'google',
      name: 'Google Ads',
      icon: () => (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.54 11.23c0-.8-.07-1.57-.19-2.31H12v4.51h5.92c-.26 1.57-1.04 2.91-2.21 3.82v3.18h3.57c2.08-1.92 3.28-4.74 3.28-8.2z"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      )
    },
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

  /// PHASE 1: Load existing Rex suggestions from database (FAST - non-blocking)
  // Note: shouldExpireOld is deprecated - expiration now happens in generateRexSuggestions
  // ONLY after new suggestions are successfully generated
  const loadExistingRexSuggestions = async (_shouldExpireOld: boolean = false) => {
    if (!user) return;

    try {
      // Load suggestions (dismissed and applied suggestions persist)
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

    // Check if we have any ad accounts from connected platforms
    const hasAnyAdAccounts =
      facebook.adAccounts.length > 0 ||
      tiktok.accounts.length > 0 ||
      google.accounts.length > 0;

    // Also check if platforms are still loading
    const platformsStillLoading = facebook.loading || tiktok.loading || google.loading;

    if (!hasAnyAdAccounts && !platformsStillLoading) {
      console.log('[Audit] Skipping Rex suggestions - no ad accounts from any platform');
      return;
    }

    if (platformsStillLoading) {
      console.log('[Audit] Platforms still loading, deferring Rex suggestions');
      return;
    }

    const hasData = creativesToAnalyze.length > 0 || campaignsToAnalyze.length > 0 || adSetsToAnalyze.length > 0;

    const creativesWithMetrics = creativesToAnalyze.filter(c => hasValidData(c.metrics));
    const campaignsWithMetrics = campaignsToAnalyze.filter(c => hasValidData(c.metrics));
    const adSetsWithMetrics = adSetsToAnalyze.filter(a => hasValidData(a.metrics));
    const hasValidMetrics = creativesWithMetrics.length > 0 || campaignsWithMetrics.length > 0 || adSetsWithMetrics.length > 0;

    console.log('[Revoa AI] Data validation check:', {
      creativesCount: creativesToAnalyze.length,
      campaignsCount: campaignsToAnalyze.length,
      adSetsCount: adSetsToAnalyze.length,
      creativesWithMetrics: creativesWithMetrics.length,
      campaignsWithMetrics: campaignsWithMetrics.length,
      adSetsWithMetrics: adSetsWithMetrics.length,
      hasData,
      hasValidMetrics,
      sampleCreative: creativesToAnalyze[0] ? {
        id: creativesToAnalyze[0].id,
        name: creativesToAnalyze[0].name || creativesToAnalyze[0].adName,
        platform: creativesToAnalyze[0].platform,
        hasMetrics: !!creativesToAnalyze[0].metrics,
        spend: creativesToAnalyze[0].metrics?.spend
      } : null,
      sampleCampaign: campaignsToAnalyze[0] ? {
        id: campaignsToAnalyze[0].id,
        name: campaignsToAnalyze[0].name,
        platform: campaignsToAnalyze[0].platform,
        hasMetrics: !!campaignsToAnalyze[0].metrics,
        spend: campaignsToAnalyze[0].metrics?.spend
      } : null
    });

    if (!hasData) {
      console.log('[Audit] Skipping Revoa AI - no ad data available yet');
      return;
    }

    if (!hasValidMetrics) {
      console.log('[Audit] Skipping Revoa AI - entities exist but no metrics synced yet');
      return;
    }

    // NOTE: Cooldown removed - manual refresh should always regenerate suggestions
    // The UI already handles rate limiting through the refresh button state

    console.log('[Revoa AI] Starting AI analysis in background...');
    console.log('[Revoa AI] Setting isGeneratingAI=true via flushSync...');

    // Use flushSync to ensure the UI updates immediately (badge shows "AI Analyzing...")
    flushSync(() => {
      setIsGeneratingAI(true);
      setIsGeneratingSuggestions(true);
    });

    console.log('[Revoa AI] flushSync complete - badge should now be visible');

    // Track start time to ensure minimum display duration for the badge
    const analysisStartTime = Date.now();
    const MIN_DISPLAY_MS = 3000; // Show "AI Analyzing..." for at least 3 seconds

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
      }
    } finally {
      // Ensure the badge stays visible for minimum duration
      const elapsed = Date.now() - analysisStartTime;
      const remainingTime = Math.max(0, MIN_DISPLAY_MS - elapsed);
      console.log(`[Revoa AI] Analysis took ${elapsed}ms, waiting additional ${remainingTime}ms for badge visibility`);
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      console.log('[Revoa AI] Setting isGeneratingAI=false - hiding badge');
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
    if (!metrics) {
      return false;
    }
    const isValid = (
      metrics.impressions > 0 ||
      metrics.clicks > 0 ||
      metrics.spend > 0
    );
    return isValid;
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

    // Check if we have any ad accounts from connected platforms
    const hasAnyAdAccounts =
      facebook.adAccounts.length > 0 ||
      tiktok.accounts.length > 0 ||
      google.accounts.length > 0;

    if (!hasAnyAdAccounts) {
      console.log('[Audit] Skipping Rex suggestions - no ad accounts from any platform');
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
      // Initialize Advanced Rex Intelligence for EACH platform
      // CRITICAL: Pass correct ad account ID for each platform
      const facebookAdAccountId = facebook.adAccounts[0]?.id;
      const tiktokAdAccountId = tiktok.accounts[0]?.id;
      const googleAdAccountId = google.accounts[0]?.id;

      console.log('[Rex] Platform connection details:', {
        facebook: {
          connected: facebook.isConnected,
          adAccountsCount: facebook.adAccounts.length,
          firstAccount: facebook.adAccounts[0]
        },
        tiktok: {
          connected: tiktok.isConnected,
          accountsCount: tiktok.accounts.length,
          firstAccount: tiktok.accounts[0],
          accountsArray: tiktok.accounts
        },
        google: {
          connected: google.isConnected,
          accountsCount: google.accounts.length,
          firstAccount: google.accounts[0]
        }
      });

      console.log('[Rex] Initializing AdvancedRexIntelligence for all platforms:', {
        userId: user.id,
        facebook: { adAccountId: facebookAdAccountId, accounts: facebook.adAccounts.length },
        tiktok: { adAccountId: tiktokAdAccountId, accounts: tiktok.accounts.length },
        google: { adAccountId: googleAdAccountId, accounts: google.accounts.length }
      });

      // Create platform-specific intelligence engines
      const rexEngines = {
        facebook: facebookAdAccountId ? new AdvancedRexIntelligence(user.id, facebookAdAccountId, 'facebook') : null,
        tiktok: tiktokAdAccountId ? new AdvancedRexIntelligence(user.id, tiktokAdAccountId, 'tiktok') : null,
        google: googleAdAccountId ? new AdvancedRexIntelligence(user.id, googleAdAccountId, 'google') : null
      };

      console.log('[Rex] AI Engines created:', {
        facebook: !!rexEngines.facebook,
        tiktok: !!rexEngines.tiktok,
        google: !!rexEngines.google
      });

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

      console.log(`[Revoa AI] After filtering and sorting:`);
      console.log(`  - Ads: ${topCreatives.length} / ${dataCreatives.length} total (${dataCreatives.filter(c => hasValidData(c.metrics)).length} have valid metrics)`);
      console.log(`  - Campaigns: ${topCampaigns.length} / ${dataCampaigns.length} total (${dataCampaigns.filter(c => hasValidData(c.metrics)).length} have valid metrics)`);
      console.log(`  - Ad Sets: ${topAdSets.length} / ${dataAdSets.length} total (${dataAdSets.filter(a => hasValidData(a.metrics)).length} have valid metrics)`);

      // If most entities lack metrics, suggest a sync
      const entitiesWithMetrics = topCreatives.length + topCampaigns.length + topAdSets.length;
      const totalEntities = dataCreatives.length + dataCampaigns.length + dataAdSets.length;
      if (totalEntities > 0 && entitiesWithMetrics < totalEntities * 0.3) {
        console.warn(`[Revoa AI] WARNING: Only ${entitiesWithMetrics}/${totalEntities} entities (${Math.round(entitiesWithMetrics/totalEntities*100)}%) have metrics for the selected date range. This may be due to incomplete historical data sync. Try triggering a manual sync from Settings > Integrations.`);
      }

      if (topCreatives.length === 0 && topCampaigns.length === 0 && topAdSets.length === 0) {
        const hasEntitiesWithoutMetrics = dataCreatives.length > 0 || dataCampaigns.length > 0 || dataAdSets.length > 0;
        if (hasEntitiesWithoutMetrics) {
          console.log('[Revoa AI] Entities exist but no metrics synced yet - skipping AI analysis');
        } else {
          console.log('[Revoa AI] No ad data available - skipping AI analysis');
        }
        return;
      }

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

            // Use platform-specific Advanced AI engine
            const platform = (entityData.platform || 'facebook') as 'facebook' | 'tiktok' | 'google';
            const rexEngine = rexEngines[platform];
            console.log(`[Rex] Analyzing ${entityData.name} (${platform}):`, {
              hasEngine: !!rexEngine,
              platform,
              entityId: entityData.id,
              metrics: entityData.metrics
            });
            if (rexEngine) {
              const suggestions = await rexEngine.analyzeEntity('ad', entityData, startDate, endDate);
              console.log(`[Rex] Generated ${suggestions.length} suggestions for ${entityData.name}`);
              newSuggestions.push(...suggestions);
            } else {
              console.warn(`[Rex] No AI engine available for platform: ${platform}`);
            }
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

            // Use platform-specific Advanced AI engine
            const platform = (entityData.platform || 'facebook') as 'facebook' | 'tiktok' | 'google';
            const rexEngine = rexEngines[platform];
            console.log(`[Rex] Analyzing campaign ${entityData.name} (${platform}):`, {
              hasEngine: !!rexEngine,
              platform,
              entityId: entityData.id
            });
            if (rexEngine) {
              const suggestions = await rexEngine.analyzeEntity('campaign', entityData, startDate, endDate);
              console.log(`[Rex] Generated ${suggestions.length} suggestions for campaign ${entityData.name}`);
              newSuggestions.push(...suggestions);
            } else {
              console.warn(`[Rex] No AI engine available for platform: ${platform}`);
            }
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

            // Use platform-specific Advanced AI engine
            const platform = (entityData.platform || 'facebook') as 'facebook' | 'tiktok' | 'google';
            const rexEngine = rexEngines[platform];
            console.log(`[Rex] Analyzing ad set ${entityData.name} (${platform}):`, {
              hasEngine: !!rexEngine,
              platform,
              entityId: entityData.id
            });
            if (rexEngine) {
              const suggestions = await rexEngine.analyzeEntity('ad_set', entityData, startDate, endDate);
              console.log(`[Rex] Generated ${suggestions.length} suggestions for ad set ${entityData.name}`);
              newSuggestions.push(...suggestions);
            } else {
              console.warn(`[Rex] No AI engine available for platform: ${platform}`);
            }
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
      console.log('[Rex] Suggestions by platform:', {
        facebook: newSuggestions.filter(s => s.platform === 'facebook').length,
        tiktok: newSuggestions.filter(s => s.platform === 'tiktok').length,
        google: newSuggestions.filter(s => s.platform === 'google').length
      });
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
        // Expire old suggestions ONLY after we know new ones will be created
        // This prevents users from losing all suggestions if generation produces nothing
        if (user) {
          await rexSuggestionService.expireUserPendingSuggestions(user.id);
        }

        const createdSuggestions = await Promise.all(
          newSuggestions.map(s => rexSuggestionService.createSuggestion(s))
        );

        // Sort by priority - ALL suggestions are displayed (no limit!)
        const sortedSuggestions = createdSuggestions.sort((a, b) => b.priority_score - a.priority_score);

        // Build fresh map with only new suggestions (old ones were expired above)
        const updatedMap = new Map<string, RexSuggestionWithPerformance>();
        sortedSuggestions.forEach(suggestion => {
          updatedMap.set(suggestion.entity_id, suggestion);
          // Also set platform_entity_id as key if different (allows matching by either ID)
          if (suggestion.platform_entity_id && suggestion.platform_entity_id !== suggestion.entity_id) {
            updatedMap.set(suggestion.platform_entity_id, suggestion);
          }
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
        // No new suggestions found - keep existing ones visible (don't expire them)
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

  // Handle executing an immediate action (e.g., increase budget, pause)
  const handleExecuteAction = async (
    suggestion: RexSuggestionWithPerformance,
    actionType: string,
    parameters: any
  ): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      return { success: false, message: 'User not authenticated' };
    }

    try {
      console.log('[Audit] Executing action:', actionType, 'for suggestion:', suggestion.id);

      const entityData = [...creatives, ...campaigns, ...adSets].find(
        e => e.id === suggestion.entity_id || e.adSetId === suggestion.platform_entity_id || e.campaignId === suggestion.platform_entity_id
      );

      const orchestrationService = new RexOrchestrationService(user.id);

      const entity = {
        id: suggestion.entity_id,
        name: suggestion.entity_name,
        type: suggestion.entity_type as 'campaign' | 'ad_set' | 'ad',
        platform: suggestion.platform as 'facebook' | 'google' | 'tiktok',
        platformId: suggestion.platform_entity_id,
        status: entityData?.status || 'ACTIVE',
        metrics: entityData?.metrics || {
          spend: entityData?.spend || 0,
          revenue: entityData?.revenue || 0,
          profit: entityData?.profit || 0,
          roas: entityData?.roas || 0,
          conversions: entityData?.conversions || 0,
          cpa: entityData?.cpa || 0
        }
      };

      const result = await orchestrationService.executeAction(entity, actionType, parameters, suggestion.id);

      if (result.success) {
        const updatedMap = new Map(rexSuggestions);
        const existingSuggestion = updatedMap.get(suggestion.entity_id);
        if (existingSuggestion) {
          updatedMap.set(suggestion.entity_id, {
            ...existingSuggestion,
            status: 'applied'
          });
          setRexSuggestions(updatedMap);
        }

        const topIds = getTopPendingSuggestions(updatedMap);
        setTopDisplayedSuggestionIds(topIds);
      }

      return result;
    } catch (error) {
      console.error('[Audit] Error executing action:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Action failed' };
    }
  };

  const handleTimeChange = (time: TimeOption) => {
    setSelectedTime(time);
  };

  const handleDateRangeChange = (range: DateRange) => {
    console.log('[Audit] handleDateRangeChange called:', {
      startDate: range.startDate.toISOString().split('T')[0],
      endDate: range.endDate.toISOString().split('T')[0],
      daysDiff: Math.ceil((range.endDate.getTime() - range.startDate.getTime()) / (1000 * 60 * 60 * 24))
    });
    setDateRange(range);
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

  const refreshData = async (showSuccessToast = false, forceRefresh = false) => {
    if (isBlocked) return;

    // Check if any platform is connected - use getState() for fresh state when forceRefresh is true
    const store = forceRefresh ? useConnectionStore.getState() : { facebook, shopify, tiktok, google };
    const anyPlatformConnected = store.facebook.isConnected || store.shopify.isConnected || store.tiktok.isConnected || store.google.isConnected;
    if (!anyPlatformConnected && !forceRefresh) {
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

        // Facebook Ads sync - use store state for fresh data when forceRefresh
        const facebookAccounts = store.facebook.adAccounts || [];
        if (facebookAccounts.length > 0) {
          const { facebookAdsService } = await import('@/lib/facebookAds');

          const facebookSync = Promise.all(
            facebookAccounts.map(async account => {
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
        const tiktokAccounts = store.tiktok.accounts || [];
        if (tiktokAccounts.length > 0) {
          const { tiktokAdsService } = await import('@/lib/tiktokAds');

          const tiktokSync = Promise.all(
            tiktokAccounts.map(async account => {
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
        const googleAccounts = store.google.accounts || [];
        if (googleAccounts.length > 0) {
          const { googleAdsService } = await import('@/lib/googleAds');

          const googleSync = Promise.all(
            googleAccounts.map(async account => {
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
        if (store.shopify.isConnected && user) {
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

      console.log('[Refresh] Data breakdown:', {
        campaigns: campaignsData.length,
        campaignsByPlatform: campaignsData.reduce((acc: Record<string, number>, c: any) => {
          acc[c.platform || 'unknown'] = (acc[c.platform || 'unknown'] || 0) + 1;
          return acc;
        }, {}),
        adSets: adSetsData.length,
        creatives: creativesData.length,
        sampleCampaign: campaignsData[0] ? { name: campaignsData[0].name, platform: campaignsData[0].platform, spend: campaignsData[0].metrics?.spend } : null
      });

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
            // Load existing suggestions first (fast) - DON'T expire old ones yet
            // Expiration should only happen AFTER new suggestions are successfully generated
            const existingSuggestions = await loadExistingRexSuggestions(false);

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
    if (isBlocked) {
      setIsLoading(false);
      return;
    }

    // Wait for all platforms to finish loading before proceeding
    const platformsStillLoading = facebook.loading || tiktok.loading || google.loading;
    if (platformsStillLoading) {
      console.log('[Audit] Waiting for platform connections to load...');
      return;
    }

    const anyPlatformConnected = facebook.isConnected || tiktok.isConnected || google.isConnected;
    if (!anyPlatformConnected) return;

    const startDate = dateRange.startDate.toISOString().split('T')[0];
    const endDate = dateRange.endDate.toISOString().split('T')[0];

    console.log('[Audit] useEffect triggered - fetching data for date range:', {
      startDate,
      endDate,
      selectedTime,
      daysDiff: Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24))
    });

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
        console.log('[Audit] Loading cached data - displaying existing suggestions and running AI analysis');
        loadExistingRexSuggestions(false).then(existingSuggestions => {
          // Run AI analysis in background after a short delay to let UI settle
          setTimeout(() => {
            if (existingSuggestions) {
              generateNewRexSuggestions(
                existingSuggestions,
                cachedResult.data.creatives,
                cachedResult.data.campaigns,
                cachedResult.data.adSets
              );
            }
          }, 1000);
        });
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
  }, [facebook.isConnected, facebook.loading, tiktok.isConnected, tiktok.loading, google.isConnected, google.loading, dateRange.startDate.getTime(), dateRange.endDate.getTime(), isBlocked]);

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

      const handleMessage = async (event: MessageEvent) => {
        if (event.data.type === 'facebook-oauth-success') {
          toast.success('Facebook Ads connected successfully!');
          window.removeEventListener('message', handleMessage);
          setIsFacebookConnecting(false);

          // Refresh connection store to update Facebook connection status
          await useConnectionStore.getState().refreshFacebookAccounts();

          // Force refresh with forceRefresh=true to use fresh store state
          // This ensures data loads even if React state hasn't propagated yet
          await refreshData(true, true);
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
    <SubscriptionPageWrapper>
      <Helmet>
        <title>Ad Manager | Revoa</title>
      </Helmet>
      <div className="h-full flex flex-col gap-6 overflow-hidden">
        <SoftWarningBanner />

      <div className="flex-shrink-0">
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2 flex items-center gap-3">
          <span>Unified Ad Manager</span>
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
{/* Platform Pills & Add Platform Button */}
        <div className="flex items-center gap-3 mt-2">
          {(() => {
            const connectedPlatforms = [];
            const unconnectedPlatforms = [];

            if (facebook.isConnected && facebook.accounts && facebook.accounts.length > 0) {
              connectedPlatforms.push({
                id: 'facebook',
                name: 'Meta Ads',
                icon: (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                )
              });
            } else {
              unconnectedPlatforms.push({
                id: 'facebook',
                name: 'Meta Ads',
                onClick: handleConnectFacebook
              });
            }

            if (tiktok.isConnected && tiktok.accounts && tiktok.accounts.length > 0) {
              connectedPlatforms.push({
                id: 'tiktok',
                name: 'TikTok Ads',
                icon: (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
                )
              });
            } else {
              unconnectedPlatforms.push({
                id: 'tiktok',
                name: 'TikTok Ads',
                onClick: async () => {
                  try {
                    const { tiktokAdsService } = await import('@/lib/tiktokAds');
                    const oauthUrl = await tiktokAdsService.connectTikTokAds();
                    const popup = window.open(oauthUrl, 'tiktok-oauth', 'width=600,height=700,scrollbars=yes');

                    const handleMessage = async (event: MessageEvent) => {
                      if (event.data?.type === 'tiktok-oauth-success') {
                        toast.success('TikTok Ads connected successfully!');
                        window.removeEventListener('message', handleMessage);
                        await useConnectionStore.getState().refreshTikTokAccounts();
                        await refreshData(true, true);
                      } else if (event.data?.type === 'tiktok-oauth-error') {
                        toast.error(event.data.error || 'Failed to connect TikTok Ads');
                        window.removeEventListener('message', handleMessage);
                      }
                    };

                    window.addEventListener('message', handleMessage);

                    const checkClosed = setInterval(() => {
                      if (popup?.closed) {
                        clearInterval(checkClosed);
                        window.removeEventListener('message', handleMessage);
                      }
                    }, 1000);
                  } catch (error) {
                    console.error('[Audit] Error connecting TikTok Ads:', error);
                    toast.error(error instanceof Error ? error.message : 'Failed to connect TikTok Ads');
                  }
                }
              });
            }

            if (google.isConnected && google.accounts && google.accounts.length > 0) {
              connectedPlatforms.push({
                id: 'google',
                name: 'Google Ads',
                icon: (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.54 11.23c0-.8-.07-1.57-.19-2.31H12v4.51h5.92c-.26 1.57-1.04 2.91-2.21 3.82v3.18h3.57c2.08-1.92 3.28-4.74 3.28-8.2z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )
              });
            } else {
              unconnectedPlatforms.push({
                id: 'google',
                name: 'Google Ads',
                onClick: async () => {
                  try {
                    const { googleAdsService } = await import('@/lib/googleAds');
                    const oauthUrl = await googleAdsService.connectGoogleAds();
                    const popup = window.open(oauthUrl, 'google-oauth', 'width=600,height=700,scrollbars=yes');

                    const handleMessage = async (event: MessageEvent) => {
                      if (event.data?.type === 'google-oauth-success') {
                        toast.success('Google Ads connected successfully!');
                        window.removeEventListener('message', handleMessage);
                        await useConnectionStore.getState().refreshGoogleAccounts();
                        await refreshData(true, true);
                      } else if (event.data?.type === 'google-oauth-error') {
                        toast.error(event.data.error || 'Failed to connect Google Ads');
                        window.removeEventListener('message', handleMessage);
                      }
                    };

                    window.addEventListener('message', handleMessage);

                    const checkClosed = setInterval(() => {
                      if (popup?.closed) {
                        clearInterval(checkClosed);
                        window.removeEventListener('message', handleMessage);
                      }
                    }, 1000);
                  } catch (error) {
                    console.error('[Audit] Error connecting Google Ads:', error);
                    toast.error(error instanceof Error ? error.message : 'Failed to connect Google Ads');
                  }
                }
              });
            }

            if (connectedPlatforms.length === 0) {
              return (
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0"></span>
                  {facebook.loading || tiktok.loading || google.loading ? 'Checking connections...' : 'No ad platforms connected'}
                </p>
              );
            }

            // Get last sync time
            const allAccounts = [
              ...(facebook.accounts || []),
              ...(tiktok.accounts || []),
              ...(google.accounts || [])
            ];

            const lastSyncedAccount = allAccounts
              .filter(acc => acc.last_synced_at)
              .sort((a, b) => new Date(b.last_synced_at!).getTime() - new Date(a.last_synced_at!).getTime())[0];

            return (
              <>
                {/* Connected Platform Pills */}
                {connectedPlatforms.map((platform) => (
                  <div
                    key={platform.id}
                    className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-md h-[27px]"
                  >
                    <div className="flex-shrink-0">
                      {platform.icon}
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {platform.name}
                    </span>
                  </div>
                ))}

                {/* Add Platform Button */}
                {unconnectedPlatforms.length > 0 && (
                  <div className="relative" ref={addPlatformRef}>
                    <button
                      onClick={() => setShowAddPlatform(!showAddPlatform)}
                      className="flex items-center justify-center w-[27px] h-[27px] bg-white dark:bg-dark border border-dashed border-gray-300 dark:border-[#4a4a4a] rounded-md hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-[#3a3a3a] transition-all"
                      title="Add platform"
                    >
                      <Plus className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                    </button>

                    {/* Add Platform Dropdown */}
                    {showAddPlatform && (
                      <div className="absolute left-0 top-full mt-2 w-64 bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg shadow-lg overflow-hidden z-50">
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-[#3a3a3a]">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Add Platform
                          </p>
                        </div>
                        <div>
                          {unconnectedPlatforms.map((platform, index) => (
                            platform.onClick ? (
                              <button
                                key={platform.id}
                                onClick={() => {
                                  platform.onClick();
                                  setShowAddPlatform(false);
                                }}
                                disabled={platform.id === 'facebook' && isFacebookConnecting}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                  index === unconnectedPlatforms.length - 1 ? 'rounded-b-lg' : ''
                                }`}
                              >
                                <div className="flex items-center justify-center w-8 h-8 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg flex-shrink-0">
                                  {platform.id === 'facebook' && (
                                    <svg className="w-5 h-5 text-gray-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                    </svg>
                                  )}
                                  {platform.id === 'tiktok' && (
                                    <svg className="w-5 h-5 text-gray-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                                    </svg>
                                  )}
                                  {platform.id === 'google' && (
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                    </svg>
                                  )}
                                </div>
                                <div className="flex-1 text-left">
                                  <p className="font-medium">{platform.name}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {platform.id === 'facebook' && isFacebookConnecting ? 'Connecting...' : 'Connect account'}
                                  </p>
                                </div>
                                {platform.id === 'facebook' && isFacebookConnecting && (
                                  <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                                )}
                              </button>
                            ) : null
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Last Synced Time */}
                {lastSyncedAccount?.last_synced_at && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    Updated {formatDistanceToNow(new Date(lastSyncedAccount.last_synced_at), { addSuffix: true })}
                  </span>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-start sm:justify-end gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Product Filter - only show if products exist */}
          {uniqueProducts.length > 0 && (
            <div className="relative" ref={productFilterRef}>
              <button
                onClick={() => setShowProductFilter(!showProductFilter)}
                className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <Package className="w-4 h-4" />
                <span className="border-b border-dashed border-gray-400 dark:border-gray-500">
                  {selectedProducts.includes('all') ? 'All Products' : selectedProducts.length === 1 ? selectedProducts[0] : `${selectedProducts.length} products`}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showProductFilter ? 'rotate-180' : ''}`} />
              </button>
              {showProductFilter && (
                <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => handleProductFilter('all')}
                    className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors rounded-t-lg"
                  >
                    <span>All Products</span>
                    {selectedProducts.includes('all') && (
                      <Check className="w-4 h-4 text-rose-500" />
                    )}
                  </button>
                  {uniqueProducts.map((product) => (
                    <button
                      key={product}
                      onClick={() => handleProductFilter(product)}
                      className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors last:rounded-b-lg"
                    >
                      <span className="truncate">{product}</span>
                      {selectedProducts.includes(product) && (
                        <Check className="w-4 h-4 text-rose-500 flex-shrink-0 ml-2" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selection Filter - only show when items are selected */}
          {getCurrentSelectionCount() > 0 && (
            <button
              onClick={() => setFilterBySelection(!filterBySelection)}
              className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer transition-colors"
            >
              <span className={`border-b border-dashed ${
                filterBySelection
                  ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                  : 'border-gray-400 dark:border-gray-500'
              }`}>
                {filterBySelection
                  ? `Showing ${getCurrentSelectionCount()}`
                  : `Show ${getCurrentSelectionCount()} selected`}
              </span>
            </button>
          )}

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
              disabled={!facebook.isConnected && !tiktok.isConnected && !google.isConnected}
              isOpen={showPlatformFilter}
            />
            {showPlatformFilter && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg shadow-lg overflow-hidden z-50">
                {platforms.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => handlePlatformFilter(platform.id)}
                    className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors"
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
            disabled={isLoading || (!facebook.isConnected && !tiktok.isConnected && !google.isConnected)}
            className="flex items-center gap-2 px-3 h-[38px] text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg hover:bg-gray-50 dark:hover:bg-[#3a3a3a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Refresh</span>
          </button>

          <AdReportsTimeSelector
            selectedTime={selectedTime}
            onTimeChange={handleTimeChange}
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
          />
        </div>
      </div>

      {/* Show connection cards only when NO platforms are connected */}
      {!facebook.isConnected && !tiktok.isConnected && !google.isConnected && (
        <div className="space-y-3 flex-shrink-0">
          {!facebook.loading && (
            <div className="bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg px-4 sm:px-6 py-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="p-2 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg flex-shrink-0">
                    <svg className="w-6 h-6 text-gray-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Connect Facebook Ads</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      Connect Facebook to start tracking performance
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleConnectFacebook}
                  disabled={isFacebookConnecting}
                  loading={isFacebookConnecting}
                  icon={<ExternalLink className="w-3.5 h-3.5" />}
                  iconPosition="right"
                >
                  Connect
                </Button>
              </div>
            </div>
          )}

          {!tiktok.loading && (
            <div className="bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg px-4 sm:px-6 py-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="p-2 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg flex-shrink-0">
                    <svg className="w-6 h-6 text-gray-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Connect TikTok Ads</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      Connect TikTok to track your ad campaigns
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    try {
                      setIsTikTokConnecting(true);
                      const { tiktokAdsService } = await import('@/lib/tiktokAds');
                      const oauthUrl = await tiktokAdsService.connectTikTokAds();

                      const width = 600;
                      const height = 700;
                      const left = window.screen.width / 2 - width / 2;
                      const top = window.screen.height / 2 - height / 2;

                      const popup = window.open(
                        oauthUrl,
                        'tiktok-oauth',
                        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
                      );

                      const handleMessage = async (event: MessageEvent) => {
                        if (event.data.type === 'tiktok-oauth-success') {
                          toast.success('TikTok Ads connected successfully!');
                          window.removeEventListener('message', handleMessage);
                          setIsTikTokConnecting(false);

                          // Refresh connection store to update TikTok connection status
                          await useConnectionStore.getState().refreshTikTokAccounts();

                          // Force refresh with forceRefresh=true
                          await refreshData(true, true);
                        } else if (event.data.type === 'tiktok-oauth-error') {
                          toast.error(event.data.error || 'Failed to connect TikTok Ads');
                          window.removeEventListener('message', handleMessage);
                          setIsTikTokConnecting(false);
                        }
                      };

                      window.addEventListener('message', handleMessage);

                      const checkClosed = setInterval(() => {
                        if (popup?.closed) {
                          clearInterval(checkClosed);
                          window.removeEventListener('message', handleMessage);
                          setIsTikTokConnecting(false);
                        }
                      }, 1000);
                    } catch (error) {
                      console.error('[Audit] Error connecting TikTok Ads:', error);
                      toast.error(error instanceof Error ? error.message : 'Failed to connect TikTok Ads');
                      setIsTikTokConnecting(false);
                    }
                  }}
                  disabled={isTikTokConnecting}
                  loading={isTikTokConnecting}
                  icon={<ExternalLink className="w-3.5 h-3.5" />}
                  iconPosition="right"
                >
                  Connect
                </Button>
              </div>
            </div>
          )}

          {!google.loading && (
            <div className="bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg px-4 sm:px-6 py-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="p-2 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg flex-shrink-0">
                    <svg className="w-6 h-6 text-gray-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.54 11.23c0-.8-.07-1.57-.19-2.31H12v4.51h5.92c-.26 1.57-1.04 2.91-2.21 3.82v3.18h3.57c2.08-1.92 3.28-4.74 3.28-8.2z"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Connect Google Ads</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      Connect Google Ads to track your campaigns
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    try {
                      setIsGoogleConnecting(true);
                      const { googleAdsService } = await import('@/lib/googleAds');
                      const oauthUrl = await googleAdsService.connectGoogleAds();

                      const width = 600;
                      const height = 700;
                      const left = window.screen.width / 2 - width / 2;
                      const top = window.screen.height / 2 - height / 2;

                      const popup = window.open(
                        oauthUrl,
                        'google-oauth',
                        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
                      );

                      const handleMessage = async (event: MessageEvent) => {
                        if (event.data.type === 'google-oauth-success') {
                          toast.success('Google Ads connected successfully!');
                          window.removeEventListener('message', handleMessage);
                          setIsGoogleConnecting(false);

                          // Refresh connection store to update Google connection status
                          await useConnectionStore.getState().refreshGoogleAccounts();

                          // Force refresh with forceRefresh=true
                          await refreshData(true, true);
                        } else if (event.data.type === 'google-oauth-error') {
                          toast.error(event.data.error || 'Failed to connect Google Ads');
                          window.removeEventListener('message', handleMessage);
                          setIsGoogleConnecting(false);
                        }
                      };

                      window.addEventListener('message', handleMessage);

                      const checkClosed = setInterval(() => {
                        if (popup?.closed) {
                          clearInterval(checkClosed);
                          window.removeEventListener('message', handleMessage);
                          setIsGoogleConnecting(false);
                        }
                      }, 1000);
                    } catch (error) {
                      console.error('[Audit] Error connecting Google Ads:', error);
                      toast.error(error instanceof Error ? error.message : 'Failed to connect Google Ads');
                      setIsGoogleConnecting(false);
                    }
                  }}
                  disabled={isGoogleConnecting}
                  loading={isGoogleConnecting}
                  icon={<ExternalLink className="w-3.5 h-3.5" />}
                  iconPosition="right"
                >
                  Connect
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {(facebook.isConnected || tiktok.isConnected || google.isConnected) && (
        <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a] overflow-hidden flex-1 flex flex-col min-h-0 min-w-0">
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
            onExecuteAction={handleExecuteAction}
            selectedPlatforms={selectedPlatforms}
            selectedProducts={selectedProducts}
            filterBySelection={filterBySelection}
            onSelectionChange={handleSelectionChange}
          />
        </div>
      )}
      </div>
    </SubscriptionPageWrapper>
  );
}
