import { useEffect } from 'react';
import { useConversationalFlow } from '../../hooks/useConversationalFlow';
import { FlowMessage } from './FlowMessage';
import { toast } from 'sonner';

interface ConversationalFlowContainerProps {
  threadId: string | null;
  onFlowActive?: (isActive: boolean) => void;
}

export function ConversationalFlowContainer({ threadId, onFlowActive }: ConversationalFlowContainerProps) {
  const {
    session,
    flow,
    flowMessages,
    progress,
    isLoading,
    error,
    handleResponse,
  } = useConversationalFlow(threadId || '');

  useEffect(() => {
    if (error) {
      const errorMessage = typeof error === 'string'
        ? error
        : error instanceof Error
        ? error.message
        : 'An unexpected error occurred';
      toast.error(errorMessage);
    }
  }, [error]);

  // Notify parent about flow active state
  useEffect(() => {
    const hasActiveFlow = !!threadId && !!session && !!flow && flowMessages.length > 0;
    onFlowActive?.(hasActiveFlow);
  }, [threadId, session, flow, flowMessages.length, onFlowActive]);

  if (!threadId || !session || !flow || flowMessages.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {flowMessages.map((flowMessage) => (
        <FlowMessage
          key={flowMessage.nodeId}
          data={flowMessage}
          onResponse={handleResponse}
          isLoading={isLoading}
          progress={flowMessage.isCurrentStep ? progress : undefined}
        />
      ))}
    </div>
  );
}
