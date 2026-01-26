import { CampaignStructureIntelligenceEngine } from './campaignStructureIntelligence';
import { ProfitIntelligenceService } from './profitIntelligenceService';
import { FullFunnelAnalysisService } from './fullFunnelAnalysisService';
import { IntelligentRexService } from './intelligentRexService';
import { deepRexEngine } from './deepRexAnalysisEngine';
import { ComprehensiveRexAnalysis } from './comprehensiveRexAnalysis';
import { RexInsightGenerator } from './rexInsightGenerator';
import { platformDataInterpreter } from './platformDataInterpreter';
import { RexRuleGenerator } from './rexRuleGenerator';
import type {
  RexEntityType,
  CreateRexSuggestionParams,
  RexSuggestionReasoning,
  RexEstimatedImpact
} from '@/types/rex';

/**
 * Advanced Rex Intelligence Service
 *
 * This is the MASTER AI service that combines ALL intelligence engines:
 * 1. Campaign Structure Intelligence (CBO/ABO, learning phase, bidding, account health)
 * 2. Profit Intelligence (true profit ROAS with COGS, product margins, customer LTV)
 * 3. Full Funnel Analysis (impression to purchase drop-offs, landing page friction)
 * 4. Deep Rex Analysis Engine (multi-dimensional pattern recognition)
 * 5. Comprehensive Rex Analysis (demographics, placements, geographic, temporal)
 *
 * This service determines which campaigns/ad sets/ads get the RED GRADIENT highlighting
 * by using the same advanced AI logic that powers the modals.
 */

interface EntityMetrics {
  spend: number;
  revenue: number;
  profit: number;
  roas: number;
  conversions: number;
  cpa: number;
  impressions: number;
  clicks: number;
  ctr: number;
}

interface EntityData {
  id: string;
  name: string;
  platform: string;
  platformId?: string;
  metrics: EntityMetrics;
  performance?: 'high' | 'medium' | 'low';
}

export class AdvancedRexIntelligence {
  private userId: string;
  private adAccountId?: string;
  private platform: string;
  private campaignStructureIntel: CampaignStructureIntelligenceEngine;
  private profitIntel: ProfitIntelligenceService;
  private funnelAnalysis: FullFunnelAnalysisService;
  private intelligentRex: IntelligentRexService;
  private comprehensiveAnalysis: ComprehensiveRexAnalysis;
  private insightGenerator: RexInsightGenerator;

  constructor(userId: string, adAccountId?: string, platform: string = 'facebook') {
    console.log('[AdvancedRexIntelligence] Constructor called with:', {
      userId,
      adAccountId,
      adAccountIdType: typeof adAccountId,
      adAccountIdTruthy: !!adAccountId,
      platform
    });
    this.userId = userId;
    this.adAccountId = adAccountId;
    this.platform = platform;
    this.campaignStructureIntel = new CampaignStructureIntelligenceEngine(userId, adAccountId, platform as any);
    this.profitIntel = new ProfitIntelligenceService(userId);
    this.funnelAnalysis = new FullFunnelAnalysisService(userId);
    this.intelligentRex = new IntelligentRexService();
    this.comprehensiveAnalysis = new ComprehensiveRexAnalysis(userId);
    this.insightGenerator = new RexInsightGenerator();
  }

  /**
   * Analyze an entity using ALL advanced intelligence engines
   * This is the function that determines which entities get red gradient highlighting
   */
  async analyzeEntity(
    entityType: RexEntityType,
    entity: EntityData,
    startDate: string,
    endDate: string
  ): Promise<CreateRexSuggestionParams[]> {
    console.log(`[AdvancedRexIntelligence] Analyzing ${entityType}:`, entity.name);

    const suggestions: CreateRexSuggestionParams[] = [];

    try {
      // Run all intelligence engines in parallel for performance
      const [
        campaignStructureAnalysis,
        profitAnalysis,
        funnelAnalysis,
        deepPatternAnalysis,
        comprehensiveAnalysis
      ] = await Promise.all([
        // Campaign Structure Intelligence
        this.analyzeCampaignStructure(entityType, entity, startDate, endDate),

        // Profit Intelligence (true profit with COGS)
        this.analyzeProfitIntelligence(entity, startDate, endDate),

        // Full Funnel Analysis (impression → purchase drop-offs)
        this.analyzeFunnel(entity.id, startDate, endDate),

        // Deep Pattern Recognition (multi-dimensional insights)
        entity.platformId ? deepRexEngine.generateDeepAnalysis(entity.platformId, startDate, endDate) : null,

        // Comprehensive Analysis (demographics, placements, geo, temporal)
        entity.platformId ? this.comprehensiveAnalysis.analyzeEntity(
          entityType,
          entity.id,
          entity.platformId,
          30 // 30 days
        ) : null
      ]);

      // Generate suggestions based on Campaign Structure Intelligence
      if (campaignStructureAnalysis) {
        suggestions.push(...campaignStructureAnalysis);
      }

      // Generate suggestions based on Profit Intelligence
      if (profitAnalysis) {
        suggestions.push(...profitAnalysis);
      }

      // Generate suggestions based on Funnel Analysis
      if (funnelAnalysis) {
        suggestions.push(...funnelAnalysis);
      }

      // Generate suggestions based on Deep Pattern Analysis
      if (deepPatternAnalysis && comprehensiveAnalysis) {
        const deepSuggestions = this.createSuggestionsFromDeepAnalysis(
          entity,
          deepPatternAnalysis,
          comprehensiveAnalysis
        );
        suggestions.push(...deepSuggestions);
      }

      // Sort by priority and return top suggestions
      return suggestions.sort((a, b) => b.priority_score - a.priority_score);
    } catch (error) {
      console.error('[AdvancedRexIntelligence] Error analyzing entity:', error);
      return [];
    }
  }

