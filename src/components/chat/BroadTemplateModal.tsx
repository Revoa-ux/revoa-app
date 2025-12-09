import { useState, useEffect } from 'react';
import { X, Copy, Check, Mail, Package, RotateCcw, AlertCircle, Truck, FileCheck, MessageSquare, ThumbsUp, Search, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
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

interface BroadTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: EmailTemplate) => void;
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
  replacement: 'bg-orange-500/20 text-orange-600 dark:text-orange-400',
  damaged: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
  return: 'bg-red-500/20 text-red-600 dark:text-red-400',
  defective: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
  shipping: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  confirmation: 'bg-green-500/20 text-green-600 dark:text-green-400',
  quote_followup: 'bg-pink-500/20 text-pink-600 dark:text-pink-400',
  inquiry: 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400',
  thankyou: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
};

export const BroadTemplateModal: React.FC<BroadTemplateModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate
}) => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('scenario_email_templates')
        .select('*')
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.subject_line.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(templates.map(t => t.category)));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Email Templates
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Select a template to assign to an order
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search and Filter */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              All Categories
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {CATEGORY_LABELS[category] || category}
              </button>
            ))}
          </div>
        </div>

        {/* Templates List */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No templates found</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredTemplates.map((template) => {
                const Icon = CATEGORY_ICONS[template.category] || Mail;
                const colorClass = CATEGORY_COLORS[template.category] || 'bg-gray-500/20 text-gray-600';

                return (
                  <button
                    key={template.id}
                    onClick={() => {
                      onSelectTemplate(template);
                      onClose();
                    }}
                    className="text-left p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-red-500 dark:hover:border-red-500 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${colorClass} flex-shrink-0`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                            {template.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {template.subject_line}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                            <span className={`px-2 py-0.5 rounded ${colorClass}`}>
                              {CATEGORY_LABELS[template.category] || template.category}
                            </span>
                            <span>Used {template.usage_count} times</span>
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-red-500 flex-shrink-0 transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
