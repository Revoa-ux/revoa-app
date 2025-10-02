import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Facebook, BrandTiktok, Brain, ChevronDown,
  RefreshCw
} from 'lucide-react';
import AdReportsTimeSelector, { TimeOption } from '@/components/reports/AdReportsTimeSelector';
import PerformanceOverview from '@/components/reports/PerformanceOverview';
import PerformanceScore from '@/components/reports/PerformanceScore';
import OptimizationPriorities from '@/components/reports/OptimizationPriorities';
import TotalScore from '@/components/reports/TotalScore';
import CreativeAnalysis from '@/components/reports/CreativeAnalysis';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

// Add mock creatives data
const mockCreatives = [
  {
    id: '1',
    type: 'image' as const,
    url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
    headline: 'Premium Wireless Earbuds',
    description: 'Experience crystal clear sound with our new wireless earbuds',
    adCopy: "🎧 Introducing our Premium Wireless Earbuds! Experience unmatched sound quality and comfort with our latest innovation. Features include:\n\n• 40-hour battery life\n• Active noise cancellation\n• Wireless charging\n• Water-resistant design\n\nLimited time offer: Get 20% off + free shipping! 🚚✨",
    ctaText: "Shop Now",
    metrics: {
      impressions: 12500,
      clicks: 450,
      ctr: 3.6,
      cpa: 18.75,
      spend: 850,
      conversions: 45,
      roas: 2.65,
      cpc: 1.89
    },
    performance: 'high' as const,
    fatigueScore: 35,
    adName: 'Earbuds Pro Max',
    platform: 'facebook',
    pageProfile: {
      name: "TechGear Pro",
      imageUrl: "https://images.unsplash.com/photo-1616469829581-73993eb86b02?w=200&h=200&fit=crop"
    }
  },
  {
    id: '2',
    type: 'video' as const,
    url: 'https://example.com/video.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
    headline: 'Next-Gen Gaming Headset',
    description: 'Immersive gaming experience with 7.1 surround sound',
    adCopy: "🎮 Level Up Your Gaming Experience!\n\nOur Next-Gen Gaming Headset delivers crystal-clear audio and pinpoint accuracy for competitive gaming. With 7.1 surround sound, you'll hear every footstep and detail.\n\n✨ Features:\n• Pro-grade 7.1 surround sound\n• Lightweight comfort design\n• RGB lighting effects\n• Discord-certified mic\n\n🏆 Trusted by pro gamers worldwide\n⚡ Free expedited shipping",
    ctaText: "Get Yours Now",
    metrics: {
      impressions: 8900,
      clicks: 280,
      ctr: 3.1,
      cpa: 22.50,
      spend: 630,
      conversions: 28,
      roas: 2.2,
      cpc: 2.25
    },
    performance: 'medium' as const,
    fatigueScore: 72,
    adName: 'Gaming Headset Demo',
    platform: 'facebook',
    pageProfile: {
      name: "Gaming Gear Hub",
      imageUrl: "https://images.unsplash.com/photo-1616469829581-73993eb86b02?w=200&h=200&fit=crop"
    }
  }
];

type AdAccount = {
  id: string;
  platform: 'facebook' | 'tiktok';
  accountId: string;
  accountName: string;
  status: 'active' | 'inactive';
};

 
const mockAdAccounts: AdAccount[] = [
  {
    id: '1',
    platform: 'facebook',
    accountId: '123456789',
    accountName: 'Main Ad Account',
    status: 'active'
  },
  {
    id: '2',
    platform: 'tiktok',
    accountId: '987654321',
    accountName: 'TikTok Ads',
    status: 'active'
  }
];

const mockPerformanceMetrics = {
  roas: {
    name: 'ROAS',
    value: 2.8,
    change: 12,
    data: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      value: 2.8 + Math.random() * 0.4 - 0.2
    }))
  },
  cpa: {
    name: 'CPA',
    value: 24.5,
    change: -8,
    data: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      value: 24.5 + Math.random() * 3 - 1.5
    }))
  },
  ctr: {
    name: 'CTR',
    value: 3.2,
    change: 15,
    data: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      value: 3.2 + Math.random() * 0.6 - 0.3
    }))
  }
};

const mockScores = {
  performance: 80,
  audience: 56,
  optimization: 48
};

const mockTotalScore = {
  score: 65,
  total: 51,
  maxScore: 79
};