  /**
   * Campaign Structure Intelligence Analysis
   * Analyzes CBO vs ABO, learning phase, bidding strategy, budget scaling patterns
   */
  private async analyzeCampaignStructure(
    entityType: RexEntityType,
    entity: EntityData,
    startDate: string,
    endDate: string
  ): Promise<CreateRexSuggestionParams[]> {
    const suggestions: CreateRexSuggestionParams[] = [];

    try {
      if (entityType === 'campaign') {
        // Analyze if this campaign should switch from ABO to CBO or vice versa
        try {
          // Skip CBO analysis if ad account ID is missing
          if (!this.adAccountId) {
            console.log('[CampaignStructure] CBO analysis skipped - ad account ID not provided');
            return suggestions;
          }

          const cboAnalysis = await this.campaignStructureIntel.analyzeCBOvsABO();

          if (cboAnalysis && entity.metrics.spend > 100) {
            const isCurrentlyCBO = entity.name.toLowerCase().includes('cbo');
            const shouldBeCBO = cboAnalysis.recommendation === 'cbo';

            if (isCurrentlyCBO !== shouldBeCBO) {
              suggestions.push({
                user_id: this.userId,
                entity_type: entityType,
                entity_id: entity.id,
                entity_name: entity.name,
                platform: entity.platform,
                platform_entity_id: entity.platformId || entity.id,
                suggestion_type: shouldBeCBO ? 'switch_to_cbo' : 'switch_to_abo',
                priority_score: 75,
                confidence_score: cboAnalysis.confidenceScore || 70,
                title: shouldBeCBO ? 'Switch to Campaign Budget Optimization' : 'Switch to Ad Set Budget Optimization',
                message: cboAnalysis.reasoning,
                reasoning: {
                  triggeredBy: ['campaign_structure_analysis', 'cbo_vs_abo_comparison'],
                  metrics: {
                    current_roas: entity.metrics.roas,
                    cbo_avg_roas: cboAnalysis.cboAverageRoas,
                    abo_avg_roas: cboAnalysis.aboAverageRoas,
                    potential_improvement: shouldBeCBO
                      ? ((cboAnalysis.cboAverageRoas - entity.metrics.roas) / entity.metrics.roas) * 100
                      : ((cboAnalysis.aboAverageRoas - entity.metrics.roas) / entity.metrics.roas) * 100
                  },
                  analysis: cboAnalysis.reasoning,
                  riskLevel: 'low'
                },
                recommended_rule: RexRuleGenerator.generateRule({
                  suggestionType: shouldBeCBO ? 'switch_to_cbo' : 'switch_to_abo',
                  entityType: 'campaign',
                  entityName: entity.name,
                  currentMetrics: entity.metrics,
                  platform: entity.platform
                })
              });
            }
          }
        } catch (error) {
          console.error('[CampaignStructure] CBO analysis failed:', error);
          // Continue with other analyses
        }

        // Use platform knowledge to INTERPRET learning phase data
        const learningPhaseInterpretation = platformDataInterpreter.interpretLearningPhase(
          entity.platform as 'facebook' | 'tiktok' | 'google',
          {
            conversions: entity.metrics.conversions,
            daysSinceLaunchOrEdit: 7 // Would come from actual tracking
          }
        );

        try {
          const learningPhaseAnalysis = await this.campaignStructureIntel.analyzeLearningPhase(startDate, endDate);

          if (learningPhaseAnalysis && learningPhaseAnalysis.performanceImpact.improvement > 30) {
            // YOUR LOGIC: Campaign might be in learning phase limbo
            // Platform interpreter tells us what the numbers mean
            if (learningPhaseInterpretation.status === 'LEARNING_LIMITED' ||
                (learningPhaseInterpretation.status === 'LEARNING' && learningPhaseInterpretation.risk === 'high')) {
              suggestions.push({
                user_id: this.userId,
                entity_type: entityType,
                entity_id: entity.id,
                entity_name: entity.name,
                platform: entity.platform,
                platform_entity_id: entity.platformId || entity.id,
                suggestion_type: 'learning_phase_optimization',
                priority_score: 80,
                confidence_score: 85,
                title: 'Learning Phase Bottleneck Detected',
                message: `This campaign has spent $${entity.metrics.spend.toFixed(2)} but only has ${entity.metrics.conversions} conversions. ${learningPhaseInterpretation.interpretation}. Current ROAS of ${entity.metrics.roas.toFixed(2)}x could improve to ${learningPhaseAnalysis.performanceImpact.roasPostLearning.toFixed(2)}x once learning phase completes.`,
                reasoning: {
                  triggeredBy: ['learning_phase_stuck', 'insufficient_conversions'],
                  metrics: {
                    current_conversions: entity.metrics.conversions,
                    required_conversions: learningPhaseInterpretation.conversionsNeeded,
                    conversions_remaining: learningPhaseInterpretation.conversionsRemaining,
                    current_roas: entity.metrics.roas,
                    expected_post_learning_roas: learningPhaseAnalysis.performanceImpact.roasPostLearning,
                    improvement_potential: learningPhaseAnalysis.performanceImpact.improvement
                  },
                  analysis: `Based on YOUR historical data, campaigns typically see ${learningPhaseAnalysis.performanceImpact.improvement.toFixed(1)}% improvement in ROAS after exiting learning phase. Platform data shows: ${learningPhaseInterpretation.interpretation}`,
                  riskLevel: 'medium'
                },
                recommended_rule: RexRuleGenerator.generateRule({
                  suggestionType: 'learning_phase_optimization',
                  entityType: 'campaign',
                  entityName: entity.name,
                  currentMetrics: entity.metrics,
                  platform: entity.platform
                })
              });
            }
          }
        } catch (error) {
          console.error('[CampaignStructure] Learning phase analysis failed:', error);
          // Continue with other analyses
        }
      }

      // Check for budget scaling opportunities with platform constraints
      // For CAMPAIGNS, use lower threshold (1.8x ROAS) since campaigns control budget allocation in CBO
      const roasThreshold = entityType === 'campaign' ? 1.8 : 2.5;
      const spendThreshold = entityType === 'campaign' ? 100 : 50;

      if (entity.metrics.roas > roasThreshold && entity.metrics.profit > 0 && entity.metrics.spend > spendThreshold) {
        try {
          const budgetScalingAnalysis = await this.campaignStructureIntel.analyzeBudgetScaling(startDate, endDate);

          if (budgetScalingAnalysis) {
            const safeScalePercentage = budgetScalingAnalysis.optimalScalePercentage || 15;
            const projectedRevenue = entity.metrics.revenue * (1 + safeScalePercentage / 100);
            const projectedProfit = (projectedRevenue - entity.metrics.spend * (1 + safeScalePercentage / 100));

            suggestions.push({
              user_id: this.userId,
              entity_type: entityType,
              entity_id: entity.id,
              entity_name: entity.name,
              platform: entity.platform,
              platform_entity_id: entity.platformId || entity.id,
              suggestion_type: 'increase_budget',
              priority_score: entityType === 'campaign' ? 90 : 85,
              confidence_score: budgetScalingAnalysis.confidence || 75,
              title: entityType === 'campaign' ? 'Campaign Ready to Scale' : 'Safe Budget Scaling Opportunity',
              message: `This ${entityType} is performing well at ${entity.metrics.roas.toFixed(2)}x ROAS with $${entity.metrics.profit.toFixed(2)} profit. Historical patterns show you can safely scale budget by ${safeScalePercentage}% without resetting learning phase or degrading performance.`,
              reasoning: {
                triggeredBy: ['high_roas', 'positive_profit', 'historical_scaling_success'],
                metrics: {
                  current_roas: entity.metrics.roas,
                  current_profit: entity.metrics.profit,
                  safe_scale_percentage: safeScalePercentage,
                  projected_revenue: projectedRevenue,
                  projected_profit: projectedProfit
                },
                analysis: budgetScalingAnalysis.historicalScales.length > 0
                  ? `Based on ${budgetScalingAnalysis.historicalScales.length} historical scaling attempts, ${safeScalePercentage}% is the optimal increase that maintains performance without learning phase reset.`
                  : `Based on current performance trends and industry best practices, ${safeScalePercentage}% is a safe initial scaling increase that maintains performance without resetting the learning phase.`,
                riskLevel: 'low'
              },
              recommended_rule: RexRuleGenerator.generateRule({
                suggestionType: 'increase_budget',
                entityType: entityType,
                entityName: entity.name,
                currentMetrics: entity.metrics,
                platform: entity.platform
              }),
              estimated_impact: {
                expectedRevenue: projectedRevenue - entity.metrics.revenue,
                expectedProfit: projectedProfit - entity.metrics.profit,
                timeframe: '7-14 days'
              }
            });
          }
        } catch (error) {
          console.error('[CampaignStructure] Budget scaling analysis failed:', error);
        }
      }

      // Campaign-specific suggestions: Generate more proactive suggestions for campaigns
      console.log('[AdvancedRex] Campaign check:', {
        entityType,
        name: entity.name,
        spend: entity.metrics.spend,
        roas: entity.metrics.roas,
        conversions: entity.metrics.conversions,
        profit: entity.metrics.profit,
        isValidCampaign: entityType === 'campaign' && entity.metrics.spend > 50,
        wouldBeHighPerformer: entity.metrics.roas > 2.5 && entity.metrics.conversions >= 5,
        wouldBeGoodPerformer: entity.metrics.roas >= 1.5 && entity.metrics.roas < 2.5 && entity.metrics.conversions >= 3,
        wouldBeUnderperformer: entity.metrics.roas < 1.5 && entity.metrics.spend > 200
      });

      if (entityType === 'campaign' && entity.metrics.spend > 50) {
        // High performer suggestion - campaigns with ROAS > 2.5 are top performers
        if (entity.metrics.roas > 2.5 && entity.metrics.conversions >= 5) {
          const scalePotential = Math.min(entity.metrics.roas * 10, 30);
          suggestions.push({
            user_id: this.userId,
            entity_type: 'campaign',
            entity_id: entity.id,
            entity_name: entity.name,
            platform: entity.platform,
            platform_entity_id: entity.platformId || entity.id,
            suggestion_type: 'scale_high_performer',
            priority_score: 92,
            confidence_score: 85,
            title: 'Top Performing Campaign - Scale Now',
            message: `This campaign is crushing it with ${entity.metrics.roas.toFixed(2)}x ROAS and ${entity.metrics.conversions} conversions! With ${entity.platform === 'facebook' ? 'Meta' : entity.platform === 'tiktok' ? 'TikTok' : 'Google'}'s optimization, you could scale budget by ${scalePotential.toFixed(0)}% over the next ${entity.platform === 'tiktok' ? '1-2 days' : entity.platform === 'google' ? '1 week' : '3-4 days'} without resetting learning.`,
            reasoning: {
              triggeredBy: ['exceptional_performance', 'scaling_opportunity', 'high_conversion_velocity'],
              metrics: {
                roas: entity.metrics.roas,
                conversions: entity.metrics.conversions,
                spend: entity.metrics.spend,
                revenue: entity.metrics.revenue,
                scale_potential: scalePotential
              },
              analysis: `Campaign is performing in the top tier with ${entity.metrics.roas.toFixed(2)}x ROAS. This is a clear scaling opportunity.`,
              riskLevel: 'low'
            },
            recommended_rule: RexRuleGenerator.generateRule({
              suggestionType: 'scale_high_performer',
              entityType: 'campaign',
              entityName: entity.name,
              currentMetrics: entity.metrics,
              platform: entity.platform
            }),
            estimated_impact: {
              expectedRevenue: entity.metrics.revenue * (scalePotential / 100),
              expectedProfit: entity.metrics.profit * (scalePotential / 100) * 0.9,
              timeframe: '7-14 days'
            }
          });
        }

        // Good performer with optimization opportunity
        else if (entity.metrics.roas >= 1.5 && entity.metrics.roas < 2.5 && entity.metrics.conversions >= 3) {
          suggestions.push({
            user_id: this.userId,
            entity_type: 'campaign',
            entity_id: entity.id,
            entity_name: entity.name,
            platform: entity.platform,
            platform_entity_id: entity.platformId || entity.id,
            suggestion_type: 'optimize_campaign',
            priority_score: 75,
            confidence_score: 70,
            title: 'Campaign Optimization Opportunity',
            message: `This campaign has ${entity.metrics.roas.toFixed(2)}x ROAS - solid but room to improve. Consider reviewing ad set performance to find hidden winners, or test new creative variations. Small optimizations could push ROAS above 2.5x.`,
            reasoning: {
              triggeredBy: ['moderate_performance', 'optimization_potential'],
              metrics: {
                roas: entity.metrics.roas,
                conversions: entity.metrics.conversions,
                spend: entity.metrics.spend,
                cpa: entity.metrics.cpa
              },
              analysis: `Campaign is profitable but not in the top tier. Optimization could improve returns significantly.`,
              riskLevel: 'low'
            },
            recommended_rule: RexRuleGenerator.generateRule({
              suggestionType: 'optimize_campaign',
              entityType: 'campaign',
              entityName: entity.name,
              currentMetrics: entity.metrics,
              platform: entity.platform
            })
          });
        }

        // Underperforming but spending - needs attention
        else if (entity.metrics.roas < 1.5 && entity.metrics.spend > 200) {
          suggestions.push({
            user_id: this.userId,
            entity_type: 'campaign',
            entity_id: entity.id,
            entity_name: entity.name,
            platform: entity.platform,
            platform_entity_id: entity.platformId || entity.id,
            suggestion_type: 'review_underperformer',
            priority_score: 88,
            confidence_score: 80,
            title: 'Campaign Needs Attention',
            message: `This campaign has spent $${entity.metrics.spend.toFixed(2)} but ROAS is only ${entity.metrics.roas.toFixed(2)}x. Consider pausing underperforming ad sets, refreshing creative, or consolidating budget into better performers. Every dollar saved here could be reallocated to your top campaigns.`,
            reasoning: {
              triggeredBy: ['low_roas', 'high_spend', 'inefficient_allocation'],
              metrics: {
                roas: entity.metrics.roas,
                spend: entity.metrics.spend,
                potential_savings: entity.metrics.spend * (1 - entity.metrics.roas)
              },
              analysis: `Campaign is underperforming relative to spend. Review and optimize or reallocate budget.`,
              riskLevel: 'medium'
            },
            recommended_rule: RexRuleGenerator.generateRule({
              suggestionType: 'review_underperformer',
              entityType: 'campaign',
              entityName: entity.name,
              currentMetrics: entity.metrics,
              platform: entity.platform
            })
          });
        }
      }

      // Ad specific suggestions
      console.log('[AdvancedRex] Ad check:', {
        entityType,
        name: entity.name,
        spend: entity.metrics.spend,
        roas: entity.metrics.roas,
        conversions: entity.metrics.conversions,
        isValidAd: entityType === 'ad' && entity.metrics.spend > 10
      });

      if (entityType === 'ad' && entity.metrics.spend > 10) {
        // High performing ad - scale opportunity
        if (entity.metrics.roas > 2.5 && entity.metrics.conversions >= 2) {
          suggestions.push({
            user_id: this.userId,
            entity_type: 'ad',
            entity_id: entity.id,
            entity_name: entity.name,
            platform: entity.platform,
            platform_entity_id: entity.platformId || entity.id,
            suggestion_type: 'scale_high_performer',
            priority_score: 85,
            confidence_score: 80,
            title: 'Top Performing Ad - Consider Scaling',
            message: `This ad is performing great with ${entity.metrics.roas.toFixed(2)}x ROAS! Consider duplicating it to new ad sets or increasing budget on the parent ad set to capture more conversions.`,
            reasoning: {
              triggeredBy: ['exceptional_ad_performance', 'scaling_opportunity'],
              metrics: {
                roas: entity.metrics.roas,
                conversions: entity.metrics.conversions,
                spend: entity.metrics.spend,
                revenue: entity.metrics.revenue
              },
              analysis: `Ad is in the top performance tier. Strong candidate for scaling or duplication.`,
              riskLevel: 'low'
            },
            recommended_rule: RexRuleGenerator.generateRule({
              suggestionType: 'scale_high_performer',
              entityType: 'ad',
              entityName: entity.name,
              currentMetrics: entity.metrics,
              platform: entity.platform
            })
          });
        }

        // Underperforming ad - needs attention
        else if (entity.metrics.roas < 1.0 && entity.metrics.spend > 30) {
          suggestions.push({
            user_id: this.userId,
            entity_type: 'ad',
            entity_id: entity.id,
            entity_name: entity.name,
            platform: entity.platform,
            platform_entity_id: entity.platformId || entity.id,
            suggestion_type: 'pause_underperforming',
            priority_score: 78,
            confidence_score: 72,
            title: 'Underperforming Ad - Consider Pausing',
            message: `This ad has spent $${entity.metrics.spend.toFixed(0)} with only ${entity.metrics.roas.toFixed(2)}x ROAS. Consider pausing and reallocating budget to better performers, or refresh the creative.`,
            reasoning: {
              triggeredBy: ['underperforming_ad', 'low_roas', 'budget_waste'],
              metrics: {
                roas: entity.metrics.roas,
                spend: entity.metrics.spend,
                conversions: entity.metrics.conversions
              },
              analysis: `Ad is underperforming with ROAS below 1.0. Creative may be fatigued or targeting mismatched.`,
              riskLevel: 'medium'
            },
            recommended_rule: RexRuleGenerator.generateRule({
              suggestionType: 'pause_underperforming',
              entityType: 'ad',
              entityName: entity.name,
              currentMetrics: entity.metrics,
              platform: entity.platform
            })
          });
        }

        // High CTR but low conversion - landing page or targeting issue
        else if (entity.metrics.ctr > 2 && entity.metrics.conversions === 0 && entity.metrics.clicks > 20) {
          suggestions.push({
            user_id: this.userId,
            entity_type: 'ad',
            entity_id: entity.id,
            entity_name: entity.name,
            platform: entity.platform,
            platform_entity_id: entity.platformId || entity.id,
            suggestion_type: 'refresh_creative',
            priority_score: 75,
            confidence_score: 70,
            title: 'High CTR but No Conversions - Check Landing Page',
            message: `This ad has ${entity.metrics.ctr.toFixed(2)}% CTR (great engagement!) but zero conversions. The ad is working - check if the landing page matches the ad message or if targeting needs refinement.`,
            reasoning: {
              triggeredBy: ['high_ctr_no_conversions', 'landing_page_mismatch', 'targeting_issue'],
              metrics: {
                ctr: entity.metrics.ctr,
                clicks: entity.metrics.clicks,
                conversions: entity.metrics.conversions
              },
              analysis: `High engagement but no conversions suggests landing page friction or audience mismatch.`,
              riskLevel: 'medium'
            },
            recommended_rule: RexRuleGenerator.generateRule({
              suggestionType: 'refresh_creative',
              entityType: 'ad',
              entityName: entity.name,
              currentMetrics: entity.metrics,
              platform: entity.platform
            })
          });
        }
      }

      // Ad Set specific suggestions
      console.log('[AdvancedRex] Ad Set check:', {
        entityType,
        name: entity.name,
        spend: entity.metrics.spend,
        roas: entity.metrics.roas,
        conversions: entity.metrics.conversions,
        isValidAdSet: entityType === 'ad_set' && entity.metrics.spend > 20
      });

      if (entityType === 'ad_set' && entity.metrics.spend > 20) {
        // High performing ad set - scale opportunity
        if (entity.metrics.roas > 2.5 && entity.metrics.conversions >= 3) {
          const scalePotential = Math.min(entity.metrics.roas * 8, 25);
          suggestions.push({
            user_id: this.userId,
            entity_type: 'ad_set',
            entity_id: entity.id,
            entity_name: entity.name,
            platform: entity.platform,
            platform_entity_id: entity.platformId || entity.id,
            suggestion_type: 'scale_high_performer',
            priority_score: 88,
            confidence_score: 82,
            title: 'Top Performing Ad Set - Scale Opportunity',
            message: `This ad set is performing exceptionally with ${entity.metrics.roas.toFixed(2)}x ROAS and ${entity.metrics.conversions} conversions. Consider increasing budget by ${scalePotential.toFixed(0)}% to capture more of this high-quality traffic.`,
            reasoning: {
              triggeredBy: ['exceptional_adset_performance', 'scaling_opportunity'],
              metrics: {
                roas: entity.metrics.roas,
                conversions: entity.metrics.conversions,
                spend: entity.metrics.spend,
                revenue: entity.metrics.revenue,
                scale_potential: scalePotential
              },
              analysis: `Ad set is in the top performance tier with ${entity.metrics.roas.toFixed(2)}x ROAS. Strong candidate for budget scaling.`,
              riskLevel: 'low'
            },
            recommended_rule: RexRuleGenerator.generateRule({
              suggestionType: 'scale_high_performer',
              entityType: 'ad_set',
              entityName: entity.name,
              currentMetrics: entity.metrics,
              platform: entity.platform
            }),
            estimated_impact: {
              expectedRevenue: entity.metrics.revenue * (scalePotential / 100),
              expectedProfit: entity.metrics.profit * (scalePotential / 100) * 0.85,
              timeframe: '5-10 days'
            }
          });
        }

        // Good performing ad set with optimization potential
        else if (entity.metrics.roas >= 1.5 && entity.metrics.roas < 2.5 && entity.metrics.conversions >= 2) {
          suggestions.push({
            user_id: this.userId,
            entity_type: 'ad_set',
            entity_id: entity.id,
            entity_name: entity.name,
            platform: entity.platform,
            platform_entity_id: entity.platformId || entity.id,
            suggestion_type: 'optimize_campaign',
            priority_score: 72,
            confidence_score: 68,
            title: 'Ad Set Optimization Opportunity',
            message: `This ad set has ${entity.metrics.roas.toFixed(2)}x ROAS - decent but can be improved. Review targeting settings, consider audience refinement, or test different placements to push performance higher.`,
            reasoning: {
              triggeredBy: ['moderate_adset_performance', 'targeting_optimization_potential'],
              metrics: {
                roas: entity.metrics.roas,
                conversions: entity.metrics.conversions,
                spend: entity.metrics.spend
              },
              analysis: `Ad set shows promise but has room for optimization. ROAS of ${entity.metrics.roas.toFixed(2)}x could be improved with targeting adjustments.`,
              riskLevel: 'low'
            },
            recommended_rule: RexRuleGenerator.generateRule({
              suggestionType: 'optimize_campaign',
              entityType: 'ad_set',
              entityName: entity.name,
              currentMetrics: entity.metrics,
              platform: entity.platform
            })
          });
        }

        // Underperforming ad set - needs review
        else if (entity.metrics.roas < 1.0 && entity.metrics.spend > 50) {
          suggestions.push({
            user_id: this.userId,
            entity_type: 'ad_set',
            entity_id: entity.id,
            entity_name: entity.name,
            platform: entity.platform,
            platform_entity_id: entity.platformId || entity.id,
            suggestion_type: 'review_underperformer',
            priority_score: 80,
            confidence_score: 75,
            title: 'Underperforming Ad Set - Review Required',
            message: `This ad set has spent $${entity.metrics.spend.toFixed(0)} but ROAS is only ${entity.metrics.roas.toFixed(2)}x. Consider pausing, adjusting targeting, or refreshing creative. The targeting or audience may need refinement.`,
            reasoning: {
              triggeredBy: ['underperforming_adset', 'negative_roi_risk', 'targeting_issue'],
              metrics: {
                roas: entity.metrics.roas,
                spend: entity.metrics.spend,
                conversions: entity.metrics.conversions,
                loss_estimate: entity.metrics.spend - entity.metrics.revenue
              },
              analysis: `Ad set is underperforming with ROAS below 1.0. Targeting or audience selection may need adjustment.`,
              riskLevel: 'medium'
            },
            recommended_rule: RexRuleGenerator.generateRule({
              suggestionType: 'review_underperformer',
              entityType: 'ad_set',
              entityName: entity.name,
              currentMetrics: entity.metrics,
              platform: entity.platform
            })
          });
        }

        // Negative ROI ad set - urgent attention
        else if (entity.metrics.profit < 0 && entity.metrics.spend > 100) {
          suggestions.push({
            user_id: this.userId,
            entity_type: 'ad_set',
            entity_id: entity.id,
            entity_name: entity.name,
            platform: entity.platform,
            platform_entity_id: entity.platformId || entity.id,
            suggestion_type: 'pause_negative_roi',
            priority_score: 90,
            confidence_score: 88,
            title: 'Negative ROI Ad Set - Consider Pausing',
            message: `This ad set is losing money with $${Math.abs(entity.metrics.profit).toFixed(0)} in losses. Consider pausing immediately or drastically reducing budget while you diagnose the issue.`,
            reasoning: {
              triggeredBy: ['negative_profit', 'urgent_action_required'],
              metrics: {
                roas: entity.metrics.roas,
                profit: entity.metrics.profit,
                spend: entity.metrics.spend
              },
              analysis: `Ad set has negative ROI. Immediate attention required to stop losses.`,
              riskLevel: 'high'
            },
            recommended_rule: RexRuleGenerator.generateRule({
              suggestionType: 'pause_negative_roi',
              entityType: 'ad_set',
              entityName: entity.name,
              currentMetrics: entity.metrics,
              platform: entity.platform
            })
          });
        }
      }

      console.log('[AdvancedRex] Campaign structure suggestions generated:', suggestions.length, suggestions.map(s => s.suggestion_type));
      return suggestions;
    } catch (error) {
      console.error('[AdvancedRexIntelligence] Campaign structure analysis error:', error);
      return [];
    }
  }

