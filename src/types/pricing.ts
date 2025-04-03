export interface PricingTier {
  id: 'startup' | 'momentum' | 'scale' | 'business';
  name: string;
  description: string;
  monthlyFee: number;
  perOrderFee: number;
  transactionFee: number;
  orderLimit: number | 'unlimited';
  features: string[];
  recommended?: boolean;
}

export interface PricingCalculation {
  monthlyOrders: number;
  averageOrderValue: number;
  selectedTier: PricingTier['id'];
}