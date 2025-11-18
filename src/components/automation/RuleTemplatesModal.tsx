import React, { useState, useEffect } from 'react';
import { X, Search, TrendingUp, Shield, Zap, Target, ChevronRight, Sparkles } from 'lucide-react';
import { automationRulesService } from '@/lib/automationRulesService';
import type { RuleTemplate, TemplateCategory } from '@/types/automation';

interface RuleTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId: string) => void;
  adAccountId?: string;
}

const categoryIcons: Record<TemplateCategory, React.ReactNode> = {
  profit_protection: <Shield className="w-5 h-5" />,
  scale_winners: <TrendingUp className="w-5 h-5" />,
  pause_losers: <Target className="w-5 h-5" />,
  budget_optimization: <Zap className="w-5 h-5" />,
  creative_management: <Sparkles className="w-5 h-5" />,
  audience_optimization: <Target className="w-5 h-5" />,
  custom: <Zap className="w-5 h-5" />,
};

const categoryLabels: Record<TemplateCategory, string> = {
  profit_protection: 'Profit Protection',
  scale_winners: 'Scale Winners',
  pause_losers: 'Pause Losers',
  budget_optimization: 'Budget Optimization',
  creative_management: 'Creative Management',
  audience_optimization: 'Audience Optimization',
  custom: 'Custom',
};

const difficultyColors = {
  beginner: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  intermediate: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  advanced: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const RuleTemplatesModal: React.FC<RuleTemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  adAccountId,
}) => {
  const [templates, setTemplates] = useState<RuleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await automationRulesService.getTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      searchQuery === '' ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const featuredTemplates = filteredTemplates.filter((t) => t.is_featured);
  const otherTemplates = filteredTemplates.filter((t) => !t.is_featured);

  const categories: (TemplateCategory | 'all')[] = [
    'all',
    'profit_protection',
    'scale_winners',
    'pause_losers',
    'budget_optimization',
    'creative_management',
    'audience_optimization',
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Rule Templates
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Start with a proven automation strategy
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {category !== 'all' && categoryIcons[category as TemplateCategory]}
                {category === 'all' ? 'All Templates' : categoryLabels[category as TemplateCategory]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No templates found</p>
            </div>
          ) : (
            <div className="space-y-8">
              {featuredTemplates.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Featured Templates
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {featuredTemplates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onSelect={() => onSelectTemplate(template.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {otherTemplates.length > 0 && (
                <div>
                  {featuredTemplates.length > 0 && (
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      All Templates
                    </h3>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {otherTemplates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onSelect={() => onSelectTemplate(template.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface TemplateCardProps {
  template: RuleTemplate;
  onSelect: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onSelect }) => {
  return (
    <button
      onClick={onSelect}
      className="group text-left p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg transition-all bg-white dark:bg-gray-800"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex-shrink-0">
            {categoryIcons[template.category]}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {template.name}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {categoryLabels[template.category]}
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex-shrink-0 transition-colors" />
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
        {template.description}
      </p>

      {template.use_case_description && (
        <p className="text-xs text-gray-500 dark:text-gray-500 mb-3 line-clamp-2">
          {template.use_case_description}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`px-2 py-1 text-xs font-medium rounded ${
            difficultyColors[template.difficulty_level]
          }`}
        >
          {template.difficulty_level}
        </span>

        {template.success_rate && (
          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">
            {Math.round(template.success_rate * 100)}% success rate
          </span>
        )}

        {template.estimated_impact && (
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">
            {template.estimated_impact}
          </span>
        )}
      </div>

      {template.recommended_for && template.recommended_for.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium">Best for:</span> {template.recommended_for.join(', ')}
          </p>
        </div>
      )}
    </button>
  );
};

export default RuleTemplatesModal;
