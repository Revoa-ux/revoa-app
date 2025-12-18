import { useState, useEffect } from 'react';
import { HelpCircle, CheckCircle, ArrowRight, Mail, Sparkles, CheckSquare } from 'lucide-react';
import Lottie from 'lottie-react';
import { toast } from 'sonner';
import type { FlowNode, FlowMessageData } from '../../types/conversationalFlows';
import { QuickReplyButtons } from './QuickReplyButtons';
import { FlowTextInput } from './FlowTextInput';
import { FlowProgressIndicator } from './FlowProgressIndicator';
import { FlowAttachmentNode } from './FlowAttachmentNode';
import { FlowGuidancePanel } from './FlowGuidancePanel';
import { FlowTemplateDisplay } from './FlowTemplateDisplay';
import { getThreadProductWarranty, formatWarrantyForFlow, getDamageResolutionGuidance } from '../../lib/flowWarrantyService';
import { flowTemplateRecommendation } from '../../lib/flowTemplateRecommendationService';
import { determineCloseOffMessage } from '../../lib/flowCloseOffService';
import { flowContinuationService, type FlowSuggestion } from '../../lib/flowContinuationService';
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
  onOpenTemplateModal?: (templateIds?: string[]) => void;
  onTemplateSelect?: (templateContent: string, templateName: string) => void;
  onStartFlow?: (flowId: string) => Promise<void>;
  isLastMessage?: boolean;
}

