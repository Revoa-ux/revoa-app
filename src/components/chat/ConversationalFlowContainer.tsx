import { useEffect } from 'react';
import { useConversationalFlow } from '../../hooks/useConversationalFlow';
import { FlowMessage } from './FlowMessage';
import { toast } from '../../lib/toast';

interface ConversationalFlowContainerProps {
  threadId: string | null;
  onFlowActive?: (isActive: boolean) => void;
  onOpenTemplateModal?: (templateIds?: string[]) => void;
  onTemplateSelect?: (templateContent: string, templateName: string) => void;
  isAdminView?: boolean;
}

export function ConversationalFlowContainer({ threadId, onFlowActive, onOpenTemplateModal, onTemplateSelect, isAdminView = false }: ConversationalFlowContainerProps) {
  const {
    session,
    flow,
    flowMessages,
    isLoading,
    error,
    handleResponse,
    startFlow,
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
    <div className="relative">
      {/* Flow messages */}
      <div className="space-y-2">
        {flowMessages.map((flowMessage, index) => (
          <FlowMessage
            key={flowMessage.nodeId}
            data={flowMessage}
            onResponse={handleResponse}
            isLoading={isLoading}
            onOpenTemplateModal={onOpenTemplateModal}
            onTemplateSelect={onTemplateSelect}
            onStartFlow={startFlow}
            isLastMessage={index === flowMessages.length - 1}
            isAdminView={isAdminView}
          />
        ))}
      </div>
    </div>
  );
}
