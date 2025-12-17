import { useEffect } from 'react';
import { useConversationalFlow } from '../../hooks/useConversationalFlow';
import { FlowMessage } from './FlowMessage';
import { FlowProgressIndicator } from './FlowProgressIndicator';
import { toast } from 'sonner';

interface ConversationalFlowContainerProps {
  threadId: string | null;
  onFlowActive?: (isActive: boolean) => void;
  onOpenTemplateModal?: (templateIds?: string[]) => void;
}

export function ConversationalFlowContainer({ threadId, onFlowActive, onOpenTemplateModal }: ConversationalFlowContainerProps) {
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
    <div className="relative">
      {/* Progress bar at the top */}
      {progress && (
        <div className="sticky top-0 z-10 mb-4">
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 -mx-4 sm:-mx-6">
            <FlowProgressIndicator
              current={progress.current}
              total={progress.total}
              percentage={progress.percentage}
            />
            <div className="px-4 sm:px-6 py-2 flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400 font-medium">
                Progress
              </span>
              <span className="text-gray-900 dark:text-white font-semibold">
                {progress.current} of {progress.total}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Flow messages */}
      <div className="space-y-2">
        {flowMessages.map((flowMessage, index) => (
          <FlowMessage
            key={flowMessage.nodeId}
            data={flowMessage}
            onResponse={handleResponse}
            isLoading={isLoading}
            onOpenTemplateModal={onOpenTemplateModal}
            isLastMessage={index === flowMessages.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
