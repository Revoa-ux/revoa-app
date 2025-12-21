import { supabase } from './supabase';
import type {
  BotFlow,
  ThreadFlowSession,
  FlowResponse,
  FlowState,
  FlowExecutionContext,
} from '../types/conversationalFlows';
import { flowEngine } from './flowEngineService';
import { checkAndTriggerEscalation } from './flowEscalationService';

export class FlowStateService {
  async getActiveFlowsByCategory(category: string): Promise<BotFlow[]> {
    const { data, error } = await supabase
      .from('bot_flows')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .order('version', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getFlowById(flowId: string): Promise<BotFlow | null> {
    const { data, error } = await supabase
      .from('bot_flows')
      .select('*')
      .eq('id', flowId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async getActiveSessionForThread(threadId: string): Promise<ThreadFlowSession | null> {
    const { data, error } = await supabase
      .from('thread_flow_sessions')
      .select('*')
      .eq('thread_id', threadId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async startFlowSession(
    threadId: string,
    flowId: string
  ): Promise<ThreadFlowSession | null> {
    const flow = await this.getFlowById(flowId);
    if (!flow) throw new Error('Flow not found');

    const startNode = flowEngine.getStartNode(flow);
    if (!startNode) throw new Error('Flow has no start node');

    const existingSession = await this.getActiveSessionForThread(threadId);
    if (existingSession) {
      await this.deactivateSession(existingSession.id);
    }

    const { data, error } = await supabase
      .from('thread_flow_sessions')
      .insert({
        thread_id: threadId,
        flow_id: flowId,
        current_node_id: startNode.id,
        flow_state: {},
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    if (data) {
      await this.trackAnalytics(flowId, startNode.id, 'view');
    }

    return data;
  }

  async updateSessionResponse(
    sessionId: string,
    nodeId: string,
    response: any,
    nextNodeId?: string,
    nodeType?: string
  ): Promise<ThreadFlowSession | null> {
    const session = await this.getSessionById(sessionId);
    if (!session) throw new Error('Session not found');

    const updatedFlowState = {
      ...session.flow_state,
      [nodeId]: {
        response,
        respondedAt: new Date().toISOString(),
      },
    };

    const updateData: any = {
      flow_state: updatedFlowState,
      last_interaction_at: new Date().toISOString(),
    };

    if (nextNodeId) {
      updateData.current_node_id = nextNodeId;
    }

    const { data, error } = await supabase
      .from('thread_flow_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;

    // Only save response for question nodes, not info nodes
    await this.saveFlowResponse(sessionId, nodeId, response, nodeType);

    // Only track response analytics for nodes that actually collect input
    if (nodeType !== 'info' && response !== null) {
      await this.trackAnalytics(session.flow_id, nodeId, 'response');
    }

    if (nextNodeId) {
      await this.trackAnalytics(session.flow_id, nextNodeId, 'view');
    }

    return data;
  }

  async completeSession(sessionId: string): Promise<void> {
    const session = await this.getSessionById(sessionId);
    if (!session) return;

    const startTime = new Date(session.started_at).getTime();
    const endTime = Date.now();
    const durationSeconds = Math.round((endTime - startTime) / 1000);

    // Mark as completed but keep active so templates remain accessible
    await supabase
      .from('thread_flow_sessions')
      .update({
        completed_at: new Date().toISOString(),
        is_active: true, // Keep active for template access
      })
      .eq('id', sessionId);

    await this.trackAnalytics(
      session.flow_id,
      session.current_node_id,
      'completion',
      durationSeconds
    );
  }

  async deactivateSession(sessionId: string): Promise<void> {
    await supabase
      .from('thread_flow_sessions')
      .update({ is_active: false })
      .eq('id', sessionId);
  }

  async getSessionById(sessionId: string): Promise<ThreadFlowSession | null> {
    const { data, error } = await supabase
      .from('thread_flow_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async saveFlowResponse(
    sessionId: string,
    nodeId: string,
    response: any,
    nodeType?: string
  ): Promise<FlowResponse | null> {
    // Skip saving responses for info nodes since they don't collect user input
    if (nodeType === 'info' || response === null) {
      return null;
    }

    const { data, error } = await supabase
      .from('flow_responses')
      .insert({
        session_id: sessionId,
        node_id: nodeId,
        response_value: response,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getFlowResponses(sessionId: string): Promise<FlowResponse[]> {
    const { data, error } = await supabase
      .from('flow_responses')
      .select('*')
      .eq('session_id', sessionId)
      .order('responded_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async trackAnalytics(
    flowId: string,
    nodeId: string,
    metric: 'view' | 'response' | 'completion',
    timeSeconds?: number
  ): Promise<void> {
    try {
      await supabase.rpc('increment_flow_analytics', {
        p_flow_id: flowId,
        p_node_id: nodeId,
        p_metric: metric,
        p_time_seconds: timeSeconds || null,
      });
    } catch (error) {
      console.error('Failed to track flow analytics:', error);
    }
  }

  async buildExecutionContext(
    sessionId: string,
    threadData?: any
  ): Promise<FlowExecutionContext | null> {
    const session = await this.getSessionById(sessionId);
    if (!session) return null;

    const flow = await this.getFlowById(session.flow_id);
    if (!flow) return null;

    const currentNode = flowEngine.getNodeById(flow, session.current_node_id);
    if (!currentNode) return null;

    return {
      session,
      flow,
      currentNode,
      threadData,
    };
  }

  async handleFlowResponse(
    sessionId: string,
    response: any,
    threadData?: any
  ): Promise<{
    success: boolean;
    nextNode?: any;
    completed?: boolean;
    error?: string;
  }> {
    try {
      console.log('[flowStateService] handleFlowResponse called with:', { sessionId, response });

      const context = await this.buildExecutionContext(sessionId, threadData);
      console.log('[flowStateService] Context built:', { hasContext: !!context, hasSession: !!context?.session, hasFlow: !!context?.flow, hasCurrentNode: !!context?.currentNode });

      if (!context) {
        return { success: false, error: 'Session not found' };
      }

      console.log('[flowStateService] Validating response for node:', context.currentNode.id);
      const validation = flowEngine.validateResponse(context.currentNode, response);
      console.log('[flowStateService] Validation result:', validation);

      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      console.log('[flowStateService] Determining next node...');
      const navigationResult = flowEngine.determineNextNode(context, response);
      console.log('[flowStateService] Navigation result:', { hasNextNode: !!navigationResult.nextNode, completed: navigationResult.completed, error: navigationResult.error });

      if (navigationResult.error) {
        return { success: false, error: navigationResult.error };
      }

      console.log('[flowStateService] Updating session response...');
      await this.updateSessionResponse(
        sessionId,
        context.currentNode.id,
        response,
        navigationResult.nextNode?.id,
        context.currentNode.type
      );
      console.log('[flowStateService] Session response updated successfully');

      // Check if next node requires agent escalation
      if (navigationResult.nextNode?.metadata?.requiresAgentAction) {
        console.log('[flowStateService] Next node requires agent escalation, triggering...');
        try {
          const escalated = await checkAndTriggerEscalation(
            context.session.thread_id,
            navigationResult.nextNode.metadata,
            context.session.flow_state,
            navigationResult.nextNode.id
          );
          if (escalated) {
            console.log('[flowStateService] Escalation triggered successfully');
          }
        } catch (escalationError) {
          console.error('[flowStateService] Error triggering escalation:', escalationError);
          // Don't fail the flow if escalation fails, just log it
        }
      }

      if (navigationResult.completed) {
        console.log('[flowStateService] Flow completed, marking session as complete');
        await this.completeSession(sessionId);
        return { success: true, completed: true };
      }

      return {
        success: true,
        nextNode: navigationResult.nextNode,
        completed: false,
      };
    } catch (error) {
      console.error('[flowStateService] Error handling flow response:', error);
      console.error('[flowStateService] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        raw: error
      });

      // Extract meaningful error message
      let errorMessage = 'Failed to process response';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object') {
        // Try to extract message from various error formats
        if ('message' in error && typeof error.message === 'string') {
          errorMessage = error.message;
        } else if ('error' in error && typeof error.error === 'string') {
          errorMessage = error.error;
        } else if ('details' in error && typeof error.details === 'string') {
          errorMessage = error.details;
        }
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async getFlowHistory(threadId: string): Promise<ThreadFlowSession[]> {
    const { data, error } = await supabase
      .from('thread_flow_sessions')
      .select('*')
      .eq('thread_id', threadId)
      .order('started_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async canRestartFlow(sessionId: string): Promise<boolean> {
    const session = await this.getSessionById(sessionId);
    if (!session) return false;

    return !session.completed_at;
  }

  async restartFlow(sessionId: string): Promise<ThreadFlowSession | null> {
    const session = await this.getSessionById(sessionId);
    if (!session) throw new Error('Session not found');

    const flow = await this.getFlowById(session.flow_id);
    if (!flow) throw new Error('Flow not found');

    const startNode = flowEngine.getStartNode(flow);
    if (!startNode) throw new Error('Flow has no start node');

    const { data, error } = await supabase
      .from('thread_flow_sessions')
      .update({
        current_node_id: startNode.id,
        flow_state: {},
        last_interaction_at: new Date().toISOString(),
        completed_at: null,
        is_active: true,
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export const flowStateService = new FlowStateService();
