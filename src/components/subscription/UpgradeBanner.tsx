import React, { useEffect, useState } from 'react';
import { TrendingUp, Gem } from 'lucide-react';
import { getOrderCountAnalysis, shouldNotifyUpgrade } from '@/lib/subscriptionService';
import { useConnectionStore } from '@/lib/connectionStore';
import { supabase } from '@/lib/supabase';

interface UpgradeBannerProps {
  onUpgradeClick?: () => void;
}

export function UpgradeBanner({ onUpgradeClick }: UpgradeBannerProps) {
  const { shopify } = useConnectionStore();
  const [notification, setNotification] = useState<{
    shouldNotify: boolean;
    notificationLevel: 'warning' | 'urgent' | null;
    message: string;
    orderCount: number;
    currentTier: string;
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    if (shopify.installation?.store_url) {
      lookupStoreId();
    }
  }, [shopify.installation?.store_url]);

  useEffect(() => {
    if (storeId) {
      loadNotification();
    }
  }, [storeId]);

  const lookupStoreId = async () => {
    if (!shopify.installation?.store_url) return;
    const { data } = await supabase
      .from('shopify_stores')
      .select('id')
      .eq('store_url', shopify.installation.store_url)
      .single();
    if (data?.id) {
      setStoreId(data.id);
    }
  };

  const loadNotification = async () => {
    if (!storeId) return;
    const analysis = await getOrderCountAnalysis(storeId);
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

  const innerGradientDark = isUrgent
    ? 'linear-gradient(to bottom, rgba(127, 29, 29, 0.15), rgba(127, 29, 29, 0.25))'
    : 'linear-gradient(to bottom, rgba(120, 53, 15, 0.15), rgba(120, 53, 15, 0.25))';

  const iconColor = isUrgent
    ? 'text-red-400 dark:text-red-500/70'
    : 'text-amber-400 dark:text-amber-500/70';

  const IconComponent = Gem;

  return (
    <div className={`mb-6 rounded-xl p-0.5 border ${outerBorderColor} ${outerBg}`}>
      <div
        className={`upgrade-banner-gradient rounded-lg border ${innerBorderColor} px-4 py-3`}
        style={{ background: `var(--upgrade-banner-gradient, ${innerGradient})` }}
      >
        <style>{`
          .dark .upgrade-banner-gradient {
            --upgrade-banner-gradient: ${innerGradientDark};
          }
        `}</style>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <IconComponent className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />

          <span className="text-sm text-gray-700 dark:text-gray-300">
            {notification.message}
          </span>

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
                className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-all duration-150 hover:brightness-110"
                style={{
                  backgroundColor: isUrgent ? '#F43F5E' : '#F59E0B',
                  boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                }}
              >
                <TrendingUp className="w-3.5 h-3.5 transition-transform duration-150 group-hover:scale-110" />
                View Plans
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
