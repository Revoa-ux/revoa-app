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
import { ComprehensiveRexInsightsModal } from './ComprehensiveRexInsightsModal';
import { RexIntroductionModal } from './RexIntroductionModal';
import { RexOrchestrationService } from '@/lib/rexOrchestrationService';
import type { GeneratedInsight } from '@/lib/rexInsightGenerator';
import type { RexSuggestionWithPerformance } from '@/types/rex';
import { useAuth } from '@/contexts/AuthContext';
import { createDemoInsight } from '@/lib/demoInsight';

interface CreativeAnalysisEnhancedProps {
  creatives?: any[];
  isLoading?: boolean;
  selectedTime?: string;
  onTimeChange?: (time: string) => void;
  showAIInsights?: boolean;
  viewLevel?: 'campaigns' | 'adsets' | 'ads';
  onDrillDown?: (item: any) => void;
  selectedItems?: Set<string>;
  onToggleSelect?: (id: string) => void;
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
  isLoading = false,
  showAIInsights = true,
  viewLevel = 'ads',
  onDrillDown,
  selectedItems: externalSelectedItems,
  onToggleSelect: externalOnToggleSelect,
  rexSuggestions = new Map(),
  topDisplayedSuggestionIds = new Set(),
  onViewSuggestion,
  onAcceptSuggestion,
  onDismissSuggestion
}) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['all']);
  const [internalSelectedItems, setInternalSelectedItems] = useState<Set<string>>(new Set());

  // Use external selection if provided, otherwise use internal
  const selectedCreatives = externalSelectedItems || internalSelectedItems;

  const toggleSelection = (id: string) => {
    if (externalOnToggleSelect) {
      externalOnToggleSelect(id);
    } else {
      const newSet = new Set(internalSelectedItems);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      setInternalSelectedItems(newSet);
    }
  };

  const setSelectedCreatives = (newSet: Set<string>) => {
    if (!externalOnToggleSelect) {
      setInternalSelectedItems(newSet);
    }
  };
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
  const [openInsightModal, setOpenInsightModal] = useState<{ creativeId: string; insight: GeneratedInsight; creative: any } | null>(null);
  const [itemsToShow, setItemsToShow] = useState(20);
  const [showAllItems, setShowAllItems] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [isResizing, setIsResizing] = useState(false);
  const [resizingColumnId, setResizingColumnId] = useState<string | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  // Rex AI state
  const [generatedInsights, setGeneratedInsights] = useState<Map<string, GeneratedInsight[]>>(new Map());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showRexIntro, setShowRexIntro] = useState(false);
  const [rexIntroSeen, setRexIntroSeen] = useState(true);

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

    // DEBUG: Log what CreativeAnalysis receives
    console.log('[DEBUG CreativeAnalysis] Received', creatives.length, 'creatives');
    if (creatives.length > 0) {
      console.log('[DEBUG CreativeAnalysis] First 3 samples:', creatives.slice(0, 3).map(c => ({
        id: c.id,
        name: c.adName,
        metrics: c.metrics,
        hasMetrics: !!c.metrics
      })));
    }
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

  // Toggle status handler
  const handleToggleStatus = async (creative: any, e: React.MouseEvent) => {
    e.stopPropagation();

    if (togglingIds.has(creative.id)) return;

    const currentStatus = creative.status;
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';

    setTogglingIds(prev => new Set([...prev, creative.id]));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Determine the entity type and ID
      let entityType: 'campaign' | 'adset' | 'ad';
      let entityId: string;

      if (viewLevel === 'campaigns') {
        entityType = 'campaign';
        entityId = creative.id;
      } else if (viewLevel === 'adsets') {
        entityType = 'adset';
        entityId = creative.id;
      } else {
        entityType = 'ad';
        entityId = creative.id;
      }

      // Call the appropriate platform API to update status
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/facebook-ads-toggle-status`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            userId: user.id,
            platform: creative.platform || 'facebook',
            entityType,
            entityId,
            newStatus
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update status');
      }

      // Trigger quick refresh to update metrics
      const refreshFunction = creative.platform === 'facebook' ? 'facebook-ads-quick-refresh' :
                               creative.platform === 'google' ? 'google-ads-quick-refresh' :
                               creative.platform === 'tiktok' ? 'tiktok-ads-quick-refresh' :
                               'facebook-ads-quick-refresh';

      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${refreshFunction}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            userId: user.id,
            adAccountId: creative.adAccountId
          })
        }
      );

      toast.success(`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ${newStatus === 'ACTIVE' ? 'activated' : 'paused'} successfully`);
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(creative.id);
        return next;
      });
    }
  };

  // Helper function to determine which metrics should glow based on trigger conditions
  const getGlowingMetrics = (suggestion: RexSuggestionWithPerformance): Set<string> => {
    const glowMetrics = new Set<string>();
    const triggers = suggestion.reasoning.triggeredBy || [];

    triggers.forEach(trigger => {
      const lowerTrigger = trigger.toLowerCase();

      // Map trigger conditions to metric column IDs
      if (lowerTrigger.includes('roas')) glowMetrics.add('roas');
      if (lowerTrigger.includes('net roas')) glowMetrics.add('netROAS');
      if (lowerTrigger.includes('cpa') || lowerTrigger.includes('cost per')) glowMetrics.add('cpa');
      if (lowerTrigger.includes('ctr') || lowerTrigger.includes('click')) glowMetrics.add('ctr');
      if (lowerTrigger.includes('profit') || lowerTrigger.includes('margin')) {
        glowMetrics.add('profit');
        glowMetrics.add('profitMargin');
      }
      if (lowerTrigger.includes('spend')) glowMetrics.add('spend');
      if (lowerTrigger.includes('conversion')) glowMetrics.add('conversions');
      if (lowerTrigger.includes('impression')) glowMetrics.add('impressions');
    });

    // If no specific metrics identified, default to profit and ROAS as primary indicators
    if (glowMetrics.size === 0) {
      glowMetrics.add('profit');
      glowMetrics.add('roas');
    }

    return glowMetrics;
  };

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
            toggleSelection(creative.id);
          }}
        />
      )
    },
    {
      id: 'status',
      label: 'Status',
      width: 100,
      flexGrow: 0,
      flexShrink: 0,
      sortable: true,
      render: (value: string, creative: any) => {
        const isToggling = togglingIds.has(creative.id);
        const canToggle = value === 'ACTIVE' || value === 'PAUSED';

        const statusStyles = {
          ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800/30',
          PAUSED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-800/30',
          ARCHIVED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
          DELETED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        };
        const style = statusStyles[value as keyof typeof statusStyles] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
        const displayText = value === 'ACTIVE' ? 'Active' :
                           value === 'PAUSED' ? 'Paused' :
                           value === 'ARCHIVED' ? 'Archived' :
                           value === 'DELETED' ? 'Deleted' :
                           value || 'Unknown';

        return (
          <button
            onClick={(e) => canToggle && !isToggling ? handleToggleStatus(creative, e) : e.stopPropagation()}
            disabled={!canToggle || isToggling}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all ${style} ${canToggle && !isToggling ? 'cursor-pointer' : 'cursor-default'}`}
            title={canToggle ? (value === 'ACTIVE' ? 'Click to pause' : 'Click to activate') : undefined}
          >
            {isToggling ? (
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : null}
            {displayText}
          </button>
        );
      }
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
        'Status',
        'Ad Name',
        'Platform',
        'Performance',
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
        c.status || 'Unknown',
        c.adName || '-',
        c.platform || 'facebook',
        c.performance,
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

    return matchesSearch && matchesPlatform;
  });

  const sortedCreatives = getSortedCreatives(filteredCreatives);

  // Pagination logic
  const displayedCreatives = showAllItems ? sortedCreatives : sortedCreatives.slice(0, itemsToShow);

  // Calculate totals for all sorted creatives
  const totals = sortedCreatives.reduce((acc, creative) => {
    // Sum up actual revenue from metrics (already calculated from attribution system)
    const creativeRevenue = (creative.metrics?.conversions || 0) > 0 && (creative.metrics?.roas || 0) > 0
      ? (creative.metrics.spend * creative.metrics.roas)
      : 0;

    return {
      impressions: acc.impressions + (creative.metrics?.impressions || 0),
      clicks: acc.clicks + (creative.metrics?.clicks || 0),
      spend: acc.spend + (creative.metrics?.spend || 0),
      conversions: acc.conversions + (creative.metrics?.conversions || 0),
      revenue: acc.revenue + creativeRevenue,
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
    revenue: 0,
    cpa: 0,
    profit: 0,
    profitMargin: 0,
    roas: 0,
    netROAS: 0,
    ctr: 0,
  });

  // Calculate derived metrics from REAL data
  if (totals.conversions > 0) {
    totals.cpa = totals.spend / totals.conversions;
  }
  if (totals.impressions > 0) {
    totals.ctr = (totals.clicks / totals.impressions) * 100;
  }
  if (totals.spend > 0) {
    // Use REAL revenue from attribution system, not mock data
    totals.roas = totals.revenue / totals.spend;
    totals.profitMargin = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0;
    totals.netROAS = totals.profit / totals.spend;
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

  const isEmpty = creatives.length === 0 && !isLoading;

  return (
    <>
      {/* Rex Introduction Modal */}
      {showRexIntro && (
        <RexIntroductionModal
          onClose={() => setShowRexIntro(false)}
          onGetStarted={() => {
            setShowRexIntro(false);
            setRexIntroSeen(true);
            // Save to user profile
            if (user?.id) {
              supabase
                .from('user_profiles')
                .update({ rex_intro_seen: true })
                .eq('user_id', user.id)
                .then(() => console.log('Rex intro marked as seen'));
            }
          }}
        />
      )}

      {/* Comprehensive Rex Insights Modal */}
      {openInsightModal && (
        <ComprehensiveRexInsightsModal
          isOpen={!!openInsightModal}
          insight={openInsightModal.insight}
          entityName={openInsightModal.creative.name || openInsightModal.creative.title || 'Unnamed'}
          platform={openInsightModal.creative.platform || 'facebook'}
          onExecuteAction={async (actionType, parameters) => {
            if (!user?.id) {
              toast.error('User not authenticated');
              return;
            }
            const orchestration = new RexOrchestrationService(user.id);
            const entity = {
              id: openInsightModal.creative.id,
              platformId: openInsightModal.creative.platformId || openInsightModal.creative.id,
              platform: openInsightModal.creative.platform || 'facebook',
              name: openInsightModal.creative.name || openInsightModal.creative.title || 'Unnamed',
              type: viewLevel === 'campaigns' ? 'campaign' as const :
                    viewLevel === 'adsets' ? 'ad_set' as const : 'ad' as const,
              status: openInsightModal.creative.status || 'active',
              dailyBudget: openInsightModal.creative.budget,
              spend: openInsightModal.creative.spend,
              revenue: openInsightModal.creative.revenue,
              conversions: openInsightModal.creative.conversions,
              roas: openInsightModal.creative.roas,
              cpa: openInsightModal.creative.cpa
            };
            const result = await orchestration.executeAction(entity, actionType, parameters);
            if (result.success) {
              toast.success(result.message);
            } else {
              toast.error(result.message);
            }
          }}
          onCreateRule={async () => {
            if (!user?.id) {
              toast.error('User not authenticated');
              return;
            }
            const orchestration = new RexOrchestrationService(user.id);
            const entity = {
              id: openInsightModal.creative.id,
              platformId: openInsightModal.creative.platformId || openInsightModal.creative.id,
              platform: openInsightModal.creative.platform || 'facebook',
              name: openInsightModal.creative.name || openInsightModal.creative.title || 'Unnamed',
              type: viewLevel === 'campaigns' ? 'campaign' as const :
                    viewLevel === 'adsets' ? 'ad_set' as const : 'ad' as const,
              status: openInsightModal.creative.status || 'active',
              dailyBudget: openInsightModal.creative.budget,
              spend: openInsightModal.creative.spend,
              revenue: openInsightModal.creative.revenue,
              conversions: openInsightModal.creative.conversions,
              roas: openInsightModal.creative.roas,
              cpa: openInsightModal.creative.cpa
            };
            const result = await orchestration.createAutomatedRule(entity, openInsightModal.insight);
            if (result.success) {
              toast.success('Automated rule created successfully');
            } else {
              toast.error('Failed to create automated rule');
            }
          }}
          onDismiss={async (reason) => {
            setOpenInsightModal(null);
            setExpandedRowId(null);
            toast.info('Insight dismissed');
          }}
          onClose={() => {
            setOpenInsightModal(null);
            setExpandedRowId(null);
          }}
        />
      )}

      <div className="h-full flex flex-col gap-4 overflow-hidden">
      {showAIInsights && visibleInsights.length > 0 && (
        <div className="flex-shrink-0">
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
      <div className="flex items-center justify-between flex-shrink-0">
        <div></div>
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
              placeholder={`Search ${viewLevel === 'campaigns' ? 'campaigns' : viewLevel === 'adsets' ? 'ad sets' : 'ads'}...`}
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
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 flex-shrink-0">
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

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex-1 flex flex-col min-h-0 min-w-0">
        <div className="relative flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
          <div className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-900/50 border-b-2 border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div
              ref={headerRef}
              className="overflow-x-scroll [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
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
                      className={`relative flex items-center h-12 px-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap ${
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
                // Skeleton loading rows - enough to fill viewport
                Array.from({ length: 15 }).map((_, index) => (
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
                const glowingMetrics = suggestion ? getGlowingMetrics(suggestion) : new Set<string>();

                const handleMetricClick = async (e: React.MouseEvent) => {
                  if (suggestion) {
                    e.stopPropagation();
                    if (expandedRowId === creative.id) {
                      setExpandedRowId(null);
                    } else {
                      setExpandedRowId(creative.id);
                      // Open modal with the first insight
                      const insights = generatedInsights.get(creative.id);
                      if (insights && insights.length > 0) {
                        setOpenInsightModal({
                          creativeId: creative.id,
                          insight: insights[0],
                          creative
                        });
                      }
                      if (onViewSuggestion) {
                        onViewSuggestion(suggestion);
                      }

                      // Trigger real AI analysis if not already done
                      if (!generatedInsights.has(creative.id) && user?.id) {
                        setIsAnalyzing(true);
                        try {
                          console.log('[CreativeAnalysis] Starting Rex analysis for:', creative.id);
                          const orchestration = new RexOrchestrationService(user.id);
                          const entity = {
                            id: creative.id,
                            platformId: creative.platformId || creative.id,
                            platform: creative.platform || 'facebook',
                            name: creative.name || creative.title || 'Unnamed',
                            type: viewLevel === 'campaigns' ? 'campaign' as const :
                                  viewLevel === 'adsets' ? 'ad_set' as const : 'ad' as const,
                            status: creative.status || 'active',
                            dailyBudget: creative.budget,
                            spend: creative.spend,
                            revenue: creative.revenue,
                            conversions: creative.conversions,
                            roas: creative.roas,
                            cpa: creative.cpa
                          };

                          const insights = await orchestration.analyzeEntity(entity, 30);
                          console.log('[CreativeAnalysis] Insights generated:', insights.length);

                          if (insights.length === 0) {
                            console.warn('[CreativeAnalysis] No insights generated - using demo insight');
                            const demoInsight = createDemoInsight();
                            insights.push(demoInsight);
                          }

                          const newInsights = new Map(generatedInsights);
                          newInsights.set(creative.id, insights);
                          setGeneratedInsights(newInsights);

                          console.log('[CreativeAnalysis] Insights saved to state');

                          // Automatically open modal with first insight after generation
                          if (insights.length > 0) {
                            setOpenInsightModal({
                              creativeId: creative.id,
                              insight: insights[0],
                              creative
                            });
                          }
                        } catch (error) {
                          console.error('[CreativeAnalysis] Error analyzing entity:', error);
                          toast.error('Failed to generate AI insights');
                          setExpandedRowId(null);
                        } finally {
                          setIsAnalyzing(false);
                        }
                      }
                    }
                  }
                };

                return (
                <div key={creative.id} className="relative">
                  <div
                    onClick={hasPendingSuggestion ? handleMetricClick : () => onDrillDown && onDrillDown(creative)}
                    className={`flex items-center min-h-[60px] border-b border-gray-200 dark:border-gray-700 transition-all duration-300 ${
                    index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/30 dark:bg-gray-700/30'
                  } ${
                    hasPendingSuggestion
                      ? 'cursor-pointer hover:shadow-lg bg-gradient-to-r from-red-50/80 via-pink-50/60 to-red-50/80 dark:from-red-900/20 dark:via-pink-900/15 dark:to-red-900/20 animate-pulse-slow'
                      : onDrillDown ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/80' : ''
                  } ${
                    hasActiveRule && suggestion?.performance?.is_improving
                      ? 'bg-green-50/40 dark:bg-green-900/10 shadow-sm'
                      : ''
                  }`}
                  style={hasPendingSuggestion ? {
                    boxShadow: 'inset 3px 0 0 0 rgb(239 68 68), inset 0 -2px 0 0 rgb(239 68 68), 0 0 0 1px rgba(239 68 68 / 0.4)'
                  } : hasActiveRule && suggestion?.performance?.is_improving ? {
                    boxShadow: 'inset 3px 0 0 0 rgb(34 197 94), inset 0 -2px 0 0 rgb(34 197 94), 0 0 0 1px rgba(34 197 94 / 0.3)'
                  } : undefined}
                  title={hasPendingSuggestion ? '🤖 Rex has an AI-powered optimization suggestion - Click to view!' : undefined}
                >
                  {columns.map((column, colIndex) => {
                    const customWidth = columnWidths[column.id];
                    const columnStyle = customWidth
                      ? { width: customWidth, minWidth: customWidth, flexGrow: 0, flexShrink: 0 }
                      : { minWidth: column.width, flexGrow: column.flexGrow || 0, flexShrink: column.flexShrink || 0, flexBasis: column.width };

                    // No more individual metric glow - entire row glows now
                    const metricContent = column.render ? (
                      column.render(null, creative)
                    ) : column.id === 'platform' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">
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
                      creative.metrics.conversions
                    ) : column.id === 'cpa' ? (
                      `$${creative.metrics.cpa.toFixed(2)}`
                    ) : column.id === 'roas' ? (
                      `${creative.metrics.roas?.toFixed(2) || '0.00'}x`
                    ) : column.id === 'profit' ? (
                      `$${creative.metrics.profit?.toFixed(2) || '0.00'}`
                    ) : column.id === 'profitMargin' ? (
                      `${creative.metrics.profitMargin?.toFixed(1) || '0.0'}%`
                    ) : column.id === 'netROAS' ? (
                      `${creative.metrics.netROAS?.toFixed(2) || '0.00'}x`
                    ) : null;

                    return (
                      <div
                        key={column.id}
                        className={`flex items-center px-4 py-4 text-sm text-gray-900 dark:text-white ${
                          column.id === 'adName' ? 'overflow-hidden' : ''
                        }`}
                        style={columnStyle}
                      >
                        <span className={`${
                          column.id === 'adName' ? 'truncate block w-full' : ''
                        }`}>
                          {metricContent}
                        </span>
                      </div>
                    );
                  })}
                  </div>

                  {/* Modal is rendered outside the table */}

                  {/* Loading state while analyzing */}
                  {expandedRowId === creative.id && isAnalyzing && (
                    <div className="bg-white dark:bg-gray-800 border-x border-b border-gray-200 dark:border-gray-700 px-6 py-12">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Rex is analyzing thousands of data points...
                        </p>
                      </div>
                    </div>
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
            <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-3 flex items-center justify-between flex-shrink-0">
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
    </>
  );
};
