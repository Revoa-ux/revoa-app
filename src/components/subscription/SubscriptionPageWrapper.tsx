import React, { ReactNode } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { SubscriptionBlockedBanner } from './SubscriptionBlockedBanner';

interface SubscriptionPageWrapperProps {
  children: ReactNode;
}

export function SubscriptionPageWrapper({ children }: SubscriptionPageWrapperProps) {
  const { hasActiveSubscription, isOverLimit, loading, noPlanSelected } = useSubscription();
  const isBlocked = !hasActiveSubscription || isOverLimit || noPlanSelected;

  if (loading) {
    return <>{children}</>;
  }

  if (!isBlocked) {
    return <>{children}</>;
  }

  return (
    <div>
      <SubscriptionBlockedBanner />
      <div className="relative">
        <div
          className="blur-sm pointer-events-none select-none"
          style={{ filter: 'blur(4px)' }}
        >
          {children}
        </div>
        <div
          className="absolute inset-0 bg-white/30 dark:bg-dark/30"
          style={{ backdropFilter: 'blur(1px)' }}
        />
      </div>
    </div>
  );
}