const mockPriorities = [
  {
    id: '1',
    title: 'Optimize Campaign Budget Distribution',
    points: 15,
    description: 'Current budget allocation is not optimal across campaigns',
    recommendations: [
      'Reallocate budget from low-performing campaigns',
      'Increase budget for campaigns with ROAS > 2.5',
      'Test new audience segments with small budget'
    ]
  },
  {
    id: '2',
    title: 'Address Creative Fatigue',
    points: 12,
    description: 'Several ad creatives showing signs of performance decline',
    recommendations: [
      'Refresh creatives for campaigns running > 30 days',
      'Test new visual themes and messaging',
      'Archive underperforming creatives'
    ]
  },
  {
    id: '3',
    title: 'Improve Audience Targeting',
    points: 10,
    description: 'Current audience targeting is too broad and may be wasting ad spend',
    recommendations: [
      'Create more specific audience segments based on past purchase behavior',
      'Exclude audiences that have low conversion rates',
      'Test lookalike audiences with different similarity percentages'
    ]
  }
];

export default function Audit() {
  const [selectedTime, setSelectedTime] = useState<TimeOption>('7d');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endDate: new Date()
  });
  const [isLoading, setIsLoading] = useState(false);
  const [performanceData, setPerformanceData] = useState(mockPerformanceMetrics);

  const handleTimeChange = (time: TimeOption) => {
    setSelectedTime(time);
    refreshData();
  };

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
  };

  const handleApplyDateRange = () => {
    refreshData();
  };

  const refreshData = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const handleConnectPlatform = (platform: 'facebook' | 'tiktok') => {
    console.log('Connecting to', platform);
  };

  const getTimePeriodText = (time: TimeOption): string => {
    switch (time) {
      case '24h': return 'Last 24 hours';
      case '7d': return 'Last 7 days';
      case '14d': return 'Last 14 days';
      case '30d': return 'Last 30 days';
      case '60d': return 'Last 60 days';
      case '90d': return 'Last 90 days';
      case 'this_month': return 'This month';
      case 'last_month': return 'Last month';
      case 'ytd': return 'Year to date';
      case 'custom': return 'Custom range';
      default: return 'Last 7 days';
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
            Ad Reports
          </h1>
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {mockCreatives.length} creatives <span className="inline-block mx-1.5">•</span> {getTimePeriodText(selectedTime)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2"
            onClick={refreshData}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Refreshing...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </>
            )}
          </button>
          <AdReportsTimeSelector
            selectedTime={selectedTime}
            onTimeChange={handleTimeChange}
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            onApply={handleApplyDateRange}
          />
        </div>
      </div>

      {(!mockAdAccounts.find(a => a.platform === 'facebook') || !mockAdAccounts.find(a => a.platform === 'tiktok')) && (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-white dark:bg-gray-700 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Connect Your Ad Platforms</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Connect your advertising accounts to get started with the audit</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {!mockAdAccounts.find(a => a.platform === 'facebook') && (
                <button
                  onClick={() => handleConnectPlatform('facebook')}
                  className="px-4 py-2 text-sm text-white bg-[#1877F2] rounded-lg hover:bg-[#1877F2]/90 transition-colors flex items-center whitespace-nowrap"
                >
                  <Facebook className="w-4 h-4 mr-2" />
                  Connect Facebook
                </button>
              )}
              {!mockAdAccounts.find(a => a.platform === 'tiktok') && (
                <button
                  onClick={() => handleConnectPlatform('tiktok')}
                  className="px-4 py-2 text-sm text-white bg-black rounded-lg hover:bg-black/90 transition-colors flex items-center whitespace-nowrap"
                >
                  <BrandTiktok className="w-4 h-4 mr-2" />
                  Connect TikTok
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <PerformanceOverview metrics={performanceData} />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Account Overview</h2>
            </div>
            <PerformanceScore scores={mockScores} />
            
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <OptimizationPriorities priorities={mockPriorities} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <TotalScore {...mockTotalScore} />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full px-4 py-3 text-left bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center justify-between group">
                <div className="flex items-center">
                  <Brain className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400" />
                  <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">Run AI Analysis</span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </button>
              <button className="w-full px-4 py-3 text-left bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center justify-between group">
                <div className="flex items-center">
                  <Brain className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400" />
                  <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">View Full Report</span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </button>
              <button className="w-full px-4 py-3 text-left bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center justify-between group">
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400" />
                  <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">View Issues</span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <CreativeAnalysis 
          creatives={mockCreatives} 
          selectedTime={selectedTime}
          onTimeChange={handleTimeChange} 
        />
      </div>
    </div>
  );
}