import React, { useState, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Eye, Target, TrendingUp, ChevronDown, Check } from 'lucide-react';
import { useClickOutside } from '@/lib/useClickOutside';

interface Competitor {
  id: string;
  name: string;
  metrics: {
    shareOfVoice: number;
    avgEngagement: number;
    totalAds: number;
    topPerformingAds: Array<{
      id: string;
      type: 'image' | 'video';
      thumbnail: string;
      engagement: number;
    }>;
  };
  targeting: {
    interests: string[];
    demographics: string[];
    placements: string[];
  };
}

interface CompetitiveAnalysisProps {
  competitors: Competitor[];
  industryBenchmarks: {
    ctr: number;
    cpc: number;
    conversionRate: number;
  };
}

export const CompetitiveAnalysis: React.FC<CompetitiveAnalysisProps> = ({
  competitors,
  industryBenchmarks
}) => {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('7d');
  const [showTimeframeDropdown, setShowTimeframeDropdown] = useState(false);
  
  const timeframeRef = useRef<HTMLDivElement>(null);
  
  useClickOutside(timeframeRef, () => setShowTimeframeDropdown(false));

  // Format number to be more readable
  const formatYAxisTick = (value: number) => {
    // For percentages or small numbers, show with 1 decimal place
    if (value < 10) {
      return value.toFixed(1);
    }
    
    // For larger numbers, simplify
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    
    // For medium numbers, round to nearest whole number
    return Math.round(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">Competitive Analysis</h2>
        <div className="flex items-center space-x-4">
          <div className="relative" ref={timeframeRef}>
            <button
              onClick={() => setShowTimeframeDropdown(!showTimeframeDropdown)}
              className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors w-[180px]"
            >
              {timeframe === '7d' ? 'Last 7 days' : 
               timeframe === '30d' ? 'Last 30 days' : 'Last 90 days'}
              <ChevronDown className="w-4 h-4 ml-2 text-gray-400" />
            </button>
            
            {showTimeframeDropdown && (
              <div className="absolute right-0 mt-2 w-[180px] bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button
                  onClick={() => {
                    setTimeframe('7d');
                    setShowTimeframeDropdown(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
                >
                  {timeframe === '7d' && <Check className="w-4 h-4 mr-2 text-primary-500" />}
                  <span className={timeframe === '7d' ? 'ml-6' : ''}>Last 7 days</span>
                </button>
                <button
                  onClick={() => {
                    setTimeframe('30d');
                    setShowTimeframeDropdown(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
                >
                  {timeframe === '30d' && <Check className="w-4 h-4 mr-2 text-primary-500" />}
                  <span className={timeframe === '30d' ? 'ml-6' : ''}>Last 30 days</span>
                </button>
                <button
                  onClick={() => {
                    setTimeframe('90d');
                    setShowTimeframeDropdown(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
                >
                  {timeframe === '90d' && <Check className="w-4 h-4 mr-2 text-primary-500" />}
                  <span className={timeframe === '90d' ? 'ml-6' : ''}>Last 90 days</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Eye className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="text-base font-medium text-gray-900">Share of Voice</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={competitors.map(c => ({
                  name: c.name,
                  value: c.metrics.shareOfVoice
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={formatYAxisTick} />
                <Tooltip formatter={(value) => [`${value}%`, 'Share of Voice']} />
                <Bar dataKey="value" fill="#F43F5E" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-green-50 rounded-lg">
              <Target className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="text-base font-medium text-gray-900">Targeting Analysis</h3>
          </div>
          <div className="space-y-4">
            {competitors.map(competitor => (
              <div key={competitor.id}>
                <h4 className="text-sm font-medium text-gray-900 mb-2">{competitor.name}</h4>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {competitor.targeting.interests.map((interest, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-purple-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <h3 className="text-base font-medium text-gray-900">Industry Benchmarks</h3>
          </div>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">CTR</span>
                <span className="text-sm font-medium text-gray-900">
                  {industryBenchmarks.ctr.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full">
                <div
                  className="h-full bg-primary-500 rounded-full"
                  style={{ width: `${industryBenchmarks.ctr * 5}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">CPC</span>
                <span className="text-sm font-medium text-gray-900">
                  ${industryBenchmarks.cpc.toFixed(2)}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full">
                <div
                  className="h-full bg-primary-500 rounded-full"
                  style={{ width: `${industryBenchmarks.cpc * 10}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Conversion Rate</span>
                <span className="text-sm font-medium text-gray-900">
                  {industryBenchmarks.conversionRate.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full">
                <div
                  className="h-full bg-primary-500 rounded-full"
                  style={{ width: `${industryBenchmarks.conversionRate * 5}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};