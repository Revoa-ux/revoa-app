import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Filter, Check, TrendingUp, TrendingDown, DollarSign, Clock, AlertCircle, ArrowLeft } from 'lucide-react';
import { balanceService, BalanceAccount, BalanceTransaction, Invoice } from '../../lib/balanceService';
import { FilterButton } from '../FilterButton';
import { useClickOutside } from '@/lib/useClickOutside';
import { format } from 'date-fns';
import { toast } from '../../lib/toast';

interface MerchantTransactionsModalProps {
  userId: string;
  merchantName: string;
  merchantEmail?: string;
  onClose: () => void;
}

export default function MerchantTransactionsModal({
  userId,
  merchantName,
  merchantEmail,
  onClose
}: MerchantTransactionsModalProps) {
  const [balanceAccount, setBalanceAccount] = useState<BalanceAccount | null>(null);
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState({
    totalOutstanding: 0,
    paidThisMonth: 0,
    totalCredits: 0,
    totalDebits: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'pending' | 'partially_paid'>('all');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<'all' | 'payment' | 'refund' | 'adjustment' | 'order_charge' | 'cancellation'>('all');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(statusDropdownRef, () => setShowStatusDropdown(false));
  useClickOutside(typeDropdownRef, () => setShowTypeDropdown(false));

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await balanceService.getMerchantFinancials(userId);
      setBalanceAccount(data.balanceAccount);
      setTransactions(data.transactions);
      setInvoices(data.invoices);
      setStats(data.stats);
    } catch (error) {
      console.error('Error loading merchant financials:', error);
      toast.error('Failed to load merchant data');
    } finally {
      setLoading(false);
    }
  };

  const currentBalance = balanceAccount?.current_balance || 0;

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch =
      (invoice.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch =
      (transaction.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = transactionTypeFilter === 'all' || transaction.type === transactionTypeFilter;
    return matchesSearch && matchesType;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400';
      case 'overdue':
        return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400';
      case 'partially_paid':
        return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400';
      default:
        return 'bg-gray-100 dark:bg-[#3a3a3a] text-gray-700 dark:text-gray-300';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'order_charge':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'refund':
        return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'cancellation':
        return <TrendingUp className="w-4 h-4 text-orange-500" />;
      default:
        return <DollarSign className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="relative w-full max-w-5xl max-h-[90vh] bg-white dark:bg-dark rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#3a3a3a]">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {merchantName} - Balance & Transaction History
            </h2>
            {merchantEmail && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{merchantEmail}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="space-y-6">
              <div className="h-32 bg-gray-100 dark:bg-[#3a3a3a] rounded-xl animate-pulse" />
              <div className="h-64 bg-gray-100 dark:bg-[#3a3a3a] rounded-xl animate-pulse" />
              <div className="h-64 bg-gray-100 dark:bg-[#3a3a3a] rounded-xl animate-pulse" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative overflow-hidden p-4 rounded-xl border border-gray-200/60 dark:border-[#3a3a3a]/60">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-cyan-50/30 dark:from-emerald-900/20 dark:via-teal-900/10 dark:to-cyan-900/5" />
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-200/30 to-transparent dark:from-emerald-700/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                  <div className="relative">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Balance</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      ${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <div className="relative overflow-hidden p-4 rounded-xl border border-gray-200/60 dark:border-[#3a3a3a]/60">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50/50 to-yellow-50/30 dark:from-amber-900/20 dark:via-orange-900/10 dark:to-yellow-900/5" />
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-200/30 to-transparent dark:from-amber-700/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                  <div className="relative">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Outstanding</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      ${stats.totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <div className="relative overflow-hidden p-4 rounded-xl border border-gray-200/60 dark:border-[#3a3a3a]/60">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-violet-50/30 dark:from-blue-900/20 dark:via-indigo-900/10 dark:to-violet-900/5" />
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-200/30 to-transparent dark:from-blue-700/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                  <div className="relative">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Invoices</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {invoices.length}
                    </p>
                  </div>
                </div>
                <div className="relative overflow-hidden p-4 rounded-xl border border-gray-200/60 dark:border-[#3a3a3a]/60">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-emerald-50/50 to-teal-50/30 dark:from-green-900/20 dark:via-emerald-900/10 dark:to-teal-900/5" />
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-200/30 to-transparent dark:from-green-700/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                  <div className="relative">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Paid</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      ${stats.totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Invoice History</h3>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search invoices..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                    <div className="relative" ref={statusDropdownRef}>
                      <FilterButton
                        icon={Filter}
                        label="Status"
                        selectedLabel={statusFilter === 'all' ? 'All' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                        onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                        isActive={statusFilter !== 'all'}
                        activeCount={statusFilter !== 'all' ? 1 : 0}
                        isOpen={showStatusDropdown}
                      />
                      {showStatusDropdown && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark rounded-lg shadow-lg border border-gray-200 dark:border-[#3a3a3a] overflow-hidden z-50">
                          {['all', 'paid', 'unpaid', 'pending', 'partially_paid'].map((status) => (
                            <button
                              key={status}
                              onClick={() => {
                                setStatusFilter(status as any);
                                setShowStatusDropdown(false);
                              }}
                              className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors"
                            >
                              <span>{status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}</span>
                              {statusFilter === status && <Check className="w-4 h-4 text-rose-500" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-[#3a3a3a]">
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Invoice</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredInvoices.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                              No invoices found
                            </td>
                          </tr>
                        ) : (
                          filteredInvoices.slice(0, 10).map((invoice) => (
                            <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50">
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                {format(new Date(invoice.created_at), 'MMM dd, yyyy')}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                {invoice.invoice_number || `INV-${invoice.id.slice(0, 8)}`}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                                ${(invoice.total_amount || invoice.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(invoice.status)}`}>
                                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1).replace('_', ' ')}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {filteredInvoices.length > 10 && (
                    <div className="px-4 py-3 border-t border-gray-200 dark:border-[#3a3a3a] text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Showing 10 of {filteredInvoices.length} invoices
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Transaction History</h3>
                  <div className="relative" ref={typeDropdownRef}>
                    <FilterButton
                      icon={Filter}
                      label="Type"
                      selectedLabel={transactionTypeFilter === 'all' ? 'All' : transactionTypeFilter.charAt(0).toUpperCase() + transactionTypeFilter.slice(1).replace('_', ' ')}
                      onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                      isActive={transactionTypeFilter !== 'all'}
                      activeCount={transactionTypeFilter !== 'all' ? 1 : 0}
                      isOpen={showTypeDropdown}
                    />
                    {showTypeDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark rounded-lg shadow-lg border border-gray-200 dark:border-[#3a3a3a] overflow-hidden z-50">
                        {['all', 'payment', 'order_charge', 'refund', 'adjustment', 'cancellation'].map((type) => (
                          <button
                            key={type}
                            onClick={() => {
                              setTransactionTypeFilter(type as any);
                              setShowTypeDropdown(false);
                            }}
                            className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors"
                          >
                            <span>{type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}</span>
                            {transactionTypeFilter === type && <Check className="w-4 h-4 text-rose-500" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-[#3a3a3a]">
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredTransactions.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                              No transactions found
                            </td>
                          </tr>
                        ) : (
                          filteredTransactions.slice(0, 15).map((tx) => (
                            <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50">
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                {format(new Date(tx.created_at), 'MMM dd, yyyy')}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {getTransactionIcon(tx.type)}
                                  <span className="text-sm text-gray-900 dark:text-white capitalize">
                                    {tx.type.replace('_', ' ')}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                                {tx.description}
                              </td>
                              <td className={`px-4 py-3 text-sm text-right font-medium ${tx.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {tx.amount >= 0 ? '+' : ''}${Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                                ${tx.balance_after.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {filteredTransactions.length > 15 && (
                    <div className="px-4 py-3 border-t border-gray-200 dark:border-[#3a3a3a] text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Showing 15 of {filteredTransactions.length} transactions
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-[#3a3a3a]/50 px-4 sm:px-6 py-4">
          <div className="flex justify-center">
            <button
              onClick={onClose}
              className="btn btn-secondary"
            >
              <ArrowLeft className="btn-icon btn-icon-back" />
              Close
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
