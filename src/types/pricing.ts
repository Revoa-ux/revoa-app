export interface PricingTier {
  id: 'startup' | 'momentum' | 'scale' | 'enterprise';
  name: string;
  orderRange: string;
  perOrderFee: number;
  transactionFee: number;
  features: string[];
}

export interface PricingCalculation {
  orders: number;
  avgOrderValue: number;
  totalOrderValue: number;
  perOrderFees: number;
  transactionFees: number;
  totalFees: number;
  effectiveFeePercentage: number;
}
