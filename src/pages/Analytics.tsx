import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Edit3, Save, X, Plus, Info, Clock, AlertCircle, WifiOff, LayoutGrid, LineChart, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AdReportsTimeSelector, { TimeOption } from '../components/reports/AdReportsTimeSelector';
import TemplateSelector from '../components/analytics/TemplateSelector';
import MetricCard from '../components/analytics/MetricCard';
import CardSelectorModal from '../components/analytics/CardSelectorModal';
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
  MetricCardData
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
  const [viewType, setViewType] = useState<'card' | 'chart'>('card');
  const [selectedChartCard, setSelectedChartCard] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalCardOrder, setOriginalCardOrder] = useState<string[]>([]);

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

  // Initialize selected chart card when visible cards change
  useEffect(() => {
    if (visibleCards.length > 0 && !selectedChartCard) {
      setSelectedChartCard(visibleCards[0]);
    }
  }, [visibleCards]);

  // Fetch card data whenever visible cards or date range changes
  useEffect(() => {
    const fetchCardData = async () => {
      if (visibleCards.length === 0) return;

      try {
        // Trigger incremental sync first (fire and forget)
        const { facebook } = useConnectionStore.getState();
        if (facebook.isConnected && facebook.accounts && facebook.accounts.length > 0) {
          const { facebookAdsService } = await import('@/lib/facebookAds');
          facebook.accounts.forEach(account => {
            facebookAdsService.syncAdAccount(account.platform_account_id, undefined, undefined, true)
              .catch(err => console.error('[Analytics] Auto-sync failed:', err));
          });
        }

        const startDateStr = dateRange.startDate.toISOString();
        const endDateStr = dateRange.endDate.toISOString();
        const data = await computeMetricCardData(visibleCards, startDateStr, endDateStr);
        setCardData(data);
} catch (error) {
        console.error('Error fetching card data:', error);
      }
    };

    fetchCardData();
  }, [visibleCards, dateRange.startDate.getTime(), dateRange.endDate.getTime()]);

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
    // Trigger refetch by updating the date range
    setDateRange({ ...dateRange });
  };


  // Get chart labels for selected card
  const getChartLabels = (cardId: string) => {
    const card = cardData[cardId];
    if (!card) return { label1: 'Value 1', label2: 'Value 2', label3: 'Value 3' };

    // Return the actual data point labels from the card
    return {
      label1: card.dataPoint1.label,
      label2: card.dataPoint2.label,
      label3: card.title // Use the main metric title as the third label
    };
  };

  const handleTemplateChange = async (template: TemplateType) => {
    if (!user?.id) return;

    // Reset selected chart card when template changes
    setSelectedChartCard(null);

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

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
          Real-Time Analytics and Performance Insights
        </h1>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="flex items-center space-x-2">
            <div className={`w-1.5 h-1.5 rounded-full ${
              shopify.isConnected ? 'bg-green-500' : 'bg-gray-400'
            }`}></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {shopify.isConnected ? 'Shopify Connected' : 'No Shopify data'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isLoading ? 'Updating...' : 'Updated ' + new Date().toLocaleTimeString()}
            </p>
          </div>
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

          {/* View Type Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg p-1 flex-shrink-0">
            <button
              onClick={() => setViewType('card')}
              className={`relative flex items-center px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap ${
                viewType === 'card'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm -my-[1px] py-[7px] -mx-[1px] px-[13px]'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4 mr-1.5" />
              Card View
            </button>
            <button
              onClick={() => setViewType('chart')}
              className={`relative flex items-center px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap ${
                viewType === 'chart'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm -my-[1px] py-[7px] -mx-[1px] px-[13px]'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <LineChart className="w-4 h-4 mr-1.5" />
              Chart View
            </button>
          </div>

          {isEditMode ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowCardSelector(true)}
                disabled={viewType === 'chart'}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                <span>Add Metrics</span>
              </button>
              <button
                onClick={handleToggleEditMode}
                disabled={!hasUnsavedChanges}
                className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                  hasUnsavedChanges
                    ? 'bg-gradient-to-r from-[#E11D48] via-[#EC4899] to-[#E8795A] text-white hover:opacity-90'
                    : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>Save Layout</span>
              </button>
              <button
                onClick={() => setIsEditMode(false)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleToggleEditMode}
              disabled={viewType === 'chart'}
              className="flex items-center space-x-2 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Edit3 className="w-4 h-4" />
              <span>Customize</span>
            </button>
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

      {/* Metric Cards Grid */}
      {isEditMode && viewType === 'card' && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">
              Drag and drop cards to rearrange them. Click "Add Metrics" to show/hide cards.
            </p>
          </div>
        </div>
      )}

      {viewType === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleCards.map((cardId) => {
            const data = cardData[cardId];
            if (!data) return null;

            return (
              <MetricCard
                key={cardId}
                data={data}
                isDragging={draggedCard === cardId}
                onDragStart={isEditMode ? handleDragStart(cardId) : undefined}
                onDragEnd={isEditMode ? handleDragEnd : undefined}
                onDragOver={isEditMode ? handleDragOver : undefined}
                onDrop={isEditMode ? handleDrop(cardId) : undefined}
              />
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Metric Selector Buttons */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 p-4">
              {visibleCards.map((cardId) => {
                const data = cardData[cardId];
                if (!data) return null;

                const isSelected = selectedChartCard === cardId;
                const Icon = data.icon as any;

                return (
                  <button
                    key={cardId}
                    onClick={() => setSelectedChartCard(cardId)}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-gray-900 dark:bg-gray-700 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="truncate">{data.title}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chart Display */}
          {selectedChartCard && cardData[selectedChartCard] && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {cardData[selectedChartCard].title}
                    </h3>
                    <div className={`flex items-center space-x-1 text-sm ${
                      cardData[selectedChartCard].changeType === 'positive'
                        ? 'text-green-500'
                        : cardData[selectedChartCard].changeType === 'critical'
                        ? 'text-red-500'
                        : 'text-red-500'
                    }`}>
                      {cardData[selectedChartCard].changeType === 'positive' ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                      <span>{cardData[selectedChartCard].change}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-[#F43F5E] mr-2"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{getChartLabels(selectedChartCard).label1}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-[#E8795A] mr-2"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{getChartLabels(selectedChartCard).label2}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-[#EC4899] mr-2"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{getChartLabels(selectedChartCard).label3}</span>
                    </div>
                  </div>
                </div>

                <div className="h-[400px]">
                  <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-600">
                    <div className="text-center">
                      <LineChart className="w-16 h-16 mx-auto mb-4" />
                      <p className="text-lg font-medium">Your data will appear here</p>
                      <p className="text-sm mt-2">Connect your store and sync data to see historical trends</p>
                    </div>
                  </div>
                  {/* <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={[]}
                      margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                        tickFormatter={(value) => {
                          if (value >= 1000) {
                            return `$${(value / 1000).toFixed(1)}k`;
                          }
                          return `$${value}`;
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value1"
                        stroke="#F43F5E"
                        fill="#F43F5E"
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="value2"
                        stroke="#E8795A"
                        fill="#E8795A"
                        fillOpacity={0.4}
                      />
                      <Area
                        type="monotone"
                        dataKey="value3"
                        stroke="#EC4899"
                        fill="#EC4899"
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer> */}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state when no cards */}
      {visibleCards.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 dark:text-gray-600 mb-4">
            <Edit3 className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Metrics Selected
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Click "Customize" to add metrics to your dashboard
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
