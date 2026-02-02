import { supabase } from './supabase';

export interface CloseOffMessage {
  message: string;
  isFullResolution: boolean;
  requiresFollowUp: boolean;
}

/**
 * Determines the appropriate close-off message after a template is copied
 * based on flow category, template type, and flow state
 */
export async function determineCloseOffMessage(
  sessionId: string,
  templateId: string
): Promise<CloseOffMessage> {
  try {
    // Get flow session data
    const { data: sessionData } = await supabase
      .from('thread_flow_sessions')
      .select('flow_id, flow_state')
      .eq('id', sessionId)
      .maybeSingle();

    if (!sessionData) {
      return getDefaultCloseOff();
    }

    // Get flow category
    const { data: flowData } = await supabase
      .from('bot_flows')
      .select('category, name')
      .eq('id', sessionData.flow_id)
      .maybeSingle();

    // Get template metadata
    const { data: templateData } = await supabase
      .from('email_templates')
      .select('category, badges')
      .eq('id', templateId)
      .maybeSingle();

    const flowCategory = flowData?.category || 'general';
    const templateCategory = templateData?.category || 'general';
    const badges = templateData?.badges || [];

    // Analyze flow state for context
    const flowState = sessionData.flow_state || {};

    // Determine resolution type based on category and badges
    const isResolutionTemplate = templateCategory === 'resolution' || badges.includes('Resolution');
    const isMilestoneTemplate = badges.includes('Milestone') || badges.includes('Follow Up Required');
    const isShippingRelated = flowCategory === 'shipping' || templateCategory === 'shipping';
    const isDamageRelated = flowCategory === 'damage' || templateCategory === 'damage';
    const isWarrantyRelated = flowCategory === 'warranty' || badges.includes('Warranty Issue');

    // Check if issue requires follow-up based on flow answers
    const requiresFollowUp = checkRequiresFollowUp(flowState, flowCategory);

    // Generate appropriate close-off message
    if (isResolutionTemplate && !requiresFollowUp) {
      return {
        message: 'Template copied! This email should fully resolve the customer\'s issue.',
        isFullResolution: true,
        requiresFollowUp: false,
      };
    }

    if (isMilestoneTemplate || requiresFollowUp) {
      if (isShippingRelated) {
        return {
          message: 'Template copied! Monitor the shipment status and follow up with the customer if needed.',
          isFullResolution: false,
          requiresFollowUp: true,
        };
      }

      if (isDamageRelated) {
        return {
          message: 'Template copied! You may need to follow up once the customer responds with photos or additional details.',
          isFullResolution: false,
          requiresFollowUp: true,
        };
      }

      if (isWarrantyRelated) {
        return {
          message: 'Template copied! Follow up with the customer after reviewing their warranty claim details.',
          isFullResolution: false,
          requiresFollowUp: true,
        };
      }

      return {
        message: 'Template copied! You may need to follow up based on the customer\'s response.',
        isFullResolution: false,
        requiresFollowUp: true,
      };
    }

    // Default to partial resolution
    return {
      message: 'Template copied! This addresses the immediate concern. Monitor the customer\'s reply to determine if additional support is needed.',
      isFullResolution: false,
      requiresFollowUp: false,
    };
  } catch (error) {
    console.error('Error determining close-off message:', error);
    return getDefaultCloseOff();
  }
}

function checkRequiresFollowUp(flowState: any, category: string): boolean {
  // Check flow state for indicators that follow-up is needed

  // Shipping flows that need tracking updates
  if (category === 'shipping') {
    const deliveryStatus = flowState.delivery_status?.response;
    if (deliveryStatus === 'lost' || deliveryStatus === 'delayed') {
      return true;
    }
  }

  // Damage flows that need photo review
  if (category === 'damage') {
    const damageType = flowState.damage_assessment?.response;
    if (damageType === 'packaging_damage' || damageType === 'product_damage') {
      return true;
    }
  }

  // Warranty flows that need claim processing
  if (category === 'warranty') {
    return true; // Most warranty flows need follow-up
  }

  return false;
}

function getDefaultCloseOff(): CloseOffMessage {
  return {
    message: 'Template copied! You can now send this email to your customer.',
    isFullResolution: false,
    requiresFollowUp: false,
  };
}
