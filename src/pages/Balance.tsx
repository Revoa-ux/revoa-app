import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Bell,
  ChevronDown,
  Check,
  Search,
  Filter,
  X,
  CreditCard,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import { StripeTopUpModal } from '../components/balance/StripeTopUpModal';
import { AutoTopUpModal } from '../components/balance/AutoTopUpModal';
import { BankTransferModal } from '../components/balance/BankTransferModal';  
import { InvoiceTable } from '@/components/balance/InvoiceTable';
import { TransactionTable } from '@/components/balance/TransactionTable';
import { useClickOutside } from '@/lib/useClickOutside';
import { COGSProjection } from '@/components/balance/COGSProjection';
import { balanceService } from '@/lib/balanceService';
import type { BalanceAccount, BalanceTransaction, Invoice as DBInvoice } from '@/lib/balanceService';

interface BankDetails {
  accountHolder: string;
  accountNumber: string;
  routingNumber: string;
  bankName: string;
  swiftCode: string;
}

interface Invoice {
  id: string;
  date: string;
  invoice_number: string;
  product_cost: number;
  shipping_cost: number;
  total_cost: number;
  status: 'paid' | 'unpaid' | 'pending';
  payment_link?: string;
  file_url: string;
}

interface Transaction {
  id: string;
  date: string;
  type: 'payment' | 'refund' | 'adjustment' | 'top_up' | 'order_charge' | 'cancellation';
  amount: number;
  payment_method: string;
  status: string;
  reference?: string;
}

