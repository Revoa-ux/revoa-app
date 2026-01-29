import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { RefreshCw, Edit3, X, Plus, Info, AlertCircle, WifiOff, ArrowRight, ExternalLink } from 'lucide-react';
import { useClickOutside } from '../lib/useClickOutside';
import { formatDistanceToNow } from 'date-fns';
import AdReportsTimeSelector, { TimeOption } from '../components/reports/AdReportsTimeSelector';
import TemplateSelector from '../components/analytics/TemplateSelector';
import FlippableMetricCard from '../components/analytics/FlippableMetricCard';
import CardSelectorModal from '../components/analytics/CardSelectorModal';
import ConnectPlatformCard from '../components/analytics/ConnectPlatformCard';
import { SubscriptionPageWrapper } from '../components/subscription/SubscriptionPageWrapper';
import { SoftWarningBanner } from '../components/subscription/SoftWarningBanner';
import { toast } from '../lib/toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useConnectionStore } from '../lib/connectionStore';
import { useSyncStore } from '../lib/syncStore';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAdDataCache } from '../lib/adDataCache';
import {
  TemplateType,
  getUserAnalyticsPreferences,
  initializeUserAnalyticsPreferences,
  updateUserAnalyticsPreferences,
  switchTemplate,
  toggleCardVisibility,
  computeMetricCardData,
  getTemplateMetricCards,
  getAllMetricCards,
  MetricCardData,
  MetricCardMetadata,
  fetchChartDataForCard,
  ChartDataPoint
} from '../lib/analyticsService';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

