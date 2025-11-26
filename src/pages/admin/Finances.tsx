import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { DollarSign, TrendingUp, Users, CreditCard, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import { toast } from 'sonner';

interface FinanceMetrics {
  totalRevenue: number;
  totalPlatformFees: number;
  wireTransferFees: number;
  stripeTransferFees: number;
  totalTransactions: number;
  activeUsers: number;
  averageTransactionValue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  revenueGrowth: number;
}

interface Transaction {
  id: string;
  user_id: string;
  payment_method: string;
  amount: number;
  platform_fee: number;
  supplier_amount: number;
  status: string;
  created_at: string;
  user_profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

type TimeRange = '7d' | '30d' | 'month' | 'year' | 'all';

export default function AdminFinances() {
  const [metrics, setMetrics] = useState<FinanceMetrics | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  useEffect(() => {
    loadFinanceData();
  }, [timeRange]);

  const getDateRange = () => {
    const now = new Date();
    switch (timeRange) {
      case '7d':
        return { start: subDays(now, 7), end: now };
      case '30d':
        return { start: subDays(now, 30), end: now };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'year':
        return { start: startOfYear(now), end: now };
      case 'all':
        return { start: new Date(0), end: now };
      default:
        return { start: subDays(now, 30), end: now };
    }
  };

  const loadFinanceData = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange();

      // Fetch payment intents with platform fees
      const { data: payments, error: paymentsError } = await supabase
        .from('payment_intents')
        .select(`
          id,
          user_id,
          payment_method,
          amount,
          platform_fee,
          supplier_amount,
          status,
          created_at,
          user_profiles!payment_intents_user_id_fkey (
            first_name,
            last_name,
            email
          )
        `)
        .eq('status', 'succeeded')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Calculate metrics
      const totalPlatformFees = payments?.reduce((sum, p) => sum + Number(p.platform_fee), 0) || 0;
      const wireTransferFees = payments?.filter(p => p.payment_method === 'wire').reduce((sum, p) => sum + Number(p.platform_fee), 0) || 0;
      const stripeTransferFees = payments?.filter(p => p.payment_method === 'stripe').reduce((sum, p) => sum + Number(p.platform_fee), 0) || 0;
      const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const totalTransactions = payments?.length || 0;
      const uniqueUsers = new Set(payments?.map(p => p.user_id)).size;
      const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

      // Get monthly revenue for current month
      const monthStart = startOfMonth(new Date());
      const monthEnd = endOfMonth(new Date());
      const { data: monthlyPayments } = await supabase
        .from('payment_intents')
        .select('platform_fee')
        .eq('status', 'succeeded')
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString());

      const monthlyRevenue = monthlyPayments?.reduce((sum, p) => sum + Number(p.platform_fee), 0) || 0;

      // Get yearly revenue
      const yearStart = startOfYear(new Date());
      const { data: yearlyPayments } = await supabase
        .from('payment_intents')
        .select('platform_fee')
        .eq('status', 'succeeded')
        .gte('created_at', yearStart.toISOString());

      const yearlyRevenue = yearlyPayments?.reduce((sum, p) => sum + Number(p.platform_fee), 0) || 0;

      // Calculate revenue growth (comparing to previous period)
      const previousStart = new Date(start);
      previousStart.setTime(previousStart.getTime() - (end.getTime() - start.getTime()));
      const { data: previousPayments } = await supabase
        .from('payment_intents')
        .select('platform_fee')
        .eq('status', 'succeeded')
        .gte('created_at', previousStart.toISOString())
        .lt('created_at', start.toISOString());

      const previousRevenue = previousPayments?.reduce((sum, p) => sum + Number(p.platform_fee), 0) || 0;
      const revenueGrowth = previousRevenue > 0
        ? ((totalPlatformFees - previousRevenue) / previousRevenue) * 100
        : 0;

      setMetrics({
        totalRevenue,
        totalPlatformFees,
        wireTransferFees,
        stripeTransferFees,
        totalTransactions,
        activeUsers: uniqueUsers,
        averageTransactionValue,
        monthlyRevenue,
        yearlyRevenue,
        revenueGrowth
      });

      setRecentTransactions(payments?.slice(0, 10) || []);
    } catch (error) {
      console.error('Error loading finance data:', error);
      toast.error('Failed to load finance data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Business Finances</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Platform revenue and business health metrics
          </p>
        </div>

        <div className="flex gap-2">
          {[
            { value: '7d', label: '7 Days' },
            { value: '30d', label: '30 Days' },
            { value: 'month', label: 'This Month' },
            { value: 'year', label: 'This Year' },
            { value: 'all', label: 'All Time' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setTimeRange(option.value as TimeRange)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                timeRange === option.value
                  ? 'bg-gray-900 text-white dark:bg-gray-600'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className={`flex items-center gap-1 text-sm font-medium ${
              metrics?.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {metrics?.revenueGrowth >= 0 ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              {formatPercentage(metrics?.revenueGrowth || 0)}
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Platform Fees</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(metrics?.totalPlatformFees || 0)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Wire Transfer Fees (3%)</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(metrics?.wireTransferFees || 0)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Stripe: {formatCurrency(metrics?.stripeTransferFees || 0)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Transactions</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {metrics?.totalTransactions || 0}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Avg: {formatCurrency(metrics?.averageTransactionValue || 0)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active Users</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {metrics?.activeUsers || 0}
          </p>
        </div>
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <p className="text-sm font-medium text-blue-900 dark:text-blue-300">This Month</p>
          </div>
          <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
            {formatCurrency(metrics?.monthlyRevenue || 0)}
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">Platform fees earned</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-sm font-medium text-green-900 dark:text-green-300">This Year</p>
          </div>
          <p className="text-3xl font-bold text-green-900 dark:text-green-100">
            {formatCurrency(metrics?.yearlyRevenue || 0)}
          </p>
          <p className="text-xs text-green-700 dark:text-green-400 mt-2">Year-to-date revenue</p>
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <DollarSign className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <p className="text-sm font-medium text-gray-900 dark:text-gray-300">Total Volume</p>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(metrics?.totalRevenue || 0)}
          </p>
          <p className="text-xs text-gray-700 dark:text-gray-400 mt-2">Gross transaction value</p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Latest platform fee collections
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Platform Fee (3%)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Supplier Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No transactions found for this period
                  </td>
                </tr>
              ) : (
                recentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {format(new Date(transaction.created_at), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {transaction.user_profiles?.first_name && transaction.user_profiles?.last_name
                        ? `${transaction.user_profiles.first_name} ${transaction.user_profiles.last_name}`
                        : transaction.user_profiles?.email || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        transaction.payment_method === 'wire'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      }`}>
                        {transaction.payment_method === 'wire' ? 'Wire Transfer' : 'Stripe'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(Number(transaction.amount))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(Number(transaction.platform_fee))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {formatCurrency(Number(transaction.supplier_amount))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
