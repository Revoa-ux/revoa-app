import React, { ReactNode } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { SubscriptionBlockedBanner } from './SubscriptionBlockedBanner';

interface SubscriptionGateProps {
  children: ReactNode;
  skeleton: ReactNode;
  showBanner?: boolean;
}

export function SubscriptionGate({ children, skeleton, showBanner = true }: SubscriptionGateProps) {
  const { hasActiveSubscription, isOverLimit, noPlanSelected, loading } = useSubscription();

  if (loading) {
    return <>{skeleton}</>;
  }

  const isBlocked = !hasActiveSubscription || isOverLimit || noPlanSelected;

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
  const { hasActiveSubscription, isOverLimit, noPlanSelected, loading } = useSubscription();
  if (loading) return false;
  return !hasActiveSubscription || isOverLimit || noPlanSelected;
}
