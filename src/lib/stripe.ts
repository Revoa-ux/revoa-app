export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal';
  status: 'active' | 'expired' | 'failed';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  billingDetails?: {
    name: string;
    email: string;
    address?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  };
  created: number;
  metadata?: Record<string, any>;
}

export const getPaymentMethods = async (customerId: string) => {
  return {
    methods: [] as PaymentMethod[],
    defaultMethodId: null
  };
};

export const deletePaymentMethod = async (paymentMethodId: string) => {
  return true;
};

export const setDefaultPaymentMethod = async (
  customerId: string,
  paymentMethodId: string
) => {
  return { defaultMethodId: paymentMethodId };
};
