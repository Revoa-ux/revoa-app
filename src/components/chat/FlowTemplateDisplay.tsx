import { useState, useEffect } from 'react';
import { Mail, Copy, Check, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { fetchVariableData, replaceVariables } from '../../lib/templateVariableService';

interface FlowTemplateDisplayProps {
  templateId: string;
  templateName: string;
  threadId: string;
  orderId?: string;
  userId?: string;
  onCopied?: () => void;
}

export function FlowTemplateDisplay({
  templateId,
  templateName,
  threadId,
  orderId,
  userId,
  onCopied,
}: FlowTemplateDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
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

  // Load template content on mount
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const { data, error } = await supabase
          .from('email_templates')
          .select('subject, body_plain')
          .eq('id', templateId)
          .maybeSingle();

        if (error) throw error;
        if (!data) return;

        setTemplateContent({
          subject: data.subject || '',
          body: data.body_plain || '',
        });
      } catch (error) {
        console.error('Error loading template:', error);
        toast.error('Failed to load template');
      }
    };

    loadTemplate();
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
          className="inline-flex items-center px-1.5 py-0.5 mx-0.5 text-[10px] font-medium rounded border bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700"
        >
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
      toast.success('Email populated with your data');
    } catch (error) {
      console.error('Error populating template:', error);
      toast.error('Failed to populate template');
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
      toast.success('Email copied to clipboard');

      setTimeout(() => {
        onCopied?.();
      }, 500);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  if (!templateContent) {
    return (
      <div className="mt-4 animate-pulse">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
        </div>
      </div>
    );
  }

  const displayContent = isPopulated ? populatedContent : templateContent;
  const subjectVariables = extractVariables(templateContent.subject);
  const bodyVariables = extractVariables(templateContent.body);
  const totalVariables = new Set([...subjectVariables, ...bodyVariables]).size;

  const previewLines = displayContent.body.split('\n').slice(0, 3);
  const hasMore = displayContent.body.split('\n').length > 3;

  return (
    <div className="mt-4 max-w-2xl">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        {/* Email Header */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
              Email Template
            </span>
            {!isPopulated && totalVariables > 0 && (
              <span className="ml-auto text-[10px] text-gray-500 dark:text-gray-400">
                {totalVariables} variable{totalVariables !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Email Content */}
        <div className="p-4">
          {/* Subject Line */}
          <div className="mb-3">
            <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              Subject
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {isPopulated ? displayContent.subject : renderTextWithVariables(displayContent.subject)}
            </div>
          </div>

          {/* Body */}
          <div>
            <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              Message
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {isExpanded ? (
                isPopulated ? displayContent.body : renderTextWithVariables(displayContent.body)
              ) : (
                <>
                  {isPopulated ? (
                    previewLines.join('\n')
                  ) : (
                    <div>{renderTextWithVariables(previewLines.join('\n'))}</div>
                  )}
                  {hasMore && <span className="text-gray-400">...</span>}
                </>
              )}
            </div>

            {/* Expand/Collapse Button */}
            {hasMore && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-2 inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    Show full email
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="px-4 pb-4">
          {!isPopulated ? (
            <button
              onClick={handlePopulate}
              disabled={isLoading}
              className="group inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm w-full"
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
              className="group inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm w-full"
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
        </div>
      </div>
    </div>
  );
}
