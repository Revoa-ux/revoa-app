export interface PricingTier {
  id: 'standard';
  name: string;
  price: number;
  trialDays: number;
  features: string[];
  interval: 'monthly' | 'annual';
}
