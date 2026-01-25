import React, { useEffect, useState } from 'react';
import { TrendingUp, Gem } from 'lucide-react';
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

  const outerBorderColor = isUrgent
    ? 'border-red-200 dark:border-red-900/50'
    : 'border-amber-200 dark:border-amber-900/50';

  const innerBorderColor = isUrgent
    ? 'border-red-300 dark:border-red-800/60'
    : 'border-amber-300 dark:border-amber-800/60';

  const outerBg = isUrgent
    ? 'bg-red-50 dark:bg-red-950/30'
    : 'bg-amber-50 dark:bg-amber-950/30';

  const innerGradient = isUrgent
    ? 'linear-gradient(to bottom, rgba(254, 242, 242, 1), rgba(254, 226, 226, 1))'
    : 'linear-gradient(to bottom, rgba(255, 251, 235, 1), rgba(254, 243, 199, 1))';

  const iconColor = isUrgent
    ? 'text-red-600 dark:text-red-400'
    : 'text-amber-600 dark:text-amber-400';

  const IconComponent = Gem;

  return (
    <div className={`mb-6 rounded-xl p-0.5 border ${outerBorderColor} ${outerBg}`}>
      <div
        className={`rounded-lg border ${innerBorderColor} px-4 py-3`}
        style={{ background: innerGradient }}
      >
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <IconComponent className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />

          <div className="flex items-center gap-2 text-center">
            <span className="font-semibold text-sm text-gray-900 dark:text-white">
              {isUrgent ? 'Action Required' : 'Upgrade Recommended'}
            </span>
            <span className="text-gray-400 dark:text-gray-500">-</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {notification.message}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDismissed(true)}
              className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors px-2 py-1"
            >
              Dismiss
            </button>

            {onUpgradeClick && (
              <button
                onClick={onUpgradeClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-all duration-150 hover:-translate-y-0.5"
                style={{
                  background: 'linear-gradient(to bottom, #1f2937, #111827)',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                }}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                View Plans
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
