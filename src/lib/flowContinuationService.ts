import { supabase } from './supabase';
import type { BotFlow } from '../types/conversationalFlows';

export interface FlowSuggestion {
  flowId: string;
  flowName: string;
  flowDescription: string;
  flowCategory: string;
  reason: string;
}

export class FlowContinuationService {
  /**
   * Get suggested next flows based on the completed flow
   */
  async getSuggestedNextFlows(
    threadId: string,
    currentFlowId: string
  ): Promise<FlowSuggestion[]> {
    try {
      const { data, error } = await supabase.rpc('get_suggested_next_flows', {
        p_thread_id: threadId,
        p_current_flow_id: currentFlowId,
      });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        flowId: row.flow_id,
        flowName: row.flow_name,
        flowDescription: row.flow_description,
        flowCategory: row.flow_category,
        reason: row.reason,
      }));
    } catch (error) {
      console.error('Error getting suggested next flows:', error);
      return [];
    }
  }

  /**
   * Track flow continuation in history
   */
  async recordFlowContinuation(
    threadId: string,
    fromSessionId: string,
    toSessionId: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('flow_continuation_history')
        .insert({
          thread_id: threadId,
          from_session_id: fromSessionId,
          to_session_id: toSessionId,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error recording flow continuation:', error);
      throw error;
    }
  }

  /**
   * Get flow continuation history for a thread
   */
  async getFlowContinuationHistory(threadId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('flow_continuation_history')
        .select(`
          *,
          from_session:from_session_id(
            flow_id,
            started_at,
            completed_at
          ),
          to_session:to_session_id(
            flow_id,
            started_at,
            completed_at
          )
        `)
        .eq('thread_id', threadId)
        .order('continued_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting flow continuation history:', error);
      return [];
    }
  }

  /**
   * Check if a specific flow has already been completed in this thread
   */
  async hasCompletedFlow(threadId: string, flowCategory: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('thread_flow_sessions')
        .select(`
          id,
          flow:flow_id(
            category
          )
        `)
        .eq('thread_id', threadId)
        .not('completed_at', 'is', null);

      if (error) throw error;

      return (data || []).some(
        (session: any) => session.flow?.category === flowCategory
      );
    } catch (error) {
      console.error('Error checking completed flows:', error);
      return false;
    }
  }

  /**
   * Get all flows in a chain for a thread (in order)
   */
  async getFlowChain(threadId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('thread_flow_sessions')
        .select(`
          id,
          flow_id,
          started_at,
          completed_at,
          flow:flow_id(
            name,
            category,
            description
          )
        `)
        .eq('thread_id', threadId)
        .order('started_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting flow chain:', error);
      return [];
    }
  }
}

export const flowContinuationService = new FlowContinuationService();
