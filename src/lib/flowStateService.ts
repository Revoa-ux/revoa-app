import { supabase } from './supabase';
import type {
  BotFlow,
  ThreadFlowSession,
  FlowResponse,
  FlowState,
  FlowExecutionContext,
} from '../types/conversationalFlows';
import { flowEngine } from './flowEngineService';

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
    nextNodeId?: string
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

    await this.saveFlowResponse(sessionId, nodeId, response);
    await this.trackAnalytics(session.flow_id, nodeId, 'response');

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

    await supabase
      .from('thread_flow_sessions')
      .update({
        completed_at: new Date().toISOString(),
        is_active: false,
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
    response: any
  ): Promise<FlowResponse | null> {
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
      const context = await this.buildExecutionContext(sessionId, threadData);
      if (!context) {
        return { success: false, error: 'Session not found' };
      }

      const validation = flowEngine.validateResponse(context.currentNode, response);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const navigationResult = flowEngine.determineNextNode(context, response);

      if (navigationResult.error) {
        return { success: false, error: navigationResult.error };
      }

      await this.updateSessionResponse(
        sessionId,
        context.currentNode.id,
        response,
        navigationResult.nextNode?.id
      );

      if (navigationResult.completed) {
        await this.completeSession(sessionId);
        return { success: true, completed: true };
      }

      return {
        success: true,
        nextNode: navigationResult.nextNode,
        completed: false,
      };
    } catch (error) {
      console.error('Error handling flow response:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
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
