import React, { useEffect, useState } from 'react';
import { AlertTriangle, TrendingUp, X } from 'lucide-react';
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
      <div className="flex items-start gap-3">
        <AlertTriangle
          className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
            isUrgent ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
          }`}
        />

        <div className="flex-1 min-w-0">
          <h3
            className={`text-sm font-semibold ${
              isUrgent ? 'text-red-900 dark:text-red-100' : 'text-amber-900 dark:text-amber-100'
            }`}
          >
            {isUrgent ? 'Action Required' : 'Upgrade Recommended'}
          </h3>
          <p
            className={`text-sm mt-1 ${
              isUrgent ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'
            }`}
          >
            {notification.message}
          </p>

          {onUpgradeClick && (
            <button
              onClick={onUpgradeClick}
              className={`mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                isUrgent
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              View Plans
            </button>
          )}
        </div>

        <button
          onClick={() => setDismissed(true)}
          className={`p-1 rounded-lg transition-colors ${
            isUrgent
              ? 'hover:bg-red-100 dark:hover:bg-red-900/30'
              : 'hover:bg-amber-100 dark:hover:bg-amber-900/30'
          }`}
        >
          <X
            className={`w-4 h-4 ${
              isUrgent ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
