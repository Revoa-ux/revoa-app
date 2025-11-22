import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Edit3, Save, X, Plus, Info, Clock } from 'lucide-react';
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
  const [emptyStateDismissed, setEmptyStateDismissed] = useState(false);

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

  // Load empty state dismissed preference
  useEffect(() => {
    const dismissed = localStorage.getItem('analytics-empty-state-dismissed');
    if (dismissed === 'true') {
      setEmptyStateDismissed(true);
    }
  }, []);

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

      try {
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
    if (isEditMode) {
      // Save and exit edit mode
      if (user?.id) {
        try {
await updateUserAnalyticsPreferences(user.id, {
            is_editing: false
          });
        } catch (error) {
          console.error('Error saving layout:', error);
        }
      }
    }
    setIsEditMode(!isEditMode);
  };

  const handleToggleCard = async (cardId: string, visible: boolean) => {
    if (!user?.id) return;

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

    // Save to backend
    if (user?.id) {
      updateUserAnalyticsPreferences(user.id, {
        visible_cards: newCards
}).catch(error => {
        console.error('Error saving card order:', error);
      });
    }
  };

  const handleDragEnd = () => {
    setDraggedCard(null);
  };

  const handleDismissEmptyState = () => {
    localStorage.setItem('analytics-empty-state-dismissed', 'true');
    setEmptyStateDismissed(true);
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
          Hi {userName || 'there'}, welcome to Revoa👋
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


{/* Empty State */}
      {!shopify.isConnected && !isLoading && !emptyStateDismissed && (
        <div className="mb-6 p-3.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg relative">
          <button
            onClick={handleDismissEmptyState}
            className="absolute top-2.5 right-2.5 p-1 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-md transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center space-x-3 pr-8">
            <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-sm text-amber-900 dark:text-amber-100">
                Connect your Shopify store in <a href="/settings" className="font-medium underline hover:text-amber-700 dark:hover:text-amber-300">Settings</a> to view your analytics dashboard.
              </p>
            </div>
          </div>
        </div>
      )}

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
                onClick={() => setShowCardSelector(true)}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Metrics</span>
              </button>
              <button
                onClick={handleToggleEditMode}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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
              className="flex items-center space-x-2 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
      {isEditMode && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Drag and drop cards to rearrange them. Click "Add Metrics" to show/hide cards.
          </p>
        </div>
      )}

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
