import { useEffect } from 'react';
import { useConversationalFlow } from '../../hooks/useConversationalFlow';
import { FlowMessage } from './FlowMessage';
import { toast } from 'sonner';

interface ConversationalFlowContainerProps {
  threadId: string | null;
}

export function ConversationalFlowContainer({ threadId }: ConversationalFlowContainerProps) {
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
      toast.error(error);
    }
  }, [error]);

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
