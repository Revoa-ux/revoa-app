import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Search,
  X,
  Package,
  ExternalLink,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Filter,
  Check,
  Facebook,
  Play,
  Image as ImageIcon,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Target,
  GripVertical
} from 'lucide-react';
import { useClickOutside } from '@/lib/useClickOutside';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { CustomCheckbox } from '@/components/CustomCheckbox';
import { RexSuggestionBadge } from './RexSuggestionBadge';
import { ExpandedSuggestionRow } from './ExpandedSuggestionRow';
import type { RexSuggestionWithPerformance } from '@/types/rex';

interface CreativeAnalysisEnhancedProps {
  creatives?: any[];
  selectedTime?: string;
  onTimeChange?: (time: string) => void;
  showAIInsights?: boolean;
  viewLevel?: 'campaigns' | 'adsets' | 'ads';
  onDrillDown?: (item: any) => void;
  rexSuggestions?: Map<string, RexSuggestionWithPerformance>;
  topDisplayedSuggestionIds?: Set<string>;
  onViewSuggestion?: (suggestion: RexSuggestionWithPerformance) => void;
  onAcceptSuggestion?: (suggestion: RexSuggestionWithPerformance) => Promise<void>;
  onDismissSuggestion?: (suggestion: RexSuggestionWithPerformance, reason?: string) => Promise<void>;
}

interface Column {
  id: string;
  label: string;
  width: number;
  flexGrow?: number;
  flexShrink?: number;
  sortable?: boolean;
  render?: (value: any, item: any) => React.ReactNode;
}

type SortDirection = 'asc' | 'desc';

