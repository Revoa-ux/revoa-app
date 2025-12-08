import { useState, useEffect } from 'react';
import { X, Copy, Check, Mail, Package, RotateCcw, AlertCircle, Truck, FileCheck, MessageSquare, ThumbsUp, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { renderTemplate } from '../../lib/templateVariableService';
import { toast } from 'sonner';

interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  subject_line: string;
  body_html: string;
  body_plain: string;
  usage_count: number;
  last_used_at: string | null;
}

interface ScenarioTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  threadId: string;
  threadCategory?: string;
  orderId?: string;
  userId: string;
  recipientEmail?: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  replacement: RotateCcw,
  damaged: AlertCircle,
  return: Package,
  defective: AlertCircle,
  shipping: Truck,
  confirmation: FileCheck,
  quote_followup: Mail,
  inquiry: MessageSquare,
  thankyou: ThumbsUp
};

const CATEGORY_LABELS: Record<string, string> = {
  replacement: 'Replacement Requests',
  damaged: 'Damaged Items',
  return: 'Returns & Refunds',
  defective: 'Defective Products',
  shipping: 'Shipping Updates',
  confirmation: 'Order Confirmations',
  quote_followup: 'Quote Follow-ups',
  inquiry: 'General Inquiries',
  thankyou: 'Thank You Messages'
};

const CATEGORY_COLORS: Record<string, string> = {
  replacement: 'bg-blue-100 text-blue-700',
  damaged: 'bg-red-100 text-red-700',
  return: 'bg-orange-100 text-orange-700',
  defective: 'bg-red-100 text-red-700',
  shipping: 'bg-green-100 text-green-700',
  confirmation: 'bg-teal-100 text-teal-700',
  quote_followup: 'bg-purple-100 text-purple-700',
  inquiry: 'bg-gray-100 text-gray-700',
  thankyou: 'bg-pink-100 text-pink-700'
};

export function ScenarioTemplateModal({
  isOpen,
  onClose,
  threadId,
  threadCategory,
  orderId,
  userId,
  recipientEmail
}: ScenarioTemplateModalProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [populatedSubject, setPopulatedSubject] = useState('');
  const [populatedBody, setPopulatedBody] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen, threadCategory]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('email_templates')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('usage_count', { ascending: false });

      // Filter by category if provided
      if (threadCategory) {
        query = query.eq('category', threadCategory);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTemplate = async (template: EmailTemplate) => {
    setIsLoading(true);
    setSelectedTemplate(template);

    try {
      // Populate template with actual data
      const context = {
        threadId,
        orderId,
        userId
      };

      const [populatedSubjectText, populatedBodyText] = await Promise.all([
        renderTemplate(template.subject_line, context),
        renderTemplate(template.body_plain, context)
      ]);

      setPopulatedSubject(populatedSubjectText);
      setPopulatedBody(populatedBodyText);
    } catch (error) {
      console.error('Error populating template:', error);
      toast.error('Failed to populate template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      const emailContent = `Subject: ${populatedSubject}\n\n${populatedBody}`;
      await navigator.clipboard.writeText(emailContent);

      // Log the template usage
      await supabase.from('email_template_sends').insert({
        template_id: selectedTemplate?.id,
        chat_thread_id: threadId,
        user_id: userId,
        recipient_email: recipientEmail || '',
        populated_subject: populatedSubject,
        populated_body: populatedBody
      });

      // Increment usage count
      if (selectedTemplate?.id) {
        await supabase.rpc('increment_template_usage', {
          template_uuid: selectedTemplate.id
        });
      }

      setCopied(true);
      toast.success('Email copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const filteredTemplates = searchQuery
    ? templates.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subject_line.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : templates;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {selectedTemplate ? selectedTemplate.name : 'Email Templates'}
            </h2>
            {threadCategory && !selectedTemplate && (
              <div className="mt-1 flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[threadCategory] || 'bg-gray-100 text-gray-700'}`}>
                  {CATEGORY_LABELS[threadCategory] || threadCategory}
                </span>
                <span className="text-sm text-gray-500">
                  {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} available
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!selectedTemplate ? (
            <div className="p-6 space-y-4">
              {/* Search */}
              {templates.length > 5 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              )}

              {/* Template List */}
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">No templates found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTemplates.map((template) => {
                    const Icon = CATEGORY_ICONS[template.category] || Mail;
                    return (
                      <button
                        key={template.id}
                        onClick={() => handleSelectTemplate(template)}
                        className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all text-left group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1 p-2 rounded-lg bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                            <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                              {template.name}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              Subject: {template.subject_line}
                            </p>
                            <p className="text-xs text-gray-500 line-clamp-2">
                              {template.body_plain.slice(0, 150)}...
                            </p>
                            {template.usage_count > 0 && (
                              <p className="text-xs text-gray-400 mt-2">
                                Used {template.usage_count} time{template.usage_count !== 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Subject Line */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Subject Line
                </label>
                <p className="mt-1 text-gray-900 dark:text-white font-medium">
                  {isLoading ? 'Loading...' : populatedSubject}
                </p>
              </div>

              {/* Email Body */}
              <div className="flex-1 p-6 overflow-y-auto">
                {isLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-5/6" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-4/6" />
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 font-mono text-sm">
                    {populatedBody}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedTemplate && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <button
              onClick={() => {
                setSelectedTemplate(null);
                setCopied(false);
              }}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              ← Back to Templates
            </button>
            <button
              onClick={handleCopyToClipboard}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy to Clipboard
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
