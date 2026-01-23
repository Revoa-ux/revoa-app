import React, { ReactNode } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';

interface SubscriptionGateProps {
  children: ReactNode;
  className?: string;
}

export function SubscriptionGate({ children, className = '' }: SubscriptionGateProps) {
  const { hasActiveSubscription, isOverLimit } = useSubscription();
  const isBlocked = !hasActiveSubscription || isOverLimit;

  if (!isBlocked) {
    return <>{children}</>;
  }

  return (
    <div className={`relative ${className}`}>
      <div className="blur-sm pointer-events-none select-none">
        {children}
      </div>
    </div>
  );
}
