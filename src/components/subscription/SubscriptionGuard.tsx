import React from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  // No longer blocks during loading - just pass through children immediately
  // Pages show their own skeleton states
  // Banners and individual pages handle subscription enforcement after loading
  return <>{children}</>;
}
