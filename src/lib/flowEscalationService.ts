import { supabase } from './supabase';

export interface EscalationContext {
  order_number?: string;
  order_id?: string;
  days_no_tracking?: number;
  order_value?: number;
  customer_name?: string;
  product_name?: string;
  tracking_number?: string;
  [key: string]: any;
}

export interface EscalationMetadata {
  requiresAgentAction: boolean;
  escalationType: string;
  escalationMessage: string;
  adminActionMessage: string;
}

/**
 * Checks if a flow completion node requires agent escalation
 * and triggers the escalation if needed
 */
export async function checkAndTriggerEscalation(
  threadId: string,
  nodeMetadata: any,
  flowState: Record<string, any>,
  currentNodeId: string
): Promise<boolean> {
  if (!nodeMetadata?.requiresAgentAction) {
    return false;
  }

  const escalationMetadata: EscalationMetadata = {
    requiresAgentAction: nodeMetadata.requiresAgentAction,
    escalationType: nodeMetadata.escalationType,
    escalationMessage: nodeMetadata.escalationMessage,
    adminActionMessage: nodeMetadata.adminActionMessage,
  };

  // Build context data from flow state
  const contextData = buildEscalationContext(flowState, escalationMetadata.escalationType);

  // Trigger escalation via database function
  const { error } = await supabase.rpc('trigger_thread_escalation', {
    p_thread_id: threadId,
    p_escalation_type: escalationMetadata.escalationType,
    p_triggered_by_node: currentNodeId,
    p_context_data: contextData,
  });

  if (error) {
    console.error('Error triggering escalation:', error);
    throw error;
  }

  return true;
}

/**
 * Builds escalation context from flow state
 */
function buildEscalationContext(
  flowState: Record<string, any>,
  escalationType: string
): EscalationContext {
  const context: EscalationContext = {};

  // Extract relevant data based on escalation type
  switch (escalationType) {
    case 'contact_carrier_investigation':
    case 'file_carrier_claim':
    case 'delivery_verification_needed':
      context.tracking_number = flowState.tracking_number;
      context.days_no_tracking = extractDaysFromFlowState(flowState);
      break;

    case 'contact_factory_claim':
    case 'factory_exception_approval':
      context.product_name = flowState.product_name;
      context.defect_description = flowState.defect_description;
      context.warranty_status = flowState.warranty_status;
      break;

    case 'contact_carrier_intercept':
    case 'contact_logistics_redirect':
      context.new_address = flowState.new_address;
      context.current_status = flowState.current_status;
      break;

    case 'high_value_approval':
      context.order_value = flowState.order_value;
      context.refund_amount = flowState.refund_amount;
      break;

    case 'return_investigation':
      context.return_status = flowState.return_status;
      context.days_since_return = flowState.days_since_return;
      break;

    case 'review_defect_evidence':
    case 'review_wrong_item_evidence':
      context.evidence_submitted = true;
      context.review_type = escalationType;
      break;
  }

  // Always include order info if available
  if (flowState.order_number) context.order_number = flowState.order_number;
  if (flowState.order_id) context.order_id = flowState.order_id;
  if (flowState.customer_name) context.customer_name = flowState.customer_name;

  // Include all flow state responses for admin reference
  context.flow_responses = flowState;

  return context;
}

/**
 * Extracts number of days from flow state responses
 */
function extractDaysFromFlowState(flowState: Record<string, any>): number | undefined {
  // Check for explicit days
  if (flowState.days_no_tracking) {
    return parseInt(flowState.days_no_tracking);
  }

  // Check for duration response
  if (flowState.not_updating_duration === '7_plus_days') {
    return 7;
  }
  if (flowState.not_updating_duration === 'delivered_2_plus') {
    return 2;
  }
  if (flowState.lost_package_status === 'no_updates_14') {
    return 14;
  }

  return undefined;
}

/**
 * Acknowledges an escalation (called when admin views the thread)
 */
