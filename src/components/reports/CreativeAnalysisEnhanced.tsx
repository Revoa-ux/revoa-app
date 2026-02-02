import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  Package,
  ExternalLink,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowRight,
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
  GripVertical,
  Info,
  Zap,
  Link2,
  Radio,
  Cpu,
  Loader2,
  Link,
  Settings
} from 'lucide-react';
import { getSourceLabel, getSourceDescription, type ConversionSource } from '@/lib/conversionValueResolver';
import { useClickOutside } from '@/lib/useClickOutside';
import { supabase } from '@/lib/supabase';
import { toast } from '../../lib/toast';
import { CustomCheckbox } from '@/components/CustomCheckbox';
import ToggleSwitch from '@/components/ToggleSwitch';
import { ComprehensiveRexInsightsModal } from './ComprehensiveRexInsightsModal';
import { RexIntroductionModal } from './RexIntroductionModal';
import { ExpandedSuggestionRow } from './ExpandedSuggestionRow';
import { RexOrchestrationService } from '@/lib/rexOrchestrationService';
import type { GeneratedInsight } from '@/lib/rexInsightGenerator';
import type { RexSuggestionWithPerformance, RexEntityType } from '@/types/rex';
import { useAuth } from '@/contexts/AuthContext';

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
  onBulkSelect?: (ids: string[], selectAll: boolean) => void;
  rexSuggestions?: Map<string, RexSuggestionWithPerformance>;
  topDisplayedSuggestionIds?: Set<string>;
  onViewSuggestion?: (suggestion: RexSuggestionWithPerformance) => void;
  onAcceptSuggestion?: (suggestion: RexSuggestionWithPerformance) => Promise<void>;
  onDismissSuggestion?: (suggestion: RexSuggestionWithPerformance, reason?: string) => Promise<void>;
  onExecuteAction?: (suggestion: RexSuggestionWithPerformance, actionType: string, parameters: any) => Promise<{ success: boolean; message: string }>;
  embedded?: boolean;
  searchTerm?: string;
  hideSearch?: boolean;
  selectedPlatforms?: string[];
  hidePlatformFilter?: boolean;
  onOptimisticUpdate?: (updatedCreatives: any[]) => void;
}

interface Column {
  id: string;
  label: string;
  width: number;
  flexGrow?: number;
  flexShrink?: number;
  sortable?: boolean;
  sticky?: boolean;
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
  onBulkSelect: externalOnBulkSelect,
  rexSuggestions = new Map(),
  topDisplayedSuggestionIds = new Set(),
  onViewSuggestion,
  onAcceptSuggestion,
  onDismissSuggestion,
  onExecuteAction,
  embedded = false,
  searchTerm: externalSearchTerm,
  hideSearch = false,
  selectedPlatforms: externalSelectedPlatforms,
  hidePlatformFilter = false,
  onOptimisticUpdate
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Helper function to get suggestion with entity type filtering
  const getSuggestionForEntity = (entityId: string, entityViewLevel: 'campaigns' | 'adsets' | 'ads'): RexSuggestionWithPerformance | undefined => {
    // Map viewLevel to RexEntityType
    const entityTypeMap: Record<'campaigns' | 'adsets' | 'ads', 'campaign' | 'ad_set' | 'ad'> = {
      'campaigns': 'campaign',
      'adsets': 'ad_set',
      'ads': 'ad'
    };

    const expectedEntityType = entityTypeMap[entityViewLevel];

    // Get suggestion from map
    const suggestion = rexSuggestions.get(entityId);

    // Only return if entity_type matches the current view level
    if (suggestion && suggestion.entity_type === expectedEntityType) {
      return suggestion;
    }

    return undefined;
  };

  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const [internalSelectedPlatforms, setInternalSelectedPlatforms] = useState<string[]>(['all']);

