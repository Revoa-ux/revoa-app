import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Filter,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { toast } from '../../lib/toast';
import { stripeConnectService, MarketplaceTransaction } from '@/lib/stripeConnect';

export default function Transactions() {
  const [transactions, setTransactions] = useState<MarketplaceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadTransactions();
  }, [statusFilter]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const filters = statusFilter !== 'all' ? { status: statusFilter } : undefined;
      const data = await stripeConnectService.getTransactions(filters);
      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Succeeded
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <RefreshCw className="w-3 h-3 mr-1" />
            Processing
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </span>
        );
      case 'refunded':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800 dark:bg-[#3a3a3a] dark:text-gray-300">
            <RefreshCw className="w-3 h-3 mr-1" />
            Refunded
          </span>
        );
      default:
        return null;
    }
  };

  const calculateStats = () => {
    const total = transactions.reduce((sum, t) => sum + parseFloat(t.total_amount.toString()), 0);
    const platformFees = transactions.reduce(
      (sum, t) => sum + parseFloat(t.platform_fee.toString()),
      0
    );
    const supplierPayouts = transactions.reduce(
      (sum, t) => sum + parseFloat(t.supplier_amount.toString()),
      0
    );

    return { total, platformFees, supplierPayouts };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500 dark:text-gray-400">Loading transactions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-normal text-gray-900 dark:text-gray-100 dark:text-white mb-2">
            Transactions
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 flex items-start sm:items-center gap-2">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 sm:mt-0 flex-shrink-0"></span>
            View and manage marketplace transactions
          </p>
        </div>
        <button
          onClick={loadTransactions}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-[#4a4a4a] text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 dark:bg-dark/50 dark:hover:bg-[#3a3a3a] transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a] p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Total Volume</span>
            <DollarSign className="w-5 h-5 text-primary-500" />
          </div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100 dark:text-white">
            ${stats.total.toFixed(2)}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {transactions.length} transactions
          </p>
        </div>

        <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a] p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Platform Fees</span>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100 dark:text-white">
            ${stats.platformFees.toFixed(2)}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {stats.total > 0
              ? ((stats.platformFees / stats.total) * 100).toFixed(1)
              : 0}
            % of total
          </p>
        </div>

        <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a] p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Supplier Payouts</span>
            <Calendar className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100 dark:text-white">
            ${stats.supplierPayouts.toFixed(2)}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {stats.total > 0
              ? ((stats.supplierPayouts / stats.total) * 100).toFixed(1)
              : 0}
            % of total
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a]">
        <div className="p-6 border-b border-gray-200 dark:border-[#3a3a3a]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 dark:text-white">
              Transaction History
            </h2>
            <div className="flex items-center space-x-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark dark:bg-[#3a3a3a] text-sm text-gray-900 dark:text-gray-100 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="succeeded">Succeeded</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 dark:text-white mb-2">
              No transactions yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Transactions will appear here once customers make purchases
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-dark/50 dark:bg-[#3a3a3a]/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Payment Intent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Platform Fee
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Supplier
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-[#3a3a3a]">
                {transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 dark:bg-dark/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 dark:text-white">
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500 dark:text-gray-400">
                      {transaction.stripe_payment_intent_id.slice(0, 20)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(transaction.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100 dark:text-white font-medium">
                      ${parseFloat(transaction.total_amount.toString()).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 dark:text-green-400">
                      ${parseFloat(transaction.platform_fee.toString()).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100 dark:text-white">
                      ${parseFloat(transaction.supplier_amount.toString()).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
