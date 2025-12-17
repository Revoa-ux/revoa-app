import type { FlowWarrantyContext } from './warrantyService';
import type { FlowContextData } from './flowContextService';

export interface AutoRoutingDecision {
  shouldAutoRoute: boolean;
  targetNodeId?: string;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface ResolutionGuidance {
  resolution: 'free_replacement' | 'factory_review' | 'not_covered' | 'manual_review';
  reasoning: string;
  nextSteps: string[];
  templateSuggestions: string[];
  urgency: 'immediate' | 'within_24h' | 'within_48h' | 'low_priority';
}

export class FlowDecisionEngine {
  /**
   * Auto-route damage assessment based on warranty and damage type
   */
  decideDamageResolution(
    damageType: string,
    warranty: FlowWarrantyContext
  ): AutoRoutingDecision {
    // SHIPPING DAMAGE - Always covered
    if (damageType === 'shipping_damage') {
      return {
        shouldAutoRoute: true,
        targetNodeId: 'damage_shipping_resolution',
        reasoning: 'Shipping damage is always covered by carrier insurance or shipping protection policy.',
        confidence: 'high',
      };
    }

    // CUSTOMER CAUSED - Never covered
    if (damageType === 'customer_caused') {
      return {
        shouldAutoRoute: true,
        targetNodeId: 'damage_customer_caused',
        reasoning: 'Damage occurred after delivery. Customer is responsible.',
        confidence: 'high',
      };
    }

    // UNCLEAR - Always needs factory review
    if (damageType === 'unclear') {
      return {
        shouldAutoRoute: true,
        targetNodeId: 'damage_factory_review',
        reasoning: 'Damage type cannot be determined from photos. Factory expert assessment required.',
        confidence: 'high',
      };
    }

    // MANUFACTURING DEFECT - Depends on warranty
    if (damageType === 'manufacturing_defect') {
      if (!warranty.hasOrder) {
        return {
          shouldAutoRoute: false,
          reasoning: 'No order data available to check warranty status.',
          confidence: 'low',
        };
      }

      // Check if damage is covered in warranty terms
      if (!warranty.productCoverages?.damaged) {
        return {
          shouldAutoRoute: true,
          targetNodeId: 'damage_factory_review',
          reasoning: 'Product warranty does not explicitly cover damaged items. Factory review needed.',
          confidence: 'medium',
        };
      }

      // Active warranty = immediate approval
      if (warranty.orderWarrantyStatus === 'active') {
        return {
          shouldAutoRoute: true,
          targetNodeId: 'damage_warranty_active_resolution',
          reasoning: 'Manufacturing defect + active warranty = automatic approval for free replacement.',
          confidence: 'high',
        };
      }

      // Expired warranty = factory review (they often cover anyway)
      if (warranty.orderWarrantyStatus === 'expired') {
        return {
          shouldAutoRoute: true,
          targetNodeId: 'damage_warranty_expired_factory',
          reasoning: 'Warranty expired but factories often cover manufacturing defects. Forward for review.',
          confidence: 'high',
        };
      }

      // No warranty or mixed warranty = needs manual review
      return {
        shouldAutoRoute: true,
        targetNodeId: 'damage_factory_review',
        reasoning: 'Complex warranty situation. Factory review recommended.',
        confidence: 'medium',
      };
    }

    // Fallback - manual review
    return {
      shouldAutoRoute: false,
      reasoning: 'Unable to determine appropriate resolution path automatically.',
      confidence: 'low',
    };
  }

