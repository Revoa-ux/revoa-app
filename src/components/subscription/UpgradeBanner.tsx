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
      className={`info-banner p-4 ${
        isUrgent ? 'info-banner-red' : 'info-banner-yellow'
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
            className={`btn btn-ghost px-3 py-2 text-sm ${
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
              className="btn btn-secondary flex-shrink-0 w-full sm:w-auto"
            >
              <TrendingUp className="btn-icon w-4 h-4" />
              View Plans
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
