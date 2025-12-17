import { useState, useEffect, useCallback } from 'react';
import { flowStateService } from '../lib/flowStateService';
import { flowEngine } from '../lib/flowEngineService';
import type {
  ThreadFlowSession,
  BotFlow,
  FlowNode,
  FlowMessageData,
} from '../types/conversationalFlows';

interface UseConversationalFlowResult {
  session: ThreadFlowSession | null;
  flow: BotFlow | null;
  currentNode: FlowNode | null;
  flowMessages: FlowMessageData[];
  progress: { current: number; total: number; percentage: number } | null;
  isLoading: boolean;
  error: string | null;
  startFlow: (flowId: string) => Promise<void>;
  handleResponse: (response: any) => Promise<void>;
  restartFlow: () => Promise<void>;
}

export function useConversationalFlow(threadId: string): UseConversationalFlowResult {
  const [session, setSession] = useState<ThreadFlowSession | null>(null);
  const [flow, setFlow] = useState<BotFlow | null>(null);
  const [currentNode, setCurrentNode] = useState<FlowNode | null>(null);
  const [flowMessages, setFlowMessages] = useState<FlowMessageData[]>([]);
  const [progress, setProgress] = useState<{ current: number; total: number; percentage: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    // Guard: Don't load if no valid thread ID
    if (!threadId || threadId === '__no_thread__') {
      setSession(null);
      setFlow(null);
      setCurrentNode(null);
      setFlowMessages([]);
      setProgress(null);
      return;
    }

    try {
      const activeSession = await flowStateService.getActiveSessionForThread(threadId);
      if (!activeSession) {
        setSession(null);
        setFlow(null);
        setCurrentNode(null);
        setFlowMessages([]);
        setProgress(null);
        return;
      }

      setSession(activeSession);

      const flowData = await flowStateService.getFlowById(activeSession.flow_id);
      if (!flowData) return;

      setFlow(flowData);

      const current = flowEngine.getNodeById(flowData, activeSession.current_node_id);
      setCurrentNode(current);

      const context = await flowStateService.buildExecutionContext(activeSession.id);
      if (context) {
        const progressData = flowEngine.getFlowProgress(context);
        setProgress(progressData);

        const messages: FlowMessageData[] = [];
        const allNodes = flowEngine.parseFlow(flowData);

        for (const node of allNodes) {
          const isCurrentStep = node.id === activeSession.current_node_id;
          const previousResponse = activeSession.flow_state[node.id]?.response;

          if (previousResponse !== undefined || isCurrentStep) {
            messages.push({
              sessionId: activeSession.id,
              flowId: activeSession.flow_id,
              nodeId: node.id,
              node,
              isCurrentStep,
              previousResponse,
            });
          }

          if (isCurrentStep) break;
        }

        setFlowMessages(messages);
      }
    } catch (err) {
      console.error('Error loading flow session:', err);
      setError(err instanceof Error ? err.message : 'Failed to load flow session');
    }
  }, [threadId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const startFlow = useCallback(
    async (flowId: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const newSession = await flowStateService.startFlowSession(threadId, flowId);
        if (!newSession) throw new Error('Failed to start flow session');

        await loadSession();
      } catch (err) {
        console.error('Error starting flow:', err);
        setError(err instanceof Error ? err.message : 'Failed to start flow');
      } finally {
        setIsLoading(false);
      }
    },
    [threadId, loadSession]
  );

  const handleResponse = useCallback(
    async (response: any) => {
      console.log('[useConversationalFlow] handleResponse called with:', { response, session: !!session, flow: !!flow, currentNode: !!currentNode });

      if (!session || !flow || !currentNode) {
        console.error('[useConversationalFlow] Missing required data:', { session: !!session, flow: !!flow, currentNode: !!currentNode });
        setError('Flow session is not properly initialized');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        console.log('[useConversationalFlow] Calling flowStateService.handleFlowResponse...');
        const result = await flowStateService.handleFlowResponse(session.id, response);
        console.log('[useConversationalFlow] handleFlowResponse result:', result);

        if (!result.success) {
          console.error('[useConversationalFlow] Flow response failed:', result.error);
          setError(result.error || 'Failed to process response');
          return;
        }

        console.log('[useConversationalFlow] Reloading session...');
        await loadSession();

        if (result.completed) {
          console.log('[useConversationalFlow] Flow completed successfully');
        }
      } catch (err) {
        console.error('[useConversationalFlow] Error handling response:', err);
        setError(err instanceof Error ? err.message : 'Failed to process response');
      } finally {
        console.log('[useConversationalFlow] Setting isLoading to false');
        setIsLoading(false);
      }
    },
    [session, flow, currentNode, loadSession]
  );

  const restartFlow = useCallback(async () => {
    if (!session) return;

    try {
      setIsLoading(true);
      setError(null);

      await flowStateService.restartFlow(session.id);
      await loadSession();
    } catch (err) {
      console.error('Error restarting flow:', err);
      setError(err instanceof Error ? err.message : 'Failed to restart flow');
    } finally {
      setIsLoading(false);
    }
  }, [session, loadSession]);

  return {
    session,
    flow,
    currentNode,
    flowMessages,
    progress,
    isLoading,
    error,
    startFlow,
    handleResponse,
    restartFlow,
  };
}
