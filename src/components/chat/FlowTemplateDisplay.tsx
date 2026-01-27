import { useState, useEffect, useRef } from 'react';
import { Copy, Check, ArrowRight, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fetchVariableData, replaceVariables } from '../../lib/templateVariableService';

interface FlowTemplateDisplayProps {
  templateId: string;
  templateName: string;
  threadId: string;
  orderId?: string;
  userId?: string;
  onCopied?: () => void;
  isAdminView?: boolean;
}

export function FlowTemplateDisplay({
  templateId,
  templateName,
  threadId,
  orderId,
  userId,
  onCopied,
  isAdminView = false,
}: FlowTemplateDisplayProps) {
  const [isPopulated, setIsPopulated] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [templateContent, setTemplateContent] = useState<{
    subject: string;
    body: string;
  } | null>(null);
  const [populatedContent, setPopulatedContent] = useState<{
    subject: string;
    body: string;
  } | null>(null);
  const loadingCompleted = useRef(false);

  // Load template content on mount
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const loadTemplate = async () => {
      console.log('[FlowTemplateDisplay] Loading template:', templateId);
      console.log('[FlowTemplateDisplay] Thread ID:', threadId);
      console.log('[FlowTemplateDisplay] Order ID:', orderId);
      console.log('[FlowTemplateDisplay] User ID:', userId);

      try {
        const { data, error } = await supabase
          .from('email_templates')
          .select('subject_line, body_plain')
          .eq('id', templateId)
          .maybeSingle();

        console.log('[FlowTemplateDisplay] Query result:', { data, error });

        if (!mounted) return;

        if (error) {
          console.error('[FlowTemplateDisplay] Database error:', error);
          loadingCompleted.current = true;
          clearTimeout(timeoutId);
          setTemplateContent({
            subject: 'Database Error',
            body: `Failed to load template: ${error.message}`,
          });
          return;
        }

        if (!data) {
          console.error('[FlowTemplateDisplay] No template found for ID:', templateId);
          loadingCompleted.current = true;
          clearTimeout(timeoutId);
          setTemplateContent({
            subject: 'Template Not Found',
            body: `Template ID "${templateId}" does not exist in the database. Please check that the template has been created.`,
          });
          return;
        }

        console.log('[FlowTemplateDisplay] Template loaded successfully:', {
          subject: data.subject_line,
          bodyLength: data.body_plain?.length || 0
        });

        loadingCompleted.current = true;
        clearTimeout(timeoutId);
        setTemplateContent({
          subject: data.subject_line || '',
          body: data.body_plain || '',
        });
      } catch (error) {
        console.error('[FlowTemplateDisplay] Unexpected error:', error);
        if (mounted) {
          loadingCompleted.current = true;
          clearTimeout(timeoutId);
          setTemplateContent({
            subject: 'Error',
            body: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
        }
      }
    };

    loadTemplate();

    // Timeout after 10 seconds
    timeoutId = setTimeout(() => {
      if (mounted && !loadingCompleted.current) {
        console.error('[FlowTemplateDisplay] Timeout loading template after 10 seconds');
        console.error('[FlowTemplateDisplay] Template ID:', templateId);
        setTemplateContent({
          subject: 'Loading Timeout',
          body: `Template ID "${templateId}" took too long to load. This may indicate a database connection issue or the template doesn't exist.`,
        });
      }
    }, 10000);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [templateId]);

  const extractVariables = (text: string): string[] => {
    const regex = /\{\{([a-zA-Z0-9_]+)\}\}/g;
    const matches = text.matchAll(regex);
    const variables = new Set<string>();

    for (const match of matches) {
      variables.add(match[1]);
    }

    return Array.from(variables);
  };

  const renderTextWithVariables = (text: string) => {
    const parts: React.ReactNode[] = [];
    const regex = /\{\{([a-zA-Z0-9_]+)\}\}/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      parts.push(
        <span
          key={`${match.index}-${match[1]}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 text-xs font-mono rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
        >
          <Sparkles className="w-3 h-3" />
          {match[1]}
        </span>
      );

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const handlePopulate = async () => {
    if (!templateContent) return;

    setIsLoading(true);
    try {
      const variableData = await fetchVariableData({
        threadId,
        orderId,
        userId,
      });

      const populatedSubject = replaceVariables(templateContent.subject, variableData);
      const populatedBody = replaceVariables(templateContent.body, variableData);

      setPopulatedContent({
        subject: populatedSubject,
        body: populatedBody,
      });
      setIsPopulated(true);
    } catch (error) {
      console.error('Error populating template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!populatedContent) return;

    const fullEmail = `Subject: ${populatedContent.subject}\n\n${populatedContent.body}`;

    try {
      await navigator.clipboard.writeText(fullEmail);
      setIsCopied(true);

      setTimeout(() => {
        onCopied?.();
      }, 500);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  if (!templateContent) {
    return (
      <div className="mt-4 animate-pulse">
        <div className="bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg p-4">
          <div className="h-4 bg-gray-200 dark:bg-[#3a3a3a] rounded w-3/4 mb-3" />
          <div className="h-3 bg-gray-200 dark:bg-[#3a3a3a] rounded w-full mb-2" />
          <div className="h-3 bg-gray-200 dark:bg-[#3a3a3a] rounded w-5/6" />
        </div>
      </div>
    );
  }

  const displayContent = isPopulated ? populatedContent : templateContent;

  return (
    <div className="mt-4">
      <div className="bg-gray-50 dark:bg-dark/50 border border-gray-200 dark:border-[#3a3a3a] rounded-lg p-4">
        {/* Subject Line */}
        <div className="mb-3">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
            Subject
          </div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {isPopulated ? displayContent.subject : renderTextWithVariables(displayContent.subject)}
          </div>
        </div>

        {/* Body */}
        <div className="mb-4">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
            Message
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
            {isPopulated ? displayContent.body : renderTextWithVariables(displayContent.body)}
          </div>
        </div>

        {/* Action Button - Hidden for admin view */}
        {!isAdminView && (
          <>
            {!isPopulated ? (
              <button
                onClick={handlePopulate}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-dark hover:bg-gray-50 dark:hover:bg-[#3a3a3a] border border-gray-200 dark:border-[#4a4a4a] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="flex gap-1">
                      <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span>Populating email...</span>
                  </>
                ) : (
                  <>
                    <span>Populate Email</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleCopy}
                disabled={isCopied}
                className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-gray-800 dark:bg-[#3a3a3a] hover:bg-dark dark:hover:bg-[#4a4a4a] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy to Clipboard</span>
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
