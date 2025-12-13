import { supabase } from './supabase';
import type { CreateRexSuggestionParams } from '@/types/rex';

export type PixelHealthGrade = 'strong' | 'moderate' | 'weak' | 'critical' | 'unknown';

export interface PixelHealthScore {
  userId: string;
  attributionRate: number;
  pixelEventVolume: number;
  expectedEventVolume: number;
  sessionTrackingAccuracy: number;
  healthScore: number;
  healthGrade: PixelHealthGrade;
  calculatedForStart: string;
  calculatedForEnd: string;
  issuesDetected: string[];
  recommendations: string[];
}

export interface PixelStrengthImpact {
  affectsDataReliability: boolean;
  confidenceModifier: number;
  warnings: string[];
  recommendations: CreateRexSuggestionParams[];
}

export class PixelStrengthService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async calculatePixelHealth(startDate: string, endDate: string): Promise<PixelHealthScore> {
    try {
      const [attributionData, pixelData, orderData] = await Promise.all([
        this.getAttributionData(startDate, endDate),
        this.getPixelEventData(startDate, endDate),
        this.getOrderData(startDate, endDate),
      ]);

      const attributionRate = orderData.totalOrders > 0
        ? (attributionData.attributedOrders / orderData.totalOrders) * 100
        : 0;

      const expectedEvents = orderData.totalOrders * 5;
      const sessionAccuracy = pixelData.uniqueSessions > 0
        ? (attributionData.matchedSessions / pixelData.uniqueSessions) * 100
        : 0;

      let healthScore = 0;
      healthScore += Math.min(40, attributionRate * 0.4);
      healthScore += Math.min(30, (pixelData.totalEvents / Math.max(expectedEvents, 1)) * 30);
      healthScore += Math.min(30, sessionAccuracy * 0.3);

      const healthGrade = this.calculateGrade(healthScore);
      const { issues, recommendations } = this.analyzeIssues(
        attributionRate,
        pixelData.totalEvents,
        expectedEvents,
        sessionAccuracy,
        orderData.totalOrders
      );

      const result: PixelHealthScore = {
        userId: this.userId,
        attributionRate,
        pixelEventVolume: pixelData.totalEvents,
        expectedEventVolume: expectedEvents,
        sessionTrackingAccuracy: sessionAccuracy,
        healthScore,
        healthGrade,
        calculatedForStart: startDate,
        calculatedForEnd: endDate,
        issuesDetected: issues,
        recommendations,
      };

      await this.storeHealthScore(result);

      return result;
    } catch (error) {
      console.error('[PixelStrengthService] Error calculating health:', error);
      return {
        userId: this.userId,
        attributionRate: 0,
        pixelEventVolume: 0,
        expectedEventVolume: 0,
        sessionTrackingAccuracy: 0,
        healthScore: 0,
        healthGrade: 'unknown',
        calculatedForStart: startDate,
        calculatedForEnd: endDate,
        issuesDetected: ['Unable to calculate pixel health'],
        recommendations: ['Check pixel installation and database connectivity'],
      };
    }
  }

  async getPixelStrengthImpact(startDate: string, endDate: string): Promise<PixelStrengthImpact> {
    const health = await this.calculatePixelHealth(startDate, endDate);
    const warnings: string[] = [];
    const recommendations: CreateRexSuggestionParams[] = [];

    let confidenceModifier = 1.0;

    if (health.healthGrade === 'critical') {
      confidenceModifier = 0.5;
      warnings.push('Pixel data is critically low - ROAS and conversion data may be significantly underreported');
    } else if (health.healthGrade === 'weak') {
      confidenceModifier = 0.7;
      warnings.push('Pixel tracking is weak - reported metrics may not reflect true performance');
    } else if (health.healthGrade === 'moderate') {
      confidenceModifier = 0.85;
      warnings.push('Pixel tracking is moderate - some conversions may be missed');
    }

    if (health.attributionRate < 40) {
      recommendations.push({
        user_id: this.userId,
        entity_type: 'account',
        entity_id: 'pixel',
        entity_name: 'Revoa Pixel',
        platform: 'facebook',
        suggestion_type: 'pixel_strength_warning',
        priority_score: 90,
        confidence_score: 95,
        title: 'Critical: Low Attribution Rate',
        message: `Only ${health.attributionRate.toFixed(1)}% of your orders are being attributed to ads. This means your actual ROAS could be ${(100 / Math.max(health.attributionRate, 1) * 100).toFixed(0)}% higher than reported. Strengthen your pixel tracking to get accurate data.`,
        reasoning: {
          triggeredBy: ['low_attribution_rate', 'pixel_tracking_gap'],
          metrics: {
            attribution_rate: health.attributionRate,
            pixel_events: health.pixelEventVolume,
            orders_tracked: health.expectedEventVolume / 5,
          },
          analysis: 'Low attribution means Meta cannot learn from your conversions effectively, leading to worse targeting and higher CPAs over time.',
          riskLevel: 'critical',
        },
      });
    }

    if (health.pixelEventVolume < health.expectedEventVolume * 0.5) {
      recommendations.push({
        user_id: this.userId,
        entity_type: 'account',
        entity_id: 'pixel',
        entity_name: 'Revoa Pixel',
        platform: 'facebook',
        suggestion_type: 'pixel_strength_warning',
        priority_score: 85,
        confidence_score: 90,
        title: 'Low Pixel Event Volume',
        message: `Your pixel is only capturing ${health.pixelEventVolume} events vs expected ${health.expectedEventVolume}. This indicates the pixel may not be installed correctly or is being blocked.`,
        reasoning: {
          triggeredBy: ['low_event_volume', 'pixel_installation_issue'],
          metrics: {
            actual_events: health.pixelEventVolume,
            expected_events: health.expectedEventVolume,
            capture_rate: (health.pixelEventVolume / Math.max(health.expectedEventVolume, 1)) * 100,
          },
          analysis: 'Low event volume means visitor behavior is not being tracked. Check pixel installation and ensure it fires on all pages.',
          riskLevel: 'high',
        },
      });
    }

    return {
      affectsDataReliability: health.healthGrade !== 'strong',
      confidenceModifier,
      warnings,
      recommendations,
    };
  }

  async shouldTrustMetaReportedROAS(campaignRoas: number, startDate: string, endDate: string): Promise<{
    trustworthy: boolean;
    adjustedRoas: number;
    reasoning: string;
  }> {
    const health = await this.calculatePixelHealth(startDate, endDate);

    if (health.healthGrade === 'strong') {
      return {
        trustworthy: true,
        adjustedRoas: campaignRoas,
        reasoning: 'Pixel health is strong - Meta-reported ROAS is reliable',
      };
    }

    const adjustmentFactor = health.attributionRate / 100;
    const potentialTrueRoas = campaignRoas / Math.max(adjustmentFactor, 0.1);

    if (health.healthGrade === 'critical' || health.healthGrade === 'weak') {
      return {
        trustworthy: false,
        adjustedRoas: potentialTrueRoas,
        reasoning: `Pixel health is ${health.healthGrade} (${health.attributionRate.toFixed(1)}% attribution). Reported ${campaignRoas.toFixed(2)}x ROAS could actually be as high as ${potentialTrueRoas.toFixed(2)}x. Strengthen pixel before making budget decisions.`,
      };
    }

    return {
      trustworthy: true,
      adjustedRoas: campaignRoas * 1.15,
      reasoning: `Pixel health is moderate - actual ROAS is likely 10-20% higher than ${campaignRoas.toFixed(2)}x reported`,
    };
  }

  private async getAttributionData(startDate: string, endDate: string) {
    const { data: conversions } = await supabase
      .from('ad_conversions')
      .select('id, session_id')
      .eq('user_id', this.userId)
      .gte('converted_at', startDate)
      .lte('converted_at', endDate);

    const attributedOrders = conversions?.length || 0;
    const matchedSessions = new Set(conversions?.map(c => c.session_id).filter(Boolean) || []).size;

    return { attributedOrders, matchedSessions };
  }

  private async getPixelEventData(startDate: string, endDate: string) {
    const { data: events } = await supabase
      .from('pixel_events')
      .select('id, session_id')
      .eq('user_id', this.userId)
      .gte('event_time', startDate)
      .lte('event_time', endDate);

    const totalEvents = events?.length || 0;
    const uniqueSessions = new Set(events?.map(e => e.session_id) || []).size;

    return { totalEvents, uniqueSessions };
  }

  private async getOrderData(startDate: string, endDate: string) {
    const { data: orders } = await supabase
      .from('shopify_orders')
      .select('id')
      .eq('user_id', this.userId)
      .gte('ordered_at', startDate)
      .lte('ordered_at', endDate);

    return { totalOrders: orders?.length || 0 };
  }

  private calculateGrade(score: number): PixelHealthGrade {
    if (score >= 70) return 'strong';
    if (score >= 50) return 'moderate';
    if (score >= 25) return 'weak';
    if (score > 0) return 'critical';
    return 'unknown';
  }

  private analyzeIssues(
    attributionRate: number,
    eventVolume: number,
    expectedEvents: number,
    sessionAccuracy: number,
    totalOrders: number
  ): { issues: string[]; recommendations: string[] } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (attributionRate < 40) {
      issues.push(`Low attribution rate: ${attributionRate.toFixed(1)}%`);
      recommendations.push('Ensure UTM parameters are properly set on all ad URLs');
      recommendations.push('Verify pixel is firing on checkout confirmation page');
    } else if (attributionRate < 70) {
      issues.push(`Moderate attribution rate: ${attributionRate.toFixed(1)}%`);
      recommendations.push('Check for ad blocker interference');
    }

    if (eventVolume < expectedEvents * 0.5) {
      issues.push(`Low event capture: ${eventVolume} of ${expectedEvents} expected`);
      recommendations.push('Verify pixel code is installed on all pages');
      recommendations.push('Check browser console for pixel errors');
    }

    if (sessionAccuracy < 50 && totalOrders > 10) {
      issues.push(`Low session tracking accuracy: ${sessionAccuracy.toFixed(1)}%`);
      recommendations.push('Check cookie consent implementation');
    }

    if (totalOrders > 0 && eventVolume === 0) {
      issues.push('No pixel events detected despite having orders');
      recommendations.push('Pixel may not be installed - visit Settings > Pixel to install');
    }

    return { issues, recommendations };
  }

  private async storeHealthScore(health: PixelHealthScore): Promise<void> {
    try {
      await supabase.from('pixel_health_scores').upsert({
        user_id: health.userId,
        attribution_rate: health.attributionRate,
        pixel_event_volume: health.pixelEventVolume,
        expected_event_volume: health.expectedEventVolume,
        session_tracking_accuracy: health.sessionTrackingAccuracy,
        health_score: health.healthScore,
        health_grade: health.healthGrade,
        calculated_for_start: health.calculatedForStart,
        calculated_for_end: health.calculatedForEnd,
        issues_detected: health.issuesDetected,
        recommendations: health.recommendations,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,calculated_for_start,calculated_for_end',
      });
    } catch (error) {
      console.error('[PixelStrengthService] Error storing health score:', error);
    }
  }
}

export function createPixelStrengthService(userId: string) {
  return new PixelStrengthService(userId);
}