export async function acknowledgeEscalation(threadId: string): Promise<void> {
  const { error } = await supabase.rpc('acknowledge_thread_escalation', {
    p_thread_id: threadId,
  });

  if (error) {
    console.error('Error acknowledging escalation:', error);
    throw error;
  }
}

/**
 * Resolves an escalation (called when admin completes the required action)
 */
export async function resolveEscalation(
  threadId: string,
  resolutionNotes?: string
): Promise<void> {
  const { error } = await supabase.rpc('resolve_thread_escalation', {
    p_thread_id: threadId,
    p_resolution_notes: resolutionNotes || null,
  });

  if (error) {
    console.error('Error resolving escalation:', error);
    throw error;
  }
}

/**
 * Gets escalation history for a thread
 */
export async function getEscalationHistory(threadId: string) {
  const { data, error } = await supabase
    .from('thread_escalation_history')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching escalation history:', error);
    throw error;
  }

  return data;
}

/**
 * Gets all threads requiring agent action for the current admin
 */
export async function getEscalatedThreads() {
  const { data, error } = await supabase
    .from('chat_threads')
    .select(`
      *,
      chat:chats!inner(
        id,
        user_id,
        admin_id,
        user_profile:user_profiles(name, company)
      ),
      shopify_orders(order_number, total_price)
    `)
    .eq('requires_agent_action', true)
    .order('escalated_at', { ascending: true });

  if (error) {
    console.error('Error fetching escalated threads:', error);
    throw error;
  }

  return data;
}

/**
 * Gets escalation message text for merchant display
 */
export function getEscalationMessageForMerchant(
  escalationType: string,
  escalationMessage?: string,
  adminName?: string
): string {
  const agentName = adminName || 'Your support agent';

  if (escalationMessage) {
    return escalationMessage;
  }

  // Fallback messages
  const messages: Record<string, string> = {
    contact_carrier_investigation: `${agentName} will contact the carrier to investigate the tracking delay`,
    file_carrier_claim: `${agentName} will file a claim with the carrier for the lost/damaged package`,
    contact_factory_claim: `${agentName} will coordinate with the factory to resolve this issue`,
    factory_exception_approval: `${agentName} will review your case for a possible exception`,
    contact_logistics_customs: `${agentName} will contact logistics to resolve the customs issue`,
    contact_carrier_intercept: `${agentName} will contact the carrier to attempt interception or redirect`,
    contact_logistics_redirect: `${agentName} will contact logistics to update the shipping address`,
    high_value_approval: `${agentName} will review and process your request`,
    delivery_verification_needed: `${agentName} will verify the delivery status and investigate`,
    return_investigation: `${agentName} will investigate the return processing issue`,
    review_defect_evidence: `${agentName} is reviewing the defect evidence and will coordinate with the factory once verified`,
    review_wrong_item_evidence: `${agentName} is verifying the wrong item claim and will arrange the correct shipment`,
  };

  return messages[escalationType] || `${agentName} will investigate this issue`;
}

/**
 * Gets escalation type display name
 */
export function getEscalationTypeLabel(escalationType: string): string {
  const labels: Record<string, string> = {
    contact_carrier_investigation: 'Carrier Investigation',
    file_carrier_claim: 'File Carrier Claim',
    contact_factory_claim: 'Factory Coordination',
    factory_exception_approval: 'Warranty Exception Review',
    contact_logistics_customs: 'Customs Resolution',
    contact_carrier_intercept: 'Carrier Intercept',
    contact_logistics_redirect: 'Address Change',
    high_value_approval: 'High-Value Approval',
    delivery_verification_needed: 'Delivery Verification',
    return_investigation: 'Return Investigation',
    review_defect_evidence: 'Defect Evidence Review',
    review_wrong_item_evidence: 'Wrong Item Verification',
  };

  return labels[escalationType] || 'Agent Action Needed';
}
