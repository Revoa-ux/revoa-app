import React, { useState, useEffect, useRef } from 'react';
import {
  Facebook,
  Search,
  AlertTriangle,
  X,
  ChevronDown,
  Check,
  GitBranch as BrandTiktok,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { AdAccount, AdInsight, AdCheckItem } from '@/types/ads';
import { PerformanceScore } from '@/components/reports/PerformanceScore';
import { TotalScore } from '@/components/reports/TotalScore';
import { OptimizationPriorities } from '@/components/reports/OptimizationPriorities';
import { PerformanceOverview } from '@/components/reports/PerformanceOverview';
import { CreativeAnalysis } from '@/components/reports/CreativeAnalysis';
import AdReportsTimeSelector, { TimeOption } from '@/components/reports/AdReportsTimeSelector';
import { getAdReportsMetrics, getCreativePerformance } from '@/lib/adReportsService';
import { useConnectionStore } from '@/lib/connectionStore';

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

  // Initialize date range for 7 days (same as Dashboard and Calculator)
  const initialEndDate = new Date();
  initialEndDate.setHours(23, 59, 59, 999);
  const initialStartDate = new Date(initialEndDate);
  initialStartDate.setDate(initialStartDate.getDate() - 7);
  initialStartDate.setHours(0, 0, 0, 0);

  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: initialStartDate,
    endDate: initialEndDate
  });
  const [isLoading, setIsLoading] = useState(false);
  const [performanceData, setPerformanceData] = useState(mockPerformanceMetrics);
  const [creatives, setCreatives] = useState(mockCreatives);
  const [hasRealData, setHasRealData] = useState(false);

  // Use centralized connection store
  const { facebook } = useConnectionStore();

  const handleTimeChange = (time: TimeOption) => {
    setSelectedTime(time);

    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (time) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '7d':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '14d':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 14);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '30d':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '60d':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 60);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '90d':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 90);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'ytd':
        startDate = new Date(now.getFullYear(), 0, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        // Don't update date range for custom - user will set it manually
        return;
      default:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
    }

    console.log('[Audit] Time changed to:', time, 'Range:', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);
    setDateRange({ startDate, endDate });
  };

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
  };

  const handleApplyDateRange = () => {
    refreshData();
  };

  const refreshData = async () => {
    if (!facebook.isConnected) {
      toast.error('Please connect your Facebook Ads account in Settings');
      return;
    }

    setIsLoading(true);
    try {
      const startDate = dateRange.startDate.toISOString().split('T')[0];
      const endDate = dateRange.endDate.toISOString().split('T')[0];

      console.log('[Audit] Fetching real ad data:', { startDate, endDate });

      // Fetch real metrics and creatives
      const [metrics, creativesData] = await Promise.all([
        getAdReportsMetrics(startDate, endDate),
        getCreativePerformance(startDate, endDate)
      ]);

      console.log('[Audit] Received data:', { metrics, creativesCount: creativesData.length });

      setPerformanceData(metrics);
      if (creativesData.length > 0) {
        setCreatives(creativesData);
        setHasRealData(true);
      } else {
        // Keep mock data if no real data available
        setHasRealData(false);
      }

      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('[Audit] Error refreshing data:', error);
      toast.error('Failed to refresh ad data');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount and when Facebook is connected
  useEffect(() => {
    if (facebook.isConnected) {
      refreshData();
    }
  }, [facebook.isConnected]);

  // Refresh data when date range changes
  useEffect(() => {
    if (facebook.isConnected) {
      refreshData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.startDate.getTime(), dateRange.endDate.getTime()]);

  const handleConnectPlatform = (platform: 'facebook' | 'tiktok') => {
    console.log('Connecting to', platform);
  };

  const getTimePeriodText = (time: TimeOption): string => {
    switch (time) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
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
              {creatives.length} creatives <span className="inline-block mx-1.5">•</span> {getTimePeriodText(selectedTime)} {hasRealData && <span className="text-green-500">• Live Data</span>}
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

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <PerformanceOverview metrics={performanceData} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <CreativeAnalysis
          creatives={creatives}
          selectedTime={selectedTime}
          onTimeChange={handleTimeChange}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Account Overview</h2>
          </div>
          <PerformanceScore scores={mockScores} />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <TotalScore {...mockTotalScore} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <OptimizationPriorities priorities={mockPriorities} />
      </div>
    </div>
  );
}