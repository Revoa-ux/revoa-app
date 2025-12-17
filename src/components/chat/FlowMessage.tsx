import { useState, useEffect } from 'react';
import { HelpCircle, CheckCircle, ArrowRight } from 'lucide-react';
import Lottie from 'lottie-react';
import type { FlowNode, FlowMessageData } from '../../types/conversationalFlows';
import { QuickReplyButtons } from './QuickReplyButtons';
import { FlowTextInput } from './FlowTextInput';
import { FlowProgressIndicator } from './FlowProgressIndicator';
import { FlowAttachmentNode } from './FlowAttachmentNode';
import { getThreadProductWarranty, formatWarrantyForFlow } from '../../lib/flowWarrantyService';
import { supabase } from '../../lib/supabase';

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
  const [dynamicContent, setDynamicContent] = useState<string | null>(null);
  const [productOptions, setProductOptions] = useState<any[]>([]);
  const [needsProductSelection, setNeedsProductSelection] = useState(false);
  const [loadingWarranty, setLoadingWarranty] = useState(false);

  useEffect(() => {
    fetch('/revoa_ai_bot_white.json')
      .then(res => res.json())
      .then(data => setAnimationData(data))
      .catch(err => console.error('Failed to load animation:', err));
  }, []);

  // Load dynamic warranty content
  useEffect(() => {
    const loadWarrantyContent = async () => {
      if (!node.metadata?.dynamicContent || node.metadata?.contentSource !== 'product_warranty') {
        return;
      }

      if (!isCurrentStep) return;

      setLoadingWarranty(true);

      try {
        // Get thread ID from the session data
        const { data: sessionData } = await supabase
          .from('thread_flow_sessions')
          .select('thread_id')
          .eq('id', data.sessionId)
          .maybeSingle();

        if (!sessionData?.thread_id) {
          setDynamicContent('⚠️ Unable to load warranty information - thread not found.');
          return;
        }

        const warrantyInfo = await getThreadProductWarranty(sessionData.thread_id);

        if (!warrantyInfo) {
          setDynamicContent('⚠️ Unable to load warranty information - no order linked to this thread.');
          return;
        }

        if (warrantyInfo.needsProductSelection && warrantyInfo.availableProducts) {
          // Show product selection
          setNeedsProductSelection(true);
          setProductOptions(warrantyInfo.availableProducts);
          setDynamicContent('This order has multiple products. Please select which product is damaged:');
        } else {
          // Show warranty info
          const formattedWarranty = formatWarrantyForFlow(warrantyInfo.warranty);
          const productInfo = warrantyInfo.variantTitle
            ? `**Product**: ${warrantyInfo.productName} - ${warrantyInfo.variantTitle}\n\n`
            : `**Product**: ${warrantyInfo.productName}\n\n`;

          setDynamicContent(productInfo + formattedWarranty);
          setNeedsProductSelection(false);
        }
      } catch (error) {
        console.error('Error loading warranty content:', error);
        setDynamicContent('⚠️ Error loading warranty information. Please try again.');
      } finally {
        setLoadingWarranty(false);
      }
    };

    loadWarrantyContent();
  }, [node.metadata, isCurrentStep, data.sessionId]);

  const isCompleted = !isCurrentStep && previousResponse !== undefined;
  const isActive = isCurrentStep && !isCompleted;

  const handleProductSelection = async (productId: string) => {
    try {
      // Get thread ID
      const { data: sessionData } = await supabase
        .from('thread_flow_sessions')
        .select('thread_id')
        .eq('id', data.sessionId)
        .maybeSingle();

      if (!sessionData?.thread_id) return;

      // Update thread with selected line item
      const { error } = await supabase
        .from('chat_threads')
        .update({ line_item_id: productId })
        .eq('id', sessionData.thread_id);

      if (error) throw error;

      // Reload warranty info with selected product
      const warrantyInfo = await getThreadProductWarranty(sessionData.thread_id);
      if (warrantyInfo && !warrantyInfo.needsProductSelection) {
        const formattedWarranty = formatWarrantyForFlow(warrantyInfo.warranty);
        const productInfo = warrantyInfo.variantTitle
          ? `**Product**: ${warrantyInfo.productName} - ${warrantyInfo.variantTitle}\n\n`
          : `**Product**: ${warrantyInfo.productName}\n\n`;

        setDynamicContent(productInfo + formattedWarranty);
        setNeedsProductSelection(false);
        setProductOptions([]);
      }
    } catch (error) {
      console.error('Error selecting product:', error);
    }
  };

  const renderResponseInput = () => {
    if (!isActive) return null;

    // Handle product selection for warranty
    if (needsProductSelection && productOptions.length > 0) {
      return (
        <QuickReplyButtons
          options={productOptions.map(p => ({
            id: p.id,
            label: p.variant ? `${p.name} - ${p.variant}` : p.name,
            value: p.id,
          }))}
          onSelect={handleProductSelection}
          multiSelect={false}
          disabled={loadingWarranty}
        />
      );
    }

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

    // Don't show continue if product selection is needed
    if (needsProductSelection) return null;

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

    // Show continue button for info nodes or nodes without response types (including dynamic warranty display)
    if (node.type === 'info' || !node.responseType) {
      // For warranty display, wait until content is loaded
      if (node.metadata?.dynamicContent && loadingWarranty) {
        return null;
      }

      return (
        <button
          onClick={() => onResponse(null)}
          disabled={isLoading || loadingWarranty}
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
              ? 'bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/50 border border-gray-200 dark:border-gray-700 shadow-lg'
              : isCompleted
              ? 'bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-800/50 border border-gray-200 dark:border-gray-800 opacity-75'
              : 'bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-800/50 border border-gray-200 dark:border-gray-800'
          }`}>
            {/* Apple-style red gradient accent for active state */}
            {isActive && (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(239,68,68,0.03)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(239,68,68,0.05)_0%,transparent_50%)] pointer-events-none"></div>
            )}

          <div className="flex items-start justify-between gap-2 mb-2 relative z-10">
            <div className={`text-sm flex-1 ${
              isActive
                ? 'text-gray-900 dark:text-white font-medium'
                : 'text-gray-600 dark:text-gray-400'
            }`}>
              {loadingWarranty ? (
                <p>Loading warranty information...</p>
              ) : dynamicContent ? (
                <div className="whitespace-pre-wrap">{dynamicContent}</div>
              ) : (
                <p>{node.content}</p>
              )}
            </div>

            {node.metadata?.helpText && (
              <button
                onClick={() => setShowHelp(!showHelp)}
                className={`flex-shrink-0 p-1 rounded transition-colors ${
                  isActive
                    ? 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title="Show help"
              >
                <HelpCircle className={`w-4 h-4 ${
                  isActive
                    ? 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`} />
              </button>
            )}
          </div>

          {showHelp && node.metadata?.helpText && (
            <div className={`mb-3 p-2 rounded text-xs border relative z-10 ${
              isActive
                ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-900 dark:text-rose-100 border-rose-100 dark:border-rose-800'
                : 'bg-rose-50 dark:bg-rose-900/20 text-rose-900 dark:text-rose-100 border-rose-100 dark:border-rose-800'
            }`}>
              {node.metadata.helpText}
            </div>
          )}

          {renderPreviousResponse()}

          {node.metadata?.skipable && isActive && (
            <button
              onClick={() => onResponse(null)}
              className="mt-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white underline relative z-10"
              disabled={isLoading}
            >
              Skip this step
            </button>
          )}
        </div>

        {isLoading && (
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>Processing...</span>
          </div>
        )}

        {/* Interactive elements moved outside bubble */}
        {renderResponseInput() && (
          <div className="mt-3">
            {renderResponseInput()}
          </div>
        )}

        {renderContinueButton() && (
          <div className="mt-3">
            {renderContinueButton()}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
