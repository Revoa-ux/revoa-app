import React, { useState, useEffect } from 'react';
import { Facebook, AlertTriangle, RefreshCw, Sparkles, BarChart3, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { PerformanceOverview } from '@/components/reports/PerformanceOverview';
import { UnifiedAdManager } from '@/components/reports/UnifiedAdManager';
import { AIInsightsSidebar } from '@/components/reports/AIInsightsSidebar';
import AdReportsTimeSelector, { TimeOption } from '@/components/reports/AdReportsTimeSelector';
import { getAdReportsMetrics, getCreativePerformance, getCampaignPerformance, getAdSetPerformance } from '@/lib/adReportsService';
import { useConnectionStore } from '@/lib/connectionStore';
import { rexSuggestionService } from '@/lib/rexSuggestionService';
import { rexIntelligence } from '@/lib/rexIntelligence';
import { automationRulesService } from '@/lib/automationRulesService';
import { useAuth } from '@/contexts/AuthContext';
import type { RexSuggestionWithPerformance } from '@/types/rex';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

export default function Audit() {
  const { user } = useAuth();
  const [selectedTime, setSelectedTime] = useState<TimeOption>('28d');
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
  const [auditView, setAuditView] = useState<'performance' | 'admanager'>('admanager');

  const { facebook } = useConnectionStore();

  // Helper: Get top 3 pending suggestions for display
  const getTopPendingSuggestions = (allSuggestions: Map<string, RexSuggestionWithPerformance>): Set<string> => {
    const pendingSuggestions = Array.from(allSuggestions.values())
      .filter(s => s.status === 'pending' || s.status === 'viewed')
      .sort((a, b) => b.priority_score - a.priority_score)
      .slice(0, 3);

    return new Set(pendingSuggestions.map(s => s.entity_id));
  };

  // Load existing Rex suggestions from database
  const loadRexSuggestions = async () => {
    if (!user) return;

    try {
      const suggestions = await rexSuggestionService.getSuggestions(user.id);
      const suggestionsMap = new Map<string, RexSuggestionWithPerformance>();

      // Get performance data for each suggestion
      await Promise.all(
        suggestions.map(async (suggestion) => {
          const performance = await rexSuggestionService.getPerformance(suggestion.id);
          suggestionsMap.set(suggestion.entity_id, {
            ...suggestion,
            performance: performance || undefined
          });
        })
      );

      setRexSuggestions(suggestionsMap);

      // Update top 3 displayed suggestions
      const topIds = getTopPendingSuggestions(suggestionsMap);
      setTopDisplayedSuggestionIds(topIds);

      // Generate new suggestions for items without suggestions
      await generateRexSuggestions(suggestionsMap);
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

  // Generate new Rex suggestions for ads/campaigns/ad sets
  const generateRexSuggestions = async (existingSuggestions: Map<string, RexSuggestionWithPerformance>) => {
    if (!user || isGeneratingSuggestions) return;

    // Check if we have valid ad account with last_synced_at
    if (facebook.adAccounts.length === 0 || !facebook.adAccounts[0].last_synced_at) {
      console.log('[Audit] Skipping Rex suggestions - no data sync completed yet');
      return;
    }

    setIsGeneratingSuggestions(true);
    try {
      const newSuggestions: any[] = [];
      let skippedCount = 0;

      // Generate suggestions for ads
      for (const creative of creatives) {
        // Skip if no valid data
        if (!hasValidData(creative.metrics)) {
          skippedCount++;
          continue;
        }

        if (!existingSuggestions.has(creative.id)) {
          const entityData = {
            id: creative.id,
            name: creative.adName || creative.name,
            platform: creative.platform || 'facebook',
            metrics: {
              spend: creative.metrics.spend,
              revenue: creative.metrics.revenue || creative.metrics.conversions * creative.metrics.cpa,
              profit: creative.metrics.profit || 0,
              roas: creative.metrics.roas || 0,
              conversions: creative.metrics.conversions,
              cpa: creative.metrics.cpa,
              impressions: creative.metrics.impressions,
              clicks: creative.metrics.clicks,
              ctr: creative.metrics.ctr,
              fatigueScore: creative.fatigueScore
            },
            performance: creative.performance
          };

          const suggestions = rexIntelligence.analyzeEntity(user.id, 'ad', entityData);
          newSuggestions.push(...suggestions);
        }
      }

      // Generate suggestions for campaigns
      for (const campaign of campaigns) {
        // Skip if no valid data
        if (!hasValidData(campaign.metrics || {})) {
          skippedCount++;
          continue;
        }

        if (!existingSuggestions.has(campaign.id)) {
          const entityData = {
            id: campaign.id,
            name: campaign.name,
            platform: campaign.platform || 'facebook',
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

          const suggestions = rexIntelligence.analyzeEntity(user.id, 'campaign', entityData);
          newSuggestions.push(...suggestions);
        }
      }

      // Generate suggestions for ad sets
      for (const adSet of adSets) {
        // Skip if no valid data
        if (!hasValidData(adSet.metrics || {})) {
          skippedCount++;
          continue;
        }

        if (!existingSuggestions.has(adSet.id)) {
          const entityData = {
            id: adSet.id,
            name: adSet.name,
            platform: adSet.platform || 'facebook',
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

          const suggestions = rexIntelligence.analyzeEntity(user.id, 'ad_set', entityData);
          newSuggestions.push(...suggestions);
        }
      }

      // Create suggestions in database
      if (newSuggestions.length > 0) {
        const createdSuggestions = await Promise.all(
          newSuggestions.map(s => rexSuggestionService.createSuggestion(s))
        );

        // Sort by priority and take top 3
        const sortedSuggestions = createdSuggestions.sort((a, b) => b.priority_score - a.priority_score);
        const top3Suggestions = sortedSuggestions.slice(0, 3);

        // Add only top 3 to map
        const updatedMap = new Map(existingSuggestions);
        top3Suggestions.forEach(suggestion => {
          updatedMap.set(suggestion.entity_id, suggestion);
        });
        setRexSuggestions(updatedMap);

        if (top3Suggestions.length > 0) {
          const message = sortedSuggestions.length > 3
            ? `Rex found ${top3Suggestions.length} top optimization ${top3Suggestions.length === 1 ? 'opportunity' : 'opportunities'} (${sortedSuggestions.length} total)`
            : `Rex found ${top3Suggestions.length} optimization ${top3Suggestions.length === 1 ? 'opportunity' : 'opportunities'}!`;
          toast.success(message);
        }
      } else if (skippedCount > 0) {
        console.log(`[Audit] Skipped ${skippedCount} entities without valid data`);
      }
    } catch (error) {
      console.error('[Audit] Error generating Rex suggestions:', error);
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

      toast.success(`Rex's automation rule "${rule.name}" is now active!`);
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

  const refreshData = async (showSuccessToast = false) => {
    if (!facebook.isConnected) {
      return;
    }

    setIsLoading(true);
    try {
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

      // Load existing suggestions and generate new ones
      await loadRexSuggestions();

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
    if (facebook.isConnected) {
      refreshData();
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

  return (
    <div className="space-y-6 pb-6 overflow-x-hidden max-w-full">
      <div>
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">Ad Reports</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Cross-platform campaign management and performance insights</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg p-1">
            <button
              onClick={() => setAuditView('performance')}
              className={`relative flex items-center px-3 py-1.5 rounded-lg text-sm transition-colors ${
                auditView === 'performance'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm -my-[1px] py-[7px] -mx-[1px] px-[13px]'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4 mr-1.5" />
              Performance
            </button>
            <button
              onClick={() => setAuditView('admanager')}
              className={`relative flex items-center px-3 py-1.5 rounded-lg text-sm transition-colors ${
                auditView === 'admanager'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm -my-[1px] py-[7px] -mx-[1px] px-[13px]'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4 mr-1.5" />
              Ad Manager
            </button>
          </div>

          <button
            onClick={() => refreshData(true)}
            disabled={isLoading || !facebook.isConnected}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        <AdReportsTimeSelector
          selectedTime={selectedTime}
          onTimeChange={handleTimeChange}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onApply={refreshData}
        />
      </div>

      {!facebook.isConnected && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Connect Your Ad Platforms
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Connect Facebook to start tracking your ad performance
              </p>
            </div>
            <button className="px-6 py-3 bg-[#1877F2] text-white rounded-lg hover:bg-[#1877F2]/90 transition-colors font-medium flex items-center space-x-2">
              <Facebook className="w-5 h-5" />
              <span>Connect Now</span>
            </button>
          </div>
        </div>
      )}

      {facebook.isConnected && (
        <>
          {auditView === 'performance' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <PerformanceOverview metrics={performanceData} userId={user?.id} isLoading={isLoading} />
            </div>
          )}

          {auditView === 'admanager' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden w-full max-w-full">
              <UnifiedAdManager
                creatives={creatives}
                campaigns={campaigns}
                adSets={adSets}
                selectedTime={selectedTime}
                onTimeChange={handleTimeChange}
                rexSuggestions={rexSuggestions}
                topDisplayedSuggestionIds={topDisplayedSuggestionIds}
                onViewSuggestion={handleViewSuggestion}
                onAcceptSuggestion={handleAcceptSuggestion}
                onDismissSuggestion={handleDismissSuggestion}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
