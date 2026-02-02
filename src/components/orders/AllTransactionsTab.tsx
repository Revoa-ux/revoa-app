import React, { useState, useEffect, useRef } from 'react';
import { FileText, Package, ChevronDown, Check, Eye, Search, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { toast } from '../../lib/toast';
import { Invoice } from '../../lib/invoiceService';
import { useClickOutside } from '../../lib/useClickOutside';
import { FilterButton } from '../FilterButton';
import Modal from '../Modal';

interface AllTransactionsTabProps {
  filteredUserId?: string;
  isSuperAdmin: boolean;
  permissions: any;
  refreshKey: number;
  searchTerm: string;
}

type TransactionType = 'all' | 'invoice' | 'order';

interface Transaction {
  id: string;
  type: 'invoice' | 'order';
  reference: string;
  merchantName: string;
  amount: number;
  status: string;
  date: string;
  rawData: any;
}

export default function AllTransactionsTab({
  filteredUserId,
  isSuperAdmin,
  permissions,
  refreshKey,
  searchTerm
}: AllTransactionsTabProps) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TransactionType>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(typeDropdownRef, () => setShowTypeDropdown(false));
  useClickOutside(statusDropdownRef, () => setShowStatusDropdown(false));

  useEffect(() => {
    loadTransactions();
  }, [user?.id, filteredUserId, refreshKey]);

  const loadTransactions = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      let merchantIds: string[] | null = null;

      if (filteredUserId) {
        merchantIds = [filteredUserId];
      } else if (!isSuperAdmin) {
        const { data: assignments } = await supabase
          .from('user_assignments')
          .select('user_id')
          .eq('admin_id', user.id);

        if (assignments && assignments.length > 0) {
          merchantIds = assignments.map(a => a.user_id);
        } else {
          setTransactions([]);
          setLoading(false);
          return;
        }
      }

      let invoiceQuery = supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      let orderQuery = supabase
        .from('shopify_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (merchantIds) {
        invoiceQuery = invoiceQuery.in('user_id', merchantIds);
        orderQuery = orderQuery.in('user_id', merchantIds);
      }

      const [invoicesResult, ordersResult] = await Promise.all([
        invoiceQuery,
        orderQuery
      ]);

      const allUserIds = new Set<string>();
      invoicesResult.data?.forEach(inv => allUserIds.add(inv.user_id));
      ordersResult.data?.forEach(ord => allUserIds.add(ord.user_id));

      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, email, first_name, last_name, company')
        .in('id', Array.from(allUserIds));

      const profileMap = new Map(
        profiles?.map(p => [
          p.id,
          p.company || `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email
        ])
      );

      const invoiceTransactions: Transaction[] = (invoicesResult.data || []).map(inv => ({
        id: inv.id,
        type: 'invoice' as const,
        reference: inv.invoice_number || `INV-${inv.id.slice(0, 8)}`,
        merchantName: profileMap.get(inv.user_id) || 'Unknown',
        amount: inv.total_amount || inv.amount,
        status: inv.status,
        date: inv.created_at,
        rawData: inv
      }));

      const orderTransactions: Transaction[] = (ordersResult.data || []).map(ord => ({
        id: ord.id,
        type: 'order' as const,
        reference: `#${ord.order_number}`,
        merchantName: profileMap.get(ord.user_id) || 'Unknown',
        amount: ord.total_price || 0,
        status: ord.fulfillment_status || 'unfulfilled',
        date: ord.created_at,
        rawData: ord
      }));

      const combined = [...invoiceTransactions, ...orderTransactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setTransactions(combined);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string, type: string) => {
    if (type === 'invoice') {
      switch (status) {
        case 'paid':
          return 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400';
        case 'overdue':
          return 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400';
        case 'pending':
        case 'unpaid':
          return 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
        default:
          return 'bg-gray-50 text-gray-700 dark:bg-dark/20 dark:text-gray-400';
      }
    } else {
      switch (status?.toLowerCase()) {
        case 'fulfilled':
          return 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400';
        case 'unfulfilled':
        case null:
          return 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
        case 'partially_fulfilled':
          return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
        default:
          return 'bg-gray-50 text-gray-700 dark:bg-dark/20 dark:text-gray-400';
      }
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        t.reference.toLowerCase().includes(term) ||
        t.merchantName.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const uniqueStatuses = [...new Set(transactions.map(t => t.status))].filter(Boolean);

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        Loading transactions...
      </div>
    );
  }

  return (
    <>
      <div className="px-4 py-3 border-b border-gray-200 dark:border-[#333333]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative" ref={typeDropdownRef}>
            <FilterButton
              icon={Package}
              label="Type"
              selectedLabel={typeFilter === 'all' ? 'All' : typeFilter === 'invoice' ? 'Invoices' : 'Orders'}
              onClick={() => setShowTypeDropdown(!showTypeDropdown)}
              isActive={typeFilter !== 'all'}
              activeCount={typeFilter !== 'all' ? 1 : 0}
              hideLabel="md"
              isOpen={showTypeDropdown}
            />
            {showTypeDropdown && (
              <div className="absolute left-0 z-50 w-40 mt-2 bg-white dark:bg-dark rounded-lg shadow-lg border border-gray-200 dark:border-[#333333] overflow-hidden">
                {[
                  { value: 'all', label: 'All Types' },
                  { value: 'invoice', label: 'Invoices' },
                  { value: 'order', label: 'Orders' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setTypeFilter(option.value as TransactionType);
                      setShowTypeDropdown(false);
                    }}
                    className={`flex items-center justify-between w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-[#2a2a2a]/50 transition-colors ${
                      typeFilter === option.value ? 'bg-gray-50 dark:bg-[#2a2a2a]/50' : ''
                    }`}
                  >
                    <span className="text-gray-900 dark:text-white">{option.label}</span>
                    {typeFilter === option.value && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative" ref={statusDropdownRef}>
            <FilterButton
              icon={FileText}
              label="Status"
              selectedLabel={statusFilter === 'all' ? 'All' : statusFilter}
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              isActive={statusFilter !== 'all'}
              activeCount={statusFilter !== 'all' ? 1 : 0}
              hideLabel="md"
              isOpen={showStatusDropdown}
            />
            {showStatusDropdown && (
              <div className="absolute left-0 z-50 w-48 mt-2 bg-white dark:bg-dark rounded-lg shadow-lg border border-gray-200 dark:border-[#333333] overflow-hidden max-h-64 overflow-y-auto">
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setShowStatusDropdown(false);
                  }}
                  className={`flex items-center justify-between w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-[#2a2a2a]/50 transition-colors ${
                    statusFilter === 'all' ? 'bg-gray-50 dark:bg-[#2a2a2a]/50' : ''
                  }`}
                >
                  <span className="text-gray-900 dark:text-white">All Statuses</span>
                  {statusFilter === 'all' && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                </button>
                {uniqueStatuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      setShowStatusDropdown(false);
                    }}
                    className={`flex items-center justify-between w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-[#2a2a2a]/50 transition-colors capitalize ${
                      statusFilter === status ? 'bg-gray-50 dark:bg-[#2a2a2a]/50' : ''
                    }`}
                  >
                    <span className="text-gray-900 dark:text-white">{status}</span>
                    {statusFilter === status && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
            {filteredTransactions.length} transactions
          </div>
        </div>
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No transactions found
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-dark/50 border-b border-gray-200 dark:border-[#333333]">
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 w-24">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Reference</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Merchant</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Date</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 w-16">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-[#333333]">
              {filteredTransactions.map((transaction) => (
                <tr
                  key={`${transaction.type}-${transaction.id}`}
                  className="hover:bg-gray-50 dark:hover:bg-[#2a2a2a]/50"
                >
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700 dark:bg-dark dark:text-gray-300">
                      {transaction.type === 'invoice' ? (
                        <FileText className="w-3 h-3" />
                      ) : (
                        <Package className="w-3 h-3" />
                      )}
                      {transaction.type === 'invoice' ? 'Invoice' : 'Order'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {transaction.reference}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {transaction.merchantName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      ${transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs capitalize ${getStatusColor(transaction.status, transaction.type)}`}>
                      {transaction.status || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {format(new Date(transaction.date), 'MMM dd, yyyy')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => {
                        setSelectedTransaction(transaction);
                        setShowDetailModal(true);
                      }}
                      className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showDetailModal && selectedTransaction && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title={`${selectedTransaction.type === 'invoice' ? 'Invoice' : 'Order'} Details`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Reference</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">
                  {selectedTransaction.reference}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Merchant</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">
                  {selectedTransaction.merchantName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Amount</p>
                <p className="text-base font-semibold text-gray-900 dark:text-white">
                  ${selectedTransaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs capitalize ${getStatusColor(selectedTransaction.status, selectedTransaction.type)}`}>
                  {selectedTransaction.status || 'Unknown'}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">
                  {format(new Date(selectedTransaction.date), 'MMM dd, yyyy h:mm a')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Type</p>
                <p className="text-base font-medium text-gray-900 dark:text-white capitalize">
                  {selectedTransaction.type}
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
