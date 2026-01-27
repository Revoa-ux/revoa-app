import React from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { loading } = useSubscription();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 rounded-full animate-spin relative" style={{ background: 'conic-gradient(from 0deg, #E11D48, #EC4899, #F87171, #E8795A, #E11D48)' }}>
          <div className="absolute inset-[3px] rounded-full bg-white dark:bg-dark" />
        </div>
      </div>
    );
  }

  // No longer blocks - just pass through children
  // Banners and individual pages handle subscription enforcement
  return <>{children}</>;
}