export default function Balance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [expandedPaymentMethod, setExpandedPaymentMethod] = useState<string | null>(null);
  const [showStripeTopUpModal, setShowStripeTopUpModal] = useState(false);
  const [showAutoTopUpModal, setShowAutoTopUpModal] = useState(false);  
  const [searchTerm, setSearchTerm] = useState('');  
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'pending'>('all');  
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<'all' | 'payment' | 'refund' | 'adjustment' | 'top_up' | 'order_charge' | 'cancellation'>('all');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '14d' | '30d'>('7d');
  
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  
  useClickOutside(statusDropdownRef, () => setShowStatusDropdown(false));
  useClickOutside(typeDropdownRef, () => setShowTypeDropdown(false));

  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success === 'true') {
      toast.success('Payment successful!', {
        description: 'Your balance has been topped up.'
      });
      setSearchParams({});
    } else if (canceled === 'true') {
      toast.error('Payment canceled', {
        description: 'Your payment was canceled. No charges were made.'
      });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balanceAccount, setBalanceAccount] = useState<BalanceAccount | null>(null);
  const [cogsProjectionData, setCogsProjectionData] = useState<Record<'7d' | '14d' | '30d', any>>({
    '7d': { period: '7d', total: 0, percentageChange: 0 },
    '14d': { period: '14d', total: 0, percentageChange: 0 },
    '30d': { period: '30d', total: 0, percentageChange: 0 },
  });
  const [loading, setLoading] = useState(true);

  const bankDetails: BankDetails = {
    accountHolder: "Hangzhou Jiaming Yichang Technology",
    accountNumber: "****3545",
    routingNumber: "026073150",
    bankName: "Wise",
    swiftCode: "CMFGUS33"
  };

  // Load balance data
  useEffect(() => {
    loadBalanceData();
  }, []);

  const loadBalanceData = async () => {
    try {
      setLoading(true);

      // Load balance account
      const account = await balanceService.getBalanceAccount();
      setBalanceAccount(account);

      // Load transactions
      const txs = await balanceService.getTransactions(50);
      const formattedTransactions: Transaction[] = txs.map(tx => ({
        id: tx.id,
        date: tx.created_at,
        type: tx.type as Transaction['type'],
        amount: Math.abs(tx.amount),
        payment_method: tx.type === 'payment' ? 'stripe' : '',
        status: 'completed',
        reference: tx.description,
      }));
      setTransactions(formattedTransactions);

      // Load invoices
      const invs = await balanceService.getInvoices();
      const formattedInvoices: Invoice[] = invs.map(inv => ({
        id: inv.id,
        date: inv.created_at,
        invoice_number: inv.invoice_number || `INV-${inv.id.slice(0, 8)}`,
        product_cost: inv.total_amount || inv.amount || 0,
        shipping_cost: 0,
        total_cost: inv.total_amount || inv.amount || 0,
        status: inv.status as Invoice['status'],
        file_url: inv.file_url || '',
      }));
      setInvoices(formattedInvoices);

      // Load COGS projections
      const projections = await balanceService.getCOGSProjections();
      setCogsProjectionData(projections);
    } catch (error) {
      console.error('Error loading balance data:', error);
      toast.error('Failed to load balance data');
    } finally {
      setLoading(false);
    }
  };

  const currentBalance = balanceAccount?.current_balance || 0;
  const projectedExpenses = cogsProjectionData[selectedPeriod]?.total || 0;
  const suggestedBalance = projectedExpenses * 1.5; // 1.5x projected as buffer
  const suggestedTopUp = Math.max(0, suggestedBalance - currentBalance);


  const handleAutoTopUpSave = async (config: { enabled: boolean; threshold: number; amount: number }) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success('Auto top-up settings saved', {
        description: config.enabled
          ? `Will top up $${config.amount.toLocaleString()} when balance falls below $${config.threshold.toLocaleString()}`
          : 'Auto top-up has been disabled'
      });
    } catch (error) {
      toast.error('Failed to save auto top-up settings');
      throw error;
    }
  };

  const handleStripeClick = () => {
    setShowStripeTopUpModal(true);
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.reference?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    
    const matchesType = transactionTypeFilter === 'all' || transaction.type === transactionTypeFilter;
    
    return matchesSearch && matchesType;
  });

  const getStatusLabel = () => {
    switch (statusFilter) {
      case 'all': return 'All';
      case 'paid': return 'Paid';
      case 'unpaid': return 'Unpaid';
      case 'pending': return 'Pending';
      default: return 'All';
    }
  };

  const getTypeLabel = () => {
    switch (transactionTypeFilter) {
      case 'all': return 'All';
      case 'payment': return 'Payment';
      case 'refund': return 'Refund';
      case 'adjustment': return 'Adjustment';
      case 'top_up': return 'Top Up';
      default: return 'All';
    }
  };

  return (
    <div className="w-full max-w-[1050px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
          Payments, Balance & History
        </h1>
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Real-time balance monitoring and management</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-3 sm:mb-4 whitespace-nowrap">Current Balance</h2>
          <div className="flex items-end space-x-2 mb-3 sm:mb-4">
            <span className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white">${currentBalance.toLocaleString()}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">USD</span>
          </div>
          <div className="mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">Suggested Balance</span>
              <span className="font-medium text-gray-900 dark:text-white">${suggestedBalance.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:space-x-3 sm:gap-0">
            <button
              onClick={() => setShowStripeTopUpModal(true)}
              className="flex-1 px-4 py-2 text-sm sm:text-base text-white rounded-lg transition-colors flex items-center justify-center bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 focus:outline-none whitespace-nowrap"
            >
              <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>Manually Top Up</span>
            </button>
            <button
              onClick={() => setShowAutoTopUpModal(true)}
              className="flex-1 px-4 py-2 text-sm sm:text-base bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors flex items-center justify-center focus:outline-none focus:ring-0 whitespace-nowrap"
            >
              <Bell className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>Auto Top-up</span>
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-3 sm:mb-4 whitespace-nowrap">Projected Fulfillment Costs</h2>
          <COGSProjection 
            data={cogsProjectionData} 
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Payment Methods</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Add funds to your balance using Stripe or bank transfer</p>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleStripeClick}
            className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group focus:outline-none"
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-white dark:bg-gray-600 rounded-lg">
                <CreditCard className="w-6 h-6 text-gray-900 dark:text-white" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Pay with Stripe</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Cards, Apple Pay, Google Pay</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setExpandedPaymentMethod('bank')}
            className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group focus:outline-none"
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-white dark:bg-gray-600 rounded-lg">
                <Building2 className="w-6 h-6 text-gray-900 dark:text-white" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Bank Transfer</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Via Wise (1-3 business days)</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white whitespace-nowrap">Invoice History</h2>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-[280px] sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input w-full"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
            <div className="relative flex-1 sm:flex-initial" ref={statusDropdownRef}>
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="filter-button w-full sm:min-w-[180px] rounded-lg"
              >
                <div className="flex items-center min-w-0">
                  <Filter className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                  <span className="truncate">Status: {getStatusLabel()}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </button>
              
              {showStatusDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                  <button
                    onClick={() => {
                      setStatusFilter('all');
                      setShowStatusDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg"
                  >
                    <span>All</span>
                    {statusFilter === 'all' && <Check className="w-4 h-4 text-primary-500" />}
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter('paid');
                      setShowStatusDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <span>Paid</span>
                    {statusFilter === 'paid' && <Check className="w-4 h-4 text-primary-500" />}
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter('unpaid');
                      setShowStatusDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <span>Unpaid</span>
                    {statusFilter === 'unpaid' && <Check className="w-4 h-4 text-primary-500" />}
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter('pending');
                      setShowStatusDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 last:rounded-b-lg"
                  >
                    <span>Pending</span>
                    {statusFilter === 'pending' && <Check className="w-4 h-4 text-primary-500" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="relative overflow-x-auto">
              <table className="w-full whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Invoice</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product Cost</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Shipping Cost</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Cost</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-16 animate-pulse"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <InvoiceTable data={filteredInvoices} />
        )}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 my-8"></div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white whitespace-nowrap">Transaction History</h2>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-[280px] sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input w-full"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
            <div className="relative flex-1 sm:flex-initial" ref={typeDropdownRef}>
              <button
                onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                className="filter-button w-full sm:min-w-[180px] rounded-lg"
              >
                <div className="flex items-center min-w-0">
                  <Filter className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                  <span className="truncate">Type: {getTypeLabel()}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </button>
              
              {showTypeDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                  <button
                    onClick={() => {
                      setTransactionTypeFilter('all');
                      setShowTypeDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg"
                  >
                    <span>All</span>
                    {transactionTypeFilter === 'all' && <Check className="w-4 h-4 text-primary-500" />}
                  </button>
                  <button
                    onClick={() => {
                      setTransactionTypeFilter('payment');
                      setShowTypeDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <span>Payment</span>
                    {transactionTypeFilter === 'payment' && <Check className="w-4 h-4 text-primary-500" />}
                  </button>
                  <button
                    onClick={() => {
                      setTransactionTypeFilter('refund');
                      setShowTypeDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <span>Refund</span>
                    {transactionTypeFilter === 'refund' && <Check className="w-4 h-4 text-primary-500" />}
                  </button>
                  <button
                    onClick={() => {
                      setTransactionTypeFilter('adjustment');
                      setShowTypeDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <span>Adjustment</span>
                    {transactionTypeFilter === 'adjustment' && <Check className="w-4 h-4 text-primary-500" />}
                  </button>
                  <button
                    onClick={() => {
                      setTransactionTypeFilter('top_up');
                      setShowTypeDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <span>Top Up</span>
                    {transactionTypeFilter === 'top_up' && <Check className="w-4 h-4 text-primary-500" />}
                  </button>
                  <button
                    onClick={() => {
                      setTransactionTypeFilter('order_charge');
                      setShowTypeDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <span>Order Charge</span>
                    {transactionTypeFilter === 'order_charge' && <Check className="w-4 h-4 text-primary-500" />}
                  </button>
                  <button
                    onClick={() => {
                      setTransactionTypeFilter('cancellation');
                      setShowTypeDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 last:rounded-b-lg"
                  >
                    <span>Cancellation</span>
                    {transactionTypeFilter === 'cancellation' && <Check className="w-4 h-4 text-primary-500" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="relative overflow-x-auto">
              <table className="w-full whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment Method</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-16 animate-pulse"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <TransactionTable data={filteredTransactions} />
        )}
      </div>

      {showStripeTopUpModal && (
        <StripeTopUpModal
          onClose={() => setShowStripeTopUpModal(false)}
        />
      )}

      {showAutoTopUpModal && (
        <AutoTopUpModal
          onClose={() => setShowAutoTopUpModal(false)}
          onSave={handleAutoTopUpSave}
        />
      )}

      {expandedPaymentMethod === 'bank' && (
        <BankTransferModal
          onClose={() => setExpandedPaymentMethod(null)}
          bankDetails={bankDetails}
        />
      )}
    </div>
  );
}