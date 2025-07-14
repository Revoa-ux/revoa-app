import { PricingTier } from '@/types/pricing';

export const pricingTiers: PricingTier[] = [
  {
    id: 'startup',
    name: 'Startup',
    description: 'Perfect for new businesses and startups',
    monthlyFee: 0,
    perOrderFee: 0.25,
    transactionFee: 2.5,
    orderLimit: 50,
    features: [
      'Up to 50 orders per month'
    ]
  },
  {
    id: 'momentum',
    name: 'Momentum',
    description: 'Ideal for growing businesses',
    monthlyFee: 0,
    perOrderFee: 0.20,
    transactionFee: 2.0,
    orderLimit: 500,
    features: [
      'Up to 500 orders per month'
    ]
  },
  {
    id: 'scale',
    name: 'Scale',
    description: 'For brands with high sales volume',
    monthlyFee: 0,
    perOrderFee: 0.15,
    transactionFee: 1.5,
    orderLimit: 1000,
    features: [
      'Up to 1,000 orders per month'
    ]
  },
  {
    id: 'business',
    name: 'Business',
    description: 'The ultimate solution for established brands',
    monthlyFee: 0,
    perOrderFee: 0.10,
    transactionFee: 1.0,
    orderLimit: 'unlimited',
    features: [
      'Unlimited orders'
    ]
  }
];