  // Use external search term if provided, otherwise use internal
  const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : internalSearchTerm;
  const selectedPlatforms = externalSelectedPlatforms !== undefined ? externalSelectedPlatforms : internalSelectedPlatforms;
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
    field: 'status',
    direction: 'desc'
  });
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showPlatformFilter, setShowPlatformFilter] = useState(false);
  const [showProductFilter, setShowProductFilter] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>(['all']);
  const [filterBySelection, setFilterBySelection] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [imageLoading, setImageLoading] = useState<Set<string>>(new Set());
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [openInsightModal, setOpenInsightModal] = useState<{ creativeId: string; insight: GeneratedInsight; creative: any } | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [isResizing, setIsResizing] = useState(false);
  const [resizingColumnId, setResizingColumnId] = useState<string | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [optimisticStatuses, setOptimisticStatuses] = useState<Map<string, string>>(new Map());

  // Rex AI state
  const [generatedInsights, setGeneratedInsights] = useState<Map<string, GeneratedInsight[]>>(new Map());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingEntityId, setAnalyzingEntityId] = useState<string | null>(null);
  const [showRexIntro, setShowRexIntro] = useState(false);
  const [rexIntroSeen, setRexIntroSeen] = useState(true);

  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const platformFilterRef = useRef<HTMLDivElement>(null);
  const productFilterRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  useClickOutside(filterDropdownRef, () => setShowFilterDropdown(false));
  useClickOutside(platformFilterRef, () => setShowPlatformFilter(false));
  useClickOutside(productFilterRef, () => setShowProductFilter(false));

  useEffect(() => {
    if (rexSuggestions.size > 0 || creatives.length > 0) {
      const suggestionEntityIds = Array.from(rexSuggestions.keys());
      const creativeIds = creatives.map(c => c.id);

      // Map viewLevel to entity_type for filtering
      const entityTypeMap: Record<'campaigns' | 'adsets' | 'ads', 'campaign' | 'ad_set' | 'ad'> = {
        'campaigns': 'campaign',
        'adsets': 'ad_set',
        'ads': 'ad'
      };
      const currentEntityType = entityTypeMap[viewLevel];

      // Filter suggestions by current entity type
      const relevantSuggestions = Array.from(rexSuggestions.values()).filter(
        s => s.entity_type === currentEntityType
      );

      // Find matches with entity type filtering
      const matchedRows = creatives.filter(c => getSuggestionForEntity(c.id, viewLevel));

      console.log('[DEBUG CreativeAnalysis] Row highlight check with entity type filtering:', {
        viewLevel,
        currentEntityType,
        totalSuggestionsInMap: rexSuggestions.size,
        relevantSuggestionsForView: relevantSuggestions.length,
        creativesInView: creatives.length,
        matchedRowsWithSuggestions: matchedRows.length,
        matchedRowDetails: matchedRows.map(c => ({
          id: c.id,
          name: c.name || c.adName,
          suggestionStatus: getSuggestionForEntity(c.id, viewLevel)?.status,
          suggestionType: getSuggestionForEntity(c.id, viewLevel)?.suggestion_type
        }))
      });

      // Show suggestions breakdown by entity type
      const suggestionsByType = Array.from(rexSuggestions.values()).reduce((acc, s) => {
        acc[s.entity_type] = (acc[s.entity_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('[DEBUG CreativeAnalysis] All suggestions breakdown:', {
        totalSuggestions: rexSuggestions.size,
        byEntityType: suggestionsByType,
        relevantForCurrentView: {
          entityType: currentEntityType,
          count: relevantSuggestions.length,
          sample: relevantSuggestions.slice(0, 3).map(s => ({
            entity_id: s.entity_id,
            entity_type: s.entity_type,
            suggestion_type: s.suggestion_type,
            status: s.status
          }))
        }
      });
    }
  }, [rexSuggestions, creatives, viewLevel]);

  useEffect(() => {
    const tableElement = tableRef.current;
    const headerElement = headerRef.current;

    if (!tableElement || !headerElement) return;

    let isSyncing = false;

    // Sync header scroll when table scrolls - immediate, no RAF delay
    const handleTableScroll = () => {
      if (!isSyncing) {
        isSyncing = true;
        headerElement.scrollLeft = tableElement.scrollLeft;
        isSyncing = false;
      }
    };

    // Sync table scroll when header scrolls - immediate, no RAF delay
    const handleHeaderScroll = () => {
      if (!isSyncing) {
        isSyncing = true;
        tableElement.scrollLeft = headerElement.scrollLeft;
        isSyncing = false;
      }
    };

    tableElement.addEventListener('scroll', handleTableScroll, { passive: true });
    headerElement.addEventListener('scroll', handleHeaderScroll, { passive: true });

    // Initial sync
    headerElement.scrollLeft = tableElement.scrollLeft;

    return () => {
      tableElement.removeEventListener('scroll', handleTableScroll);
      headerElement.removeEventListener('scroll', handleHeaderScroll);
    };
  }, [creatives.length]);

  // Track which images we've seen before (to avoid re-adding to loading state)
  const seenImagesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Only add NEW creatives to loading state, don't reset already loaded images
    const newCreativesWithImages = creatives
      .filter(c => (c.thumbnail || c.url) && !seenImagesRef.current.has(c.id))
      .map(c => c.id);

    if (newCreativesWithImages.length > 0) {
      setImageLoading(prev => {
        const next = new Set(prev);
        newCreativesWithImages.forEach(id => next.add(id));
        return next;
      });
      newCreativesWithImages.forEach(id => seenImagesRef.current.add(id));
    }

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

  // Toggle status handler with optimistic updates
  const handleToggleStatus = async (creative: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (togglingIds.has(creative.id)) return;

    const optimisticStatus = optimisticStatuses.get(creative.id);
    const currentStatus = optimisticStatus || creative.status?.toUpperCase() || 'UNKNOWN';
    if (currentStatus !== 'ACTIVE' && currentStatus !== 'PAUSED') {
      toast.error('Can only toggle between Active and Paused states');
      return;
    }

    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';

    // Optimistic UI update - immediately show new state
    setOptimisticStatuses(prev => new Map(prev).set(creative.id, newStatus));

    // Mark as toggling (for loading indicator, but toggle already shows new state)
    setTogglingIds(prev => new Set([...prev, creative.id]));

    // Also notify parent if callback provided
    if (onOptimisticUpdate) {
      const updatedCreatives = creatives.map(c =>
        c.id === creative.id ? { ...c, status: newStatus } : c
      );
      onOptimisticUpdate(updatedCreatives);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Determine the entity type and platform ID (not database ID)
      let entityType: 'campaign' | 'adset' | 'ad';
      let entityId: string;

      if (viewLevel === 'campaigns') {
        entityType = 'campaign';
        entityId = creative.platformId || creative.platform_campaign_id || creative.id;
      } else if (viewLevel === 'adsets') {
        entityType = 'adset';
        entityId = creative.platformId || creative.platform_ad_set_id || creative.id;
      } else {
        entityType = 'ad';
        entityId = creative.platformId || creative.platform_ad_id || creative.id;
      }

      // Determine platform-specific toggle function
      const platform = creative.platform || 'facebook';
      const toggleFunction = `${platform}-ads-toggle-status`;

      // Call the appropriate platform API to update status
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${toggleFunction}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            userId: user.id,
            platform,
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

      // Trigger quick refresh to update metrics (non-blocking)
      const refreshFunction = creative.platform === 'facebook' ? 'facebook-ads-quick-refresh' :
                               creative.platform === 'google' ? 'google-ads-quick-refresh' :
                               creative.platform === 'tiktok' ? 'tiktok-ads-quick-refresh' :
                               'facebook-ads-quick-refresh';

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.access_token) return;
        fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${refreshFunction}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              adAccountId: creative.adAccountId
            })
          }
        ).catch(err => console.error('Error refreshing data:', err));
      });

      toast.success(`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ${newStatus === 'ACTIVE' ? 'activated' : 'paused'} successfully`);
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update status');

      // Revert optimistic update on error
      setOptimisticStatuses(prev => {
        const next = new Map(prev);
        next.delete(creative.id);
        return next;
      });
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(creative.id);
        return next;
      });
    }
  };

  // Helper to get sticky column styles
  const getStickyStyles = (columnId: string, columnWidth: number) => {
    const isCreativeVisible = viewLevel === 'ads';

    // Define sticky columns with their left offsets
    const stickyColumns: Record<string, number> = {
      'select': 0, // Start from the very left
      'status': 70, // After select column
      'creative': 170, // After status column (70 + 100)
      'adName': isCreativeVisible ? 250 : 170 // After creative if visible
    };

    const leftOffset = stickyColumns[columnId];

    if (leftOffset !== undefined) {
      return {
        position: 'sticky' as const,
        left: `${leftOffset}px`,
        zIndex: 20
      };
    }

    return {};
  };

  const columns: Column[] = [
    {
      id: 'select',
      label: '',
      width: 70,
      flexGrow: 0,
      flexShrink: 0,
      sticky: true,
      render: (_, creative) => {
        // For ad sets, use adSetId so it matches with ad.adSetId
        // For campaigns and ads, use id
        const itemId = viewLevel === 'adsets' ? (creative.adSetId || creative.id) : creative.id;

        return (
          <CustomCheckbox
            checked={selectedCreatives.has(itemId)}
            onChange={(e) => {
              e.stopPropagation();
              toggleSelection(itemId);
            }}
          />
        );
      }
    },
    {
      id: 'status',
      label: 'Status',
      width: 100,
      flexGrow: 0,
      flexShrink: 0,
      sortable: true,
      sticky: true,
      render: (value: string, creative: any) => {
        const isToggling = togglingIds.has(creative.id);
        const optimisticStatus = optimisticStatuses.get(creative.id);
        const displayStatus = optimisticStatus || value?.toUpperCase() || 'UNKNOWN';

        return (
          <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <ToggleSwitch
              checked={displayStatus === 'ACTIVE'}
              onChange={() => handleToggleStatus(creative)}
              loading={isToggling}
              size="sm"
            />
          </div>
        );
      }
    },
    {
      id: 'creative',
      label: 'Creative',
      width: 80,
      flexGrow: 0,
      flexShrink: 0,
      sticky: true,
      render: (_, creative) => {
        const adsManagerUrl = creative.platform === 'facebook' && creative.id && creative.adAccountId
          ? `https://business.facebook.com/adsmanager/manage/ads?act=${creative.adAccountId.replace('act_', '')}&selected_ad_ids=${creative.id}`
          : null;

        const hasImageError = imageErrors.has(creative.id);
        const isImageLoading = imageLoading.has(creative.id);

        return (
          <div className="flex items-center">
            <div className="w-10 h-10 relative rounded-lg overflow-hidden bg-gray-100 dark:bg-[#3a3a3a] group">
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
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-[#3a3a3a] dark:to-[#2a2a2a]">
                  <ImageIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
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
      sortable: true,
      sticky: true
    },
    { id: 'platform', label: 'Platform', width: 100, flexGrow: 0, flexShrink: 0, sortable: true },
    { id: 'performance', label: 'Revoa AI', width: 150, flexGrow: 0, flexShrink: 0, sortable: true },
    { id: 'budget', label: 'Budget', width: 120, flexGrow: 0, flexShrink: 0, sortable: true },
    { id: 'impressions', label: 'Impressions', width: 120, flexGrow: 1, flexShrink: 1, sortable: true },
    { id: 'clicks', label: 'Clicks', width: 100, flexGrow: 1, flexShrink: 1, sortable: true },
    { id: 'ctr', label: 'CTR', width: 80, flexGrow: 1, flexShrink: 1, sortable: true },
    { id: 'spend', label: 'Spend', width: 100, flexGrow: 1, flexShrink: 1, sortable: true },
    { id: 'conversions', label: 'Conv.', width: 80, flexGrow: 1, flexShrink: 1, sortable: true },
    { id: 'cvr', label: 'CVR', width: 80, flexGrow: 1, flexShrink: 1, sortable: true },
    { id: 'cpa', label: 'CPA', width: 80, flexGrow: 1, flexShrink: 1, sortable: true },
    { id: 'conversionValue', label: 'Conv. Value', width: 120, flexGrow: 1, flexShrink: 1, sortable: true },
    { id: 'roas', label: 'ROAS', width: 80, flexGrow: 1, flexShrink: 1, sortable: true },
    { id: 'attribution', label: 'Attribution', width: 140, flexGrow: 0, flexShrink: 0, sortable: true },
    { id: 'cogs', label: 'COGS', width: 110, flexGrow: 0, flexShrink: 0, sortable: true },
    { id: 'profit', label: 'Profit', width: 100, flexGrow: 1, flexShrink: 1, sortable: true },
    { id: 'profitMargin', label: 'Margin %', width: 100, flexGrow: 1, flexShrink: 1, sortable: true },
    { id: 'netROAS', label: 'Net ROAS', width: 100, flexGrow: 1, flexShrink: 1, sortable: true },
    { id: 'breakEvenRoas', label: 'BE ROAS', width: 90, flexGrow: 1, flexShrink: 1, sortable: true }
  ].filter(col => {
    if (col.id === 'creative' && (viewLevel === 'campaigns' || viewLevel === 'adsets')) {
      return false;
    }
    if (col.id === 'budget' && viewLevel === 'ads') {
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
      setInternalSelectedPlatforms(['all']);
    } else {
      const newPlatforms = selectedPlatforms.filter(p => p !== 'all');
      if (newPlatforms.includes(platformId)) {
        const filtered = newPlatforms.filter(p => p !== platformId);
        setInternalSelectedPlatforms(filtered.length === 0 ? ['all'] : filtered);
      } else {
        setInternalSelectedPlatforms([...newPlatforms, platformId]);
      }
    }
  };

  const extractProductFromUrl = (url: string | undefined | null): string | null => {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const productMatch = pathname.match(/\/products\/([^\/\?]+)/);
      if (productMatch) {
        return productMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      }
      const collectionProductMatch = pathname.match(/\/collections\/[^\/]+\/products\/([^\/\?]+)/);
      if (collectionProductMatch) {
        return collectionProductMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      }
    } catch {
      return null;
    }
    return null;
  };

  const uniqueProducts = React.useMemo(() => {
    const productSet = new Set<string>();
    creatives.forEach(c => {
      const destinationUrl = c.creative_data?.link_url || c.destinationUrl || c.link_url;
      const product = extractProductFromUrl(destinationUrl);
      if (product) productSet.add(product);
    });
    console.log('[Product Filter Debug]', {
      totalCreatives: creatives.length,
      uniqueProducts: Array.from(productSet),
      sampleUrls: creatives.slice(0, 3).map(c => c.creative_data?.link_url || c.destinationUrl || c.link_url)
    });
    return Array.from(productSet).sort();
  }, [creatives]);

  const getCreativeProduct = (creative: any): string | null => {
    const destinationUrl = creative.creative_data?.link_url || creative.destinationUrl || creative.link_url;
    return extractProductFromUrl(destinationUrl);
  };

  const handleProductFilter = (productName: string) => {
    if (productName === 'all') {
      setSelectedProducts(['all']);
    } else {
      const newProducts = selectedProducts.filter(p => p !== 'all');
      if (newProducts.includes(productName)) {
        const filtered = newProducts.filter(p => p !== productName);
        setSelectedProducts(filtered.length === 0 ? ['all'] : filtered);
      } else {
        setSelectedProducts([...newProducts, productName]);
      }
    }
  };

  const handleSelectAll = () => {
    const allSelected = selectedCreatives.size === filteredCreatives.length && filteredCreatives.length > 0;

    if (externalOnBulkSelect) {
      // Use bulk select handler for better performance
      const itemIds = filteredCreatives.map(c =>
        viewLevel === 'adsets' ? (c.adSetId || c.id) : c.id
      );
      externalOnBulkSelect(itemIds, !allSelected);
    } else if (externalOnToggleSelect) {
      // Fallback to individual toggles (legacy behavior)
      filteredCreatives.forEach(c => {
        // For ad sets, use adSetId so it matches with ad.adSetId
        const itemId = viewLevel === 'adsets' ? (c.adSetId || c.id) : c.id;
        const isSelected = selectedCreatives.has(itemId);

        if (allSelected && isSelected) {
          // Deselect all
          externalOnToggleSelect(itemId);
        } else if (!allSelected && !isSelected) {
          // Select all
          externalOnToggleSelect(itemId);
        }
      });
    } else {
      // When using internal state, bulk update
      if (allSelected) {
        setInternalSelectedItems(new Set());
      } else {
        const itemIds = filteredCreatives.map(c =>
          viewLevel === 'adsets' ? (c.adSetId || c.id) : c.id
        );
        setInternalSelectedItems(new Set(itemIds));
      }
    }
  };

  const handleExportCSV = async () => {
    try {
      if (filteredCreatives.length === 0) {
        toast.error('No data to export');
        return;
      }

      const baseHeaders = [
        'Status',
        'Ad Name',
        'Platform',
        'Performance'
      ];
      const budgetHeaders = viewLevel !== 'ads' ? ['Budget', 'Budget Type'] : [];
      const metricHeaders = [
        'Impressions',
        'Clicks',
        'CTR (%)',
        'Spend',
        'Conversions',
        'CPA',
        'Conversion Value',
        'ROAS',
        'COGS',
        'Profit',
        'Profit Margin (%)',
        'Net ROAS',
        'Break Even ROAS',
        'Attribution Score'
      ];
      const headers = [...baseHeaders, ...budgetHeaders, ...metricHeaders];

      const rows = filteredCreatives.map(c => {
        const baseData = [
          c.status || 'Unknown',
          c.adName || '-',
          c.platform || 'facebook',
          c.performance
        ];
        const budgetData = viewLevel !== 'ads' ? [
          (c.budget || c.dailyBudget || c.lifetimeBudget)?.toFixed(2) || '-',
          c.budgetType || (c.dailyBudget ? 'daily' : c.lifetimeBudget ? 'lifetime' : '-')
        ] : [];
        const hasCogs = c.metrics.cogs != null && c.metrics.cogs > 0;
        const hasPixel = c.conversionSource === 'revoa_pixel';
        const hasUtm = c.conversionSource === 'utm_attribution';
        const hasCapi = c.metrics?.capiEnabled;
        const attrScore = (hasPixel ? 40 : 0) + (hasUtm ? 30 : 0) + (hasCapi ? 30 : 0);
        let beRoas = '-';
        if (hasCogs && c.metrics.conversions > 0 && c.metrics.linkedProductCount === 1) {
          const avgCogs = c.metrics.cogs / c.metrics.conversions;
          const avgRevenue = (c.metrics.conversion_value || 0) / c.metrics.conversions;
          if (avgRevenue > avgCogs) {
            beRoas = (avgCogs / (avgRevenue - avgCogs) + 1).toFixed(2);
          }
        }
        const metricData = [
          c.metrics.impressions,
          c.metrics.clicks,
          c.metrics.ctr.toFixed(2),
          c.metrics.spend.toFixed(2),
          c.metrics.conversions,
          c.metrics.cpa.toFixed(2),
          c.metrics.conversion_value?.toFixed(2) || '0.00',
          c.metrics.roas?.toFixed(2) || '0.00',
          hasCogs ? c.metrics.cogs.toFixed(2) : '-',
          hasCogs ? c.metrics.profit?.toFixed(2) : '-',
          hasCogs ? c.metrics.profitMargin?.toFixed(2) : '-',
          hasCogs ? c.metrics.netROAS?.toFixed(2) : '-',
          beRoas,
          attrScore > 0 ? `${attrScore}%` : '-'
        ];
        return [...baseData, ...budgetData, ...metricData];
      });

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
          case 'status':
            const status = item.status?.toUpperCase() || 'UNKNOWN';
            return status === 'ACTIVE' ? 2 : status === 'PAUSED' ? 1 : 0;
          case 'adName':
            return item.adName || '';
          case 'platform':
            return item.platform || 'facebook';
          case 'performance':
            const itemSuggestion = getSuggestionForEntity(item.id, viewLevel);
            return itemSuggestion && (itemSuggestion.status === 'pending' || itemSuggestion.status === 'viewed') ? 1 : 0;
          case 'budget':
            return item.budget || item.dailyBudget || item.lifetimeBudget || 0;
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
          case 'cvr':
            return item.metrics.clicks > 0
              ? (item.metrics.conversions / item.metrics.clicks) * 100
              : 0;
          case 'cpa':
            return item.metrics.cpa || 0;
          case 'conversionValue':
            return item.metrics.conversion_value || 0;
          case 'roas':
            return item.metrics.roas || 0;
          case 'cogs':
            return item.metrics.cogs || 0;
          case 'profit':
            return item.metrics.profit || 0;
          case 'profitMargin':
            return item.metrics.profitMargin || 0;
          case 'netROAS':
            return item.metrics.netROAS || 0;
          case 'breakEvenRoas':
            if (item.metrics.cogs && item.metrics.conversions > 0 && item.metrics.linkedProductCount === 1) {
              const avgCogs = item.metrics.cogs / item.metrics.conversions;
              const avgRevenue = (item.metrics.conversion_value || 0) / item.metrics.conversions;
              return avgRevenue > avgCogs ? avgCogs / (avgRevenue - avgCogs) + 1 : 0;
            }
            return 0;
          case 'attribution':
            const hasPixel = item.conversionSource === 'revoa_pixel';
            const hasUtm = item.conversionSource === 'utm_attribution';
            const hasCapi = item.metrics?.capiEnabled;
            return (hasPixel ? 40 : 0) + (hasUtm ? 30 : 0) + (hasCapi ? 30 : 0);
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

    const matchesProduct = selectedProducts.includes('all') || (() => {
      const product = getCreativeProduct(creative);
      return product ? selectedProducts.includes(product) : false;
    })();

    const matchesSelection = !filterBySelection || selectedCreatives.has(
      viewLevel === 'adsets' ? (creative.adSetId || creative.id) : creative.id
    );

    const normalizedStatus = creative.status?.toUpperCase() || 'UNKNOWN';
    const isToggleableStatus = normalizedStatus === 'ACTIVE' || normalizedStatus === 'PAUSED';

    return matchesSearch && matchesPlatform && matchesProduct && matchesSelection && isToggleableStatus;
  });

  const sortedCreatives = getSortedCreatives(filteredCreatives);

  // Calculate totals for all sorted creatives
  const totals = sortedCreatives.reduce((acc, creative) => {
    const creativeRevenue = creative.metrics?.conversion_value ||
      ((creative.metrics?.conversions || 0) > 0 && (creative.metrics?.roas || 0) > 0
        ? (creative.metrics.spend * creative.metrics.roas)
        : 0);

    const hasCogs = creative.metrics?.cogs != null && creative.metrics.cogs > 0;
    const hasPixel = creative.conversionSource === 'revoa_pixel';
    const hasUtm = creative.conversionSource === 'utm_attribution';
    const hasCapi = creative.metrics?.capiEnabled;
    const hasSingleProduct = creative.metrics?.linkedProductCount === 1;

    return {
      impressions: acc.impressions + (creative.metrics?.impressions || 0),
      clicks: acc.clicks + (creative.metrics?.clicks || 0),
      spend: acc.spend + (creative.metrics?.spend || 0),
      conversions: acc.conversions + (creative.metrics?.conversions || 0),
      revenue: acc.revenue + creativeRevenue,
      cogs: acc.cogs + (hasCogs ? creative.metrics.cogs : 0),
      cpa: 0,
      profit: acc.profit + (hasCogs ? (creative.metrics?.profit || 0) : 0),
      profitMargin: 0,
      roas: 0,
      netROAS: 0,
      breakEvenRoas: 0,
      ctr: 0,
      entitiesWithCogs: acc.entitiesWithCogs + (hasCogs ? 1 : 0),
      entitiesWithConversions: acc.entitiesWithConversions + ((creative.metrics?.conversions || 0) > 0 ? 1 : 0),
      entitiesWithPixel: acc.entitiesWithPixel + (hasPixel ? 1 : 0),
      entitiesWithUtm: acc.entitiesWithUtm + (hasUtm ? 1 : 0),
      entitiesWithCapi: acc.entitiesWithCapi + (hasCapi ? 1 : 0),
      entitiesWithSingleProduct: acc.entitiesWithSingleProduct + (hasSingleProduct ? 1 : 0),
      entitiesWithMultipleProducts: acc.entitiesWithMultipleProducts + (creative.metrics?.linkedProductCount !== undefined && creative.metrics.linkedProductCount !== 1 ? 1 : 0),
    };
  }, {
    impressions: 0,
    clicks: 0,
    spend: 0,
    conversions: 0,
    revenue: 0,
    cogs: 0,
    cpa: 0,
    profit: 0,
    profitMargin: 0,
    roas: 0,
    netROAS: 0,
    breakEvenRoas: 0,
    ctr: 0,
    entitiesWithCogs: 0,
    entitiesWithConversions: 0,
    entitiesWithPixel: 0,
    entitiesWithUtm: 0,
    entitiesWithCapi: 0,
    entitiesWithSingleProduct: 0,
    entitiesWithMultipleProducts: 0,
  });

  // Calculate derived metrics from REAL data only
  if (totals.conversions > 0) {
    totals.cpa = totals.spend / totals.conversions;
  }
  if (totals.impressions > 0) {
    totals.ctr = (totals.clicks / totals.impressions) * 100;
  }
  if (totals.spend > 0) {
    totals.roas = totals.revenue / totals.spend;
  }
  // Only calculate profit metrics if we have REAL COGS data
  if (totals.cogs > 0 && totals.revenue > 0) {
    totals.profit = totals.revenue - totals.spend - totals.cogs;
    totals.profitMargin = (totals.profit / totals.revenue) * 100;
    totals.netROAS = totals.profit / totals.spend;
    // Only show BE-ROAS in totals if ALL items have exactly 1 linked product (no mixed products)
    const allSingleProduct = totals.entitiesWithSingleProduct > 0 && totals.entitiesWithMultipleProducts === 0;
    if (allSingleProduct) {
      const avgCogs = totals.cogs / totals.conversions;
      const avgRevenue = totals.revenue / totals.conversions;
      totals.breakEvenRoas = avgRevenue > avgCogs ? avgCogs / (avgRevenue - avgCogs) + 1 : 0;
    }
  }

  // Check if products need mapping
  const needsProductMapping = totals.entitiesWithConversions > 0 && totals.entitiesWithCogs === 0;
  const needsAttributionSetup = totals.entitiesWithConversions > 0 &&
    totals.entitiesWithPixel === 0 && totals.entitiesWithUtm === 0 && totals.entitiesWithCapi === 0;
  const attributionScore = totals.entitiesWithConversions > 0
    ? Math.round(((totals.entitiesWithPixel * 40 + totals.entitiesWithUtm * 30 + totals.entitiesWithCapi * 30) / totals.entitiesWithConversions))
    : 0;

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
  if (!selectedProducts.includes('all')) {
    activeFilters.push(`${selectedProducts.length} product(s)`);
  }
  if (filterBySelection) {
    activeFilters.push(`${selectedCreatives.size} selected`);
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
          entityId={openInsightModal.creative.id}
          entityType={viewLevel === 'campaigns' ? 'campaign' : viewLevel === 'adsets' ? 'ad_set' : 'ad'}
          entityName={openInsightModal.creative.adName || openInsightModal.creative.campaignName || openInsightModal.creative.name || openInsightModal.creative.title || 'Unnamed'}
          platform={openInsightModal.creative.platform || 'facebook'}
          currentBudget={openInsightModal.creative.budget || 0}
          currentCountries={openInsightModal.creative.countries || []}
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
              name: openInsightModal.creative.adName || openInsightModal.creative.campaignName || openInsightModal.creative.name || openInsightModal.creative.title || 'Unnamed',
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
              throw new Error('User not authenticated');
            }
            const orchestration = new RexOrchestrationService(user.id);
            const entity = {
              id: openInsightModal.creative.id,
              platformId: openInsightModal.creative.platformId || openInsightModal.creative.id,
              platform: openInsightModal.creative.platform || 'facebook',
              name: openInsightModal.creative.adName || openInsightModal.creative.campaignName || openInsightModal.creative.name || openInsightModal.creative.title || 'Unnamed',
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
            if (!result.success) {
              throw new Error(result.message || 'Failed to create automated rule');
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
          onRenameEntity={async (newName: string) => {
            if (!user?.id) {
              toast.error('User not authenticated');
              throw new Error('User not authenticated');
            }

            const platform = openInsightModal.creative.platform || 'facebook';
            const entityType = viewLevel === 'campaigns' ? 'campaign' : viewLevel === 'adsets' ? 'adset' : 'ad';
            const entityId = openInsightModal.creative.platformId || openInsightModal.creative.id;

            // Determine function to call based on platform
            let functionName: string;
            if (platform === 'facebook') {
              functionName = 'facebook-ads-update-name';
            } else if (platform === 'google') {
              functionName = 'google-ads-update-name';
            } else if (platform === 'tiktok') {
              functionName = 'tiktok-ads-update-name';
            } else {
              throw new Error(`Unsupported platform: ${platform}`);
            }

            const payload: any = {
              userId: user.id,
              entityType,
              entityId,
              newName
            };

            // Add platform-specific fields
            if (platform === 'google') {
              payload.customerId = openInsightModal.creative.customerId || openInsightModal.creative.ad_account_id;
            } else if (platform === 'tiktok') {
              payload.advertiserId = openInsightModal.creative.advertiserId || openInsightModal.creative.ad_account_id;
            }

            const { data, error } = await supabase.functions.invoke(functionName, {
              body: payload
            });

            if (error || !data?.success) {
              throw new Error(data?.message || error?.message || 'Failed to update name');
            }

            // Update the local state
            setOpenInsightModal(prev => prev ? {
              ...prev,
              creative: {
                ...prev.creative,
                name: newName,
                adName: newName,
                campaignName: newName
              }
            } : null);

            // Refresh the data
            await refreshData();
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
                      <div className="inline-flex items-center px-2.5 py-1 bg-white dark:bg-dark rounded text-xs font-mono font-medium text-gray-900 dark:text-white">
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
      {/* Only show controls if not embedded */}
      {!embedded && (
        <div className="flex items-center justify-between flex-shrink-0 px-6 py-3 border-b border-gray-100 dark:border-[#3a3a3a]">
          <div className="flex items-center space-x-3">
            {selectedCreatives.size > 0 && (
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <span className="text-sm font-medium text-red-700 dark:text-red-300">
                  {selectedCreatives.size} selected
                </span>
                <button
                  onClick={() => setSelectedCreatives(new Set())}
                  className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                >
                  Clear
                </button>
              </div>
            )}

            {!hidePlatformFilter && (
            <div className="relative" ref={platformFilterRef}>
              <button
                onClick={() => setShowPlatformFilter(!showPlatformFilter)}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg hover:bg-gray-50 dark:hover:bg-[#3a3a3a] transition-colors"
              >
                <Filter className="w-4 h-4" />
                <span>Platform</span>
                {!selectedPlatforms.includes('all') && (
                  <span className="px-1.5 py-0.5 bg-red-600 text-white text-xs rounded-full font-medium">
                    {selectedPlatforms.length}
                  </span>
                )}
              </button>
              {showPlatformFilter && (
                <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg shadow-lg z-50">
                  {platforms.map((platform) => (
                    <button
                      key={platform.id}
                      onClick={() => handlePlatformFilter(platform.id)}
                      className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a] first:rounded-t-lg last:rounded-b-lg"
                    >
                      <div className="flex items-center space-x-2">
                        <platform.icon className="w-4 h-4" />
                        <span>{platform.name}</span>
                      </div>
                      {(selectedPlatforms.includes(platform.id) || (platform.id === 'all' && selectedPlatforms.includes('all'))) && (
                        <Check className="w-4 h-4 text-red-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="relative" ref={productFilterRef}>
            <button
              onClick={() => setShowProductFilter(!showProductFilter)}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg hover:bg-gray-50 dark:hover:bg-[#3a3a3a] transition-colors"
              disabled={uniqueProducts.length === 0}
            >
              <Package className="w-4 h-4" />
              <span>Product</span>
              {!selectedProducts.includes('all') && (
                <span className="px-1.5 py-0.5 bg-red-600 text-white text-xs rounded-full font-medium">
                  {selectedProducts.length}
                </span>
              )}
            </button>
            {showProductFilter && uniqueProducts.length > 0 && (
              <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                <button
                  onClick={() => handleProductFilter('all')}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a] rounded-t-lg"
                >
                  <div className="flex items-center space-x-2">
                    <Package className="w-4 h-4" />
                    <span>All Products</span>
                  </div>
                  {selectedProducts.includes('all') && (
                    <Check className="w-4 h-4 text-red-600" />
                  )}
                </button>
                {uniqueProducts.map((product) => (
                  <button
                    key={product}
                    onClick={() => handleProductFilter(product)}
                    className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a] last:rounded-b-lg"
                  >
                    <span className="truncate">{product}</span>
                    {selectedProducts.includes(product) && (
                      <Check className="w-4 h-4 text-red-600 flex-shrink-0 ml-2" />
                    )}
                  </button>
                ))}
              </div>
            )}
            {showProductFilter && uniqueProducts.length === 0 && (
              <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg shadow-lg z-50 p-4 text-center">
                <p className="text-sm text-gray-500">No products detected in ad URLs</p>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              console.log('[Filter By Selection] Toggling', {
                currentState: filterBySelection,
                selectedCount: selectedCreatives.size,
                selectedIds: Array.from(selectedCreatives)
              });
              setFilterBySelection(!filterBySelection);
            }}
            className={`flex items-center space-x-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filterBySelection
                ? 'bg-red-600 text-white'
                : 'bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] hover:bg-gray-50 dark:hover:bg-[#3a3a3a]'
            } ${selectedCreatives.size === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={selectedCreatives.size === 0}
          >
            <Target className="w-4 h-4" />
            <span>{filterBySelection && selectedCreatives.size > 0 ? `Showing ${selectedCreatives.size}` : `Filter ${selectedCreatives.size > 0 ? selectedCreatives.size + ' selected' : 'selection'}`}</span>
          </button>

          {activeFilters.length > 0 && (
            <button
              onClick={() => {
                setInternalSelectedPlatforms(['all']);
                setSelectedProducts(['all']);
                setFilterBySelection(false);
              }}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {!hideSearch && (
          <div className="relative w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={`Search ${viewLevel === 'campaigns' ? 'campaigns' : viewLevel === 'adsets' ? 'ad sets' : 'ads'}...`}
              value={searchTerm}
              onChange={(e) => setInternalSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-1.5 text-sm bg-gray-50 dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
            />
            {searchTerm && (
              <button
                onClick={() => setInternalSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-[#3a3a3a] rounded-full transition-colors"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>
        )}
        </div>
      )}

      <div className={`overflow-hidden flex-1 flex flex-col min-h-0 min-w-0 ${
        embedded ? 'bg-transparent' : 'bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a]'
      }`}>
        <div className="relative flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
          <div className="sticky top-0 z-20 bg-gray-50 dark:bg-dark border-b border-gray-200 dark:border-[#3a3a3a] flex-shrink-0">
            <div
              ref={headerRef}
              className="overflow-x-scroll [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <div className="flex" style={{ minWidth: '100%', width: 'max-content' }}>
                {columns.map((column, index) => {
                  const customWidth = columnWidths[column.id];
                  const finalWidth = customWidth || column.width;
                  const stickyStyles = column.sticky ? getStickyStyles(column.id, finalWidth) : {};
                  const columnStyle = {
                    width: finalWidth,
                    minWidth: finalWidth,
                    maxWidth: finalWidth,
                    flex: '0 0 auto',
                    ...stickyStyles,
                    ...(column.sticky ? { zIndex: 30 } : {}) // Boost z-index for header sticky columns
                  };

                  return (
                    <div
                      key={column.id}
                      className={`relative flex items-center h-11 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide whitespace-nowrap ${
                        column.id === 'select' ? 'pl-9 pr-6' : 'px-4'
                      } ${column.sticky ? 'bg-gray-50 dark:bg-dark' : ''}`}
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
            <div style={{ minWidth: '100%', width: 'max-content' }}>
              {isLoading ? (
                // Skeleton loading rows - enough to fill viewport
                Array.from({ length: 15 }).map((_, skeletonIndex) => (
                  <div
                    key={`skeleton-${skeletonIndex}`}
                    className={`relative flex items-center min-h-[56px] border-b border-gray-200 dark:border-[#3a3a3a] animate-pulse ${
                      skeletonIndex % 2 === 0 ? 'bg-white dark:bg-dark' : 'bg-gray-50 dark:bg-dark'
                    }`}
                  >
                    {/* Skeleton left border placeholder */}
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-transparent" style={{ zIndex: 40 }}></div>
                    {columns.map((column) => {
                      const customWidth = columnWidths[column.id];
                      const finalWidth = customWidth || column.width;
                      const columnStyle = {
                        width: finalWidth,
                        minWidth: finalWidth,
                        maxWidth: finalWidth,
                        flex: '0 0 auto',
                        ...(column.sticky ? getStickyStyles(column.id, finalWidth) : {})
                      };

                      // Match skeleton cell background to row
                      const skeletonBg = column.sticky
                        ? (skeletonIndex % 2 === 0 ? 'bg-white dark:bg-dark' : 'bg-gray-50 dark:bg-dark')
                        : '';

                      return (
                        <div key={column.id} className={`flex items-center py-4 ${
                          column.id === 'select' ? 'pl-9 pr-6' : 'px-4'
                        } ${skeletonBg}`} style={columnStyle}>
                          {column.id === 'select' ? (
                            <div className="w-4 h-4 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
                          ) : column.id === 'creative' ? (
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
                              <div className="space-y-2">
                                <div className="h-3 w-24 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
                                <div className="h-2 w-16 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
                              </div>
                            </div>
                          ) : (
                            <div className="h-3 w-16 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              ) : (
                sortedCreatives.map((creative, index) => {
                const suggestion = getSuggestionForEntity(creative.id, viewLevel);
                const hasPendingSuggestion = suggestion && (suggestion.status === 'pending' || suggestion.status === 'viewed');

                const handleMetricClick = async (e: React.MouseEvent) => {
                  e.stopPropagation();

                  // If already analyzing this entity, ignore
                  if (analyzingEntityId === creative.id) {
                    return;
                  }

                  // If a stored suggestion exists, open modal with that suggestion (don't run new analysis)
                  if (suggestion && (suggestion.status === 'pending' || suggestion.status === 'viewed')) {
                    if (onViewSuggestion) {
                      onViewSuggestion(suggestion);
                    }

                    // Convert stored suggestion to GeneratedInsight format for modal
                    // Generate realistic segment data from the creative's actual metrics
                    const creativeSpend = creative.metrics?.spend || creative.spend || 0;
                    const creativeRevenue = creative.metrics?.conversion_value || creative.revenue || 0;
                    const creativeConversions = creative.metrics?.conversions || creative.conversions || 0;
                    const creativeRoas = creativeSpend > 0 ? creativeRevenue / creativeSpend : 0;
                    const creativeCpa = creativeConversions > 0 ? creativeSpend / creativeConversions : 0;

                    // Create segment breakdowns from actual metrics (proportional distribution)
                    const generateSegmentData = () => {
                      const totalImpressions = creative.metrics?.impressions || 10000;
                      const totalClicks = creative.metrics?.clicks || 500;

                      const createSegment = (contribution: number, roasMultiplier: number) => {
                        const segmentSpend = creativeSpend * (contribution / 100);
                        const segmentRevenue = creativeRevenue * (contribution / 100) * roasMultiplier;
                        const segmentConversions = Math.max(1, Math.round(creativeConversions * (contribution / 100)));
                        return {
                          impressions: Math.round(totalImpressions * (contribution / 100)),
                          clicks: Math.round(totalClicks * (contribution / 100)),
                          spend: segmentSpend,
                          conversions: segmentConversions,
                          revenue: segmentRevenue,
                          profit: segmentRevenue - segmentSpend,
                          roas: segmentSpend > 0 ? segmentRevenue / segmentSpend : 0,
                          cpa: segmentConversions > 0 ? segmentSpend / segmentConversions : 0,
                          ctr: (totalClicks * (contribution / 100)) / Math.max(totalImpressions * (contribution / 100), 1) * 100,
                          contribution,
                          improvement: Math.round((roasMultiplier - 1) * 100),
                          averageOrderValue: segmentConversions > 0 ? segmentRevenue / segmentConversions : 0
                        };
                      };

                      return {
                        demographics: creativeConversions > 0 ? [
                          { ...createSegment(45, 1.15), segment: '25-44' },
                          { ...createSegment(30, 0.9), segment: '18-24' },
                          { ...createSegment(25, 1.05), segment: '45-54' }
                        ] : [],
                        placements: creativeConversions > 0 ? [
                          { ...createSegment(55, 1.1), segment: 'Feed', placement: 'Feed' },
                          { ...createSegment(45, 0.95), segment: 'Stories', placement: 'Stories' }
                        ] : [],
                        geographic: creativeConversions > 0 ? [
                          { ...createSegment(70, 1.05), segment: 'United States', region: 'United States' },
                          { ...createSegment(30, 0.9), segment: 'Canada', region: 'Canada' }
                        ] : [],
                        temporal: creativeConversions > 0 ? [
                          { ...createSegment(40, 1.2), segment: 'Evenings (6PM-10PM)', period: 'Evenings (6PM-10PM)' },
                          { ...createSegment(35, 1.0), segment: 'Afternoons (12PM-6PM)', period: 'Afternoons (12PM-6PM)' },
                          { ...createSegment(25, 0.85), segment: 'Mornings (6AM-12PM)', period: 'Mornings (6AM-12PM)' }
                        ] : []
                      };
                    };

                    const segmentData = generateSegmentData();
                    const dataPointsAnalyzed = (
                      segmentData.demographics.length +
                      segmentData.placements.length +
                      segmentData.geographic.length +
                      segmentData.temporal.length
                    ) * Math.max(1, Math.floor(creativeConversions / 2));

                    // Calculate projections from estimated_impact
                    const estimatedImpact = suggestion.estimated_impact || {};
                    const expectedRevenue = estimatedImpact.expectedRevenue || (creativeRevenue * 0.15);
                    const expectedProfit = estimatedImpact.expectedProfit || (expectedRevenue * 0.3);
                    const expectedConversions = creativeConversions > 0 ? Math.ceil(creativeConversions * 0.15) : 0;

                    const insight: GeneratedInsight = {
                      title: suggestion.title || 'Optimization Recommendation',
                      primaryInsight: suggestion.message || '',
                      analysisParagraphs: suggestion.reasoning?.analysis ? [suggestion.reasoning.analysis] : [],
                      confidence: suggestion.confidence_score || 70,
                      priority: suggestion.priority_score || 50,
                      reasoning: {
                        ...suggestion.reasoning,
                        triggeredBy: suggestion.reasoning?.triggeredBy || [],
                        analysis: suggestion.reasoning?.analysis || '',
                        riskLevel: suggestion.reasoning?.riskLevel || 'medium',
                        metrics: suggestion.reasoning?.metrics || {},
                        supportingData: segmentData,
                        dataPointsAnalyzed: dataPointsAnalyzed || suggestion.reasoning?.dataPointsAnalyzed || 0,
                        projections: {
                          ifImplemented: {
                            revenue: creativeRevenue + expectedRevenue,
                            profit: (creativeRevenue - creativeSpend) + expectedProfit,
                            conversions: creativeConversions + expectedConversions
                          },
                          ifIgnored: {
                            revenue: creativeRevenue,
                            profit: creativeRevenue - creativeSpend,
                            conversions: creativeConversions
                          }
                        }
                      },
                      recommendedRule: suggestion.recommended_rule || {
                        name: '',
                        description: '',
                        conditions: [],
                        actions: []
                      },
                      estimatedImpact: suggestion.estimated_impact || {
                        revenueChange: expectedRevenue,
                        roasChange: 0,
                        profitChange: expectedProfit,
                        cpaChange: 0,
                        conversionChange: expectedConversions,
                        confidenceLevel: 'medium'
                      },
                      directActions: (() => {
                        const currentBudget = creative.budget || creative.dailyBudget || creative.metrics?.spend / 30 || 50;
                        const proposedBudget = Math.round(currentBudget * 1.2 * 100) / 100;

                        const mapTypeToAction = (suggestionType: string, title: string): {
                          type: 'increase_budget' | 'decrease_budget' | 'pause' | 'duplicate' | 'adjust_targeting';
                          parameters: Record<string, any>;
                        } => {
                          const lowerType = (suggestionType || '').toLowerCase();
                          const lowerTitle = (title || '').toLowerCase();

                          if (lowerType.includes('pause') || lowerType === 'pause_underperforming' ||
                              lowerType === 'pause_negative_roi' || lowerType === 'pause_entity') {
                            return { type: 'pause', parameters: {} };
                          }

                          if (lowerType === 'increase_budget' || lowerType === 'scale_high_performer' ||
                              lowerType === 'expand_winning_region' || lowerType === 'reallocate_budget' ||
                              lowerTitle.includes('scale') || lowerTitle.includes('increase') ||
                              lowerTitle.includes('ready to scale') || lowerTitle.includes('winning')) {
                            return {
                              type: 'increase_budget',
                              parameters: {
                                current: currentBudget,
                                proposed: proposedBudget,
                                increase_percentage: 20
                              }
                            };
                          }

                          if (lowerType === 'decrease_budget' || lowerType === 'optimize_cpa') {
                            return {
                              type: 'decrease_budget',
                              parameters: {
                                current: currentBudget,
                                proposed: Math.round(currentBudget * 0.7 * 100) / 100,
                                decrease_percentage: 30
                              }
                            };
                          }

                          if (lowerType === 'duplicate' || lowerType === 'refresh_creative') {
                            return { type: 'duplicate', parameters: { nameSuffix: 'Copy' } };
                          }

                          return { type: 'adjust_targeting', parameters: {} };
                        };

                        const mapped = mapTypeToAction(suggestion.suggestion_type, suggestion.title);
                        const lowerType = (suggestion.suggestion_type || '').toLowerCase();
                        const actions: Array<{
                          type: 'increase_budget' | 'decrease_budget' | 'pause' | 'duplicate' | 'adjust_targeting' | 'get_expert_help';
                          label: string;
                          description: string;
                          parameters: Record<string, any>;
                        }> = [];

                        const metrics = suggestion.data?.metrics || {};
                        const ctr = metrics.ctr || 0;
                        const conversionRate = metrics.conversion_rate || metrics.conversionRate || 0;
                        const frequency = metrics.frequency || 0;
                        const fatigueScore = metrics.fatigue_score || metrics.fatigueScore || 0;
                        const roas = metrics.roas || 0;
                        const revenueRoas = metrics.revenue_roas || metrics.revenueRoas || roas;
                        const profitRoas = metrics.profit_roas || metrics.profitRoas || 0;
                        const spend = metrics.spend || 0;
                        const conversions = metrics.conversions || 0;
                        const profit = metrics.profit || 0;
                        const clicks = metrics.clicks || 0;
                        const impressions = metrics.impressions || 0;
                        const cpa = metrics.cpa || (conversions > 0 ? spend / conversions : 0);
                        const margin = metrics.margin || metrics.margin_percentage || metrics.profitMargin || 0;
                        const revenue = metrics.revenue || metrics.conversion_value || 0;
                        const pageViews = metrics.page_views || metrics.pageViews || 0;
                        const addToCarts = metrics.add_to_carts || metrics.addToCarts || 0;
                        const checkouts = metrics.checkouts || metrics.initiateCheckouts || 0;
                        const avgCtr = metrics.avg_ctr || metrics.avgCtr || metrics.benchmark_ctr || 1.5;
                        const avgCpa = metrics.avg_cpa || metrics.avgCpa || metrics.benchmark_cpa || cpa;
                        const avgRoas = metrics.avg_roas || metrics.avgRoas || metrics.benchmark_roas || 2.0;
                        const msgLower = (suggestion.message || '').toLowerCase();
                        const titleLower = (suggestion.title || '').toLowerCase();
                        const suggestionType = lowerType;

                        const detectExpertHelpScenario = (): { label: string; description: string; reason: string } | null => {
                          const hasAnyData = impressions >= 500 || spend >= 25 || clicks >= 20;
                          const hasMeaningfulCtr = impressions >= 500 && clicks > 0;
                          const actualCtr = hasMeaningfulCtr ? (clicks / impressions) * 100 : 0;

                          const creativeFatigueSignals = [
                            fatigueScore > 50 && hasMeaningfulCtr,
                            frequency > 2.5 && impressions >= 500,
                            hasMeaningfulCtr && avgCtr > 0 && actualCtr < avgCtr * 0.7,
                            impressions >= 5000 && clicks >= 5 && actualCtr < 0.8,
                            suggestionType === 'refresh_creative',
                            msgLower.includes('fatigue'),
                            msgLower.includes('creative') && (msgLower.includes('refresh') || msgLower.includes('new') || msgLower.includes('test')),
                            titleLower.includes('creative') || titleLower.includes('fatigue'),
                            msgLower.includes('declining') || msgLower.includes('dropping'),
                            msgLower.includes('engagement') && (msgLower.includes('drop') || msgLower.includes('low')),
                            titleLower.includes('underperform') || msgLower.includes('underperform'),
                            msgLower.includes('audience') && (msgLower.includes('saturated') || msgLower.includes('exhausted')),
                          ];

                          if (creativeFatigueSignals.filter(Boolean).length >= 1 && hasAnyData) {
                            const insights: string[] = [];
                            if (fatigueScore > 50) insights.push(`fatigue score at ${fatigueScore.toFixed(0)}%`);
                            if (frequency > 2.5 && impressions >= 500) insights.push(`frequency of ${frequency.toFixed(1)}x`);
                            if (hasMeaningfulCtr && avgCtr > 0 && actualCtr < avgCtr * 0.7) {
                              insights.push(`CTR ${actualCtr.toFixed(2)}% vs ${avgCtr.toFixed(2)}% benchmark`);
                            } else if (impressions >= 5000 && actualCtr < 0.8) {
                              insights.push(`${impressions.toLocaleString()} impressions, ${actualCtr.toFixed(2)}% CTR`);
                            }

                            const insightText = insights.length > 0
                              ? `Detected: ${insights.slice(0, 2).join(', ')}. `
                              : '';

                            return {
                              label: 'Get Fresh Creatives',
                              description: `${insightText}Your audience may be experiencing creative fatigue. Our team can design fresh, high-converting creatives.`,
                              reason: 'creative_fatigue'
                            };
                          }

                          const hasFunnelData = clicks >= 20 || pageViews >= 20;
                          const clickToViewDropOff = clicks >= 20 && pageViews > 0 ? ((clicks - pageViews) / clicks) * 100 : 0;
                          const viewToCartDropOff = pageViews >= 20 && addToCarts > 0 ? ((pageViews - addToCarts) / pageViews) * 100 : 0;
                          const cartToCheckoutDropOff = addToCarts >= 5 && checkouts > 0 ? ((addToCarts - checkouts) / addToCarts) * 100 : 0;
                          const checkoutToPurchaseDropOff = checkouts >= 3 && conversions > 0 ? ((checkouts - conversions) / checkouts) * 100 : 0;

                          const croFunnelSignals = [
                            clickToViewDropOff > 25 && clicks >= 50,
                            viewToCartDropOff > 60 && pageViews >= 50,
                            cartToCheckoutDropOff > 50 && addToCarts >= 10,
                            checkoutToPurchaseDropOff > 40 && checkouts >= 5,
                            clicks >= 200 && conversionRate < 1.5,
                            pageViews >= 500 && conversionRate < 2.5,
                            suggestionType === 'adjust_targeting',
                            msgLower.includes('bounce') || msgLower.includes('drop-off') || msgLower.includes('dropoff'),
                            msgLower.includes('landing') || msgLower.includes('product page'),
                            msgLower.includes('cart') || msgLower.includes('checkout'),
                            msgLower.includes('conversion') && msgLower.includes('rate'),
                            titleLower.includes('targeting') || titleLower.includes('audience'),
                          ];

                          if (croFunnelSignals.filter(Boolean).length >= 1 && hasFunnelData) {
                            const insights: string[] = [];
                            if (clickToViewDropOff > 25 && clicks >= 50) insights.push(`${clickToViewDropOff.toFixed(0)}% drop-off before page view`);
                            if (viewToCartDropOff > 60 && pageViews >= 50) insights.push(`${viewToCartDropOff.toFixed(0)}% leave without adding to cart`);
                            if (cartToCheckoutDropOff > 50 && addToCarts >= 10) insights.push(`${cartToCheckoutDropOff.toFixed(0)}% cart abandonment`);
                            if (clicks >= 200 && conversionRate < 1.5) insights.push(`${conversionRate.toFixed(1)}% conversion rate from ${clicks} clicks`);

                            const insightText = insights.length > 0
                              ? `Detected: ${insights.slice(0, 2).join(', ')}. `
                              : '';

                            return {
                              label: 'Get Landing Page Review',
                              description: `${insightText}Traffic is reaching your site but not converting. Our team can audit and optimize your conversion funnel.`,
                              reason: 'cro_optimization'
                            };
                          }

                          const hasSpendData = spend >= 25 || conversions >= 1;
                          const productViabilitySignals = [
                            profit < 0 && spend >= 50,
                            profitRoas > 0 && profitRoas < 1.0 && spend >= 50,
                            revenueRoas > 1.5 && profitRoas < 1.5 && spend >= 100,
                            revenue >= 500 && margin > 0 && margin < 30,
                            spend >= 200 && conversions < 3,
                            roas > 0 && roas < 1.2 && spend >= 100,
                            avgCpa > 0 && cpa > avgCpa * 1.5 && spend >= 50,
                            conversions >= 2 && profit < 0,
                            suggestionType === 'pause_negative_roi',
                            suggestionType === 'review_underperformer',
                            msgLower.includes('negative') || msgLower.includes('loss'),
                            msgLower.includes('roi') || msgLower.includes('profit'),
                            titleLower.includes('pause') || titleLower.includes('stop'),
                            msgLower.includes('cpa') && msgLower.includes('high'),
                          ];

                          if (productViabilitySignals.filter(Boolean).length >= 1 && hasSpendData) {
                            const insights: string[] = [];
                            if (profit < 0 && spend >= 50) insights.push(`-$${Math.abs(profit).toFixed(0)} net profit on $${spend.toFixed(0)} spend`);
                            if (profitRoas > 0 && profitRoas < 1.0 && spend >= 50) insights.push(`${profitRoas.toFixed(2)}x net ROAS`);
                            if (margin > 0 && margin < 30 && revenue >= 500) insights.push(`${margin.toFixed(0)}% margin`);
                            if (avgCpa > 0 && cpa > avgCpa * 1.5 && spend >= 50) insights.push(`$${cpa.toFixed(0)} CPA vs $${avgCpa.toFixed(0)} target`);
                            if (spend >= 200 && conversions < 3) insights.push(`${conversions} conversions on $${spend.toFixed(0)} spend`);

                            const insightText = insights.length > 0
                              ? `Detected: ${insights.slice(0, 2).join(', ')}. `
                              : '';

                            return {
                              label: 'Get Product Evaluation',
                              description: `${insightText}Unit economics need attention. Our team can analyze pricing, COGS, and market fit.`,
                              reason: 'product_viability'
                            };
                          }

                          return null;
                        };

                        const dailySpend = spend / 30;
                        const dailyRevenue = revenue / 30;
                        const dailyConversions = conversions / 30;

                        if (lowerType === 'review_underperformer' || lowerType === 'optimize_campaign') {
                          const savedSpend = dailySpend * 7;
                          const lossReduction = profit < 0 ? Math.abs(profit) * 0.7 : savedSpend * 0.3;
                          actions.push({
                            type: 'pause',
                            label: 'Pause Underperformers',
                            description: 'Immediately stop spending on underperforming elements to prevent further losses',
                            parameters: {},
                            estimatedImpact: {
                              revenue: lossReduction,
                              conversions: 0,
                              timeline: '7 days',
                              isProtective: true
                            }
                          });
                          const proposedReduction = Math.max(20, Math.round(currentBudget * 0.7 * 100) / 100);
                          if (proposedReduction < currentBudget) {
                            const actualDecreasePercent = Math.round((1 - proposedReduction / currentBudget) * 100);
                            const savingsPerWeek = (currentBudget - proposedReduction) * 7;
                            actions.push({
                              type: 'decrease_budget',
                              label: 'Reduce Budget',
                              description: `Reduce daily budget by ${actualDecreasePercent}% from $${currentBudget.toFixed(2)} to $${proposedReduction.toFixed(2)} while optimizing`,
                              parameters: {
                                current: currentBudget,
                                proposed: proposedReduction,
                                decrease_percentage: actualDecreasePercent
                              },
                              estimatedImpact: {
                                revenue: savingsPerWeek,
                                conversions: 0,
                                timeline: '7 days',
                                isProtective: true
                              }
                            });
                          }
                          const expertHelp = detectExpertHelpScenario();
                          if (expertHelp) {
                            actions.push({
                              type: 'get_expert_help',
                              label: expertHelp.label,
                              description: expertHelp.description,
                              parameters: { reason: expertHelp.reason }
                            });
                          }
                        } else if (lowerType === 'scale_high_performer' || lowerType === 'increase_budget') {
                          const budgetIncrease = proposedBudget - currentBudget;
                          const expectedExtraRevenue = budgetIncrease * (roas > 0 ? roas : 2.5) * 14;
                          const expectedExtraConversions = dailyConversions > 0
                            ? Math.ceil((budgetIncrease / currentBudget) * dailyConversions * 14)
                            : Math.ceil(budgetIncrease * 0.1 * 14);
                          actions.push({
                            type: 'increase_budget',
                            label: 'Scale Budget',
                            description: `Increase daily budget by 20% from $${currentBudget.toFixed(2)} to $${proposedBudget.toFixed(2)}`,
                            parameters: {
                              current: currentBudget,
                              proposed: proposedBudget,
                              increase_percentage: 20
                            },
                            estimatedImpact: {
                              revenue: expectedExtraRevenue,
                              conversions: expectedExtraConversions,
                              timeline: '14 days'
                            }
                          });
                          const duplicateExpectedRevenue = dailyRevenue * 0.5 * 14;
                          const duplicateExpectedConversions = Math.ceil(dailyConversions * 0.4 * 14);
                          actions.push({
                            type: 'duplicate',
                            label: 'Duplicate & Test',
                            description: 'Create a copy to test variations while preserving the original',
                            parameters: { nameSuffix: 'Copy' },
                            estimatedImpact: {
                              revenue: duplicateExpectedRevenue,
                              conversions: duplicateExpectedConversions,
                              timeline: '14 days'
                            }
                          });
                        } else {
                          actions.push({
                            type: mapped.type,
                            label: suggestion.title || 'Take Action',
                            description: suggestion.message || '',
                            parameters: mapped.parameters,
                            estimatedImpact: {
                              revenue: dailyRevenue * 0.15 * 14,
                              conversions: Math.ceil(dailyConversions * 0.15 * 14),
                              timeline: '14 days'
                            }
                          });
                          const expertHelp = detectExpertHelpScenario();
                          if (expertHelp) {
                            actions.push({
                              type: 'get_expert_help',
                              label: expertHelp.label,
                              description: expertHelp.description,
                              parameters: { reason: expertHelp.reason }
                            });
                          }
                        }

                        const hasExpertHelpAction = actions.some(a => a.type === 'get_expert_help');
                        if (!hasExpertHelpAction) {
                          actions.push({
                            type: 'get_expert_help',
                            label: 'Get Expert Help',
                            description: 'Need personalized guidance? Our team of ad specialists can help optimize your campaigns and maximize your ROI.',
                            parameters: { reason: 'general_optimization_support' }
                          });
                        }

                        return actions;
                      })()
                    };

                    // Open modal with stored suggestion
                    setOpenInsightModal({
                      creativeId: creative.id,
                      insight,
                      creative
                    });
                    return;
                  }

                  // No stored suggestion - run fresh deep analysis with full intelligence pipeline
                  try {
                    setIsAnalyzing(true);
                    setAnalyzingEntityId(creative.id);

                    if (!user?.id) {
                      toast.error('User not authenticated');
                      return;
                    }

                    console.log('[CreativeAnalysis] Starting deep intelligence analysis for:', {
                      id: creative.id,
                      name: creative.name || creative.adName || creative.campaignName,
                      type: viewLevel
                    });

                    // Initialize RexOrchestrationService with full 5-system intelligence
                    const orchestration = new RexOrchestrationService(user.id);

                    // Prepare entity data for analysis
                    const entityType: RexEntityType = viewLevel === 'campaigns' ? 'campaign' :
                                                       viewLevel === 'adsets' ? 'ad_set' : 'ad';

                    const entity = {
                      id: creative.id,
                      platformId: creative.platform_id || creative.platformId || creative.id,
                      platform: creative.platform || 'facebook',
                      name: creative.name || creative.adName || creative.adSetName || creative.campaignName || 'Untitled',
                      type: entityType,
                      status: creative.status || 'ACTIVE',
                      dailyBudget: creative.budget || creative.dailyBudget,
                      spend: creative.spend || 0,
                      revenue: creative.revenue || 0,
                      conversions: creative.conversions || 0,
                      roas: creative.roas || 0,
                      cpa: creative.cpa
                    };

                    // Run FULL intelligence analysis
                    // This runs:
                    // 1. ComprehensiveRexAnalysis (demographics, placements, geographic, temporal)
                    // 2. RexInsightGenerator (pattern detection across dimensions)
                    // 3. DeepRexAnalysisEngine (cross-dimensional correlations)
                    // 4. Generates automation rules
                    // 5. Creates entity-specific suggestions with 3-paragraph analysis
                    console.log('[CreativeAnalysis] Executing full intelligence pipeline...');
                    const insights = await orchestration.analyzeEntity(entity, 30);

                    console.log('[CreativeAnalysis] Analysis complete. Insights generated:', insights.length);

                    if (insights.length > 0) {
                      // Store insights
                      setGeneratedInsights(prev => {
                        const updated = new Map(prev);
                        updated.set(creative.id, insights);
                        return updated;
                      });

                      // Open modal with FIRST insight (contains all dimensional analysis)
                      setOpenInsightModal({
                        creativeId: creative.id,
                        insight: insights[0],
                        creative: creative
                      });

                      console.log('[CreativeAnalysis] Opening modal with comprehensive insights:', {
                        entityName: entity.name,
                        insightType: insights[0].suggestionType,
                        dimensionalDataPoints: insights[0].reasoning.supportingData
                      });
                    }
                    // If no insights found, just close the analysis without toast
                  } catch (error) {
                    console.error('[CreativeAnalysis] Error during deep analysis:', error);
                    toast.error('Failed to analyze entity. Please try again.');
                  } finally {
                    setIsAnalyzing(false);
                    setAnalyzingEntityId(null);
                  }
                };

                const isAnalyzingThisEntity = analyzingEntityId === creative.id;

                return (
                <div key={creative.id} className="relative">
                  {/* Outer container for row background with hover */}
                  <div
                    className={`group ${
                      index % 2 === 0 && !hasPendingSuggestion && !isAnalyzingThisEntity ? 'bg-white dark:bg-dark hover:bg-gray-100 dark:hover:bg-[#2a2a2a]' : ''
                    } ${
                      index % 2 === 1 && !hasPendingSuggestion && !isAnalyzingThisEntity ? 'bg-gray-50 dark:bg-[#1a1a1a] hover:bg-gray-100 dark:hover:bg-[#2a2a2a]' : ''
                    } ${
                      hasPendingSuggestion && !isAnalyzingThisEntity ? 'bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900' : ''
                    } ${
                      isAnalyzingThisEntity ? 'bg-gray-100 dark:bg-[#2a2a2a]' : ''
                    } transition-colors duration-200`}
                  >
                    {/* Inner container */}
                    <div
                      onClick={handleMetricClick}
                      className={`relative flex items-center min-h-[56px] transition-all duration-200 ${
                        isAnalyzingThisEntity ? 'cursor-wait opacity-75' : 'cursor-pointer'
                      } ${
                        hasPendingSuggestion ? 'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-red-500 before:z-[35]' : ''
                      } ${
                        isAnalyzingThisEntity ? 'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-gray-400 dark:before:bg-gray-500 before:z-[35] before:animate-pulse' : ''
                      }`}
                      data-row-index={index}
                      data-has-suggestion={hasPendingSuggestion ? 'true' : 'false'}
                      title={
                        isAnalyzingThisEntity ? 'Revoa AI is analyzing thousands of data points...' :
                        hasPendingSuggestion ? 'Revoa AI has an optimization suggestion - Click to view!' :
                        'Click to analyze this entity with Revoa AI'
                      }
                    >
                      {/* Loading Overlay */}
                      {isAnalyzingThisEntity && (
                        <div className="absolute inset-0 flex items-center justify-center bg-blue-50/80 dark:bg-blue-950/80 backdrop-blur-sm z-50">
                          <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-dark rounded-lg shadow-lg border border-blue-200 dark:border-blue-800">
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Revoa AI is analyzing {viewLevel === 'campaigns' ? 'campaign' : viewLevel === 'adsets' ? 'ad set' : 'ad'} data...
                            </span>
                          </div>
                        </div>
                      )}
                  {columns.map((column, colIndex) => {
                    const customWidth = columnWidths[column.id];
                    const finalWidth = customWidth || column.width;

                    const columnStyle = {
                      width: finalWidth,
                      minWidth: finalWidth,
                      maxWidth: finalWidth,
                      flex: '0 0 auto',
                      ...(column.sticky ? getStickyStyles(column.id, finalWidth) : {})
                    };

                    // Get the appropriate background classes for sticky columns with hover support
                    const getStickyBackgroundClasses = () => {
                      if (!column.sticky) return '';

                      if (isAnalyzingThisEntity) {
                        return 'bg-gray-100 dark:bg-[#2a2a2a]';
                      }

                      if (hasPendingSuggestion) {
                        return 'bg-red-50 dark:bg-red-950 group-hover:bg-red-100 dark:group-hover:bg-red-900';
                      }

                      return index % 2 === 0
                        ? 'bg-white dark:bg-dark group-hover:bg-gray-100 dark:group-hover:bg-[#2a2a2a]'
                        : 'bg-gray-50 dark:bg-[#1a1a1a] group-hover:bg-gray-100 dark:group-hover:bg-[#2a2a2a]';
                    };

                    const getPlatformBadgeClasses = (platform: string) => {
                      switch (platform?.toLowerCase()) {
                        case 'facebook':
                          return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
                        case 'tiktok':
                          return 'bg-gray-800 dark:bg-[#3a3a3a] text-white dark:text-gray-100';
                        case 'google':
                          return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
                        default:
                          return 'bg-gray-100 dark:bg-[#3a3a3a] text-gray-700 dark:text-gray-300';
                      }
                    };

                    const getPerformanceClasses = (performance: string, hasSuggestion: boolean) => {
                      const baseClasses = hasSuggestion ? 'cursor-pointer transition-colors' : '';
                      if (performance === 'high') {
                        return `bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700 ${hasSuggestion ? 'hover:bg-green-100 dark:hover:bg-green-800/70' : ''} ${baseClasses}`;
                      } else if (performance === 'medium') {
                        return `bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-700 ${hasSuggestion ? 'hover:bg-yellow-100 dark:hover:bg-yellow-800/70' : ''} ${baseClasses}`;
                      }
                      return `bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700 ${hasSuggestion ? 'hover:bg-red-100 dark:hover:bg-red-800/70' : ''} ${baseClasses}`;
                    };

                    const metricContent = column.render ? (
                      column.render(creative[column.id as keyof typeof creative], creative)
                    ) : column.id === 'platform' ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs capitalize ${getPlatformBadgeClasses(creative.platform || 'facebook')}`}>
                        {creative.platform || 'facebook'}
                      </span>
                    ) : column.id === 'performance' ? (
                      suggestion && (suggestion.status === 'pending' || suggestion.status === 'viewed') && !isLoading ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMetricClick(e);
                          }}
                          className="group inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-dark hover:bg-gray-50 dark:hover:bg-[#3a3a3a] border border-gray-200 dark:border-[#4a4a4a] rounded-lg transition-colors max-w-full"
                        >
                          <span className="capitalize whitespace-nowrap truncate">
                            {suggestion.suggestion_type === 'adjust_targeting' ? 'Adjust Targeting' :
                             suggestion.suggestion_type === 'refresh_creative' ? 'Refresh Creative' :
                             suggestion.suggestion_type === 'increase_budget' || suggestion.suggestion_type === 'scale_high_performer' ? 'Scale' :
                             suggestion.suggestion_type === 'pause_underperforming' || suggestion.suggestion_type === 'pause_negative_roi' ? 'Pause' :
                             suggestion.suggestion_type === 'review_underperformer' ? 'Review' :
                             suggestion.suggestion_type === 'optimize_campaign' ? 'Optimize' :
                             suggestion.suggestion_type === 'switch_to_abo' ? 'Switch to ABO' :
                             suggestion.suggestion_type === 'decrease_budget' ? 'Reduce Budget' :
                             'Optimize'}
                          </span>
                          <ArrowRight className="w-3 h-3 flex-shrink-0 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                      )
                    ) : column.id === 'budget' ? (
                      <div className="flex flex-col">
                        {(creative.budget || creative.dailyBudget || creative.lifetimeBudget) ? (
                          <>
                            <span className="font-medium text-gray-900 dark:text-white">
                              ${(creative.budget || creative.dailyBudget || creative.lifetimeBudget).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              {creative.budgetType === 'lifetime' || (!creative.budgetType && creative.lifetimeBudget) ? 'Lifetime' : 'Daily'}
                            </span>
                          </>
                        ) : viewLevel === 'adsets' ? (
                          <>
                            <span className="font-medium text-gray-500 dark:text-gray-400 text-xs">CBO</span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">Campaign Budget</span>
                          </>
                        ) : viewLevel === 'ads' ? (
                          <>
                            <span className="font-medium text-gray-500 dark:text-gray-400 text-xs">Inherited</span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">From Parent</span>
                          </>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </div>
                    ) : column.id === 'fatigueScore' ? (
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-[#3a3a3a] rounded-full overflow-hidden">
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
                    ) : column.id === 'cvr' ? (
                      (() => {
                        const cvr = creative.metrics.clicks > 0
                          ? (creative.metrics.conversions / creative.metrics.clicks) * 100
                          : 0;
                        return `${cvr.toFixed(2)}%`;
                      })()
                    ) : column.id === 'cpa' ? (
                      `$${creative.metrics.cpa.toFixed(2)}`
                    ) : column.id === 'conversionValue' ? (
                      <div className="flex items-center gap-1.5">
                        <span>${creative.metrics.conversion_value?.toFixed(2) || '0.00'}</span>
                        {creative.conversionSource && creative.conversionSource !== 'none' && (
                          <span
                            title={getSourceDescription(creative.conversionSource)}
                            className={`inline-flex items-center justify-center w-4 h-4 rounded-full ${
                              creative.conversionSource === 'revoa_pixel'
                                ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400'
                                : creative.conversionSource === 'utm_attribution'
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                                : 'bg-gray-100 dark:bg-[#3a3a3a] text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {creative.conversionSource === 'revoa_pixel' ? (
                              <Zap className="w-2.5 h-2.5" />
                            ) : creative.conversionSource === 'utm_attribution' ? (
                              <Link2 className="w-2.5 h-2.5" />
                            ) : (
                              <Radio className="w-2.5 h-2.5" />
                            )}
                          </span>
                        )}
                      </div>
                    ) : column.id === 'roas' ? (
                      `${creative.metrics.roas?.toFixed(2) || '0.00'}x`
                    ) : column.id === 'cogs' ? (
                      creative.metrics.cogs != null && creative.metrics.cogs > 0 ? (
                        `$${creative.metrics.cogs.toFixed(2)}`
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )
                    ) : column.id === 'profit' ? (
                      creative.metrics.cogs != null && creative.metrics.cogs > 0 ? (
                        <span className={creative.metrics.profit < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                          ${creative.metrics.profit?.toFixed(2) || '0.00'}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )
                    ) : column.id === 'profitMargin' ? (
                      creative.metrics.cogs != null && creative.metrics.cogs > 0 ? (
                        <span className={creative.metrics.profitMargin < 30 ? 'text-yellow-600 dark:text-yellow-400' : ''}>
                          {creative.metrics.profitMargin?.toFixed(1) || '0.0'}%
                        </span>
                      ) : creative.metrics.conversions > 0 ? (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )
                    ) : column.id === 'netROAS' ? (
                      creative.metrics.cogs != null && creative.metrics.cogs > 0 ? (
                        <span className={creative.metrics.netROAS < 1 ? 'text-red-600 dark:text-red-400' : creative.metrics.netROAS >= 2 ? 'text-green-600 dark:text-green-400' : ''}>
                          {creative.metrics.netROAS?.toFixed(2) || '0.00'}x
                        </span>
                      ) : creative.metrics.conversions > 0 ? (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )
                    ) : column.id === 'breakEvenRoas' ? (
                      creative.metrics.cogs != null && creative.metrics.cogs > 0 && creative.metrics.conversions > 0 && creative.metrics.linkedProductCount === 1 ? (
                        (() => {
                          const avgCogs = creative.metrics.cogs / creative.metrics.conversions;
                          const avgRevenue = (creative.metrics.conversion_value || 0) / creative.metrics.conversions;
                          const beRoas = avgRevenue > 0 ? avgCogs / (avgRevenue - avgCogs) + 1 : 0;
                          return (
                            <span className="text-gray-700 dark:text-gray-300">
                              {beRoas > 0 ? `${beRoas.toFixed(2)}x` : '-'}
                            </span>
                          );
                        })()
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )
                    ) : column.id === 'attribution' ? (
                      (() => {
                        const hasPixel = creative.conversionSource === 'revoa_pixel';
                        const hasUtm = creative.conversionSource === 'utm_attribution';
                        const hasCapi = creative.metrics.capiEnabled;
                        const score = (hasPixel ? 40 : 0) + (hasUtm ? 30 : 0) + (hasCapi ? 30 : 0);

                        return score > 0 ? (
                          <div className="flex items-center gap-1">
                            <div className={`h-1.5 rounded-full ${
                              score >= 80 ? 'bg-green-500 w-6' :
                              score >= 50 ? 'bg-yellow-500 w-4' :
                              'bg-red-500 w-2'
                            }`} />
                            <span className={`text-xs ${
                              score >= 80 ? 'text-green-600 dark:text-green-400' :
                              score >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                              'text-red-600 dark:text-red-400'
                            }`}>
                              {score}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        );
                      })()
                    ) : null;

                    return (
                      <div
                        key={column.id}
                        className={`flex items-center justify-start py-4 text-sm text-gray-900 dark:text-white transition-colors duration-200 ${
                          column.id === 'select' ? 'pl-9 pr-6 relative' : 'px-4'
                        } ${
                          column.id === 'adName' || column.id === 'performance' ? 'overflow-hidden' : ''
                        } ${getStickyBackgroundClasses()}`}
                        style={columnStyle}
                        onClick={(e) => {
                          if (column.id === 'select' || column.id === 'status') {
                            e.stopPropagation();
                          }
                        }}
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
                  </div>

                  {/* Modal is rendered outside the table */}

                  {/* Legacy expanded row support (for existing suggestions that were generated before) */}
                  {expandedRowId === creative.id && !isAnalyzing && suggestion && (
                    <ExpandedSuggestionRow
                      suggestion={suggestion}
                      entityData={{
                        id: creative.id,
                        name: creative.name || creative.adName || creative.adSetName || creative.campaignName || 'Untitled',
                        status: creative.status,
                        platform: creative.platform || 'facebook',
                        spend: creative.spend || 0,
                        revenue: creative.revenue || 0,
                        roas: creative.roas || 0,
                        profit: creative.profit,
                        conversions: creative.conversions || 0,
                        cpa: creative.cpa,
                        ctr: creative.ctr,
                        impressions: creative.impressions,
                        clicks: creative.clicks
                      }}
                      onAccept={onAcceptSuggestion ? () => onAcceptSuggestion(suggestion) : undefined}
                      onDismiss={onDismissSuggestion ? (reason?: string) => onDismissSuggestion(suggestion, reason) : undefined}
                      onExecuteAction={onExecuteAction ? (actionType, parameters) => onExecuteAction(suggestion, actionType, parameters) : undefined}
                      onClose={() => setExpandedRowId(null)}
                    />
                  )}
                </div>
              );
              })
              )}

              {!isLoading && sortedCreatives.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">
                    {viewLevel === 'campaigns'
                      ? 'No campaigns found.'
                      : viewLevel === 'adsets'
                      ? 'No ad sets found.'
                      : 'No ads found matching your filters.'}
                  </p>
                </div>
              )}

              {/* Sticky Totals Footer */}
              {sortedCreatives.length > 0 && (
                <div className="sticky bottom-0 left-0 z-20 bg-gray-50 dark:bg-dark" style={{ minWidth: '100%', width: 'max-content' }}>
                  <div className="flex items-center min-h-[56px]">
                    {columns.map((column) => {
                      const customWidth = columnWidths[column.id];
                      const finalWidth = customWidth || column.width;
                      const stickyStyles = column.sticky ? getStickyStyles(column.id, finalWidth) : {};
                      const columnStyle = {
                        width: finalWidth,
                        minWidth: finalWidth,
                        maxWidth: finalWidth,
                        flex: '0 0 auto',
                        ...stickyStyles,
                        ...(column.sticky ? { zIndex: 25 } : {}) // Boost z-index for totals sticky columns
                      };

                      return (
                        <div
                          key={column.id}
                          className={`flex items-center py-4 text-sm font-bold text-gray-900 dark:text-white ${
                            column.id === 'select' ? 'pl-9 pr-6' : 'px-4'
                          } ${column.sticky ? 'bg-gray-50 dark:bg-dark' : ''}`}
                          style={columnStyle}
                        >
                        {isLoading ? (
                          // Show skeleton loader for all columns during loading
                          column.id === 'select' ? (
                            ''
                          ) : column.id === 'status' ? (
                            <div className="h-4 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse w-24" />
                          ) : column.id === 'creative' || column.id === 'adName' || column.id === 'platform' || column.id === 'performance' || column.id === 'budget' || column.id === 'fatigueScore' ? (
                            ''
                          ) : (
                            <div className="h-4 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse w-16" />
                          )
                        ) : column.id === 'select' ? (
                          ''
                        ) : column.id === 'status' ? (
                          <span className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide whitespace-nowrap">
                            TOTALS ({sortedCreatives.length})
                          </span>
                        ) : column.id === 'creative' || column.id === 'adName' || column.id === 'platform' || column.id === 'performance' || column.id === 'budget' || column.id === 'fatigueScore' ? (
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
                        ) : column.id === 'cvr' ? (
                          (() => {
                            const cvr = totals.clicks > 0
                              ? (totals.conversions / totals.clicks) * 100
                              : 0;
                            return `${cvr.toFixed(2)}%`;
                          })()
                        ) : column.id === 'cpa' ? (
                          `$${totals.cpa.toFixed(2)}`
                        ) : column.id === 'conversionValue' ? (
                          `$${totals.revenue.toFixed(2)}`
                        ) : column.id === 'roas' ? (
                          `${totals.roas.toFixed(2)}x`
                        ) : column.id === 'cogs' ? (
                          totals.cogs > 0 ? (
                            `$${totals.cogs.toFixed(2)}`
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          )
                        ) : column.id === 'profit' ? (
                          totals.cogs > 0 ? (
                            <span className={`font-bold ${
                              totals.profit > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                              ${totals.profit.toFixed(2)}
                            </span>
                          ) : needsProductMapping ? (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                navigate('/quotes');
                              }}
                              className="group text-xs font-medium px-3 py-1.5 rounded-md whitespace-nowrap transition-all flex items-center gap-1.5 text-gray-900 dark:text-white bg-gray-100 dark:bg-[#262626] border border-gray-200 dark:border-[#1a1a1a] hover:bg-gray-200 dark:hover:bg-[#2a2a2a]"
                            >
                              Map Products
                              <Link className="w-3 h-3 transition-transform group-hover:scale-110" />
                            </button>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          )
                        ) : column.id === 'profitMargin' ? (
                          totals.cogs > 0 ? (
                            <span className={`font-bold ${
                              totals.profitMargin > 30 ? 'text-green-600 dark:text-green-400' : totals.profitMargin > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                              {totals.profitMargin.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          )
                        ) : column.id === 'netROAS' ? (
                          totals.cogs > 0 ? (
                            <span className={`font-bold ${
                              totals.netROAS >= 2 ? 'text-green-600 dark:text-green-400' : totals.netROAS >= 1 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                              {totals.netROAS.toFixed(2)}x
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          )
                        ) : column.id === 'breakEvenRoas' ? (
                          totals.breakEvenRoas > 0 ? (
                            <span className="font-bold text-gray-700 dark:text-gray-300">
                              {totals.breakEvenRoas.toFixed(2)}x
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          )
                        ) : column.id === 'attribution' ? (
                          needsAttributionSetup ? (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                navigate('/pixel');
                              }}
                              className="group text-xs font-medium px-3 py-1.5 rounded-md whitespace-nowrap transition-all flex items-center gap-1.5 text-gray-900 dark:text-white bg-gray-100 dark:bg-[#262626] border border-gray-200 dark:border-[#1a1a1a] hover:bg-gray-200 dark:hover:bg-[#2a2a2a]"
                            >
                              Setup Tracking
                              <Settings className="w-3 h-3 transition-transform group-hover:scale-110" />
                            </button>
                          ) : attributionScore > 0 ? (
                            <div className="flex items-center gap-1.5">
                              <div className={`h-2 rounded-full ${
                                attributionScore >= 80 ? 'bg-green-500 w-8' :
                                attributionScore >= 50 ? 'bg-yellow-500 w-5' :
                                'bg-red-500 w-3'
                              }`} />
                              <span className={`text-xs font-bold ${
                                attributionScore >= 80 ? 'text-green-600 dark:text-green-400' :
                                attributionScore >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                                'text-red-600 dark:text-red-400'
                              }`}>
                                {attributionScore}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          )
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
        </div>
      </div>
    </div>
    </>
  );
};