  /**
   * Profit Intelligence Analysis
   * Analyzes true profit ROAS (with COGS), product margins, customer LTV
   */
  private async analyzeProfitIntelligence(
    entity: EntityData,
    startDate: string,
    endDate: string
  ): Promise<CreateRexSuggestionParams[]> {
    const suggestions: CreateRexSuggestionParams[] = [];

    try {
      // Get profit report for this ad
      const profitReport = await this.profitIntel.generateReport(
        startDate,
        endDate
      );

      const adProfitMetrics = profitReport.adProfitMetrics.find(pm => pm.adId === entity.id);

      if (adProfitMetrics) {
        // Check for high revenue but low margin opportunity
        if (adProfitMetrics.revenueRoas > 2.5 && adProfitMetrics.profitRoas < 1.5) {
          const marginDifference = profitReport.overallMetrics.averageMarginPercent - adProfitMetrics.averageMarginPercent;

          suggestions.push({
            user_id: this.userId,
            entity_type: 'ad',
            entity_id: entity.id,
            entity_name: entity.name,
            platform: entity.platform,
            platform_entity_id: entity.platformId || entity.id,
            suggestion_type: 'optimize_product_mix',
            priority_score: 78,
            confidence_score: 88,
            title: 'High Revenue but Low Margin Detected',
            message: `This ad has strong revenue ROAS of ${adProfitMetrics.revenueRoas.toFixed(2)}x but profit ROAS is only ${adProfitMetrics.profitRoas.toFixed(2)}x due to ${adProfitMetrics.averageMarginPercent.toFixed(1)}% margin (vs account average of ${profitReport.overallMetrics.averageMarginPercent.toFixed(1)}%). Consider promoting higher-margin products to improve profitability.`,
            reasoning: {
              triggeredBy: ['low_profit_margin', 'high_cogs', 'product_mix_optimization'],
              metrics: {
                revenue_roas: adProfitMetrics.revenueRoas,
                profit_roas: adProfitMetrics.profitRoas,
                margin_percent: adProfitMetrics.averageMarginPercent,
                account_avg_margin: profitReport.overallMetrics.averageMarginPercent,
                margin_gap: marginDifference,
                total_cogs: adProfitMetrics.totalCogs
              },
              analysis: `By switching to products with ${profitReport.overallMetrics.averageMarginPercent.toFixed(1)}% margin, you could improve profit ROAS by ${((profitReport.overallMetrics.averageMarginPercent / adProfitMetrics.averageMarginPercent - 1) * 100).toFixed(1)}%.`,
              riskLevel: 'low'
            },
            recommended_rule: RexRuleGenerator.generateRule({
              suggestionType: 'optimize_product_mix',
              entityType: 'ad',
              entityName: entity.name,
              currentMetrics: entity.metrics,
              platform: entity.platform
            })
          });
        }

        // Check for margin opportunities
        const marginOpportunity = profitReport.marginOpportunities.find(mo => mo.adId === entity.id);
        if (marginOpportunity && marginOpportunity.potentialProfitIncrease > 100) {
          suggestions.push({
            user_id: this.userId,
            entity_type: 'ad',
            entity_id: entity.id,
            entity_name: entity.name,
            platform: entity.platform,
            platform_entity_id: entity.platformId || entity.id,
            suggestion_type: 'product_margin_optimization',
            priority_score: 82,
            confidence_score: 90,
            title: marginOpportunity.type === 'high_revenue_low_margin' ? 'Margin Optimization Opportunity' : 'Revenue Scaling Opportunity',
            message: marginOpportunity.opportunity,
            reasoning: {
              triggeredBy: ['margin_analysis', 'product_performance_comparison'],
              metrics: {
                current_profit: adProfitMetrics.totalProfit,
                potential_profit_increase: marginOpportunity.potentialProfitIncrease,
                revenue_roas: adProfitMetrics.revenueRoas,
                profit_roas: adProfitMetrics.profitRoas
              },
              analysis: marginOpportunity.action,
              riskLevel: 'low'
            },
            recommended_rule: RexRuleGenerator.generateRule({
              suggestionType: 'product_margin_optimization',
              entityType: 'ad',
              entityName: entity.name,
              currentMetrics: entity.metrics,
              platform: entity.platform
            }),
            estimated_impact: {
              expectedProfit: marginOpportunity.potentialProfitIncrease,
              timeframe: '30 days'
            }
          });
        }
      }

      return suggestions;
    } catch (error) {
      console.error('[AdvancedRexIntelligence] Profit intelligence error:', error);
      return [];
    }
  }

