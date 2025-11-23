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

      // Add 3 mock AI suggestions for testing - keyed by entity ID
      if (creativesData.length > 0 || campaignsData.length > 0 || adSetsData.length > 0) {
        const mockSuggestions = new Map<string, RexSuggestionWithPerformance>();
        const topIds = new Set<string>();

        // Mock suggestion 1: Budget increase for high-performing campaign
        if (campaignsData.length > 0) {
          const campaignId = campaignsData[0].id;
          mockSuggestions.set(campaignId, {
            id: `suggestion-campaign-${campaignId}`,
            entity_type: 'campaign',
            entity_id: campaignId,
            entity_name: campaignsData[0].name,
            platform: 'facebook',
            suggestion_type: 'increase_budget',
            title: 'Increase Budget for Top Performer',
            message: `Hey! I have been watching "${campaignsData[0].name}" and it is absolutely crushing it. Your ROAS is sitting at 3.2x with a CPA of just $45 - that is fantastic! This is performing way above your account average and I think we should scale this up by 30% while it is hot.`,
            priority_score: 85,
            confidence_score: 88,
            reasoning: {
              triggeredBy: ['high_roas', 'low_cpa', 'consistent_performance'],
              analysis: 'This campaign has been consistently profitable with strong metrics across the board. The current daily spend of $150 is actually below the optimal threshold based on your ad set performance data. There is clear headroom to scale without saturating the audience.',
              metrics: {
                current_roas: 3.2,
                current_cpa: 45.0,
                daily_spend: 150.0,
                potential_revenue: 2400.0
              },
              riskLevel: 'low'
            },
            estimated_impact: {
              expectedRevenue: 2400.0,
              expectedProfit: 1200.0,
              timeframeDays: 30,
              confidence: 'high',
              breakdown: "If you increase the daily budget by $45 (30%), I am projecting you will maintain the same 3.2x ROAS, which means for every extra dollar spent, you are getting $3.20 back. Over 30 days, that is an additional $2,400 in revenue and about $1,200 in profit."
            },
            recommended_rule: {
              name: `Rex: Auto-scale ${campaignsData[0].name}`,
              description: 'Automatically increase budget by 20% when ROAS stays above 3.0x for 3 consecutive days',
              entity_type: 'campaign',
              condition_logic: 'AND',
              check_frequency_minutes: 1440,
              max_daily_actions: 1,
              require_approval: true,
              dry_run: false,
              conditions: [
                {
                  metric_type: 'roas',
                  operator: 'greater_than',
                  threshold_value: 3.0,
                  time_window_days: 3
                },
                {
                  metric_type: 'spend',
                  operator: 'greater_than',
                  threshold_value: 100,
                  time_window_days: 1
                }
              ],
              actions: [
                {
                  action_type: 'increase_budget',
                  parameters: { percentage: 20, reason: 'Rex auto-scale: High ROAS detected' }
                }
              ]
            },
            status: 'pending',
            created_at: new Date().toISOString(),
            user_id: user?.id || ''
          });
          topIds.add(campaignId);
        }

        // Mock suggestion 2: Pause underperforming ad set
        if (adSetsData.length > 0) {
          const adSetId = adSetsData[0].id;
          mockSuggestions.set(adSetId, {
            id: `suggestion-adset-${adSetId}`,
            entity_type: 'ad_set',
            entity_id: adSetId,
            entity_name: adSetsData[0].name,
            platform: 'facebook',
            suggestion_type: 'pause_underperforming',
            title: 'Pause Underperforming Ad Set',
            message: `Heads up, something's not looking right with "${adSetsData[0].name}". The CTR has dropped to 0.42% (that is pretty low), and the CPA is sitting at $165 - that is 65% higher than your account average of $100. This ad set has been struggling for over a week now, and it is costing you about $45 a day in wasted spend. I think it is time to pause this one and move that budget to your better performers.`,
            priority_score: 82,
            confidence_score: 92,
            reasoning: {
              triggeredBy: ['low_ctr', 'high_cpa', 'consistent_underperformance'],
              analysis: 'This ad set has been consistently underperforming across all key metrics for 7+ consecutive days. I am seeing signs of both audience fatigue (they have seen these ads too many times) and creative fatigue (the messaging is not resonating anymore). The performance gap compared to your account average is significant and shows no signs of improvement.',
              metrics: {
                ctr: 0.42,
                cpa: 165.0,
                account_avg_cpa: 100.0,
                daily_waste: 45.0
              },
              riskLevel: 'medium'
            },
            estimated_impact: {
              expectedSavings: 1350.0,
              timeframeDays: 30,
              confidence: 'high',
              breakdown: "By pausing this underperforming ad set, you will immediately stop the $45/day in wasted spend. Over the next 30 days, that is $1,350 saved. Plus, you can reallocate that budget to your top performers for even better results."
            },
            recommended_rule: {
              name: `Rex: Pause low performers`,
              description: 'Automatically pause ad sets when CPA exceeds account average by 50% for 5 consecutive days',
              entity_type: 'ad_set',
              condition_logic: 'AND',
              check_frequency_minutes: 1440,
              max_daily_actions: 2,
              require_approval: false,
              dry_run: false,
              conditions: [
                {
                  metric_type: 'cpa',
                  operator: 'greater_than_percentage',
                  threshold_value: 150,
                  time_window_days: 5
                },
                {
                  metric_type: 'spend',
                  operator: 'greater_than',
                  threshold_value: 20,
                  time_window_days: 1
                }
              ],
              actions: [
                {
                  action_type: 'pause',
                  parameters: { reason: 'Rex auto-pause: Consistently high CPA' }
                }
              ]
            },
            status: 'pending',
            created_at: new Date().toISOString(),
            user_id: user?.id || ''
          });
          topIds.add(adSetId);
        }

        // Mock suggestion 3: Creative refresh needed
        if (creativesData.length > 0) {
          const adId = creativesData[0].id;
          mockSuggestions.set(adId, {
            id: `suggestion-ad-${adId}`,
            entity_type: 'ad',
            entity_id: adId,
            entity_name: creativesData[0].name,
            platform: 'facebook',
            suggestion_type: 'refresh_creative',
            title: 'Creative Fatigue Detected',
            message: `I noticed something with "${creativesData[0].name}" that needs attention. Your CTR has dropped 45% over the past two weeks - it went from really solid to just okay. At the same time, I am seeing your frequency climb to 4.2, which means people are seeing this ad a lot. Classic creative fatigue! Your audience has seen this creative too many times and they're starting to tune it out. Time for a refresh.`,
            priority_score: 78,
            confidence_score: 85,
            reasoning: {
              triggeredBy: ['declining_ctr', 'high_frequency', 'creative_fatigue'],
              analysis: 'This is textbook creative fatigue. The CTR decline combined with rising frequency tells me your audience is getting tired of seeing the same creative. Your reach is staying stable, so it is not an audience size issue - it is that the people seeing your ads are not clicking anymore because they have already seen it multiple times. The engagement drop of 38% confirms people are actively ignoring this creative now.',
              metrics: {
                ctr_decline: 45.0,
                frequency: 4.2,
                days_running: 14,
                engagement_drop: 38.0
              },
              riskLevel: 'medium'
            },
            estimated_impact: {
              expectedRevenue: 800.0,
              expectedProfit: 400.0,
              timeframeDays: 14,
              confidence: 'medium',
              breakdown: "If you refresh this creative with 3-5 new variations (keeping the messaging that works but with fresh visuals), I am expecting you will restore the CTR to near its original levels. Based on your historical performance, that should generate an additional $800 in revenue over the next two weeks as engagement recovers."
            },
            recommended_rule: {
              name: `Rex: Auto-detect creative fatigue`,
              description: 'Automatically flag ads when CTR declines by 30% and frequency exceeds 3.5',
              entity_type: 'ad',
              condition_logic: 'AND',
              check_frequency_minutes: 1440,
              max_daily_actions: 3,
              require_approval: true,
              dry_run: false,
              conditions: [
                {
                  metric_type: 'ctr_change',
                  operator: 'less_than',
                  threshold_value: -30,
                  time_window_days: 14
                },
                {
                  metric_type: 'frequency',
                  operator: 'greater_than',
                  threshold_value: 3.5,
                  time_window_days: 7
                }
              ],
              actions: [
                {
                  action_type: 'notify',
                  parameters: { message: 'Rex alert: Creative fatigue detected, refresh recommended' }
                }
              ]
            },
            status: 'pending',
            created_at: new Date().toISOString(),
            user_id: user?.id || ''
          });
          topIds.add(adId);
        }

        setRexSuggestions(mockSuggestions);
        setTopDisplayedSuggestionIds(topIds);
        console.log('[Audit] Mock suggestions created:', mockSuggestions, 'Top IDs:', topIds);
      }

      // Load existing suggestions and generate new ones
      // await loadRexSuggestions();

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
    <div className="h-full flex flex-col gap-6 overflow-hidden">
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">Ad Reports</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
          Cross-platform campaign management and performance insights
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3 overflow-x-auto">
          {/* View Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg p-1 flex-shrink-0">
            <button
              onClick={() => setAuditView('admanager')}
              className={`relative flex items-center px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap ${
                auditView === 'admanager'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm -my-[1px] py-[7px] -mx-[1px] px-[13px]'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4 mr-1.5" />
              Ad Manager
            </button>
            <button
              onClick={() => setAuditView('performance')}
              className={`relative flex items-center px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap ${
                auditView === 'performance'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm -my-[1px] py-[7px] -mx-[1px] px-[13px]'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4 mr-1.5" />
              Performance
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:flex-shrink-0">
          <button
            onClick={() => refreshData(true)}
            disabled={isLoading || !facebook.isConnected}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
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

      {!facebook.isConnected && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 flex-shrink-0">
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
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex-1 min-h-0 overflow-hidden flex flex-col">
              <div className="overflow-auto flex-1">
                <PerformanceOverview metrics={performanceData} userId={user?.id} isLoading={isLoading} />
              </div>
            </div>
          )}

          {auditView === 'admanager' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex-1 flex flex-col min-h-0 min-w-0">
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
