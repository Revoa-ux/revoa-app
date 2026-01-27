import React, { useState, useEffect } from 'react';
import { X, Search, TrendingUp, Shield, Zap, Target, ChevronRight, Sparkles } from 'lucide-react';
import { automationRulesService } from '@/lib/automationRulesService';
import type { RuleTemplate, TemplateCategory } from '@/types/automation';
import Modal from '@/components/Modal';

interface RuleTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId: string) => void;
  adAccountId?: string;
}

const categoryIcons: Record<TemplateCategory, React.ReactNode> = {
  profit_protection: <Shield className="w-4 h-4" />,
  scale_winners: <TrendingUp className="w-4 h-4" />,
  pause_losers: <Target className="w-4 h-4" />,
  budget_optimization: <Zap className="w-4 h-4" />,
  creative_management: <Sparkles className="w-4 h-4" />,
  audience_optimization: <Target className="w-4 h-4" />,
  custom: <Zap className="w-4 h-4" />,
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
  advanced: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
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
      <div className="bg-white dark:bg-dark rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-dark border-b border-gray-200 dark:border-[#3a3a3a] px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-normal text-gray-900 dark:text-white">
              Rule Templates
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Start with a proven automation strategy
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-dark/50 border-b border-gray-200 dark:border-[#3a3a3a] flex-shrink-0">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 focus:border-transparent transition-all"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${
                  selectedCategory === category
                    ? 'bg-gray-800 dark:bg-[#3a3a3a] text-white shadow-sm'
                    : 'bg-white dark:bg-dark text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#3a3a3a] hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50'
                }`}
              >
                {category !== 'all' && categoryIcons[category as TemplateCategory]}
                <span>{category === 'all' ? 'All' : categoryLabels[category as TemplateCategory]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-dark/30">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-gray-800 dark:border-[#3a3a3a] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No templates found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="space-y-8">
              {featuredTemplates.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 rounded-lg flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-red-500" />
                    </div>
                    <h3 className="text-lg font-normal text-gray-900 dark:text-white">
                      Featured Templates
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    <h3 className="text-lg font-normal text-gray-900 dark:text-white mb-4">
                      All Templates
                    </h3>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
      className="group text-left p-4 border border-gray-200 dark:border-[#3a3a3a] rounded-lg hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-md transition-all bg-white dark:bg-dark h-full flex flex-col"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="p-2 bg-gray-100 dark:bg-[#3a3a3a] text-gray-600 dark:text-gray-400 rounded-lg flex-shrink-0">
            {categoryIcons[template.category]}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-normal text-gray-900 dark:text-white text-sm">
              {template.name}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {categoryLabels[template.category]}
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 flex-shrink-0 transition-colors mt-1" />
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2 flex-1">
        {template.description}
      </p>

      <div className="flex items-center gap-2 flex-wrap mt-auto">
        <span
          className={`px-2 py-1 text-xs rounded ${
            difficultyColors[template.difficulty_level]
          }`}
        >
          {template.difficulty_level}
        </span>

        {template.success_rate && (
          <span className="px-2 py-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">
            {Math.round(template.success_rate * 100)}% success
          </span>
        )}

        {template.estimated_impact && (
          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 dark:bg-[#3a3a3a] dark:text-gray-300 rounded">
            {template.estimated_impact}
          </span>
        )}
      </div>
    </button>
  );
};

export default RuleTemplatesModal;
