import React from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { AnalyticsSkeleton } from '../analytics/AnalyticsSkeleton';

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { loading } = useSubscription();

  if (loading) {
    return <AnalyticsSkeleton />;
  }

  return <>{children}</>;
}
