import React, { ReactNode } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { SubscriptionBlockedBanner } from './SubscriptionBlockedBanner';

interface SubscriptionGateProps {
  children: ReactNode;
  skeleton: ReactNode;
  showBanner?: boolean;
}

export function SubscriptionGate({ children, skeleton, showBanner = true }: SubscriptionGateProps) {
  const { hasActiveSubscription, isOverLimit } = useSubscription();
  const isBlocked = !hasActiveSubscription || isOverLimit;

  if (!isBlocked) {
    return <>{children}</>;
  }

  return (
    <div>
      {showBanner && <SubscriptionBlockedBanner />}
      {skeleton}
    </div>
  );
}

export function useIsBlocked(): boolean {
  const { hasActiveSubscription, isOverLimit } = useSubscription();
  return !hasActiveSubscription || isOverLimit;
}
