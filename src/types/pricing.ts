export interface PricingTier {
  id: 'startup' | 'momentum' | 'scale' | 'enterprise';
  name: string;
  orderLimit: string; // Display string like "Up to 100 orders/mo"
  orderMin: number;
  orderMax: number;
  monthlyFee: number;
  trialDays?: number;
  features: string[];
  shopifyPlanId?: string; // Reference to Shopify Managed Pricing plan ID
}

export type SubscriptionStatus =
  | 'ACTIVE'
  | 'PENDING'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'DECLINED'
  | 'FROZEN';

export interface Subscription {
  id: string;
  storeId: string;
  currentTier: PricingTier['id'];
  subscriptionStatus: SubscriptionStatus;
  shopifySubscriptionId?: string;
  trialEndDate?: string;
  currentPeriodEnd?: string;
  monthlyOrderCount: number;
  lastOrderCountUpdate: string;
}
