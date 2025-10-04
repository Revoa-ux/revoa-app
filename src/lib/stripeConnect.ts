import { supabase } from './supabase';

export interface Supplier {
  id: string;
  name: string;
  email: string;
  stripe_account_id: string | null;
  stripe_account_status: 'pending' | 'active' | 'restricted' | 'disabled';
  commission_rate: number;
  onboarding_completed: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceTransaction {
  id: string;
  user_id: string;
  supplier_id: string;
  product_id: string | null;
  stripe_payment_intent_id: string;
  stripe_transfer_id: string | null;
  total_amount: number;
  supplier_amount: number;
  platform_fee: number;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';
  currency: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export const stripeConnectService = {
  async getSupplier(supplierId?: string): Promise<Supplier | null> {
    try {
      const query = supabase.from('suppliers').select('*');

      const { data, error } = supplierId
        ? await query.eq('id', supplierId).maybeSingle()
        : await query.maybeSingle();

      if (error) {
        console.error('Error fetching supplier:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getSupplier:', error);
      return null;
    }
  },

  async getAllSuppliers(): Promise<Supplier[]> {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching suppliers:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllSuppliers:', error);
      return [];
    }
  },

  async createSupplier(supplier: {
    name: string;
    email: string;
    commission_rate?: number;
  }): Promise<Supplier | null> {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert({
          name: supplier.name,
          email: supplier.email,
          commission_rate: supplier.commission_rate || 2.00,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating supplier:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in createSupplier:', error);
      throw error;
    }
  },

  async updateSupplier(
    supplierId: string,
    updates: Partial<Omit<Supplier, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Supplier | null> {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .update(updates)
        .eq('id', supplierId)
        .select()
        .single();

      if (error) {
        console.error('Error updating supplier:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in updateSupplier:', error);
      throw error;
    }
  },

  async onboardSupplier(
    supplierId: string,
    returnUrl: string,
    refreshUrl: string
  ): Promise<{ url: string }> {
    try {
      const { data: session } = await supabase.auth.getSession();

      if (!session.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-connect/onboard-supplier`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            supplierId,
            returnUrl,
            refreshUrl,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create onboarding link');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error in onboardSupplier:', error);
      throw error;
    }
  },

  async getAccountStatus(supplierId: string): Promise<{
    onboardingComplete: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
  }> {
    try {
      const { data: session } = await supabase.auth.getSession();

      if (!session.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-connect/account-status?supplierId=${supplierId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch account status');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error in getAccountStatus:', error);
      throw error;
    }
  },

  async createPaymentIntent(params: {
    productId: string;
    amount: number;
    currency?: string;
    metadata?: Record<string, string>;
  }): Promise<{ clientSecret: string; paymentIntentId: string }> {
    try {
      const { data: session } = await supabase.auth.getSession();

      if (!session.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-connect/create-payment-intent`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create payment intent');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error in createPaymentIntent:', error);
      throw error;
    }
  },

  async getTransactions(filters?: {
    userId?: string;
    supplierId?: string;
    status?: string;
  }): Promise<MarketplaceTransaction[]> {
    try {
      let query = supabase
        .from('marketplace_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters?.supplierId) {
        query = query.eq('supplier_id', filters.supplierId);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTransactions:', error);
      return [];
    }
  },

  async getTransaction(transactionId: string): Promise<MarketplaceTransaction | null> {
    try {
      const { data, error } = await supabase
        .from('marketplace_transactions')
        .select('*')
        .eq('id', transactionId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching transaction:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getTransaction:', error);
      return null;
    }
  },
};