export function FlowMessage({ data, onResponse, isLoading, progress, onOpenTemplateModal, onTemplateSelect, onStartFlow, isLastMessage = false }: FlowMessageProps) {
  const { node, isCurrentStep, previousResponse } = data;
  const [showHelp, setShowHelp] = useState(false);
  const [animationData, setAnimationData] = useState<any>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [dynamicContent, setDynamicContent] = useState<string | null>(null);
  const [productOptions, setProductOptions] = useState<any[]>([]);
  const [needsProductSelection, setNeedsProductSelection] = useState(false);
  const [loadingWarranty, setLoadingWarranty] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [intelligentGuidance, setIntelligentGuidance] = useState<any>(null);
  const [loadingGuidance, setLoadingGuidance] = useState(false);
  const [recommendedTemplates, setRecommendedTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [closeOffMessage, setCloseOffMessage] = useState<string | null>(null);
  const [showCloseOff, setShowCloseOff] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [suggestedFlows, setSuggestedFlows] = useState<FlowSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showContinuationOptions, setShowContinuationOptions] = useState(false);

  useEffect(() => {
    fetch('/revoa_ai_bot_white.json')
      .then(res => res.json())
      .then(data => setAnimationData(data))
      .catch(err => console.error('Failed to load animation:', err));
  }, []);

  // Load thread ID and context data upfront
  useEffect(() => {
    const loadContextData = async () => {
      if (threadId) return;

      const { data: sessionData } = await supabase
        .from('thread_flow_sessions')
        .select('thread_id')
        .eq('id', data.sessionId)
        .maybeSingle();

      if (sessionData?.thread_id) {
        setThreadId(sessionData.thread_id);

        // Load order ID from thread
        const { data: threadData } = await supabase
          .from('chat_threads')
          .select('order_id, user_id')
          .eq('id', sessionData.thread_id)
          .maybeSingle();

        if (threadData) {
          setOrderId(threadData.order_id);
          setUserId(threadData.user_id);
        }
      }
    };

    loadContextData();
  }, [data.sessionId, threadId]);

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

        setThreadId(sessionData.thread_id);

        const warrantyInfo = await getThreadProductWarranty(sessionData.thread_id);

        if (!warrantyInfo) {
          setDynamicContent('⚠️ **No order linked to this thread yet.**\n\nTo check warranty coverage, please link this thread to an order first. You can do this from the customer sidebar on the right.\n\nOnce an order is linked, refresh this flow to see warranty details.');
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

  // Load intelligent guidance for resolution nodes
  useEffect(() => {
    const loadGuidance = async () => {
      // Only load guidance for info nodes with resolution metadata
      if (!isCurrentStep || node.type !== 'info' || !node.metadata?.resolution) {
        setIntelligentGuidance(null);
        return;
      }

      if (!threadId) {
        return;
      }

      // Get the damage type from flow state
      const { data: sessionState } = await supabase
        .from('thread_flow_sessions')
        .select('flow_state')
        .eq('id', data.sessionId)
        .maybeSingle();

      const damageType = sessionState?.flow_state?.damage_assessment?.response;

      if (!damageType) {
        console.log('[FlowMessage] No damage type found in flow state');
        return;
      }

      console.log('[FlowMessage] Loading guidance for damage type:', damageType);
      setLoadingGuidance(true);
      try {
        const guidance = await getDamageResolutionGuidance(threadId, damageType);
        console.log('[FlowMessage] Guidance loaded:', guidance);
        setIntelligentGuidance(guidance);
      } catch (error) {
        console.error('Error loading guidance:', error);
      } finally {
        setLoadingGuidance(false);
      }
    };

    loadGuidance();
  }, [isCurrentStep, node.type, node.metadata, threadId, data.sessionId]);

  // Load recommended templates for completion nodes
  useEffect(() => {
    const loadTemplateRecommendations = async () => {
      if (!isCurrentStep || node.type !== 'completion') {
        console.log('[FlowMessage] Not loading templates - not completion node or not current step');
        return;
      }

      console.log('[FlowMessage] Loading template recommendations for sessionId:', data.sessionId);
      setLoadingTemplates(true);
      try {
        const { data: sessionData } = await supabase
          .from('thread_flow_sessions')
          .select('flow_state, flow_id, thread_id')
          .eq('id', data.sessionId)
          .maybeSingle();

        console.log('[FlowMessage] Session data:', sessionData);

        if (!sessionData) {
          console.log('[FlowMessage] No session data found');
          return;
        }

        const { data: flowData } = await supabase
          .from('bot_flows')
          .select('category')
          .eq('id', sessionData.flow_id)
          .maybeSingle();

        const flowCategory = flowData?.category || 'general';
        console.log('[FlowMessage] Flow category:', flowCategory);

        const templates = await flowTemplateRecommendation.getRecommendedTemplatesForFlowCompletion(
          flowCategory,
          sessionData.flow_state,
          undefined
        );

        console.log('[FlowMessage] Recommended templates:', templates);
        setRecommendedTemplates(templates);
      } catch (error) {
        console.error('[FlowMessage] Error loading template recommendations:', error);
      } finally {
        setLoadingTemplates(false);
      }
    };

    loadTemplateRecommendations();
  }, [isCurrentStep, node.type, data.sessionId]);

  // Load flow continuation suggestions for completion nodes
  useEffect(() => {
    const loadFlowContinuations = async () => {
      if (!isCurrentStep || node.type !== 'completion') {
        return;
      }

      if (!threadId) {
        return;
      }

      console.log('[FlowMessage] Loading flow continuation suggestions');
      setLoadingSuggestions(true);
      try {
        const suggestions = await flowContinuationService.getSuggestedNextFlows(
          threadId,
          data.flowId
        );
        console.log('[FlowMessage] Flow suggestions loaded:', suggestions);
        setSuggestedFlows(suggestions);
      } catch (error) {
        console.error('[FlowMessage] Error loading flow suggestions:', error);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    loadFlowContinuations();
  }, [isCurrentStep, node.type, threadId, data.flowId]);

  // Auto-advance simple info nodes
  useEffect(() => {
    if (!isCurrentStep || node.type !== 'info') return;
    if (node.type === 'completion') return;
    if (node.metadata?.templateSuggestions && node.metadata.templateSuggestions.length > 0) return;
    if (node.metadata?.dynamicContent) return;
    if (node.metadata?.resolution) return;
    if (isLoading) return;

    const timer = setTimeout(() => {
      onResponse(null);
    }, 1500);

    return () => clearTimeout(timer);
  }, [isCurrentStep, node.type, node.metadata, isLoading, onResponse]);

  const isCompleted = !isCurrentStep && previousResponse !== undefined;
  const isActive = isCurrentStep && !isCompleted;

  const handleTemplateCopied = async (templateId: string) => {
    try {
      console.log('[FlowMessage] Template copied:', templateId);

      // Determine appropriate close-off message
      const closeOff = await determineCloseOffMessage(data.sessionId, templateId);
      setCloseOffMessage(closeOff.message);
      setShowCloseOff(true);
    } catch (error) {
      console.error('[FlowMessage] Error handling template copy:', error);
    }
  };

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

  const handleFlowContinuation = async (nextFlowId: string) => {
    if (!onStartFlow || !threadId) {
      console.error('[FlowMessage] Cannot continue flow - missing required props');
      return;
    }

    try {
      // Start the next flow
      await onStartFlow(nextFlowId);

      // Get the new session ID that was just created
      const { data: newSession } = await supabase
        .from('thread_flow_sessions')
        .select('id')
        .eq('thread_id', threadId)
        .eq('flow_id', nextFlowId)
        .eq('is_active', true)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (newSession) {
        // Record the flow continuation in history
        await flowContinuationService.recordFlowContinuation(
          threadId,
          data.sessionId,
          newSession.id
        );
      }

      toast.success('Starting next flow...');
    } catch (error) {
      console.error('[FlowMessage] Error continuing flow:', error);
      toast.error('Failed to continue to next flow');
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

    // NEVER show continue button for completion nodes
    if (node.type === 'completion') return null;

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

    // Show continue button for info nodes with dynamic content or resolution guidance
    if (node.type === 'info' && (node.metadata?.dynamicContent || node.metadata?.resolution)) {
      if (loadingWarranty || loadingGuidance) {
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
    // Never show response boxes for info nodes or completion nodes
    if (node.type === 'info' || node.type === 'completion') return null;

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

    return null; // Return null - responses are now rendered as separate messages
  };

  // Render merchant response as a separate message bubble (right-aligned)
  const renderMerchantResponseBubble = () => {
    // Never show for info nodes or completion nodes
    if (node.type === 'info' || node.type === 'completion') return null;

    // Only show response if completed and has actual response data
    if (!isCompleted || previousResponse === undefined || previousResponse === null) return null;

    // Skip attachment responses (handled differently)
    if (node.type === 'attachment') return null;

    const displayValue = typeof previousResponse === 'object'
      ? JSON.stringify(previousResponse)
      : String(previousResponse);

    return (
      <div className="flex justify-end mt-3 mb-4">
        <div className="px-4 py-2.5 rounded-lg bg-gradient-to-br from-[#f14361] to-[#e83653] text-white shadow-sm max-w-[75%]">
          <span className="text-sm font-medium">
            {displayValue}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex justify-start mb-4 ${isActive ? 'animate-in fade-in slide-in-from-left-2' : ''}`}>
      <div className="flex gap-3 max-w-2xl">
        {animationData && isLastMessage && (
          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
            <Lottie
              animationData={animationData}
              loop
              className={`w-full h-full ${isActive ? '' : 'opacity-60'}`}
            />
          </div>
        )}
        {!isLastMessage && (
          <div className="flex-shrink-0 w-8 h-8" />
        )}

        <div className="flex-1 min-w-0">
          <div className={`rounded-lg p-4 relative overflow-hidden ${
            isActive
              ? 'bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-800/50 border border-gray-200 dark:border-gray-700'
              : isCompleted
              ? 'bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-800/50 border border-gray-200 dark:border-gray-800 opacity-75'
              : 'bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-800/50 border border-gray-200 dark:border-gray-800'
          }`}>
            {/* Apple-style red gradient accent for active state */}
            {isActive && (
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_0%_50%,rgba(239,68,68,0.04)_0%,transparent_50%)] dark:bg-[radial-gradient(ellipse_at_0%_50%,rgba(239,68,68,0.06)_0%,transparent_50%)] pointer-events-none"></div>
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

        {isActive && isLoading && (
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

        {/* Intelligent Guidance Panel */}
        {isActive && intelligentGuidance && !loadingGuidance && (
          <FlowGuidancePanel
            resolution={intelligentGuidance.resolution}
            reasoning={intelligentGuidance.reasoning}
            nextSteps={intelligentGuidance.nextSteps}
            urgency={intelligentGuidance.urgency}
            confidence={intelligentGuidance.confidence}
          />
        )}

        {/* Template Display for Completion Nodes */}
        {isActive && node.type === 'completion' && !loadingTemplates && recommendedTemplates.length > 0 && !showCloseOff && (
          <FlowTemplateDisplay
            templateId={recommendedTemplates[0].id}
            templateName={recommendedTemplates[0].name}
            threadId={threadId || ''}
            orderId={orderId || undefined}
            userId={userId || undefined}
            onCopied={() => handleTemplateCopied(recommendedTemplates[0].id)}
          />
        )}

        {/* Close-off Message */}
        {showCloseOff && closeOffMessage && (
          <div className="mt-4">
            <div className="px-4 py-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-900 dark:text-green-100">
                  {closeOffMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Flow Continuation Options */}
        {isActive && node.type === 'completion' && !showCloseOff && suggestedFlows.length > 0 && !showContinuationOptions && (
          <div className="mt-4">
            <div className="px-4 py-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Continue with related issue?
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                    The customer might have additional concerns:
                  </p>
                  <div className="space-y-2">
                    {suggestedFlows.map((suggestion) => (
                      <button
                        key={suggestion.flowId}
                        onClick={() => handleFlowContinuation(suggestion.flowId)}
                        className="w-full text-left px-3 py-2 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {suggestion.flowName}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                              {suggestion.reason}
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowContinuationOptions(true)}
                    className="mt-3 text-xs text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
                  >
                    No, this issue is resolved
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading Template Indicator */}
        {isActive && node.type === 'completion' && loadingTemplates && (
          <div className="mt-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>Loading template...</span>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Merchant Response Bubble - rendered separately after the question */}
      {renderMerchantResponseBubble()}
    </div>
  );
}
