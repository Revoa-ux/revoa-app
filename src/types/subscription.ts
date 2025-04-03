import { PricingTier } from './pricing';

export interface Subscription {
  id: string;
  userId: string;
  tierId: PricingTier['id'];
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
  shopifyChargeId?: string;
  metadata?: Record<string, any>;
}

export interface SubscriptionUsage {
  id: string;
  subscriptionId: string;
  period: string;
  orderCount: number;
  totalRevenue: number;
  fees: {
    orderProcessing: number;
    transaction: number;
    total: number;
  };
  metadata?: Record<string, any>;
}

export interface BillingEvent {
  id: string;
  subscriptionId: string;
  type: 'charge' | 'refund' | 'adjustment';
  amount: number;
  status: 'pending' | 'succeeded' | 'failed';
  description: string;
  createdAt: string;
}