  /**
   * Full Funnel Analysis
   * Identifies where customers drop off in the journey: Impression → Purchase
   */
  private async analyzeFunnel(
    entityId: string,
    startDate: string,
    endDate: string
  ): Promise<CreateRexSuggestionParams[]> {
    const suggestions: CreateRexSuggestionParams[] = [];

    try {
      const funnelAnalysis = await this.funnelAnalysis.analyzeAdFunnel(entityId, startDate, endDate).catch(err => {
        // Funnel analysis requires specific data that may not be available for all entities
        console.log(`[AdvancedRexIntelligence] Funnel analysis skipped for ${entityId}: ${err.message}`);
        return null;
      });

      if (!funnelAnalysis) {
        return suggestions;
      }

      if (funnelAnalysis && funnelAnalysis.biggestDropOff.dropOffRate > 50) {
        const dropOffStage = funnelAnalysis.biggestDropOff.stage;
        let recommendation = '';
        let suggestionType = 'adjust_targeting';
        let triggeredBy: string[] = ['funnel_analysis', 'high_drop_off'];

        if (dropOffStage.includes('click')) {
          recommendation = `High drop-off between impression and click (${funnelAnalysis.biggestDropOff.dropOffRate.toFixed(1)}%). This suggests ad creative isn't compelling enough or targeting is off. Consider testing new creative angles or refining audience.`;
          suggestionType = 'refresh_creative';
          triggeredBy.push('low_ctr');
        } else if (dropOffStage.includes('page_view')) {
          recommendation = `${funnelAnalysis.biggestDropOff.dropOffRate.toFixed(1)}% of clicks don't result in page views. This typically means landing page load issues, broken links, or ad-to-page mismatch. Check landing page speed and relevance.`;
          suggestionType = 'adjust_targeting';
          triggeredBy.push('landing_page_issue');
        } else if (dropOffStage.includes('add_to_cart')) {
          recommendation = `${funnelAnalysis.biggestDropOff.dropOffRate.toFixed(1)}% of page views don't add to cart. This suggests product page friction, unclear value prop, or price concerns. Consider product page optimization or promotional offers.`;
          suggestionType = 'adjust_targeting';
          triggeredBy.push('low_atc_rate');
        } else if (dropOffStage.includes('checkout')) {
          recommendation = `${funnelAnalysis.biggestDropOff.dropOffRate.toFixed(1)}% cart abandonment. Checkout friction is your biggest issue. Consider simplifying checkout process, adding trust badges, or cart abandonment emails.`;
          suggestionType = 'adjust_targeting';
          triggeredBy.push('high_cart_abandonment');
        }

        suggestions.push({
          user_id: this.userId,
          entity_type: 'ad',
          entity_id: entityId,
          entity_name: funnelAnalysis.adName,
          platform: funnelAnalysis.platform,
          platform_entity_id: entityId,
          suggestion_type: suggestionType,
          priority_score: 76,
          confidence_score: 85,
          title: `Funnel Drop-Off at ${dropOffStage}`,
          message: recommendation,
          reasoning: {
            triggeredBy,
            metrics: {
              drop_off_stage: dropOffStage,
              drop_off_rate: funnelAnalysis.biggestDropOff.dropOffRate,
              lost_opportunities: funnelAnalysis.biggestDropOff.lostOpportunities,
              overall_conversion_rate: funnelAnalysis.overallConversionRate
            },
            analysis: `Analyzing ${funnelAnalysis.funnelStages.length} funnel stages revealed ${dropOffStage} as the biggest leak. Fixing this could recover ${funnelAnalysis.biggestDropOff.lostOpportunities} lost opportunities.`,
            riskLevel: 'medium'
          },
          recommended_rule: RexRuleGenerator.generateRule({
            suggestionType: suggestionType,
            entityType: 'ad',
            entityName: funnelAnalysis.adName,
            currentMetrics: {
              spend: 0,
              revenue: 0,
              profit: 0,
              roas: 0,
              conversions: 0,
              cpa: 0,
              impressions: 0,
              clicks: 0,
              ctr: 0
            },
            platform: funnelAnalysis.platform
          })
        });
      }

      return suggestions;
    } catch (error) {
      console.error('[AdvancedRexIntelligence] Funnel analysis error:', error);
      return [];
    }
  }

