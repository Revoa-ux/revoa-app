import { useState } from 'react';
import { Bot, HelpCircle, CheckCircle } from 'lucide-react';
import type { FlowNode, FlowMessageData } from '../../types/conversationalFlows';
import { QuickReplyButtons } from './QuickReplyButtons';
import { FlowTextInput } from './FlowTextInput';
import { FlowProgressIndicator } from './FlowProgressIndicator';

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

  const isCompleted = !isCurrentStep && previousResponse !== undefined;
  const isActive = isCurrentStep && !isCompleted;

  const renderResponseInput = () => {
    if (!isActive) return null;

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

  const renderPreviousResponse = () => {
    if (!isCompleted || previousResponse === undefined) return null;

    const displayValue = typeof previousResponse === 'object'
      ? JSON.stringify(previousResponse)
      : String(previousResponse);

    return (
      <div className="mt-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <span className="text-sm text-blue-900 dark:text-blue-100 font-medium">
            {displayValue}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex gap-3 mb-4 ${isActive ? 'animate-in fade-in slide-in-from-left-2' : ''}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isActive
          ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30'
          : isCompleted
          ? 'bg-gray-100 dark:bg-gray-800'
          : 'bg-gray-50 dark:bg-gray-900'
      }`}>
        <Bot className={`w-5 h-5 ${
          isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'
        }`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className={`rounded-lg p-4 ${
          isActive
            ? 'bg-white dark:bg-gray-800 border-2 border-blue-500 shadow-lg'
            : isCompleted
            ? 'bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 opacity-75'
            : 'bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800'
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
                ? 'text-gray-900 dark:text-white font-medium'
                : 'text-gray-600 dark:text-gray-400'
            }`}>
              {node.content}
            </p>

            {node.metadata?.helpText && (
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Show help"
              >
                <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
              </button>
            )}
          </div>

          {showHelp && node.metadata?.helpText && (
            <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-900 dark:text-blue-100 border border-blue-100 dark:border-blue-800">
              {node.metadata.helpText}
            </div>
          )}

          {renderPreviousResponse()}
          {renderResponseInput()}

          {node.metadata?.skipable && isActive && (
            <button
              onClick={() => onResponse(null)}
              className="mt-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 underline"
              disabled={isLoading}
            >
              Skip this step
            </button>
          )}
        </div>

        {isLoading && (
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
}
