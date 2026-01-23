import React, { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { getOrderCountAnalysis, shouldNotifyUpgrade } from '@/lib/subscriptionService';
import { useConnectionStore } from '@/lib/connectionStore';

interface UpgradeBannerProps {
  onUpgradeClick?: () => void;
}

export function UpgradeBanner({ onUpgradeClick }: UpgradeBannerProps) {
  const { connectedShopifyStore } = useConnectionStore();
  const [notification, setNotification] = useState<{
    shouldNotify: boolean;
    notificationLevel: 'warning' | 'urgent' | null;
    message: string;
    orderCount: number;
    currentTier: string;
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (connectedShopifyStore?.id) {
      loadNotification();
    }
  }, [connectedShopifyStore?.id]);

  const loadNotification = async () => {
    if (!connectedShopifyStore?.id) return;
    const analysis = await getOrderCountAnalysis(connectedShopifyStore.id);
    if (!analysis) return;

    const notificationInfo = shouldNotifyUpgrade(analysis.orderCount, analysis.currentTier);

    if (notificationInfo.shouldNotify) {
      setNotification({
        ...notificationInfo,
        orderCount: analysis.orderCount,
        currentTier: analysis.currentTier,
      });
    }
  };

  if (!notification || !notification.shouldNotify || dismissed) {
    return null;
  }

  const isUrgent = notification.notificationLevel === 'urgent';

  return (
    <div
      className={`rounded-xl border p-4 ${
        isUrgent
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:gap-2">
          <h3
            className={`text-sm font-semibold ${
              isUrgent ? 'text-red-900 dark:text-red-100' : 'text-amber-900 dark:text-amber-100'
            }`}
          >
            {isUrgent ? 'Action Required' : 'Upgrade Recommended'}
          </h3>
          <span className={`hidden sm:inline ${isUrgent ? 'text-red-400 dark:text-red-500' : 'text-amber-400 dark:text-amber-500'}`}>-</span>
          <p
            className={`text-sm mt-0.5 sm:mt-0 ${
              isUrgent ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'
            }`}
          >
            {notification.message}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDismissed(true)}
            className={`px-3 py-2 text-sm rounded-lg transition-colors ${
              isUrgent
                ? 'text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30'
                : 'text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30'
            }`}
          >
            Dismiss
          </button>

          {onUpgradeClick && (
            <button
              onClick={onUpgradeClick}
              className="flex-shrink-0 inline-flex items-center justify-center gap-2 h-9 sm:h-8 px-3 rounded-lg font-medium text-sm transition-all duration-200 bg-white text-gray-800 border border-gray-300 shadow-sm hover:bg-gray-50 w-full sm:w-auto"
            >
              <TrendingUp className="w-4 h-4" />
              View Plans
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
