export interface PricingTier {
  id: 'startup' | 'momentum' | 'scale' | 'enterprise';
  name: string;
  revenueRange: string;
  revenueMin: number;
  revenueMax: number;
  baseFee: number;
  percentageFee: number;
  features: string[];
}

export interface PricingCalculation {
  monthlyRevenue: number;
  baseFee: number;
  variableFee: number;
  totalFee: number;
  effectiveFeePercentage: number;
}