  /**
   * Get comprehensive resolution guidance for agents
   */
  getResolutionGuidance(
    damageType: string,
    warranty: FlowWarrantyContext
  ): ResolutionGuidance {
    // SHIPPING DAMAGE
    if (damageType === 'shipping_damage') {
      return {
        resolution: 'free_replacement',
        reasoning: 'Shipping damage is always covered. This is a straightforward approval.',
        nextSteps: [
          '1. Generate replacement order in system',
          '2. File carrier claim if applicable (>$100 value)',
          '3. Send replacement shipment notification to customer',
          '4. Close thread once shipped',
        ],
        templateSuggestions: ['damage_replacement_approved', 'replacement_shipment'],
        urgency: 'immediate',
      };
    }

    // MANUFACTURING DEFECT - ACTIVE WARRANTY
    if (damageType === 'manufacturing_defect' && warranty.orderWarrantyStatus === 'active') {
      return {
        resolution: 'free_replacement',
        reasoning: 'Manufacturing defect within warranty period. Automatic approval.',
        nextSteps: [
          '1. Generate replacement order',
          '2. Consider creating return WEN if factory needs defective item for QC',
          '3. Send replacement approval to customer',
          '4. Document defect pattern if recurring',
        ],
        templateSuggestions: ['damage_replacement_approved', 'replacement_with_return'],
        urgency: 'immediate',
      };
    }

    // MANUFACTURING DEFECT - EXPIRED WARRANTY
    if (damageType === 'manufacturing_defect' && warranty.orderWarrantyStatus === 'expired') {
      return {
        resolution: 'factory_review',
        reasoning: 'Warranty expired but factories typically cover manufacturing defects as goodwill.',
        nextSteps: [
          '1. Forward photos to factory contact',
          '2. Include order age and defect description',
          '3. Pause thread and await factory decision (24-48h)',
          '4. Resume with factory guidance',
        ],
        templateSuggestions: ['damage_factory_review', 'awaiting_decision'],
        urgency: 'within_48h',
      };
    }

    // CUSTOMER CAUSED
    if (damageType === 'customer_caused') {
      return {
        resolution: 'not_covered',
        reasoning: 'Damage occurred after delivery. Outside warranty and shipping protection scope.',
        nextSteps: [
          '1. Choose resolution: paid replacement, partial refund, or politely decline',
          '2. Use professional email template to explain',
          '3. Offer paid replacement at cost if customer interested',
          '4. Document in thread',
        ],
        templateSuggestions: ['damage_not_covered', 'goodwill_offer', 'paid_replacement'],
        urgency: 'within_24h',
      };
    }

    // UNCLEAR
    if (damageType === 'unclear') {
      return {
        resolution: 'factory_review',
        reasoning: 'Cannot determine damage cause from photos. Expert assessment required.',
        nextSteps: [
          '1. Forward photos to factory with request for assessment',
          '2. Ask factory: Is this manufacturing defect, shipping damage, or user damage?',
          '3. Pause thread pending factory response',
          '4. Apply factory decision once received',
        ],
        templateSuggestions: ['damage_assessment_request', 'awaiting_factory'],
        urgency: 'within_48h',
      };
    }

    // FALLBACK
    return {
      resolution: 'manual_review',
      reasoning: 'Complex situation requiring manual review.',
      nextSteps: [
        '1. Review all photos and order details',
        '2. Consult with team lead if needed',
        '3. Determine appropriate resolution',
        '4. Document decision reasoning',
      ],
      templateSuggestions: [],
      urgency: 'within_24h',
    };
  }

  /**
   * Determine if admin should wait for factory response
   */
  shouldPauseForFactory(resolution: ResolutionGuidance): boolean {
    return resolution.resolution === 'factory_review';
  }

  /**
   * Get urgency level display
   */
  getUrgencyDisplay(urgency: string): { emoji: string; label: string; color: string } {
    switch (urgency) {
      case 'immediate':
        return { emoji: '🔴', label: 'Immediate Action Required', color: 'red' };
      case 'within_24h':
        return { emoji: '🟡', label: 'Respond Within 24 Hours', color: 'yellow' };
      case 'within_48h':
        return { emoji: '🟢', label: 'Respond Within 48 Hours', color: 'green' };
      default:
        return { emoji: '⚪', label: 'Low Priority', color: 'gray' };
    }
  }

  /**
   * Get automated email suggestions based on context
   */
  getEmailSuggestions(context: FlowContextData, damageType: string): Array<{
    templateId: string;
    reason: string;
    timing: 'immediate' | 'after_factory' | 'optional';
  }> {
    const suggestions = [];

    if (damageType === 'shipping_damage') {
      suggestions.push({
        templateId: 'damage_replacement_approved',
        reason: 'Notify customer their replacement has been approved',
        timing: 'immediate' as const,
      });
      suggestions.push({
        templateId: 'replacement_shipment',
        reason: 'Send tracking once replacement ships',
        timing: 'after_factory' as const,
      });
    }

    if (damageType === 'manufacturing_defect' && context.warranty?.orderWarrantyStatus === 'active') {
      suggestions.push({
        templateId: 'damage_replacement_approved',
        reason: 'Warranty-covered replacement approval',
        timing: 'immediate' as const,
      });
    }

    if (damageType === 'manufacturing_defect' && context.warranty?.orderWarrantyStatus === 'expired') {
      suggestions.push({
        templateId: 'damage_under_review',
        reason: 'Let customer know we\'re reviewing with factory',
        timing: 'immediate' as const,
      });
      suggestions.push({
        templateId: 'factory_decision',
        reason: 'Share factory decision once received',
        timing: 'after_factory' as const,
      });
    }

    if (damageType === 'customer_caused') {
      suggestions.push({
        templateId: 'damage_not_covered',
        reason: 'Explain coverage policy professionally',
        timing: 'immediate' as const,
      });
      suggestions.push({
        templateId: 'goodwill_offer',
        reason: 'Optional goodwill gesture',
        timing: 'optional' as const,
      });
    }

    return suggestions;
  }
}

export const flowDecisionEngine = new FlowDecisionEngine();