  /**
   * Create suggestions from Deep Pattern Analysis
   * Multi-dimensional pattern recognition across demographics, placements, geo, temporal
   */
  private createSuggestionsFromDeepAnalysis(
    entity: EntityData,
    deepAnalysis: any,
    comprehensiveAnalysis: any
  ): CreateRexSuggestionParams[] {
    const suggestions: CreateRexSuggestionParams[] = [];

    // Use the insight generator to detect opportunities
    const demoInsight = this.insightGenerator.detectDemographicOpportunity(comprehensiveAnalysis);
    if (demoInsight) {
      suggestions.push(this.convertInsightToSuggestion(entity, demoInsight, 'demographic_optimization'));
    }

    const placementInsight = this.insightGenerator.detectPlacementOpportunity(comprehensiveAnalysis);
    if (placementInsight) {
      suggestions.push(this.convertInsightToSuggestion(entity, placementInsight, 'placement_optimization'));
    }

    const geoInsight = this.insightGenerator.detectGeographicOpportunity(comprehensiveAnalysis);
    if (geoInsight) {
      suggestions.push(this.convertInsightToSuggestion(entity, geoInsight, 'geographic_optimization'));
    }

    const temporalInsight = this.insightGenerator.detectTemporalOpportunity(comprehensiveAnalysis);
    if (temporalInsight) {
      suggestions.push(this.convertInsightToSuggestion(entity, temporalInsight, 'temporal_optimization'));
    }

    return suggestions;
  }