export default function Analytics() {
  const { user } = useAuth();
  const { shopify, facebook, tiktok, google, initialized } = useConnectionStore();
  const { hasActiveSubscription, isOverLimit } = useSubscription();

  const isBlocked = !hasActiveSubscription || isOverLimit;

  const [isLoading, setIsLoading] = useState(true);
  const [selectedTime, setSelectedTime] = useState<TimeOption>('today');
  const [currentTemplate, setCurrentTemplate] = useState<TemplateType>('executive');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showCardSelector, setShowCardSelector] = useState(false);
  const [visibleCards, setVisibleCards] = useState<string[]>([]);
  const [cardData, setCardData] = useState<Record<string, MetricCardData>>({});
  const [cardMetadata, setCardMetadata] = useState<Record<string, MetricCardMetadata>>({});
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [adPlatformsSyncTime, setAdPlatformsSyncTime] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalCardOrder, setOriginalCardOrder] = useState<string[]>([]);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const connectedPlatforms = {
    facebook: facebook.isConnected,
    tiktok: tiktok.isConnected,
    google: google.isConnected
  };
  const [chartDataByCard, setChartDataByCard] = useState<Record<string, ChartDataPoint[]>>({});
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [autoFlipCardId, setAutoFlipCardId] = useState<string | null>(null);
  const [autoFlipTrigger, setAutoFlipTrigger] = useState(0);
  const [hasManuallyFlipped, setHasManuallyFlipped] = useState(false);
  const [showAddPlatform, setShowAddPlatform] = useState(false);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const addPlatformRef = useRef<HTMLDivElement>(null);

  useClickOutside(addPlatformRef, () => setShowAddPlatform(false));

  const initialEndDate = new Date();
  initialEndDate.setHours(23, 59, 59, 999);
  const initialStartDate = new Date(initialEndDate);
  initialStartDate.setHours(0, 0, 0, 0);

  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: initialStartDate,
    endDate: initialEndDate
  });

  useEffect(() => {
    if (isBlocked || isEditMode || isLoading || visibleCards.length === 0 || hasManuallyFlipped) return;

    const autoFlipInterval = setInterval(() => {
      const flippableCards = visibleCards.filter(cardId => {
        const element = cardRefs.current.get(cardId);
        if (!element) return false;

        const hasChartData = chartDataByCard[cardId]?.length > 0;
        if (!hasChartData) return false;

        const rect = element.getBoundingClientRect();
        return rect.top >= 0 && rect.bottom <= window.innerHeight;
      });

      if (flippableCards.length > 0) {
        const randomIndex = Math.floor(Math.random() * flippableCards.length);
        const randomCardId = flippableCards[randomIndex];
        setAutoFlipCardId(randomCardId);
        setAutoFlipTrigger(prev => prev + 1);
      }
    }, 12000);

    return () => clearInterval(autoFlipInterval);
  }, [isBlocked, isEditMode, isLoading, visibleCards, hasManuallyFlipped, chartDataByCard]);

  useEffect(() => {
    const { refreshFacebookAccounts, refreshTikTokAccounts, refreshGoogleAccounts } = useConnectionStore.getState();

    const handleOAuthMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'facebook-oauth-success') {
        console.log('[Analytics] Facebook OAuth success:', event.data);
        toast.success(`Successfully connected ${event.data.accountCount || 1} Facebook ad account(s)`);
        await refreshFacebookAccounts();
        localStorage.removeItem('facebook_oauth_success');
      } else if (event.data?.type === 'facebook-oauth-error') {
        console.log('[Analytics] Facebook OAuth error:', event.data.error);
        toast.error(event.data.error || 'Failed to connect Facebook Ads');
        localStorage.removeItem('facebook_oauth_error');
      } else if (event.data?.type === 'google-oauth-success') {
        console.log('[Analytics] Google OAuth success:', event.data);
        toast.success(`Successfully connected ${event.data.accountCount || 1} Google ad account(s)`);
        await refreshGoogleAccounts();
        localStorage.removeItem('google_oauth_success');
      } else if (event.data?.type === 'google-oauth-error') {
        console.log('[Analytics] Google OAuth error:', event.data.error);
        toast.error(event.data.error || 'Failed to connect Google Ads');
        localStorage.removeItem('google_oauth_error');
      } else if (event.data?.type === 'tiktok-oauth-success') {
        console.log('[Analytics] TikTok OAuth success:', event.data);
        toast.success(`Successfully connected ${event.data.accountCount || 1} TikTok ad account(s)`);
        await refreshTikTokAccounts();
        localStorage.removeItem('tiktok_oauth_success');
      } else if (event.data?.type === 'tiktok-oauth-error') {
        console.log('[Analytics] TikTok OAuth error:', event.data.error);
        toast.error(event.data.error || 'Failed to connect TikTok Ads');
        localStorage.removeItem('tiktok_oauth_error');
      }
    };

    const pollInterval = setInterval(async () => {
      const tiktokSuccessFlag = localStorage.getItem('tiktok_oauth_success');
      const tiktokErrorFlag = localStorage.getItem('tiktok_oauth_error');
      const facebookSuccessFlag = localStorage.getItem('facebook_oauth_success');
      const facebookErrorFlag = localStorage.getItem('facebook_oauth_error');
      const googleSuccessFlag = localStorage.getItem('google_oauth_success');
      const googleErrorFlag = localStorage.getItem('google_oauth_error');

      if (tiktokSuccessFlag) {
        try {
          const data = JSON.parse(tiktokSuccessFlag);
          toast.success(`Successfully connected ${data.accountCount || 1} TikTok ad account(s)`);
          await refreshTikTokAccounts();
          localStorage.removeItem('tiktok_oauth_success');
        } catch (e) { console.error('Error parsing tiktok success:', e); }
      }
      if (tiktokErrorFlag) {
        try {
          const data = JSON.parse(tiktokErrorFlag);
          toast.error(data.error || 'Failed to connect TikTok Ads');
          localStorage.removeItem('tiktok_oauth_error');
        } catch (e) { console.error('Error parsing tiktok error:', e); }
      }
      if (facebookSuccessFlag) {
        try {
          const data = JSON.parse(facebookSuccessFlag);
          toast.success(`Successfully connected ${data.accountCount || 1} Facebook ad account(s)`);
          await refreshFacebookAccounts();
          localStorage.removeItem('facebook_oauth_success');
        } catch (e) { console.error('Error parsing facebook success:', e); }
      }
      if (facebookErrorFlag) {
        try {
          const data = JSON.parse(facebookErrorFlag);
          toast.error(data.error || 'Failed to connect Facebook Ads');
          localStorage.removeItem('facebook_oauth_error');
        } catch (e) { console.error('Error parsing facebook error:', e); }
      }
      if (googleSuccessFlag) {
        try {
          const data = JSON.parse(googleSuccessFlag);
          toast.success(`Successfully connected ${data.accountCount || 1} Google ad account(s)`);
          await refreshGoogleAccounts();
          localStorage.removeItem('google_oauth_success');
        } catch (e) { console.error('Error parsing google success:', e); }
      }
      if (googleErrorFlag) {
        try {
          const data = JSON.parse(googleErrorFlag);
          toast.error(data.error || 'Failed to connect Google Ads');
          localStorage.removeItem('google_oauth_error');
        } catch (e) { console.error('Error parsing google error:', e); }
      }
    }, 500);

    window.addEventListener('message', handleOAuthMessage);
    return () => {
      window.removeEventListener('message', handleOAuthMessage);
      clearInterval(pollInterval);
    };
  }, []);

  useEffect(() => {
    setLastSyncTime(new Date());
  }, [cardData]);

  useEffect(() => {
    if (isBlocked) return;

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
  }, [user?.id, cardData, isBlocked]);

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        const allCards = await getAllMetricCards();
        const metadataMap: Record<string, MetricCardMetadata> = {};
        allCards.forEach(card => {
          metadataMap[card.id] = card;
        });
        setCardMetadata(metadataMap);

        let prefs = await getUserAnalyticsPreferences(user.id);

        if (!prefs) {
          prefs = await initializeUserAnalyticsPreferences(user.id, 'executive');
        }

        setCurrentTemplate(prefs.active_template);

        let cards = prefs.visible_cards || [];
        if (typeof cards === 'string') {
          cards = JSON.parse(cards);
        }

        setVisibleCards(Array.isArray(cards) ? cards : []);

        if (!cards || cards.length === 0) {
          const templateCards = await getTemplateMetricCards(prefs.active_template);
          const cardIds = templateCards.map(c => c.id);

          if (cardIds.length > 0 && !isBlocked) {
            await updateUserAnalyticsPreferences(user.id, {
              visible_cards: cardIds
            });
          }
          setVisibleCards(cardIds);
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [user?.id, isBlocked]);

  useEffect(() => {
    if (isBlocked) return;

    const fetchCardData = async () => {
      if (visibleCards.length === 0) return;

      setIsLoading(true);
      setCardData({});

      try {
        const startDateStr = dateRange.startDate.toISOString();
        const endDateStr = dateRange.endDate.toISOString();

        console.log('[Analytics] fetchCardData triggered:', {
          startDate: startDateStr.split('T')[0],
          endDate: endDateStr.split('T')[0],
          visibleCardsCount: visibleCards.length
        });

        const data = await computeMetricCardData(visibleCards, startDateStr, endDateStr, (cardId, cardData) => {
          setCardData(prev => ({ ...prev, [cardId]: cardData }));
        });

        setCardData(data);

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
          console.log('[Analytics] Chart data fetched:', {
            cardId,
            dataPoints: chartData.length,
            firstDate: chartData[0]?.date,
            lastDate: chartData[chartData.length - 1]?.date,
            requestedStart: startDateStr.split('T')[0],
            requestedEnd: endDateStr.split('T')[0]
          });
        });
        setChartDataByCard(chartDataMap);
      } catch (error) {
        console.error('Error fetching card data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCardData();
  }, [visibleCards, dateRange.startDate.getTime(), dateRange.endDate.getTime(), refreshCounter, isBlocked]);

  const handleTimeChange = useCallback((time: TimeOption) => {
    setSelectedTime(time);
  }, []);

  const handleDateRangeChange = (range: DateRange) => {
    console.log('[Analytics] handleDateRangeChange called:', {
      startDate: range.startDate.toISOString().split('T')[0],
      endDate: range.endDate.toISOString().split('T')[0],
      daysDiff: Math.ceil((range.endDate.getTime() - range.startDate.getTime()) / (1000 * 60 * 60 * 24))
    });
    setDateRange(range);
  };

  const handleApplyDateRange = async () => {
    const syncStore = useSyncStore.getState();
    const adDataCache = useAdDataCache.getState();
    const { facebook } = useConnectionStore.getState();

    if (facebook.isConnected && facebook.adAccounts && facebook.adAccounts.length > 0) {
      if (syncStore.startSync('analytics')) {
        try {
          const { facebookAdsService } = await import('@/lib/facebookAds');

          await Promise.all(
            facebook.adAccounts.map(async account => {
              try {
                const result = await facebookAdsService.quickRefresh(account.platform_account_id, 'last_7d');
                if (result.needsFullSync) {
                  console.log('[Analytics] Full sync needed - triggering sync for historical data');
                  await facebookAdsService.syncAdAccount(account.platform_account_id);
                }
              } catch (err) {
                console.error('[Analytics] Quick refresh failed:', err);
              }
            })
          );

          adDataCache.markStale();
          syncStore.completeSync();
        } catch (error) {
          console.error('[Analytics] Manual refresh failed:', error);
          syncStore.completeSync(error instanceof Error ? error.message : 'Refresh failed');
        }
      }
    }

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

  const isDataStale = () => {
    if (!lastSyncTime) return false;
    const hoursSinceSync = (new Date().getTime() - lastSyncTime.getTime()) / (1000 * 60 * 60);
    return hoursSinceSync > 24;
  };

  const handleExpandCard = (cardId: string) => {
    setExpandedCardId(expandedCardId === cardId ? null : cardId);
  };

  const handleManualFlip = () => {
    setHasManuallyFlipped(true);
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

  const connectedPlatformsCount = [
    connectedPlatforms.facebook,
    connectedPlatforms.tiktok,
    connectedPlatforms.google
  ].filter(Boolean).length;

  const platformSections = [
    ...(connectedPlatformsCount > 1 ? [{ key: 'combined', label: 'Combined Metrics', subtitle: 'Aggregated across all platforms' }] : []),
    ...(connectedPlatforms.facebook ? [{ key: 'meta', label: 'Meta / Facebook', subtitle: 'Facebook and Instagram ads' }] : []),
    ...(connectedPlatforms.tiktok ? [{ key: 'tiktok', label: 'TikTok', subtitle: 'TikTok ads performance' }] : []),
    ...(connectedPlatforms.google ? [{ key: 'google', label: 'Google Ads', subtitle: 'Search and display campaigns' }] : [])
  ];

  const getPlaceholderData = (cardId: string): MetricCardData => {
    const metadata = cardMetadata[cardId];
    return {
      id: cardId,
      title: metadata?.title || cardId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      mainValue: '...',
      change: '...',
      changeType: 'positive' as const,
      dataPoint1: { label: '...', value: '...' },
      dataPoint2: { label: '...', value: '...' },
      icon: metadata?.icon || 'HelpCircle',
      category: (metadata?.category || 'overview') as any
    };
  };

  const getNotification = () => {
    if (!shopify.isConnected && shopify.lastConnectedAt) {
      return {
        type: 'error' as const,
        icon: WifiOff,
        message: 'Shopify connection lost.',
        action: { text: 'Reconnect', href: '/settings' }
      };
    }

    if (!facebook.isConnected && facebook.lastConnectedAt) {
      return {
        type: 'warning' as const,
        icon: AlertCircle,
        message: 'Facebook Ads disconnected.',
        action: { text: 'Reconnect', href: '/settings' }
      };
    }

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

  return (
    <SubscriptionPageWrapper>
      <Helmet>
        <title>Analytics | Revoa</title>
      </Helmet>
      <SoftWarningBanner />

      <div className="mb-6">
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
          Analytics Dashboard
        </h1>
        {/* Platform Pills & Add Platform Button */}
        <div className="flex items-center gap-3">
          {(() => {
            const connectedPlatformsList: { id: string; name: string; icon: React.ReactNode }[] = [];
            const unconnectedPlatformsList: { id: string; name: string; href: string }[] = [];

            // Shopify first (always show if connected)
            if (shopify.isConnected) {
              connectedPlatformsList.push({
                id: 'shopify',
                name: 'Shopify',
                icon: (
                  <img
                    src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/shopify_glyph.svg"
                    alt="Shopify"
                    className="w-3.5 h-3.5"
                  />
                )
              });
            } else {
              unconnectedPlatformsList.push({
                id: 'shopify',
                name: 'Shopify',
                href: '/settings'
              });
            }

            // Meta/Facebook
            if (facebook.isConnected && facebook.adAccounts && facebook.adAccounts.length > 0) {
              connectedPlatformsList.push({
                id: 'facebook',
                name: 'Meta Ads',
                icon: (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                )
              });
            } else {
              unconnectedPlatformsList.push({
                id: 'facebook',
                name: 'Meta Ads',
                href: '/settings'
              });
            }

            // TikTok
            if (tiktok.isConnected && tiktok.accounts && tiktok.accounts.length > 0) {
              connectedPlatformsList.push({
                id: 'tiktok',
                name: 'TikTok Ads',
                icon: (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
                )
              });
            } else {
              unconnectedPlatformsList.push({
                id: 'tiktok',
                name: 'TikTok Ads',
                href: '/settings'
              });
            }

            // Google
            if (google.isConnected && google.accounts && google.accounts.length > 0) {
              connectedPlatformsList.push({
                id: 'google',
                name: 'Google Ads',
                icon: (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.54 11.23c0-.8-.07-1.57-.19-2.31H12v4.51h5.92c-.26 1.57-1.04 2.91-2.21 3.82v3.18h3.57c2.08-1.92 3.28-4.74 3.28-8.2z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )
              });
            } else {
              unconnectedPlatformsList.push({
                id: 'google',
                name: 'Google Ads',
                href: '/settings'
              });
            }

            // Loading state
            if (!initialized || facebook.loading || tiktok.loading || google.loading) {
              return (
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0 animate-pulse"></span>
                  Checking connections...
                </p>
              );
            }

            // No platforms connected - still show the add button
            if (connectedPlatformsList.length === 0) {
              return (
                <>
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0"></span>
                    No platforms connected
                  </p>
                  {/* Add Platform Button */}
                  <div className="relative" ref={addPlatformRef}>
                    <button
                      onClick={() => setShowAddPlatform(!showAddPlatform)}
                      className="flex items-center justify-center w-[27px] h-[27px] bg-white dark:bg-dark border border-dashed border-gray-300 dark:border-[#4a4a4a] rounded-md hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-[#3a3a3a] transition-all"
                      title="Add platform"
                    >
                      <Plus className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                    </button>

                    {/* Add Platform Dropdown */}
                    {showAddPlatform && (
                      <div className="absolute left-0 top-full mt-2 w-64 bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg shadow-lg overflow-hidden z-50">
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-[#3a3a3a]">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Add Platform
                          </p>
                        </div>
                        <div>
                          {unconnectedPlatformsList.map((platform, index) => (
                            <button
                              key={platform.id}
                              onClick={() => {
                                setShowAddPlatform(false);
                                if (platform.id === 'facebook') {
                                  (async () => {
                                    try {
                                      const { facebookAdsService } = await import('@/lib/facebookAds');
                                      const oauthUrl = await facebookAdsService.connectFacebookAds();
                                      window.open(oauthUrl, 'facebook-oauth', 'width=600,height=700,scrollbars=yes');
                                    } catch (error) {
                                      console.error('[Analytics] Error connecting Facebook Ads:', error);
                                      toast.error(error instanceof Error ? error.message : 'Failed to connect Facebook Ads');
                                    }
                                  })();
                                } else if (platform.id === 'google') {
                                  (async () => {
                                    try {
                                      const { googleAdsService } = await import('@/lib/googleAds');
                                      const oauthUrl = await googleAdsService.connectGoogleAds();
                                      window.open(oauthUrl, 'google-oauth', 'width=600,height=700,scrollbars=yes');
                                    } catch (error) {
                                      console.error('[Analytics] Error connecting Google Ads:', error);
                                      toast.error(error instanceof Error ? error.message : 'Failed to connect Google Ads');
                                    }
                                  })();
                                } else if (platform.id === 'tiktok') {
                                  (async () => {
                                    try {
                                      const { tiktokAdsService } = await import('@/lib/tiktokAds');
                                      const oauthUrl = await tiktokAdsService.connectTikTokAds();
                                      window.open(oauthUrl, 'tiktok-oauth', 'width=600,height=700,scrollbars=yes');
                                    } catch (error) {
                                      console.error('[Analytics] Error connecting TikTok Ads:', error);
                                      toast.error(error instanceof Error ? error.message : 'Failed to connect TikTok Ads');
                                    }
                                  })();
                                } else if (platform.id === 'shopify') {
                                  const appStoreUrl = import.meta.env.VITE_SHOPIFY_APP_STORE_URL || 'https://apps.shopify.com/revoa';
                                  window.open(appStoreUrl, '_blank');
                                } else {
                                  window.location.href = platform.href;
                                }
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors ${
                                index === unconnectedPlatformsList.length - 1 ? 'rounded-b-lg' : ''
                              }`}
                            >
                              <div className="flex items-center justify-center w-8 h-8 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg flex-shrink-0">
                                {platform.id === 'shopify' && (
                                  <>
                                    <img
                                      src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/shopify_glyph_black.svg"
                                      alt="Shopify"
                                      className="w-5 h-5 dark:hidden"
                                    />
                                    <img
                                      src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/shopify_glyph_white.svg"
                                      alt="Shopify"
                                      className="w-5 h-5 hidden dark:block"
                                    />
                                  </>
                                )}
                                {platform.id === 'facebook' && (
                                  <svg className="w-5 h-5 text-gray-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                  </svg>
                                )}
                                {platform.id === 'tiktok' && (
                                  <svg className="w-5 h-5 text-gray-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                                  </svg>
                                )}
                                {platform.id === 'google' && (
                                  <svg className="w-5 h-5 text-gray-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1 text-left">
                                <p className="font-medium">{platform.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                  Connect account
                                  {platform.id === 'shopify' && <ExternalLink className="w-3 h-3" />}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              );
            }

            return (
              <>
                {/* Connected Platform Pills */}
                {connectedPlatformsList.map((platform) => (
                  <div
                    key={platform.id}
                    className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-md h-[27px]"
                  >
                    <div className="flex-shrink-0">
                      {platform.icon}
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {platform.name}
                    </span>
                  </div>
                ))}

                {/* Add Platform Button */}
                {unconnectedPlatformsList.length > 0 && (
                  <div className="relative" ref={addPlatformRef}>
                    <button
                      onClick={() => setShowAddPlatform(!showAddPlatform)}
                      className="flex items-center justify-center w-[27px] h-[27px] bg-white dark:bg-dark border border-dashed border-gray-300 dark:border-[#4a4a4a] rounded-md hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-[#3a3a3a] transition-all"
                      title="Add platform"
                    >
                      <Plus className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                    </button>

                    {/* Add Platform Dropdown */}
                    {showAddPlatform && (
                      <div className="absolute left-0 top-full mt-2 w-64 bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg shadow-lg overflow-hidden z-50">
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-[#3a3a3a]">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Add Platform
                          </p>
                        </div>
                        <div>
                          {unconnectedPlatformsList.map((platform, index) => (
                            <button
                              key={platform.id}
                              onClick={() => {
                                setShowAddPlatform(false);
                                if (platform.id === 'facebook') {
                                  (async () => {
                                    try {
                                      const { facebookAdsService } = await import('@/lib/facebookAds');
                                      const oauthUrl = await facebookAdsService.connectFacebookAds();
                                      window.open(oauthUrl, 'facebook-oauth', 'width=600,height=700,scrollbars=yes');
                                    } catch (error) {
                                      console.error('[Analytics] Error connecting Facebook Ads:', error);
                                      toast.error(error instanceof Error ? error.message : 'Failed to connect Facebook Ads');
                                    }
                                  })();
                                } else if (platform.id === 'google') {
                                  (async () => {
                                    try {
                                      const { googleAdsService } = await import('@/lib/googleAds');
                                      const oauthUrl = await googleAdsService.connectGoogleAds();
                                      window.open(oauthUrl, 'google-oauth', 'width=600,height=700,scrollbars=yes');
                                    } catch (error) {
                                      console.error('[Analytics] Error connecting Google Ads:', error);
                                      toast.error(error instanceof Error ? error.message : 'Failed to connect Google Ads');
                                    }
                                  })();
                                } else if (platform.id === 'tiktok') {
                                  (async () => {
                                    try {
                                      const { tiktokAdsService } = await import('@/lib/tiktokAds');
                                      const oauthUrl = await tiktokAdsService.connectTikTokAds();
                                      window.open(oauthUrl, 'tiktok-oauth', 'width=600,height=700,scrollbars=yes');
                                    } catch (error) {
                                      console.error('[Analytics] Error connecting TikTok Ads:', error);
                                      toast.error(error instanceof Error ? error.message : 'Failed to connect TikTok Ads');
                                    }
                                  })();
                                } else if (platform.id === 'shopify') {
                                  const appStoreUrl = import.meta.env.VITE_SHOPIFY_APP_STORE_URL || 'https://apps.shopify.com/revoa';
                                  window.open(appStoreUrl, '_blank');
                                } else {
                                  window.location.href = platform.href;
                                }
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors ${
                                index === unconnectedPlatformsList.length - 1 ? 'rounded-b-lg' : ''
                              }`}
                            >
                              <div className="flex items-center justify-center w-8 h-8 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg flex-shrink-0">
                                {platform.id === 'shopify' && (
                                  <>
                                    <img
                                      src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/shopify_glyph_black.svg"
                                      alt="Shopify"
                                      className="w-5 h-5 dark:hidden"
                                    />
                                    <img
                                      src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/shopify_glyph_white.svg"
                                      alt="Shopify"
                                      className="w-5 h-5 hidden dark:block"
                                    />
                                  </>
                                )}
                                {platform.id === 'facebook' && (
                                  <svg className="w-5 h-5 text-gray-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                  </svg>
                                )}
                                {platform.id === 'tiktok' && (
                                  <svg className="w-5 h-5 text-gray-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                                  </svg>
                                )}
                                {platform.id === 'google' && (
                                  <svg className="w-5 h-5 text-gray-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1 text-left">
                                <p className="font-medium">{platform.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                  Connect account
                                  {platform.id === 'shopify' && <ExternalLink className="w-3 h-3" />}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Last Synced Time */}
                {adPlatformsSyncTime && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    Updated {formatDistanceToNow(adPlatformsSyncTime, { addSuffix: true })}
                  </span>
                )}
              </>
            );
          })()}
        </div>
      </div>


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

      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <TemplateSelector
            currentTemplate={currentTemplate}
            onTemplateChange={handleTemplateChange}
            disabled={isEditMode}
          />

          {isEditMode ? (
            <button
              onClick={() => setIsEditMode(false)}
              className="btn btn-secondary h-[39px] px-3 text-sm"
            >
              <div className="flex items-center justify-center space-x-2">
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">Exit Customize Mode</span>
              </div>
            </button>
          ) : (
            currentTemplate !== 'custom' && (
              <button
                onClick={handleToggleEditMode}
                className="btn btn-secondary h-[39px] px-3 text-sm"
              >
                <div className="flex items-center justify-center space-x-2">
                  <Edit3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Customize</span>
                </div>
              </button>
            )
          )}
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          <button
            className="btn btn-secondary h-[39px] px-3 text-sm"
            onClick={handleApplyDateRange}
            disabled={isLoading}
          >
            <div className="flex items-center justify-center space-x-2">
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Refreshing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Refresh</span>
                </>
              )}
            </div>
          </button>
          <AdReportsTimeSelector
            selectedTime={selectedTime}
            onTimeChange={handleTimeChange}
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
          />
        </div>
      </div>

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
                className="btn btn-primary group px-5 py-1.5 text-sm font-medium flex items-center gap-2 ml-4 flex-shrink-0"
              >
                <span>Save Layout</span>
                <ArrowRight className="btn-icon btn-icon-arrow" />
              </button>
            )}
          </div>
        </div>
      )}

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

                    const displayData = data || getPlaceholderData(cardId);

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
                          data={displayData}
                          chartData={chartDataByCard[cardId] || []}
                          dateRange={dateRange}
                          isLoading={isLoading && !isBlocked}
                          isExpanded={isExpanded}
                          autoFlipTrigger={autoFlipCardId === cardId ? autoFlipTrigger : undefined}
                          onExpand={() => handleExpandCard(cardId)}
                          onManualFlip={handleManualFlip}
                          isDragging={draggedCard === cardId}
                          onDragStart={isEditMode ? handleDragStart(cardId) : undefined}
                          onDragEnd={isEditMode ? handleDragEnd : undefined}
                          onDragOver={isEditMode ? handleDragOver : undefined}
                          onDrop={isEditMode ? handleDrop(cardId) : undefined}
                        />
                      </div>
                    );
                  })}

                  {!isLoading && (
                    <button
                      onClick={() => setShowCardSelector(true)}
                      className="h-[180px] w-full rounded-xl border border-dashed border-gray-300 dark:border-[#4a4a4a] hover:border-gray-900 dark:hover:border-gray-100 hover:bg-gray-50/70 dark:hover:bg-[#3a3a3a]/70 transition-all duration-200 flex flex-col items-center justify-center group"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#3a3a3a] group-hover:bg-gray-200 dark:group-hover:bg-gray-600 flex items-center justify-center mb-3 transition-colors border border-gray-200 dark:border-[#4a4a4a] group-hover:border-gray-400 dark:group-hover:border-gray-400">
                          <Plus className="w-6 h-6 text-gray-400 dark:text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
                        </div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                          Add Metric
                        </span>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {initialized && !facebook.loading && !connectedPlatforms.facebook && (
            <div>
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Meta / Facebook</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Facebook and Instagram ads</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <ConnectPlatformCard platform="facebook" platformLabel="Facebook Ads" />
              </div>
            </div>
          )}

          {initialized && !tiktok.loading && !connectedPlatforms.tiktok && (
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

          {initialized && !google.loading && !connectedPlatforms.google && (
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

            const displayData = data || getPlaceholderData(cardId);

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
                  data={displayData}
                  chartData={chartDataByCard[cardId] || []}
                  dateRange={dateRange}
                  isLoading={isLoading && !isBlocked}
                  isExpanded={isExpanded}
                  autoFlipTrigger={autoFlipCardId === cardId ? autoFlipTrigger : undefined}
                  onExpand={() => handleExpandCard(cardId)}
                  onManualFlip={handleManualFlip}
                  isDragging={draggedCard === cardId}
                  onDragStart={isEditMode ? handleDragStart(cardId) : undefined}
                  onDragEnd={isEditMode ? handleDragEnd : undefined}
                  onDragOver={isEditMode ? handleDragOver : undefined}
                  onDrop={isEditMode ? handleDrop(cardId) : undefined}
                />
              </div>
            );
          })}

          {!isLoading && (
            <button
              onClick={() => setShowCardSelector(true)}
              className="h-[180px] rounded-xl border border-dashed border-gray-300 dark:border-[#4a4a4a] hover:border-gray-900 dark:hover:border-gray-100 hover:bg-gray-50/70 dark:hover:bg-[#3a3a3a]/70 transition-all duration-200 flex flex-col items-center justify-center group"
            >
              <div className="flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#3a3a3a] group-hover:bg-gray-200 dark:group-hover:bg-gray-600 flex items-center justify-center mb-3 transition-colors border border-gray-200 dark:border-[#4a4a4a] group-hover:border-gray-400 dark:group-hover:border-gray-400">
                  <Plus className="w-6 h-6 text-gray-400 dark:text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
                </div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                  {currentTemplate === 'custom' ? 'Add/Delete Metric' : 'Add Metric'}
                </span>
              </div>
            </button>
          )}
        </div>
      )}

      {visibleCards.length === 0 && !isLoading && !isBlocked && (
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

      <CardSelectorModal
        isOpen={showCardSelector}
        onClose={() => setShowCardSelector(false)}
        visibleCards={visibleCards}
        onToggleCard={handleToggleCard}
      />
    </SubscriptionPageWrapper>
  );
}
