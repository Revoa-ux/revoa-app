import { useState, useEffect } from 'react';
import { HelpCircle, CheckCircle, ArrowRight, Mail, Sparkles, CheckSquare } from 'lucide-react';
import Lottie from 'lottie-react';
import { toast } from '../../lib/toast';
import type { FlowNode, FlowMessageData } from '../../types/conversationalFlows';
import { QuickReplyButtons } from './QuickReplyButtons';
import { FlowTextInput } from './FlowTextInput';
import { FlowProgressIndicator } from './FlowProgressIndicator';
import { FlowAttachmentNode } from './FlowAttachmentNode';
import { FlowGuidancePanel } from './FlowGuidancePanel';
import { FlowTemplateDisplay } from './FlowTemplateDisplay';
import { FlowEscalationNotice } from './FlowEscalationNotice';
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
  isAdminView?: boolean;
}

// Helper function to parse simple markdown into readable React elements
const parseMarkdown = (text: string) => {
  // Parse inline bold text within a string
  const parseInlineBold = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        return <strong key={i} className="font-semibold text-gray-900 dark:text-white">{boldText}</strong>;
      }
      return part;
    });
  };

  // Split by double newlines to get paragraphs
  const paragraphs = text.split(/\\n\\n|\n\n/);

  return paragraphs.map((paragraph, pIndex) => {
    // Check if it's a numbered list item
    const listMatch = paragraph.match(/^\d+\.\s+(.+)$/);
    if (listMatch) {
      return (
        <div key={pIndex} className="flex gap-2 mb-2">
          <span className="text-gray-500 dark:text-gray-400 font-medium">•</span>
          <span>{parseInlineBold(listMatch[1])}</span>
        </div>
      );
    }

    // Check if it's a bullet list item (•, -, ✓, ✗)
    const bulletMatch = paragraph.match(/^[•\-✓✗]\s*(.+)$/);
    if (bulletMatch) {
      const bulletChar = paragraph.charAt(0);
      const isCheck = bulletChar === '✓';
      const isX = bulletChar === '✗';
      return (
        <div key={pIndex} className="flex gap-2 mb-1.5 ml-2">
          <span className={`flex-shrink-0 ${isCheck ? 'text-green-600 dark:text-green-400' : isX ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
            {isCheck ? '✓' : isX ? '✗' : '•'}
          </span>
          <span>{parseInlineBold(bulletMatch[1])}</span>
        </div>
      );
    }

    // Check if it's a bold header (starts and ends with ** and possibly ends with :)
    const headerMatch = paragraph.match(/^\*\*(.+?)\*\*:?$/);
    if (headerMatch) {
      return (
        <div key={pIndex} className="font-semibold text-gray-900 dark:text-white mb-2">
          {headerMatch[1]}
        </div>
      );
    }

    // Regular paragraph - parse inline bold
    const cleaned = paragraph.replace(/\\n/g, ' ');
    if (cleaned.trim()) {
      return (
        <p key={pIndex} className="mb-2">
          {parseInlineBold(cleaned)}
        </p>
      );
    }

    return null;
  }).filter(Boolean);
};

export function FlowMessage({ data, onResponse, isLoading, progress, onOpenTemplateModal, onTemplateSelect, onStartFlow, isLastMessage = false, isAdminView = false }: FlowMessageProps) {
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
  const [templateCopied, setTemplateCopied] = useState(false);

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

  // Disabled auto-advance - users should read and manually click Continue
  // This ensures merchants can fully read operational guidance before it grays out

  const isCompleted = !isCurrentStep && previousResponse !== undefined;
  const isActive = isCurrentStep && !isCompleted;

  const handleTemplateCopied = async (templateId: string) => {
    try {
      console.log('[FlowMessage] Template copied:', templateId);

      // Mark template as copied to show resolution options
      setTemplateCopied(true);

      // Determine appropriate close-off message
      const closeOff = await determineCloseOffMessage(data.sessionId, templateId);
      setCloseOffMessage(closeOff.message);
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
    if (!isActive || isAdminView) return null;

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
    if (!isActive || isAdminView) return null;

    // NEVER show continue button for completion nodes
    if (node.type === 'completion') return null;

    // Don't show continue if product selection is needed
    if (needsProductSelection) return null;

    // Show submit button for attachment nodes when minimum files uploaded
    if (node.type === 'attachment') {
      const minFiles = node.metadata?.attachmentConfig?.minFiles || 1;
      if (attachments.length >= minFiles) {
        return (
          <button
            onClick={() => onResponse({ attachments })}
            disabled={isLoading}
            className="btn btn-primary group"
          >
            <CheckSquare className="btn-icon w-4 h-4" />
            <span>Submit Photos</span>
          </button>
        );
      }
    }

    // Show continue button for ALL info nodes so users can read before it grays out
    if (node.type === 'info') {
      if (loadingWarranty || loadingGuidance) {
        return null;
      }

      return (
        <button
          onClick={() => onResponse(null)}
          disabled={isLoading || loadingWarranty}
          className="btn btn-secondary group px-3 py-1.5 text-xs"
        >
          <span>Continue</span>
          <ArrowRight className="btn-icon btn-icon-arrow w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
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

  // Render merchant response bubble
  const renderMerchantResponseBubble = () => {
    // Never show for info nodes or completion nodes
    if (node.type === 'info' || node.type === 'completion') return null;

    // Only show response if completed and has actual response data
    if (!isCompleted || previousResponse === undefined || previousResponse === null) return null;

    // Skip attachment responses (handled differently)
    if (node.type === 'attachment') return null;

    // Get option label if it's a choice response
    let displayValue = '';
    if (node.options && typeof previousResponse === 'string') {
      const selectedOption = node.options.find(opt => opt.value === previousResponse);
      displayValue = selectedOption?.label || previousResponse;
    } else if (typeof previousResponse === 'object') {
      displayValue = JSON.stringify(previousResponse);
    } else {
      displayValue = String(previousResponse);
    }

    return (
      <div className="mt-3 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-rose-400 dark:border-rose-500 bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-900/20 dark:to-rose-900/10">
          <CheckCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 flex-shrink-0" />
          <span className="text-xs font-medium text-rose-900 dark:text-rose-100">
            {displayValue}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex justify-start mb-4 ${isActive ? 'animate-in fade-in slide-in-from-left-2' : ''}`}>
      <div className="flex gap-3 max-w-2xl items-center">
        {animationData && isLastMessage && (
          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center self-start mt-1">
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
          <div className={`rounded-lg p-3 relative overflow-hidden ${
            isActive
              ? 'bg-gradient-to-br from-gray-100 to-gray-50 dark:from-[#2a2a2a] dark:to-[#2a2a2a]/50 border border-gray-200 dark:border-[#3a3a3a]'
              : isCompleted
              ? 'bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-[#1f1f1f] dark:to-[#2a2a2a]/50 border border-gray-200 dark:border-[#2a2a2a] opacity-75'
              : 'bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-[#1f1f1f] dark:to-[#2a2a2a]/50 border border-gray-200 dark:border-[#2a2a2a]'
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
                <div>{parseMarkdown(node.content)}</div>
              )}
            </div>

            {node.metadata?.helpText && (
              <button
                onClick={() => setShowHelp(!showHelp)}
                className={`flex-shrink-0 p-1 rounded transition-colors ${
                  isActive
                    ? 'hover:bg-gray-100 dark:hover:bg-[#3a3a3a]'
                    : 'hover:bg-gray-100 dark:hover:bg-[#3a3a3a]'
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

          {/* Merchant Response Bubble - inside the message bubble */}
          {renderMerchantResponseBubble()}

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

        {/* Interactive elements moved outside bubble */}
        {renderResponseInput() && (
          <div className="mt-3">
            {renderResponseInput()}
          </div>
        )}

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
            isAdminView={isAdminView}
          />
        )}

        {/* Escalation Notice for Completion Nodes */}
        {isActive && node.type === 'completion' && node.metadata?.requiresAgentAction && threadId && (
          <FlowEscalationNotice
            threadId={threadId}
            escalationType={node.metadata.escalationType}
            escalationMessage={node.metadata.escalationMessage}
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

        {/* Flow Continuation Options - Hidden for admin view */}
        {!isAdminView && isActive && node.type === 'completion' && templateCopied && !showCloseOff && !showContinuationOptions && recommendedTemplates.length > 0 && (
          <div className="mt-4">
            <div className="px-4 py-3 bg-gray-50 dark:bg-dark/50 border border-gray-200 dark:border-[#3a3a3a] rounded-lg">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                Has this order issue been resolved?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setCloseOffMessage('Great! If you\'ve sent the customer response, you can now close this thread or keep it open to monitor their reply.');
                    setShowCloseOff(true);
                  }}
                  className="btn btn-primary flex-1"
                >
                  Yes, resolved
                </button>
                <button
                  onClick={() => {
                    if (suggestedFlows.length > 0) {
                      setShowContinuationOptions(true);
                    } else {
                      toast.info('No additional templates available for this scenario');
                    }
                  }}
                  className="btn btn-secondary flex-1"
                >
                  No, need help
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Show related flows if user needs more help - Hidden for admin view */}
        {!isAdminView && showContinuationOptions && suggestedFlows.length > 0 && (
          <div className="mt-4">
            <div className="px-4 py-3 bg-gray-50 dark:bg-dark/50 border border-gray-200 dark:border-[#3a3a3a] rounded-lg">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                The customer might have additional concerns:
              </p>
              <div className="space-y-2">
                {suggestedFlows.map((suggestion) => (
                  <button
                    key={suggestion.flowId}
                    onClick={() => handleFlowContinuation(suggestion.flowId)}
                    className="w-full text-left px-3 py-2 bg-white dark:bg-dark hover:bg-gray-100 dark:hover:bg-[#3a3a3a] border border-gray-200 dark:border-[#4a4a4a] rounded-lg transition-colors group"
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
                      <ArrowRight className="w-4 h-4 text-gray-600 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
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
    </div>
  );
}
