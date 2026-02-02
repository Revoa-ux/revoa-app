import { supabase } from './supabase';

export interface BalanceAccount {
  id: string;
  user_id: string;
  current_balance: number;
  currency: string;
  last_transaction_at: string;
  created_at: string;
  updated_at: string;
}

export interface BalanceTransaction {
  id: string;
  user_id: string;
  type: 'order_charge' | 'payment' | 'refund' | 'adjustment' | 'cancellation';
  amount: number;
  balance_after: number;
  description: string;
  reference_type?: 'order' | 'invoice' | 'payment_intent' | 'manual';
  reference_id?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface OrderLineItem {
  id: string;
  user_id: string;
  shopify_order_id: string;
  product_id?: string;
  product_name: string;
  variant_name?: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  fulfillment_status: 'pending' | 'fulfilled' | 'cancelled';
  cancelled_at?: string;
  fulfilled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  invoice_number?: string;
  user_id: string;
  supplier_id?: string;
  total_amount?: number;
  amount?: number;
  status: 'unpaid' | 'pending' | 'paid' | 'overdue' | 'partially_paid' | 'cancelled';
  due_date?: string;
  paid_at?: string;
  payment_method?: 'stripe' | 'wire';
  file_url?: string;
  wise_pay_link?: string;
  notes?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  amount_received?: number;
  remaining_amount?: number;
  payment_reference?: string;
  balance_credit_applied?: number;
  invoice_type?: 'auto_generated' | 'purchase_order' | 'manual';
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  order_line_item_id?: string;
  shopify_order_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface PaymentIntent {
  id: string;
  user_id: string;
  supplier_id?: string;
  payment_method: 'stripe' | 'wire';
  amount: number;
  platform_fee: number;
  supplier_amount: number;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
  stripe_payment_intent_id?: string;
  wire_reference_number?: string;
  invoice_ids?: string[];
  confirmed_by_admin_id?: string;
  confirmed_at?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface COGSProjection {
  period: '7d' | '14d' | '30d';
  total: number;
  percentageChange: number;
}

export const balanceService = {
  /**
   * Get the current user's balance account
   */
  async getBalanceAccount(): Promise<BalanceAccount | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('balance_accounts')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching balance account:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getBalanceAccount:', error);
      return null;
    }
  },

  /**
   * Get balance account for a specific user (admin use)
   */
  async getBalanceAccountByUserId(userId: string): Promise<BalanceAccount | null> {
    try {
      const { data, error } = await supabase
        .from('balance_accounts')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching balance account:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getBalanceAccountByUserId:', error);
      return null;
    }
  },

  /**
   * Get balance transactions for the current user
   */
  async getTransactions(limit = 50): Promise<BalanceTransaction[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('balance_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

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

  /**
   * Get balance transactions for a specific user (admin use)
   */
  async getTransactionsByUserId(userId: string, limit = 50): Promise<BalanceTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('balance_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTransactionsByUserId:', error);
      return [];
    }
  },

  /**
   * Get invoices for the current user
   */
  async getInvoices(): Promise<Invoice[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching invoices:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getInvoices:', error);
      return [];
    }
  },