export const CreativeAnalysisEnhanced: React.FC<CreativeAnalysisEnhancedProps> = ({
  creatives = [],
  showAIInsights = true,
  viewLevel = 'ads',
  onDrillDown,
  rexSuggestions = new Map(),
  topDisplayedSuggestionIds = new Set(),
  onViewSuggestion,
  onAcceptSuggestion,
  onDismissSuggestion
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['all']);
  const [selectedCreatives, setSelectedCreatives] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{
    field: string;
    direction: SortDirection;
  }>({
    field: 'profit',
    direction: 'desc'
  });
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showPlatformFilter, setShowPlatformFilter] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [imageLoading, setImageLoading] = useState<Set<string>>(new Set());
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [rexFilter, setRexFilter] = useState<'all' | 'suggestions' | 'rules_active'>('all');
  const [itemsToShow, setItemsToShow] = useState(20);
  const [showAllItems, setShowAllItems] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [isResizing, setIsResizing] = useState(false);
  const [resizingColumnId, setResizingColumnId] = useState<string | null>(null);

  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const platformFilterRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  useClickOutside(filterDropdownRef, () => setShowFilterDropdown(false));
  useClickOutside(platformFilterRef, () => setShowPlatformFilter(false));

  useEffect(() => {
    const tableElement = tableRef.current;
    const headerElement = headerRef.current;

    if (!tableElement || !headerElement) return;

    const handleScroll = () => {
      if (headerElement) {
        headerElement.scrollLeft = tableElement.scrollLeft;
      }
    };

    tableElement.addEventListener('scroll', handleScroll);
    return () => tableElement.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Initialize loading state for all creatives with images
    const creativesWithImages = creatives
      .filter(c => c.thumbnail || c.url)
      .map(c => c.id);
    setImageLoading(new Set(creativesWithImages));
    setImageErrors(new Set());
  }, [creatives]);

  // Helper function to get abbreviated column label
  const getColumnLabel = (label: string, width: number): string => {
    // Define the threshold where we start abbreviating (considering sort icon space)
    const abbreviationThreshold = 90;

    if (width < abbreviationThreshold && label.length > 6) {
      // Return first 4 letters + period
      return label.substring(0, 4) + '.';
    }
    return label;
  };

  // Column resize handler
  const handleColumnResize = useCallback((columnId: string, startX: number, startWidth: number, minWidth: number) => {
    setIsResizing(true);
    setResizingColumnId(columnId);

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      // Use the column's defined width as minimum to prevent header text overlap
      const newWidth = Math.max(minWidth, startWidth + delta);
      setColumnWidths(prev => ({ ...prev, [columnId]: newWidth }));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizingColumnId(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const platforms = [
    { id: 'all', name: 'All Platforms', icon: Filter },
    { id: 'facebook', name: 'Facebook', icon: Facebook },
    { id: 'tiktok', name: 'TikTok', icon: Play },
    { id: 'google', name: 'Google Ads', icon: ImageIcon }
  ];


  const columns: Column[] = [
    {
      id: 'select',
      label: '',
      width: 50,
      flexGrow: 0,
      flexShrink: 0,
      render: (_, creative) => (
        <CustomCheckbox
          checked={selectedCreatives.has(creative.id)}
          onChange={(e) => {
            e.stopPropagation();
            const newSelected = new Set(selectedCreatives);
            if (newSelected.has(creative.id)) {
              newSelected.delete(creative.id);
            } else {
              newSelected.add(creative.id);
            }
            setSelectedCreatives(newSelected);
          }}
        />
      )
    },
    {
      id: 'creative',
      label: 'Creative',
      width: 80,
      flexGrow: 0,
      flexShrink: 0,
      render: (_, creative) => {
        const adsManagerUrl = creative.platform === 'facebook' && creative.id && creative.adAccountId
          ? `https://business.facebook.com/adsmanager/manage/ads?act=${creative.adAccountId.replace('act_', '')}&selected_ad_ids=${creative.id}`
          : null;

        const hasImageError = imageErrors.has(creative.id);
        const isImageLoading = imageLoading.has(creative.id);

        return (
          <div className="flex items-center">
            <div className="w-10 h-10 relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 group">
              {(creative.thumbnail || creative.url) && !hasImageError ? (
                <>
                  {isImageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                    </div>
                  )}
                  <img
                    src={creative.thumbnail || creative.url}
                    alt=""
                    className="w-full h-full object-cover"
                    onLoad={() => {
                      setImageLoading(prev => {
                        const next = new Set(prev);
                        next.delete(creative.id);
                        return next;
                      });
                    }}
                    onError={() => {
                      setImageErrors(prev => new Set([...prev, creative.id]));
                      setImageLoading(prev => {
                        const next = new Set(prev);
                        next.delete(creative.id);
                        return next;
                      });
                    }}
                  />
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-5 h-5 text-gray-400" />
                </div>
              )}
              {adsManagerUrl && !isImageLoading && (
                <a
                  href={adsManagerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-5 h-5 text-white" />
                </a>
              )}
            </div>
          </div>
        );
      }
    },
    {
      id: 'adName',
      label: viewLevel === 'campaigns' ? 'Campaign Name' : viewLevel === 'adsets' ? 'Ad Set Name' : 'Ad Name',
      width: 200,
      flexGrow: 2,
      flexShrink: 1,
      sortable: true
    },
    { id: 'platform', label: 'Platform', width: 100, flexGrow: 0, flexShrink: 0, sortable: true },
    { id: 'performance', label: 'Performance', width: 120, flexGrow: 0, flexShrink: 0, sortable: true },
    { id: 'fatigueScore', label: 'Fatigue', width: 100, flexGrow: 0, flexShrink: 0, sortable: true },
    { id: 'impressions', label: 'Impressions', width: 120, flexGrow: 1, flexShrink: 1, sortable: true },
    { id: 'clicks', label: 'Clicks', width: 100, flexGrow: 1, flexShrink: 1, sortable: true },
    { id: 'ctr', label: 'CTR', width: 80, flexGrow: 1, flexShrink: 1, sortable: true },
    { id: 'spend', label: 'Spend', width: 100, flexGrow: 1, flexShrink: 1, sortable: true },
    { id: 'conversions', label: 'Conv.', width: 80, flexGrow: 1, flexShrink: 1, sortable: true },
    { id: 'cpa', label: 'CPA', width: 80, flexGrow: 1, flexShrink: 1, sortable: true },
    { id: 'roas', label: 'ROAS', width: 80, flexGrow: 1, flexShrink: 1, sortable: true },
    { id: 'profit', label: 'Profit', width: 100, flexGrow: 1, flexShrink: 1, sortable: true },
    { id: 'profitMargin', label: 'Margin %', width: 100, flexGrow: 1, flexShrink: 1, sortable: true },
    { id: 'netROAS', label: 'Net ROAS', width: 100, flexGrow: 1, flexShrink: 1, sortable: true }
  ].filter(col => {
    if (col.id === 'creative' && (viewLevel === 'campaigns' || viewLevel === 'adsets')) {
      return false;
    }
    return true;
  });

  const handleSort = (field: string) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handlePlatformFilter = (platformId: string) => {
    if (platformId === 'all') {
      setSelectedPlatforms(['all']);
    } else {
      const newPlatforms = selectedPlatforms.filter(p => p !== 'all');
      if (newPlatforms.includes(platformId)) {
        const filtered = newPlatforms.filter(p => p !== platformId);
        setSelectedPlatforms(filtered.length === 0 ? ['all'] : filtered);
      } else {
        setSelectedPlatforms([...newPlatforms, platformId]);
      }
    }
  };


  const handleSelectAll = () => {
    if (selectedCreatives.size === filteredCreatives.length) {
      setSelectedCreatives(new Set());
    } else {
      setSelectedCreatives(new Set(filteredCreatives.map(c => c.id)));
    }
  };

  const handleExportCSV = async () => {
    try {
      if (filteredCreatives.length === 0) {
        toast.error('No data to export');
        return;
      }

      const headers = [
        'Ad Name',
        'Platform',
        'Performance',
        'Fatigue Score',
        'Impressions',
        'Clicks',
        'CTR (%)',
        'Spend',
        'Conversions',
        'CPA',
        'ROAS',
        'Profit',
        'Profit Margin (%)',
        'Net ROAS'
      ];

      const rows = filteredCreatives.map(c => [
        c.adName || '-',
        c.platform || 'facebook',
        c.performance,
        Math.round(c.fatigueScore),
        c.metrics.impressions,
        c.metrics.clicks,
        c.metrics.ctr.toFixed(2),
        c.metrics.spend.toFixed(2),
        c.metrics.conversions,
        c.metrics.cpa.toFixed(2),
        c.metrics.roas?.toFixed(2) || '0.00',
        c.metrics.profit?.toFixed(2) || '0.00',
        c.metrics.profitMargin?.toFixed(2) || '0.00',
        c.metrics.netROAS?.toFixed(2) || '0.00'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `ad-performance-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Log export to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('ad_export_history').insert({
          user_id: user.id,
          export_type: 'csv',
          file_name: `ad-performance-${new Date().toISOString().split('T')[0]}.csv`,
          date_range_start: new Date().toISOString().split('T')[0],
          date_range_end: new Date().toISOString().split('T')[0],
          row_count: filteredCreatives.length,
          filters: {
            platforms: selectedPlatforms,
            performance: selectedPerformance,
            search: searchTerm
          }
        });
      }

      toast.success('Exported ' + filteredCreatives.length + ' creatives to CSV');
    } catch (error) {
      console.error('[Export] Error:', error);
      toast.error('Failed to export data');
    }
  };

  const getSortedCreatives = (items: any[]) => {
    return [...items].sort((a, b) => {
      const direction = sortConfig.direction === 'asc' ? 1 : -1;

      const getValue = (item: any, field: string) => {
        switch (field) {
          case 'adName':
            return item.adName || '';
          case 'platform':
            return item.platform || 'facebook';
          case 'performance':
            return item.performance === 'high' ? 3 : item.performance === 'medium' ? 2 : 1;
          case 'fatigueScore':
            return item.fatigueScore || 0;
          case 'impressions':
            return item.metrics.impressions || 0;
          case 'clicks':
            return item.metrics.clicks || 0;
          case 'ctr':
            return item.metrics.ctr || 0;
          case 'spend':
            return item.metrics.spend || 0;
          case 'conversions':
            return item.metrics.conversions || 0;
          case 'cpa':
            return item.metrics.cpa || 0;
          case 'roas':
            return item.metrics.roas || 0;
          case 'profit':
            return item.metrics.profit || 0;
          case 'profitMargin':
            return item.metrics.profitMargin || 0;
          case 'netROAS':
            return item.metrics.netROAS || 0;
          default:
            return 0;
        }
      };

      const aVal = getValue(a, sortConfig.field);
      const bVal = getValue(b, sortConfig.field);

      if (typeof aVal === 'string') {
        return aVal.localeCompare(bVal) * direction;
      }
      return (aVal - bVal) * direction;
    });
  };

  const filteredCreatives = creatives.filter(creative => {
    const matchesSearch =
      creative.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      creative.adName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPlatform =
      selectedPlatforms.includes('all') ||
      selectedPlatforms.includes(creative.platform || 'facebook');

    const matchesRexFilter = (() => {
      if (rexFilter === 'all') return true;
      const suggestion = rexSuggestions.get(creative.id);
      if (!suggestion) return false;
      if (rexFilter === 'suggestions') {
        return suggestion.status === 'pending' || suggestion.status === 'viewed';
      }
      if (rexFilter === 'rules_active') {
        return suggestion.status === 'applied' || suggestion.status === 'monitoring';
      }
      return true;
    })();

    return matchesSearch && matchesPlatform && matchesRexFilter;
  });

  const sortedCreatives = getSortedCreatives(filteredCreatives);

  // Pagination logic
  const displayedCreatives = showAllItems ? sortedCreatives : sortedCreatives.slice(0, itemsToShow);

  // Calculate totals for all sorted creatives
  const totals = sortedCreatives.reduce((acc, creative) => {
    return {
      impressions: acc.impressions + (creative.metrics?.impressions || 0),
      clicks: acc.clicks + (creative.metrics?.clicks || 0),
      spend: acc.spend + (creative.metrics?.spend || 0),
      conversions: acc.conversions + (creative.metrics?.conversions || 0),
      cpa: 0, // Will calculate after
      profit: acc.profit + (creative.metrics?.profit || 0),
      profitMargin: 0, // Will calculate after
      roas: 0, // Will calculate after
      netROAS: 0, // Will calculate after
      ctr: 0, // Will calculate after
    };
  }, {
    impressions: 0,
    clicks: 0,
    spend: 0,
    conversions: 0,
    cpa: 0,
    profit: 0,
    profitMargin: 0,
    roas: 0,
    netROAS: 0,
    ctr: 0,
  });

  // Calculate derived metrics
  if (totals.conversions > 0) {
    totals.cpa = totals.spend / totals.conversions;
  }
  if (totals.impressions > 0) {
    totals.ctr = (totals.clicks / totals.impressions) * 100;
  }
  if (totals.spend > 0) {
    const revenue = totals.conversions * 50; // Assuming average order value, adjust as needed
    totals.roas = revenue / totals.spend;
    totals.profitMargin = (totals.profit / totals.spend) * 100;
    totals.netROAS = (totals.profit + totals.spend) / totals.spend;
  }

  const getSortIcon = (field: string) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-300 dark:text-gray-600" />;
    }
    return sortConfig.direction === 'asc'
      ? <ArrowUp className="w-4 h-4 text-gray-900 dark:text-white" />
      : <ArrowDown className="w-4 h-4 text-gray-900 dark:text-white" />;
  };

  const activeFilters = [];
  if (!selectedPlatforms.includes('all')) {
    activeFilters.push(`${selectedPlatforms.length} platform(s)`);
  }

  // Generate AI Insights
  const generateInsights = () => {
    const insights: any[] = [];

    if (creatives.length === 0 || !showAIInsights) {
      return insights;
    }

    // Find top performer
    const topPerformer = [...creatives].sort((a, b) =>
      (b.metrics.roas || 0) - (a.metrics.roas || 0)
    )[0];

    if (topPerformer && topPerformer.metrics.roas > 1) {
      insights.push({
        id: 'top-performer',
        type: 'top_performer',
        title: 'Top Performer Detected',
        description: `"${topPerformer.adName}" is delivering ${topPerformer.metrics.roas.toFixed(2)}x ROAS with ${topPerformer.metrics.conversions} conversions.`,
        metric: `${topPerformer.metrics.roas.toFixed(2)}x ROAS`,
        confidence: 'high'
      });
    }

    // Find creatives needing attention
    const needsAttention = creatives.filter(c =>
      c.fatigueScore > 70 || (c.metrics.spend > 100 && c.performance === 'low')
    );

    if (needsAttention.length > 0) {
      insights.push({
        id: 'needs-attention',
        type: 'needs_attention',
        title: 'Creatives Need Attention',
        description: `${needsAttention.length} ${needsAttention.length === 1 ? 'creative shows' : 'creatives show'} signs of fatigue or underperformance. Consider refreshing or pausing.`,
        confidence: 'high'
      });
    }

    // Budget recommendation
    const highPerformers = creatives.filter(c => c.metrics.roas > 2 && c.metrics.conversions > 5);
    if (highPerformers.length > 0) {
      const totalHighPerformerSpend = highPerformers.reduce((sum, c) => sum + c.metrics.spend, 0);
      const totalSpend = creatives.reduce((sum, c) => sum + c.metrics.spend, 0);
      const percentage = (totalHighPerformerSpend / totalSpend) * 100;

      if (percentage < 60) {
        insights.push({
          id: 'budget-recommendation',
          type: 'budget',
          title: 'Scale High Performers',
          description: `Only ${percentage.toFixed(0)}% of budget is going to ads with 2x+ ROAS. Consider reallocating budget to your ${highPerformers.length} top performers.`,
          confidence: 'high'
        });
      }
    }

    return insights;
  };

  const insights = generateInsights();
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());
  const visibleInsights = insights.filter(i => !dismissedInsights.has(i.id));

  const handleDismissInsight = (insightId: string) => {
    setDismissedInsights(prev => new Set([...prev, insightId]));
  };

  const isLoading = creatives.length === 0;

  return (
    <div className="h-full flex flex-col space-y-4">
      {showAIInsights && visibleInsights.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <Sparkles className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">AI Insights</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">AI-detected patterns and recommendations</span>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {visibleInsights.map((insight) => (
              <div
                key={insight.id}
                className="relative bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
              >
                <button
                  onClick={() => handleDismissInsight(insight.id)}
                  className="absolute top-3 right-3 p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded transition-colors"
                  title="Dismiss insight"
                >
                  <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                </button>
                <div className="flex items-start space-x-3 pr-8">
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                    {insight.type === 'top_performer' && <TrendingUp className="w-5 h-5 text-white" />}
                    {insight.type === 'needs_attention' && <AlertTriangle className="w-5 h-5 text-white" />}
                    {insight.type === 'budget' && <Target className="w-5 h-5 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                      {insight.title}
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      {insight.description}
                    </p>
                    {insight.metric && (
                      <div className="inline-flex items-center px-2.5 py-1 bg-white dark:bg-gray-800 rounded text-xs font-mono font-medium text-gray-900 dark:text-white">
                        {insight.metric}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">
          {viewLevel === 'campaigns' ? 'Campaign Manager' : viewLevel === 'adsets' ? 'Ad Set Manager' : 'Ad Manager'}
        </h2>
        <div className="flex items-center space-x-3">
          {selectedCreatives.size > 0 && (
            <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedCreatives.size} selected
              </span>
              <button
                onClick={() => setSelectedCreatives(new Set())}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Clear
              </button>
            </div>
          )}

          <div className="relative" ref={platformFilterRef}>
            <button
              onClick={() => setShowPlatformFilter(!showPlatformFilter)}
              className="flex items-center space-x-2 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>Platform</span>
              {!selectedPlatforms.includes('all') && (
                <span className="px-1.5 py-0.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-full">
                  {selectedPlatforms.length}
                </span>
              )}
            </button>
            {showPlatformFilter && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                {platforms.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => handlePlatformFilter(platform.id)}
                    className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
                  >
                    <div className="flex items-center space-x-2">
                      <platform.icon className="w-4 h-4" />
                      <span>{platform.name}</span>
                    </div>
                    {(selectedPlatforms.includes(platform.id) || (platform.id === 'all' && selectedPlatforms.includes('all'))) && (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {rexSuggestions.size > 0 && (
            <div className="relative">
              <button
                onClick={() => {
                  if (rexFilter === 'all') setRexFilter('suggestions');
                  else if (rexFilter === 'suggestions') setRexFilter('rules_active');
                  else setRexFilter('all');
                }}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {rexFilter === 'all' ? 'All Items' : rexFilter === 'suggestions' ? 'Rex Suggestions' : 'Rex Rules Active'}
                </span>
                {rexFilter !== 'all' && (
                  <span className="px-1.5 py-0.5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full">
                    {filteredCreatives.length}
                  </span>
                )}
              </button>
            </div>
          )}

          <button
            onClick={handleExportCSV}
            disabled={filteredCreatives.length === 0}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <div className="relative w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search creatives..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 focus:border-gray-200 dark:focus:border-gray-600 text-gray-900 dark:text-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <span>Active filters:</span>
          <span className="font-medium">{activeFilters.join(', ')}</span>
          <button
            onClick={() => {
              setSelectedPlatforms(['all']);
            }}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 underline"
          >
            Clear all
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="relative flex-1 flex flex-col min-h-0">
          <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div
              ref={headerRef}
              className="overflow-x-auto scrollbar-thin"
              style={{ overflow: 'hidden' }}
            >
              <div className="flex w-full">
                {columns.map((column, index) => {
                  const customWidth = columnWidths[column.id];
                  const columnStyle = customWidth
                    ? { width: customWidth, minWidth: customWidth, flexGrow: 0, flexShrink: 0 }
                    : { minWidth: column.width, flexGrow: column.flexGrow || 0, flexShrink: column.flexShrink || 0, flexBasis: column.width };

                  return (
                    <div
                      key={column.id}
                      className={`relative flex items-center h-12 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 capitalize tracking-wider whitespace-nowrap ${
                        index === 0 ? 'rounded-tl-xl' : index === columns.length - 1 ? 'rounded-tr-xl' : ''
                      }`}
                      style={columnStyle}
                    >
                      {column.id === 'select' ? (
                        <CustomCheckbox
                          checked={selectedCreatives.size === filteredCreatives.length && filteredCreatives.length > 0}
                          onChange={handleSelectAll}
                        />
                      ) : column.sortable ? (
                        <button
                          onClick={() => handleSort(column.id)}
                          className="group inline-flex items-center space-x-1 pr-2"
                        >
                          <span>{getColumnLabel(column.label, customWidth || column.width)}</span>
                          <span className="text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400">
                            {getSortIcon(column.id)}
                          </span>
                        </button>
                      ) : (
                        getColumnLabel(column.label, customWidth || column.width)
                      )}
                      {index < columns.length - 1 && (
                        <div
                          className="absolute right-[-2px] top-0 bottom-0 w-1 cursor-col-resize hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors group z-10"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const currentWidth = customWidth || column.width;
                            handleColumnResize(column.id, e.clientX, currentWidth, column.width);
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            ref={tableRef}
            className="overflow-x-auto overflow-y-auto scrollbar-thin flex-1"
          >
            <div className="w-full">
              {isLoading ? (
                // Skeleton loading rows
                Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className="flex items-center min-h-[60px] border-b border-gray-200 dark:border-gray-700 animate-pulse"
                  >
                    {columns.map((column) => {
                      const columnStyle = columnWidths[column.id]
                        ? { width: columnWidths[column.id], minWidth: columnWidths[column.id], flexGrow: 0, flexShrink: 0 }
                        : { minWidth: column.width, flexGrow: column.flexGrow || 0, flexShrink: column.flexShrink || 0, flexBasis: column.width };

                      return (
                        <div key={column.id} className="px-4 py-3" style={columnStyle}>
                          {column.id === 'select' ? (
                            <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          ) : column.id === 'creative' ? (
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                              <div className="space-y-2">
                                <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                <div className="h-2 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                              </div>
                            </div>
                          ) : (
                            <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              ) : (
                displayedCreatives.map((creative, index) => {
                const suggestion = rexSuggestions.get(creative.id);
                const hasPendingSuggestion = suggestion && (suggestion.status === 'pending' || suggestion.status === 'viewed');
                const hasActiveRule = suggestion && (suggestion.status === 'applied' || suggestion.status === 'monitoring');
                const isTopSuggestion = topDisplayedSuggestionIds.has(creative.id);
                const shouldHighlight = isTopSuggestion && hasPendingSuggestion;

                return (
                <div key={creative.id}>
                  <div
                    onClick={() => onDrillDown && onDrillDown(creative)}
                    className={`flex items-center min-h-[60px] border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/80 transition-all duration-200 ${
                    index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/30 dark:bg-gray-700/30'
                  } ${onDrillDown ? 'cursor-pointer' : ''} ${
                    shouldHighlight
                      ? 'ring-2 ring-inset ring-red-400/50 dark:ring-red-500/50 bg-red-50/40 dark:bg-red-900/10 rounded-lg my-1 shadow-sm hover:shadow-md hover:ring-red-500/70 dark:hover:ring-red-400/70 border-l-4 border-l-red-500'
                      : ''
                  } ${
                    hasActiveRule && suggestion?.performance?.is_improving
                      ? 'ring-2 ring-inset ring-green-400/50 dark:ring-green-500/50 bg-green-50/40 dark:bg-green-900/10 rounded-lg my-1 shadow-sm border-l-4 border-l-green-500'
                      : ''
                  } ${
                    suggestion?.priority_score >= 95 && shouldHighlight ? 'animate-pulse' : ''
                  }`}
                >
                  {columns.map((column, colIndex) => {
                    const customWidth = columnWidths[column.id];
                    const columnStyle = customWidth
                      ? { width: customWidth, minWidth: customWidth, flexGrow: 0, flexShrink: 0 }
                      : { minWidth: column.width, flexGrow: column.flexGrow || 0, flexShrink: column.flexShrink || 0, flexBasis: column.width };

                    return (
                      <div
                        key={column.id}
                        className="flex items-center px-4 py-4 text-sm text-gray-900 dark:text-white"
                        style={columnStyle}
                      >
                      {column.render ? (
                        column.render(null, creative)
                      ) : column.id === 'platform' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">
                          {creative.platform || 'facebook'}
                        </span>
                      ) : column.id === 'performance' ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          creative.performance === 'high' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                          creative.performance === 'medium' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' :
                          'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                        }`}>
                          {creative.performance.charAt(0).toUpperCase() + creative.performance.slice(1)}
                        </span>
                      ) : column.id === 'fatigueScore' ? (
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                creative.fatigueScore < 30 ? 'bg-green-500' :
                                creative.fatigueScore < 60 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${creative.fatigueScore}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 w-8">
                            {Math.round(creative.fatigueScore)}
                          </span>
                        </div>
                      ) : column.id === 'adName' ? (
                        <div className="truncate" title={creative.adName}>
                          {creative.adName || '-'}
                        </div>
                      ) : column.id === 'impressions' ? (
                        creative.metrics.impressions.toLocaleString()
                      ) : column.id === 'clicks' ? (
                        creative.metrics.clicks.toLocaleString()
                      ) : column.id === 'ctr' ? (
                        `${creative.metrics.ctr.toFixed(2)}%`
                      ) : column.id === 'spend' ? (
                        `$${creative.metrics.spend.toFixed(2)}`
                      ) : column.id === 'conversions' ? (
                        <span className={creative.hasRealConversionData ? 'font-semibold text-green-600 dark:text-green-400' : ''}>
                          {creative.metrics.conversions}
                        </span>
                      ) : column.id === 'cpa' ? (
                        `$${creative.metrics.cpa.toFixed(2)}`
                      ) : column.id === 'roas' ? (
                        <span className={creative.hasRealConversionData ? 'font-semibold' : ''}>
                          {creative.metrics.roas?.toFixed(2) || '0.00'}x
                        </span>
                      ) : column.id === 'profit' ? (
                        <span className={`font-medium ${
                          (creative.metrics.profit || 0) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          ${creative.metrics.profit?.toFixed(2) || '0.00'}
                        </span>
                      ) : column.id === 'profitMargin' ? (
                        <span className={`${
                          (creative.metrics.profitMargin || 0) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {creative.metrics.profitMargin?.toFixed(1) || '0.0'}%
                        </span>
                      ) : column.id === 'netROAS' ? (
                        <span className={`font-medium ${
                          (creative.metrics.netROAS || 0) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {creative.metrics.netROAS?.toFixed(2) || '0.00'}x
                        </span>
                      ) : null}
                    </div>
                    );
                  })}

                  {suggestion && isTopSuggestion && (
                    <div className="flex items-center px-4 py-4">
                      <RexSuggestionBadge
                        status={suggestion.status}
                        priorityScore={suggestion.priority_score}
                        isImproving={suggestion.performance?.is_improving}
                        onClick={() => {
                          if (expandedRowId === creative.id) {
                            setExpandedRowId(null);
                          } else {
                            setExpandedRowId(creative.id);
                            if (onViewSuggestion) {
                              onViewSuggestion(suggestion);
                            }
                          }
                        }}
                        onDismiss={(e) => {
                          e.stopPropagation();
                          if (onDismissSuggestion) {
                            onDismissSuggestion(suggestion, 'user_dismissed');
                          }
                        }}
                      />
                    </div>
                  )}
                  </div>

                  {/* Expanded Suggestion Row */}
                  {expandedRowId === creative.id && suggestion && (
                    <ExpandedSuggestionRow
                      suggestion={suggestion}
                      onAccept={async () => {
                        if (onAcceptSuggestion) {
                          await onAcceptSuggestion(suggestion);
                        }
                        setExpandedRowId(null);
                      }}
                      onDismiss={async (reason) => {
                        if (onDismissSuggestion) {
                          await onDismissSuggestion(suggestion, reason);
                        }
                        setExpandedRowId(null);
                      }}
                      onClose={() => setExpandedRowId(null)}
                    />
                  )}
                </div>
              );
              })
              )}

              {!isLoading && sortedCreatives.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">No creatives found matching your filters.</p>
                </div>
              )}

              {/* Sticky Totals Footer */}
              {sortedCreatives.length > 0 && (
                <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-800 border-t-2 border-gray-200 dark:border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                  <div className="flex items-center min-h-[56px] w-full">
                    {columns.map((column) => {
                      const customWidth = columnWidths[column.id];
                      const columnStyle = customWidth
                        ? { width: customWidth, minWidth: customWidth, flexGrow: 0, flexShrink: 0 }
                        : { minWidth: column.width, flexGrow: column.flexGrow || 0, flexShrink: column.flexShrink || 0, flexBasis: column.width };

                      return (
                        <div
                          key={column.id}
                          className="flex items-center px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white"
                          style={columnStyle}
                        >
                        {column.id === 'select' ? (
                          <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                            {sortedCreatives.length} total
                          </span>
                        ) : column.id === 'creative' ? (
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Total Results
                          </span>
                        ) : column.id === 'adName' || column.id === 'platform' || column.id === 'performance' || column.id === 'fatigueScore' ? (
                          ''
                        ) : column.id === 'impressions' ? (
                          totals.impressions.toLocaleString()
                        ) : column.id === 'clicks' ? (
                          totals.clicks.toLocaleString()
                        ) : column.id === 'ctr' ? (
                          `${totals.ctr.toFixed(2)}%`
                        ) : column.id === 'spend' ? (
                          `$${totals.spend.toFixed(2)}`
                        ) : column.id === 'conversions' ? (
                          totals.conversions.toLocaleString()
                        ) : column.id === 'cpa' ? (
                          `$${totals.cpa.toFixed(2)}`
                        ) : column.id === 'roas' ? (
                          `${totals.roas.toFixed(2)}x`
                        ) : column.id === 'profit' ? (
                          <span className={`font-bold ${
                            totals.profit > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            ${totals.profit.toFixed(2)}
                          </span>
                        ) : column.id === 'profitMargin' ? (
                          <span className={`font-bold ${
                            totals.profitMargin > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {totals.profitMargin.toFixed(1)}%
                          </span>
                        ) : column.id === 'netROAS' ? (
                          <span className={`font-bold ${
                            totals.netROAS > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {totals.netROAS.toFixed(2)}x
                          </span>
                        ) : (
                          ''
                        )}
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pagination Info and View More Button */}
          {sortedCreatives.length > itemsToShow && (
            <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-3 flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing <span className="font-medium text-gray-900 dark:text-white">{displayedCreatives.length}</span> of <span className="font-medium text-gray-900 dark:text-white">{sortedCreatives.length}</span> {viewLevel}
              </div>
              {!showAllItems ? (
                <button
                  onClick={() => setShowAllItems(true)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  View All
                </button>
              ) : (
                <button
                  onClick={() => {
                    setShowAllItems(false);
                    if (tableRef.current) {
                      tableRef.current.scrollTop = 0;
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Show Less
                </button>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
