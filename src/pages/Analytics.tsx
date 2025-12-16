import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Edit3, X, Plus, Info, AlertCircle, WifiOff, ArrowRight } from 'lucide-react';
import AdReportsTimeSelector, { TimeOption } from '../components/reports/AdReportsTimeSelector';
import TemplateSelector from '../components/analytics/TemplateSelector';
import FlippableMetricCard from '../components/analytics/FlippableMetricCard';
import CardSelectorModal from '../components/analytics/CardSelectorModal';
import ConnectPlatformCard from '../components/analytics/ConnectPlatformCard';
import { DashboardSkeleton } from '../components/PageSkeletons';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useConnectionStore } from '../lib/connectionStore';
import {
  TemplateType,
  getUserAnalyticsPreferences,
  initializeUserAnalyticsPreferences,
  updateUserAnalyticsPreferences,
  switchTemplate,
  toggleCardVisibility,
  computeMetricCardData,
  getTemplateMetricCards,
  MetricCardData,
  fetchChartDataForCard,
  ChartDataPoint
} from '../lib/analyticsService';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

export default function Analytics() {
  const { user } = useAuth();
  const { shopify, facebook } = useConnectionStore();

  const [isLoading, setIsLoading] = useState(true);
  const [selectedTime, setSelectedTime] = useState<TimeOption>('7d');
  const [currentTemplate, setCurrentTemplate] = useState<TemplateType>('executive');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showCardSelector, setShowCardSelector] = useState(false);
  const [visibleCards, setVisibleCards] = useState<string[]>([]);
  const [cardData, setCardData] = useState<Record<string, MetricCardData>>({});
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [adPlatformsSyncTime, setAdPlatformsSyncTime] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalCardOrder, setOriginalCardOrder] = useState<string[]>([]);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState<{
    facebook: boolean;
    tiktok: boolean;
    google: boolean;
  }>({
    facebook: false,
    tiktok: false,
    google: false
  });
  const [chartDataByCard, setChartDataByCard] = useState<Record<string, ChartDataPoint[]>>({});
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [autoFlipCardId, setAutoFlipCardId] = useState<string | null>(null);
  const [autoFlipTrigger, setAutoFlipTrigger] = useState(0);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Initialize date range for 7 days
  const initialEndDate = new Date();
  initialEndDate.setHours(23, 59, 59, 999);
  const initialStartDate = new Date(initialEndDate);
  initialStartDate.setDate(initialStartDate.getDate() - 7);
  initialStartDate.setHours(0, 0, 0, 0);

  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: initialStartDate,
    endDate: initialEndDate
  });

  useEffect(() => {
    if (isEditMode || isLoading || visibleCards.length === 0) return;

    const autoFlipInterval = setInterval(() => {
      const visibleCardsInViewport = visibleCards.filter(cardId => {
        const element = cardRefs.current.get(cardId);
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        return rect.top >= 0 && rect.bottom <= window.innerHeight;
      });

      if (visibleCardsInViewport.length > 0) {
        const randomIndex = Math.floor(Math.random() * visibleCardsInViewport.length);
        const randomCardId = visibleCardsInViewport[randomIndex];
        setAutoFlipCardId(randomCardId);
        setAutoFlipTrigger(prev => prev + 1);
      }
    }, 12000);

    return () => clearInterval(autoFlipInterval);
  }, [isEditMode, isLoading, visibleCards]);

  // Load user name
  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('display_name, first_name, last_name')
            .eq('user_id', authUser.id)
            .maybeSingle();

          if (profile) {
            if (profile.first_name) {
              setUserName(profile.first_name);
            } else if (profile.display_name) {
              const firstName = profile.display_name.split(' ')[0];
              setUserName(firstName);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user name:', error);
      }
    };

    fetchUserName();
  }, []);

  // Track last sync time
  useEffect(() => {
    setLastSyncTime(new Date());
  }, [cardData]);

  // Fetch ad platforms last sync time
  useEffect(() => {
    const fetchAdPlatformsSyncTime = async () => {
      if (!user?.id) return;

      try {
        const { data: adAccounts } = await supabase
          .from('ad_accounts')
          .select('last_synced_at')
          .eq('user_id', user.id)
          .order('last_synced_at', { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();

        if (adAccounts?.last_synced_at) {
          setAdPlatformsSyncTime(new Date(adAccounts.last_synced_at));
        }
      } catch (error) {
        console.error('Error fetching ad platforms sync time:', error);
      }
    };

    fetchAdPlatformsSyncTime();
  }, [user?.id, cardData]);

  // Check which ad platforms are connected
  useEffect(() => {
    const checkConnectedPlatforms = async () => {
      if (!user?.id) return;

      try {
        const { data: adAccounts } = await supabase
          .from('ad_accounts')
          .select('platform')
          .eq('user_id', user.id)
          .eq('status', 'active');

        if (adAccounts) {
          const platforms = {
            facebook: adAccounts.some(acc => acc.platform === 'facebook'),
            tiktok: adAccounts.some(acc => acc.platform === 'tiktok'),
            google: adAccounts.some(acc => acc.platform === 'google')
          };
          setConnectedPlatforms(platforms);
        }
      } catch (error) {
        console.error('Error checking connected platforms:', error);
      }
    };

    checkConnectedPlatforms();
  }, [user?.id, cardData]);

  // Load user preferences and initialize if needed
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id) return;

      try {
        setIsLoading(true);
        let prefs = await getUserAnalyticsPreferences(user.id);

// Initialize if no preferences exist
        if (!prefs) {
          prefs = await initializeUserAnalyticsPreferences(user.id, 'executive');
        }

        setCurrentTemplate(prefs.active_template);

        // Handle visible_cards - ensure it's an array
        let cards = prefs.visible_cards || [];
        if (typeof cards === 'string') {
          cards = JSON.parse(cards);
        }

setVisibleCards(Array.isArray(cards) ? cards : []);

// If no cards visible, this might be a fresh account - manually load template cards
        if (!cards || cards.length === 0) {
          const templateCards = await getTemplateMetricCards(prefs.active_template);
          const cardIds = templateCards.map(c => c.id);

          if (cardIds.length > 0) {
            // Update the preferences with these cards
            await updateUserAnalyticsPreferences(user.id, {
              visible_cards: cardIds
            });
            setVisibleCards(cardIds);
          }
        }
} catch (error) {
        console.error('Error loading preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [user?.id]);

  // Fetch card data whenever visible cards or date range changes
  useEffect(() => {
    const fetchCardData = async () => {
      if (visibleCards.length === 0) return;

      setIsLoading(true);

      // Clear existing card data to show skeletons
      setCardData({});

      try {
        // Get last sync timestamp from localStorage for incremental sync
        const lastSyncKey = 'analytics_last_sync';
        const lastSyncStr = localStorage.getItem(lastSyncKey);
        const lastSyncTime = lastSyncStr ? new Date(lastSyncStr) : null;

        // Determine if we should do incremental sync (less than 1 hour since last sync)
        const now = new Date();
        const shouldIncrementalSync = lastSyncTime && (now.getTime() - lastSyncTime.getTime()) < 3600000;

        // Trigger incremental sync and WAIT for it to complete
        const { facebook } = useConnectionStore.getState();
        if (facebook.isConnected && facebook.accounts && facebook.accounts.length > 0) {
          const { facebookAdsService } = await import('@/lib/facebookAds');

          // Use incremental sync if recent, otherwise full sync
          const syncFrom = shouldIncrementalSync && lastSyncTime
            ? lastSyncTime.toISOString().split('T')[0]
            : undefined;

          await Promise.all(
            facebook.accounts.map(account =>
              facebookAdsService.syncAdAccount(
                account.platform_account_id,
                syncFrom,
                undefined,
                true
              ).catch(err => console.error('[Analytics] Auto-sync failed:', err))
            )
          );

          // Update last sync timestamp
          localStorage.setItem(lastSyncKey, now.toISOString());

          // Refresh account data to update last_synced_at in UI
          await facebookAdsService.getAdAccounts('facebook');
        }

        const startDateStr = dateRange.startDate.toISOString();
        const endDateStr = dateRange.endDate.toISOString();

        // Compute cards progressively and update as each completes
        const data = await computeMetricCardData(visibleCards, startDateStr, endDateStr, (cardId, cardData) => {
          // Update card data progressively as each card is computed
          setCardData(prev => ({ ...prev, [cardId]: cardData }));
        });

        // Final update with all data (in case progressive updates were skipped)
        setCardData(data);

        // Fetch chart data for each visible card
        const chartPromises = visibleCards.map(async cardId => {
          try {
            const chartData = await fetchChartDataForCard(cardId, startDateStr, endDateStr);
            return { cardId, chartData };
          } catch (err) {
            console.error(`[Analytics] Error fetching chart data for ${cardId}:`, err);
            return { cardId, chartData: [] };
          }
        });

        const chartResults = await Promise.all(chartPromises);
        const chartDataMap: Record<string, ChartDataPoint[]> = {};
        chartResults.forEach(({ cardId, chartData }) => {
          chartDataMap[cardId] = chartData;
        });
        setChartDataByCard(chartDataMap);
      } catch (error) {
        console.error('Error fetching card data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCardData();
  }, [visibleCards, dateRange.startDate.getTime(), dateRange.endDate.getTime(), refreshCounter]);

  const handleTimeChange = useCallback((time: TimeOption) => {
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
        return;
      default:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
    }

    setDateRange({ startDate, endDate });
  }, []);

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
  };

  const handleApplyDateRange = () => {
    // Trigger refetch by incrementing the refresh counter
    setRefreshCounter(prev => prev + 1);
  };


  const handleTemplateChange = async (template: TemplateType) => {
    if (!user?.id) return;

    try {
      const prefs = await switchTemplate(user.id, template);
setCurrentTemplate(template);
      setVisibleCards(prefs.visible_cards || []);
      setIsEditMode(false);
    } catch (error) {
      console.error('Error switching template:', error);
      toast.error('Failed to switch template');
    }
  };

  const handleToggleEditMode = async () => {
    if (!user?.id) return;

    if (isEditMode) {
      // Save the current order when exiting edit mode
      if (hasUnsavedChanges) {
        try {
          await updateUserAnalyticsPreferences(user.id, {
            visible_cards: visibleCards,
            is_editing: false
          });
          toast.success('Layout saved successfully');
          setHasUnsavedChanges(false);
        } catch (error) {
          console.error('Error saving layout:', error);
          toast.error('Failed to save layout');
        }
      } else {
        try {
          await updateUserAnalyticsPreferences(user.id, {
            is_editing: false
          });
        } catch (error) {
          console.error('Error exiting edit mode:', error);
        }
      }
    } else {
      // Store original order when entering edit mode
      setOriginalCardOrder([...visibleCards]);
      setHasUnsavedChanges(false);
    }

    setIsEditMode(!isEditMode);
  };

  const handleToggleCard = async (cardId: string, visible: boolean) => {
    if (!user?.id) return;

    setHasUnsavedChanges(true);

    try {
      await toggleCardVisibility(user.id, cardId, visible);
      setVisibleCards(prev =>
        visible ? [...prev, cardId] : prev.filter(id => id !== cardId)
      );
} catch (error) {
      console.error('Error toggling card visibility:', error);
    }
  };

  const handleDragStart = (cardId: string) => (e: React.DragEvent) => {
    setDraggedCard(cardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (targetCardId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedCard || draggedCard === targetCardId) {
      setDraggedCard(null);
      return;
    }

    // Reorder cards
    const draggedIndex = visibleCards.indexOf(draggedCard);
    const targetIndex = visibleCards.indexOf(targetCardId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedCard(null);
      return;
    }

    const newCards = [...visibleCards];
    newCards.splice(draggedIndex, 1);
    newCards.splice(targetIndex, 0, draggedCard);

    setVisibleCards(newCards);
    setDraggedCard(null);
    setHasUnsavedChanges(true);
  };

  const handleDragEnd = () => {
    setDraggedCard(null);
  };

  // Check if data is stale (over 24 hours old)
  const isDataStale = () => {
    if (!lastSyncTime) return false;
    const hoursSinceSync = (new Date().getTime() - lastSyncTime.getTime()) / (1000 * 60 * 60);
    return hoursSinceSync > 24;
  };

  const handleExpandCard = (cardId: string) => {
    setExpandedCardId(expandedCardId === cardId ? null : cardId);
  };

  const groupCardsByPlatform = (cards: string[]) => {
    const groups: Record<string, string[]> = {
      combined: [],
      meta: [],
      tiktok: [],
      google: []
    };

    cards.forEach(cardId => {
      const lowerCardId = cardId.toLowerCase();
      if (lowerCardId.includes('meta_') || lowerCardId.includes('facebook_')) {
        groups.meta.push(cardId);
      } else if (lowerCardId.includes('tiktok_')) {
        groups.tiktok.push(cardId);
      } else if (lowerCardId.includes('google_')) {
        groups.google.push(cardId);
      } else {
        groups.combined.push(cardId);
      }
    });

    return groups;
  };

  // Count connected platforms to determine if we should show combined section
  const connectedPlatformsCount = [
    connectedPlatforms.facebook,
    connectedPlatforms.tiktok,
    connectedPlatforms.google
  ].filter(Boolean).length;

  // Only show sections for connected platforms
  const platformSections = [
    ...(connectedPlatformsCount > 1 ? [{ key: 'combined', label: 'Combined Metrics', subtitle: 'Aggregated across all platforms' }] : []),
    ...(connectedPlatforms.facebook ? [{ key: 'meta', label: 'Meta / Facebook', subtitle: 'Facebook and Instagram ads' }] : []),
    ...(connectedPlatforms.tiktok ? [{ key: 'tiktok', label: 'TikTok', subtitle: 'TikTok ads performance' }] : []),
    ...(connectedPlatforms.google ? [{ key: 'google', label: 'Google Ads', subtitle: 'Search and display campaigns' }] : [])
  ];

  // Get contextual notification
  const getNotification = () => {
    // Priority 1: Shopify disconnected
    if (!shopify.isConnected && shopify.lastConnectedAt) {
      return {
        type: 'error' as const,
        icon: WifiOff,
        message: 'Shopify connection lost.',
        action: { text: 'Reconnect', href: '/settings' }
      };
    }

    // Priority 2: Facebook Ads disconnected
    if (!facebook.isConnected && facebook.lastConnectedAt) {
      return {
        type: 'warning' as const,
        icon: AlertCircle,
        message: 'Facebook Ads disconnected.',
        action: { text: 'Reconnect', href: '/settings' }
      };
    }

    // Priority 3: Stale data
    if (isDataStale()) {
      return {
        type: 'info' as const,
        icon: RefreshCw,
        message: 'Data sync paused.',
        action: { text: 'Refresh', onClick: handleApplyDateRange }
      };
    }

    return null;
  };

  // Don't block rendering with skeleton - show cards with loading states instead
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
          Analytics Dashboard
        </h1>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
          <span>
            {(() => {
              const connected = [];
              if (connectedPlatforms.facebook) {
                connected.push('Meta Ads');
              }
              if (connectedPlatforms.tiktok) {
                connected.push('TikTok Ads');
              }
              if (connectedPlatforms.google) {
                connected.push('Google Ads');
              }

              if (connected.length === 0) {
                return 'No ad platforms connected';
              }

              const platformText = connected.join(' - ') + ' Connected';

              // Get most recent sync time from ad platforms
              let timeText = '';
              if (adPlatformsSyncTime) {
                const now = new Date();
                const diffMs = now.getTime() - adPlatformsSyncTime.getTime();
                const diffMins = Math.floor(diffMs / 60000);

                if (diffMins < 1) {
                  timeText = ' - Updated just now';
                } else if (diffMins < 60) {
                  timeText = ` - Updated ${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
                } else {
                  timeText = ` - Updated ${adPlatformsSyncTime.toLocaleTimeString()}`;
                }
              }

              return platformText + timeText;
            })()}
          </span>
        </div>
      </div>


{/* Smart Status Notifications */}
      {(() => {
        const notification = getNotification();
        if (!notification || isLoading) return null;

        const NotificationIcon = notification.icon;
        const bgColors = {
          error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
          warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
          info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
        };
        const textColors = {
          error: 'text-red-600 dark:text-red-400',
          warning: 'text-amber-600 dark:text-amber-400',
          info: 'text-blue-600 dark:text-blue-400'
        };
        const messageColors = {
          error: 'text-red-900 dark:text-red-100',
          warning: 'text-amber-900 dark:text-amber-100',
          info: 'text-blue-900 dark:text-blue-100'
        };
        const linkColors = {
          error: 'text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200',
          warning: 'text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200',
          info: 'text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200'
        };

        return (
          <div className={`mb-6 p-3.5 border rounded-lg ${bgColors[notification.type]}`}>
            <div className="flex items-center space-x-3">
              <NotificationIcon className={`w-5 h-5 ${textColors[notification.type]} flex-shrink-0`} />
              <div className="flex-1 flex items-center justify-between">
                <p className={`text-sm ${messageColors[notification.type]}`}>
                  {notification.message}
                </p>
                {notification.action.href ? (
                  <a
                    href={notification.action.href}
                    className={`ml-4 text-sm font-medium underline ${linkColors[notification.type]} transition-colors`}
                  >
                    {notification.action.text}
                  </a>
                ) : (
                  <button
                    onClick={notification.action.onClick}
                    className={`ml-4 text-sm font-medium underline ${linkColors[notification.type]} transition-colors`}
                  >
                    {notification.action.text}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center space-x-4">
          <TemplateSelector
            currentTemplate={currentTemplate}
            onTemplateChange={handleTemplateChange}
            disabled={isEditMode}
          />

          {isEditMode ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsEditMode(false)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            currentTemplate !== 'custom' && (
              <button
                onClick={handleToggleEditMode}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                <span>Customize</span>
              </button>
            )
          )}
        </div>

        <div className="flex items-center space-x-4">
          <button
            className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2"
            onClick={handleApplyDateRange}
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

      {/* Edit Mode Notification Bar */}
      {isEditMode && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">
                Drag and drop cards to rearrange. Click any card to flip and see chart. Click the "Add Metric" card to show/hide metrics.
              </p>
            </div>
            {hasUnsavedChanges && (
              <button
                onClick={handleToggleEditMode}
                className="group px-5 py-1.5 text-sm font-medium text-white bg-gray-700 hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-700 hover:shadow-md rounded-lg transition-all flex items-center gap-2 shadow-sm ml-4 flex-shrink-0"
              >
                <span>Save Layout</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Metric Cards Grid */}
      {currentTemplate === 'cross_platform' ? (
        <div className="space-y-8">
          {platformSections.map(section => {
            const groups = groupCardsByPlatform(visibleCards);
            const sectionCards = groups[section.key as keyof typeof groups];
            if (sectionCards.length === 0) return null;

            return (
              <div key={section.key}>
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">{section.label}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{section.subtitle}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sectionCards.map((cardId) => {
                    const data = cardData[cardId];
                    const isExpanded = expandedCardId === cardId;

                    if (!data && isLoading) {
                      return (
                        <FlippableMetricCard
                          key={cardId}
                          data={{
                            id: cardId,
                            title: 'Loading...',
                            mainValue: '...',
                            change: '...',
                            changeType: 'positive',
                            dataPoint1: { label: 'Loading', value: '...' },
                            dataPoint2: { label: 'Loading', value: '...' },
                            icon: 'RefreshCw',
                            category: 'overview'
                          }}
                          isLoading={true}
                          isDragging={false}
                        />
                      );
                    }

                    if (!data) return null;

                    return (
                      <div
                        key={cardId}
                        ref={(el) => {
                          if (el) cardRefs.current.set(cardId, el);
                          else cardRefs.current.delete(cardId);
                        }}
                        className={isExpanded ? 'col-span-full' : ''}
                      >
                        <FlippableMetricCard
                          data={data}
                          chartData={chartDataByCard[cardId] || []}
                          isLoading={isLoading}
                          isExpanded={isExpanded}
                          autoFlipTrigger={autoFlipCardId === cardId ? autoFlipTrigger : undefined}
                          onExpand={() => handleExpandCard(cardId)}
                          isDragging={draggedCard === cardId}
                          onDragStart={isEditMode ? handleDragStart(cardId) : undefined}
                          onDragEnd={isEditMode ? handleDragEnd : undefined}
                          onDragOver={isEditMode ? handleDragOver : undefined}
                          onDrop={isEditMode ? handleDrop(cardId) : undefined}
                        />
                      </div>
                    );
                  })}

                  {/* Add Metric button within each active platform section */}
                  <button
                    onClick={() => setShowCardSelector(true)}
                    className="h-[180px] rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-900 dark:hover:border-gray-100 hover:bg-gray-50/70 dark:hover:bg-gray-700/70 transition-all duration-200 flex flex-col items-center justify-center group"
                  >
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 group-hover:bg-gray-200 dark:group-hover:bg-gray-600 flex items-center justify-center mb-3 transition-colors border border-gray-200 dark:border-gray-600 group-hover:border-gray-400 dark:group-hover:border-gray-400">
                      <Plus className="w-6 h-6 text-gray-400 dark:text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
                    </div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                      Add Metric
                    </span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Show placeholder cards for unconnected platforms */}
          {!connectedPlatforms.tiktok && (
            <div>
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">TikTok</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">TikTok ads performance</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <ConnectPlatformCard platform="tiktok" platformLabel="TikTok Ads" />
              </div>
            </div>
          )}

          {!connectedPlatforms.google && (
            <div>
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Google Ads</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Search and display campaigns</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <ConnectPlatformCard platform="google" platformLabel="Google Ads" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleCards.map((cardId) => {
            const data = cardData[cardId];
            const isExpanded = expandedCardId === cardId;

            if (!data && isLoading) {
              return (
                <FlippableMetricCard
                  key={cardId}
                  data={{
                    id: cardId,
                    title: 'Loading...',
                    mainValue: '...',
                    change: '...',
                    changeType: 'positive',
                    dataPoint1: { label: 'Loading', value: '...' },
                    dataPoint2: { label: 'Loading', value: '...' },
                    icon: 'RefreshCw',
                    category: 'overview'
                  }}
                  isLoading={true}
                  isDragging={false}
                />
              );
            }

            if (!data) return null;

            return (
              <div
                key={cardId}
                ref={(el) => {
                  if (el) cardRefs.current.set(cardId, el);
                  else cardRefs.current.delete(cardId);
                }}
                className={isExpanded ? 'col-span-full' : ''}
              >
                <FlippableMetricCard
                  data={data}
                  chartData={chartDataByCard[cardId] || []}
                  isLoading={isLoading}
                  isExpanded={isExpanded}
                  autoFlipTrigger={autoFlipCardId === cardId ? autoFlipTrigger : undefined}
                  onExpand={() => handleExpandCard(cardId)}
                  isDragging={draggedCard === cardId}
                  onDragStart={isEditMode ? handleDragStart(cardId) : undefined}
                  onDragEnd={isEditMode ? handleDragEnd : undefined}
                  onDragOver={isEditMode ? handleDragOver : undefined}
                  onDrop={isEditMode ? handleDrop(cardId) : undefined}
                />
              </div>
            );
          })}

          <button
            onClick={() => setShowCardSelector(true)}
            className="h-[180px] rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-900 dark:hover:border-gray-100 hover:bg-gray-50/70 dark:hover:bg-gray-700/70 transition-all duration-200 flex flex-col items-center justify-center group"
          >
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 group-hover:bg-gray-200 dark:group-hover:bg-gray-600 flex items-center justify-center mb-3 transition-colors border border-gray-200 dark:border-gray-600 group-hover:border-gray-400 dark:group-hover:border-gray-400">
              <Plus className="w-6 h-6 text-gray-400 dark:text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
            </div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
              {currentTemplate === 'custom' ? 'Add/Delete Metric' : 'Add Metric'}
            </span>
          </button>
        </div>
      )}

      {/* Empty state when no cards (only show if not loading) */}
      {visibleCards.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="text-gray-400 dark:text-gray-600 mb-4">
            <Edit3 className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Metrics Selected
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Click "Add Metric" to add metrics to your dashboard
          </p>
        </div>
      )}

      {/* Card Selector Modal */}
      <CardSelectorModal
        isOpen={showCardSelector}
        onClose={() => setShowCardSelector(false)}
        visibleCards={visibleCards}
        onToggleCard={handleToggleCard}
      />
    </div>
  );
}