  /**
   * Convert a generated insight to a Rex suggestion
   */
  private convertInsightToSuggestion(
    entity: EntityData,
    insight: any,
    suggestionType: string
  ): CreateRexSuggestionParams {
    // Enrich with platform knowledge
    const enrichedSuggestion = this.enrichWithPlatformKnowledge({
      user_id: this.userId,
      entity_type: 'ad',
      entity_id: entity.id,
      entity_name: entity.name,
      platform: entity.platform,
      platform_entity_id: entity.platformId || entity.id,
      suggestion_type: suggestionType,
      priority_score: insight.priority || 70,
      confidence_score: insight.confidence || 75,
      title: insight.title,
      message: insight.primaryInsight,
      reasoning: insight.reasoning,
      estimated_impact: insight.estimatedImpact,
      recommended_rule: RexRuleGenerator.generateRule({
        suggestionType: suggestionType,
        entityType: 'ad',
        entityName: entity.name,
        currentMetrics: entity.metrics,
        platform: entity.platform
      })
    }, entity);

    return enrichedSuggestion;
  }

  /**
   * Add platform context to YOUR suggestions (not override them)
   * Platform knowledge helps YOU understand the data, doesn't dictate decisions
   */
  private enrichWithPlatformKnowledge(
    suggestion: CreateRexSuggestionParams,
    entity: EntityData
  ): CreateRexSuggestionParams {
    try {
      // Use platform knowledge to INTERPRET the data for YOUR business logic
      // This doesn't change your suggestion - just adds context about what platform data means

      const interpretation = platformDataInterpreter.interpretCampaignContext({
        platform: suggestion.platform as 'facebook' | 'tiktok' | 'google',
        conversions: entity.metrics.conversions,
        daysSinceLaunchOrEdit: 7, // Would come from actual data
        dailyBudget: entity.metrics.spend,
        roas: entity.metrics.roas,
        frequency: 2.5 // Would come from actual data
      });

      // Add interpreted context to reasoning (doesn't override your logic)
      if (suggestion.reasoning) {
        suggestion.reasoning = {
          ...suggestion.reasoning,
          platformContext: {
            learningPhaseStatus: interpretation.learningPhase.interpretation,
            budgetConstraints: interpretation.budgetScaling.interpretation,
            performanceContext: interpretation.roas.interpretation
          }
        };
      }

      return suggestion;
    } catch (error) {
      // If interpretation fails, return YOUR original suggestion unchanged
      console.error('[AdvancedRexIntelligence] Error adding platform context:', error);
      return suggestion;
    }
  }

  /**
   * Validate suggestion against platform constraints
   * Returns null if suggestion violates platform rules
   */
  private validateAgainstPlatformRules(
    suggestion: CreateRexSuggestionParams,
    entity: EntityData
  ): CreateRexSuggestionParams | null {
    // Check if suggestion type is even possible on this platform
    if (suggestion.suggestion_type === 'change_optimization_goal') {
      // This is NEVER possible on any platform after launch
      console.warn('[AdvancedRexIntelligence] Filtered out impossible suggestion: change optimization goal');
      return null;
    }

    if (suggestion.suggestion_type === 'change_campaign_objective') {
      // This is NEVER possible on any platform after launch
      console.warn('[AdvancedRexIntelligence] Filtered out impossible suggestion: change campaign objective');
      return null;
    }

    return suggestion;
  }
}
