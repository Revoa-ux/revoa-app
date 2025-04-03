// Mock payment methods data
const MOCK_PAYMENT_METHODS = [
  {
    id: 'pm_mock_1',
    type: 'card',
    status: 'active',
    last4: '4242',
    brand: 'Visa',
    expiryMonth: 12,
    expiryYear: 25,
    created: Date.now(),
    billingDetails: {
      name: 'John Doe',
      email: 'john@example.com',
      address: {
        line1: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        postal_code: '94105',
        country: 'US'
      }
    }
  },
  {
    id: 'pm_mock_2',
    type: 'paypal',
    status: 'active',
    created: Date.now(),
    billingDetails: {
      email: 'john@example.com'
    }
  }
];

// Payment method types
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

// Get payment methods
export const getPaymentMethods = async (customerId: string) => {
  // For development, return mock data
  return {
    methods: MOCK_PAYMENT_METHODS,
    defaultMethodId: 'pm_mock_1'
  };
};

// Delete payment method
export const deletePaymentMethod = async (paymentMethodId: string) => {
  // For development, just return true
  const index = MOCK_PAYMENT_METHODS.findIndex(m => m.id === paymentMethodId);
  if (index !== -1) {
    MOCK_PAYMENT_METHODS.splice(index, 1);
  }
  return true;
};

// Set default payment method
export const setDefaultPaymentMethod = async (
  customerId: string,
  paymentMethodId: string
) => {
  // For development, just return success
  return { defaultMethodId: paymentMethodId };
};