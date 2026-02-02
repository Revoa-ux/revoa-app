import React, { useState } from 'react';
import { Check, ChevronDown, LayoutGrid, TrendingUp, Package, DollarSign, Megaphone, Globe } from 'lucide-react';
import { TemplateType } from '../../lib/analyticsService';

interface TemplateSelectorProps {
  currentTemplate: TemplateType;
  onTemplateChange: (template: TemplateType) => void;
  disabled?: boolean;
  isBlurred?: boolean;
}

const templates: Array<{
  id: TemplateType;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
}> = [
  {
    id: 'executive',
    name: 'Executive Overview',
    description: 'Key metrics for high-level business insights',
    icon: TrendingUp
  },
  {
    id: 'marketing',
    name: 'Marketing Performance',
    description: 'Ad performance, ROAS, and customer acquisition',
    icon: Megaphone
  },
  {
    id: 'inventory',
    name: 'Inventory Management',
    description: 'Stock levels, fulfillment, and order metrics',
    icon: Package
  },
  {
    id: 'financial',
    name: 'Financial Analysis',
    description: 'Detailed profit, costs, and financial ratios',
    icon: DollarSign
  },
  {
    id: 'cross_platform',
    name: 'Cross-Platform Performance',
    description: 'Combined and per-platform ad metrics from all sources',
    icon: Globe
  },
  {
    id: 'custom',
    name: 'Custom Layout',
    description: 'Your personalized dashboard configuration',
    icon: LayoutGrid
  }
];

export default function TemplateSelector({
  currentTemplate,
  onTemplateChange,
  disabled = false,
  isBlurred = false
}: TemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentTemplateData = templates.find(t => t.id === currentTemplate);
  const Icon = currentTemplateData?.icon || LayoutGrid;

  const handleTemplateSelect = (template: TemplateType) => {
    onTemplateChange(template);
    setIsOpen(false);
  };

  // Get first word for mobile display
  const getFirstWord = (name: string) => name.split(' ')[0];

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && !isBlurred && setIsOpen(!isOpen)}
        disabled={disabled || isBlurred}
        className={`h-[39px] px-4 bg-white dark:bg-dark border border-gray-200 dark:border-[#333333] rounded-lg ${!isBlurred ? 'hover:bg-gray-50 dark:hover:bg-[#2a2a2a]' : 'cursor-not-allowed'} transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <div className={`flex items-center space-x-2 ${isBlurred ? 'blur-sm pointer-events-none select-none' : ''}`}>
          <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <span className="sm:hidden text-sm font-medium text-gray-700 dark:text-gray-300">
            {currentTemplateData ? getFirstWord(currentTemplateData.name) : 'Select'}
          </span>
          <span className="hidden sm:inline text-sm font-medium text-gray-700 dark:text-gray-300">
            {currentTemplateData?.name || 'Select Template'}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-80 bg-white dark:bg-dark rounded-lg shadow-lg border border-gray-200 dark:border-[#333333] overflow-hidden z-50">
            {templates.map((template, index) => {
              const TemplateIcon = template.icon;
              const isActive = currentTemplate === template.id;

              return (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors ${
                    isActive ? 'bg-gray-50 dark:bg-[#2a2a2a]' : ''
                  } ${index === 0 ? 'rounded-t-lg' : ''} ${index === templates.length - 1 ? 'rounded-b-lg' : ''}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg mt-0.5 ${
                      isActive
                        ? 'bg-dark dark:bg-white'
                        : 'bg-gray-100 dark:bg-[#2a2a2a]'
                    }`}>
                      <TemplateIcon className={`w-4 h-4 ${
                        isActive
                          ? 'text-white dark:text-gray-900'
                          : 'text-gray-600 dark:text-gray-400'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          {template.name}
                        </h4>
                        {isActive && (
                          <Check className="w-4 h-4 text-rose-500 dark:text-rose-400 flex-shrink-0 ml-2" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {template.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
