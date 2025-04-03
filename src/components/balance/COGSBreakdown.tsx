import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Info, ChevronRight } from 'lucide-react';

interface CategoryBreakdown {
  category: string;
  amount: number;
  percentageChange: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  note?: string;
}

interface COGSBreakdownProps {
  data: {
    [key in '7d' | '14d' | '30d']: {
      period: string;
      breakdown: CategoryBreakdown[];
    };
  };
}

export const COGSBreakdown: React.FC<COGSBreakdownProps> = ({ data }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '14d' | '30d'>('7d');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const getPercentageColor = (value: number): string => {
    if (value > 10) return 'text-red-600 bg-red-50 border-red-100';
    if (value > 5) return 'text-orange-600 bg-orange-50 border-orange-100';
    if (value < 0) return 'text-green-600 bg-green-50 border-green-100';
    return 'text-gray-600 bg-gray-50 border-gray-100';
  };

  const getTrendIcon = (trend: 'increasing' | 'decreasing' | 'stable') => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'decreasing':
        return <TrendingDown className="w-4 h-4 text-green-500" />;
      default:
        return <div className="w-4 h-4 rounded-full bg-gray-200" />;
    }
  };

  const currentData = data[selectedPeriod];

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Cost Categories</h2>
          <p className="text-sm text-gray-500 mt-1">Detailed cost breakdown by category</p>
        </div>
        <div className="flex items-center space-x-2 bg-white rounded-lg border border-gray-200 p-1">
          <button
            onClick={() => setSelectedPeriod('7d')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              selectedPeriod === '7d'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            7d
          </button>
          <button
            onClick={() => setSelectedPeriod('14d')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              selectedPeriod === '14d'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            14d
          </button>
          <button
            onClick={() => setSelectedPeriod('30d')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              selectedPeriod === '30d'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            30d
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {currentData.breakdown.map((category) => (
          <div key={category.category} className="border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleCategory(category.category)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg"
            >
              <div className="flex items-center space-x-3">
                {getTrendIcon(category.trend)}
                <div className="text-left">
                  <h3 className="text-sm font-medium text-gray-900">{category.category}</h3>
                  <p className="text-sm text-gray-500">${category.amount.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className={`px-2 py-1 rounded-lg border text-xs ${
                  getPercentageColor(category.percentageChange)
                }`}>
                  {category.percentageChange > 0 ? '+' : ''}{category.percentageChange}%
                </div>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                  expandedCategories.includes(category.category) ? 'rotate-90' : ''
                }`} />
              </div>
            </button>
            
            {expandedCategories.includes(category.category) && (
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                <div className="flex items-start space-x-2">
                  <Info className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">{category.note}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};