  /**
   * Get invoices for a specific user (admin use)
   */
  async getInvoicesByUserId(userId: string): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching invoices:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getInvoicesByUserId:', error);
      return [];
    }
  },

  /**
   * Get comprehensive merchant financial data (admin use)
   */
  async getMerchantFinancials(userId: string): Promise<{
    balanceAccount: BalanceAccount | null;
    transactions: BalanceTransaction[];
    invoices: Invoice[];
    stats: {
      totalOutstanding: number;
      paidThisMonth: number;
      totalCredits: number;
      totalDebits: number;
    };
  }> {
    try {
      const [balanceAccount, transactions, invoices] = await Promise.all([
        this.getBalanceAccountByUserId(userId),
        this.getTransactionsByUserId(userId, 100),
        this.getInvoicesByUserId(userId)
      ]);

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      let totalOutstanding = 0;
      let paidThisMonth = 0;

      invoices.forEach(inv => {
        const amount = inv.total_amount || inv.amount || 0;
        if (['pending', 'unpaid', 'overdue', 'partially_paid'].includes(inv.status)) {
          if (inv.status === 'partially_paid') {
            totalOutstanding += (inv.remaining_amount || 0);
          } else {
            totalOutstanding += amount;
          }
        }
        if (inv.status === 'paid' && inv.paid_at) {
          const paidDate = new Date(inv.paid_at);
          if (paidDate >= firstDayOfMonth) {
            paidThisMonth += amount;
          }
        }
      });

      let totalCredits = 0;
      let totalDebits = 0;

      transactions.forEach(tx => {
        if (tx.amount > 0) {
          totalCredits += tx.amount;
        } else {
          totalDebits += Math.abs(tx.amount);
        }
      });

      return {
        balanceAccount,
        transactions,
        invoices,
        stats: {
          totalOutstanding,
          paidThisMonth,
          totalCredits,
          totalDebits
        }
      };
    } catch (error) {
      console.error('Error in getMerchantFinancials:', error);
      return {
        balanceAccount: null,
        transactions: [],
        invoices: [],
        stats: {
          totalOutstanding: 0,
          paidThisMonth: 0,
          totalCredits: 0,
          totalDebits: 0
        }
      };
    }
  },

  /**
   * Get invoice line items for a specific invoice
   */
  async getInvoiceLineItems(invoiceId: string): Promise<InvoiceLineItem[]> {
    try {
      const { data, error } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching invoice line items:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getInvoiceLineItems:', error);
      return [];
    }
  },

  /**
   * Get order line items for the current user
   */
  async getOrderLineItems(): Promise<OrderLineItem[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('order_line_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching order line items:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getOrderLineItems:', error);
      return [];
    }
  },

  /**
   * Calculate COGS projections based on recent order history
   */
  async getCOGSProjections(): Promise<Record<'7d' | '14d' | '30d', COGSProjection>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          '7d': { period: '7d', total: 0, percentageChange: 0 },
          '14d': { period: '14d', total: 0, percentageChange: 0 },
          '30d': { period: '30d', total: 0, percentageChange: 0 },
        };
      }

      // Get transactions for the past 60 days to calculate trends
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const { data: transactions, error } = await supabase
        .from('balance_transactions')
        .select('amount, created_at')
        .eq('user_id', user.id)
        .eq('type', 'order_charge')
        .gte('created_at', sixtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error || !transactions) {
        console.error('Error fetching transactions for projections:', error);
        return {
          '7d': { period: '7d', total: 0, percentageChange: 0 },
          '14d': { period: '14d', total: 0, percentageChange: 0 },
          '30d': { period: '30d', total: 0, percentageChange: 0 },
        };
      }

      const now = new Date();

      // Calculate totals for different periods
      const calculatePeriodTotal = (days: number): number => {
        const periodStart = new Date();
        periodStart.setDate(periodStart.getDate() - days);

        return transactions
          .filter(t => new Date(t.created_at) >= periodStart)
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      };

      // Calculate percentage change (compare to previous period)
      const calculateChange = (currentDays: number): number => {
        const currentTotal = calculatePeriodTotal(currentDays);

        const previousPeriodStart = new Date();
        previousPeriodStart.setDate(previousPeriodStart.getDate() - (currentDays * 2));
        const previousPeriodEnd = new Date();
        previousPeriodEnd.setDate(previousPeriodEnd.getDate() - currentDays);

        const previousTotal = transactions
          .filter(t => {
            const date = new Date(t.created_at);
            return date >= previousPeriodStart && date < previousPeriodEnd;
          })
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        if (previousTotal === 0) return 0;
        return ((currentTotal - previousTotal) / previousTotal) * 100;
      };

      return {
        '7d': {
          period: '7d',
          total: calculatePeriodTotal(7),
          percentageChange: calculateChange(7),
        },
        '14d': {
          period: '14d',
          total: calculatePeriodTotal(14),
          percentageChange: calculateChange(14),
        },
        '30d': {
          period: '30d',
          total: calculatePeriodTotal(30),
          percentageChange: calculateChange(30),
        },
      };
    } catch (error) {
      console.error('Error in getCOGSProjections:', error);
      return {
        '7d': { period: '7d', total: 0, percentageChange: 0 },
        '14d': { period: '14d', total: 0, percentageChange: 0 },
        '30d': { period: '30d', total: 0, percentageChange: 0 },
      };
    }
  },

  /**
   * Create a payment intent (Stripe or wire transfer)
   */
  async createPaymentIntent(params: {
    amount: number;
    payment_method: 'stripe' | 'wire';
    invoice_ids?: string[];
  }): Promise<{ clientSecret?: string; paymentIntentId: string } | null> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error('Not authenticated');
      }

      // Call edge function to create payment intent
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/balance-payment`,
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

  /**
   * Cancel an unfulfilled order (credits balance back)
   */
  async cancelOrder(shopifyOrderId: string): Promise<boolean> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-order`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ shopify_order_id: shopifyOrderId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel order');
      }

      return true;
    } catch (error) {
      console.error('Error in cancelOrder:', error);
      throw error;
    }
  },
};
