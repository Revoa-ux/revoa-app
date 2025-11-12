export interface PricingTier {
  id: 'startup' | 'momentum' | 'scale' | 'enterprise';
  name: string;
  revenueRange: string;
  revenueMin: number;
  revenueMax: number;
  monthlyFee: number;
  trialDays?: number;
  features: string[];
}
