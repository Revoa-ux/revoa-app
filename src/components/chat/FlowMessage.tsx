import { useState, useEffect } from 'react';
import { HelpCircle, CheckCircle, ArrowRight } from 'lucide-react';
import Lottie from 'lottie-react';
import type { FlowNode, FlowMessageData } from '../../types/conversationalFlows';
import { QuickReplyButtons } from './QuickReplyButtons';
import { FlowTextInput } from './FlowTextInput';
import { FlowProgressIndicator } from './FlowProgressIndicator';
import { FlowAttachmentNode } from './FlowAttachmentNode';

interface FlowMessageProps {
  data: FlowMessageData;
  onResponse: (response: any) => void;
  isLoading?: boolean;
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
}

export function FlowMessage({ data, onResponse, isLoading, progress }: FlowMessageProps) {
  const { node, isCurrentStep, previousResponse } = data;
  const [showHelp, setShowHelp] = useState(false);
  const [animationData, setAnimationData] = useState<any>(null);
  const [attachments, setAttachments] = useState<any[]>([]);

  useEffect(() => {
    fetch('/revoa_ai_bot_white.json')
      .then(res => res.json())
      .then(data => setAnimationData(data))
      .catch(err => console.error('Failed to load animation:', err));
  }, []);

  const isCompleted = !isCurrentStep && previousResponse !== undefined;
  const isActive = isCurrentStep && !isCompleted;

  const renderResponseInput = () => {
    if (!isActive) return null;

    // Handle attachment node type
    if (node.type === 'attachment') {
      return (
        <FlowAttachmentNode
          sessionId={data.sessionId}
          minFiles={node.metadata?.attachmentConfig?.minFiles || 1}
          maxFiles={node.metadata?.attachmentConfig?.maxFiles || 10}
          onAttachmentsChange={(newAttachments) => {
            setAttachments(newAttachments);
          }}
          disabled={isLoading}
        />
      );
    }

    switch (node.responseType) {
      case 'single_choice':
      case 'multiple_choice':
        return (
          <QuickReplyButtons
            options={node.options || []}
            onSelect={onResponse}
            multiSelect={node.responseType === 'multiple_choice'}
            disabled={isLoading}
          />
        );

      case 'text_input':
      case 'number_input':
        return (
          <FlowTextInput
            placeholder={node.content}
            type={node.responseType === 'number_input' ? 'number' : 'text'}
            onSubmit={onResponse}
            disabled={isLoading}
          />
        );

      default:
        return null;
    }
  };

  const renderContinueButton = () => {
    if (!isActive) return null;

    // Show continue button for attachment nodes when minimum files uploaded
    if (node.type === 'attachment') {
      const minFiles = node.metadata?.attachmentConfig?.minFiles || 1;
      if (attachments.length >= minFiles) {
        return (
          <button
            onClick={() => onResponse({ attachments })}
            disabled={isLoading}
            className="group inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <span>Continue</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        );
      }
    }

    // Show continue button for info nodes or nodes without response types
    if (node.type === 'info' || !node.responseType) {
      return (
        <button
          onClick={() => onResponse(null)}
          disabled={isLoading}
          className="group inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <span>Continue</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      );
    }

    return null;
  };

  const renderPreviousResponse = () => {
    // Never show response boxes for info nodes
    if (node.type === 'info') return null;

    // Only show response if completed and has actual response data
    if (!isCompleted || previousResponse === undefined || previousResponse === null) return null;

    // For attachment responses, show a compact view
    if (node.type === 'attachment') {
      if (previousResponse?.attachments) {
        return (
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {previousResponse.attachments.length} file{previousResponse.attachments.length !== 1 ? 's' : ''} uploaded
              </span>
            </div>
          </div>
        );
      }

      // Backwards compatibility for old format
      if (previousResponse?.attachmentCount) {
        return (
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {previousResponse.attachmentCount} file{previousResponse.attachmentCount !== 1 ? 's' : ''} uploaded
              </span>
            </div>
          </div>
        );
      }
    }

    const displayValue = typeof previousResponse === 'object'
      ? JSON.stringify(previousResponse)
      : String(previousResponse);

    return (
      <div className="mt-2 px-3 py-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-200 dark:border-rose-800">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
          <span className="text-sm text-rose-900 dark:text-rose-100 font-medium">
            {displayValue}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex justify-start mb-4 ${isActive ? 'animate-in fade-in slide-in-from-left-2' : ''}`}>
      <div className="flex gap-3 max-w-2xl">
        {animationData && (
          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
            <Lottie
              animationData={animationData}
              loop
              className={`w-full h-full ${isActive ? '' : 'opacity-60'}`}
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className={`rounded-lg p-4 relative overflow-hidden ${
            isActive
              ? 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg'
              : isCompleted
              ? 'bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-800/50 border border-gray-200 dark:border-gray-800 opacity-75'
              : 'bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-800/50 border border-gray-200 dark:border-gray-800'
          }`}>
          {progress && isActive && (
            <FlowProgressIndicator
              current={progress.current}
              total={progress.total}
              percentage={progress.percentage}
            />
          )}

          <div className="flex items-start justify-between gap-2 mb-2">
            <p className={`text-sm ${
              isActive
                ? 'text-white font-medium'
                : 'text-gray-600 dark:text-gray-400'
            }`}>
              {node.content}
            </p>

            {node.metadata?.helpText && (
              <button
                onClick={() => setShowHelp(!showHelp)}
                className={`flex-shrink-0 p-1 rounded transition-colors ${
                  isActive
                    ? 'hover:bg-white/20'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title="Show help"
              >
                <HelpCircle className={`w-4 h-4 ${
                  isActive
                    ? 'text-white/80 hover:text-white'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`} />
              </button>
            )}
          </div>

          {showHelp && node.metadata?.helpText && (
            <div className={`mb-3 p-2 rounded text-xs border ${
              isActive
                ? 'bg-white/20 text-white border-white/30'
                : 'bg-rose-50 dark:bg-rose-900/20 text-rose-900 dark:text-rose-100 border-rose-100 dark:border-rose-800'
            }`}>
              {node.metadata.helpText}
            </div>
          )}

          {renderPreviousResponse()}
          {renderResponseInput()}

          {node.metadata?.skipable && isActive && (
            <button
              onClick={() => onResponse(null)}
              className="mt-2 text-xs text-white/80 hover:text-white underline"
              disabled={isLoading}
            >
              Skip this step
            </button>
          )}
        </div>

        {isLoading && (
          <div className="mt-2 flex items-center gap-2 text-xs text-white/90">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>Processing...</span>
          </div>
        )}

        {renderContinueButton() && (
          <div className="mt-2">
            {renderContinueButton()}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
