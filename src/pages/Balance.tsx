import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Plus,
  ChevronDown,
  Check,
  Search,
  Filter,
  X,
  Package,
  ShoppingCart,
  Info
} from 'lucide-react';
import { toast } from '../lib/toast';
import { useSearchParams } from 'react-router-dom';
import { FilterButton } from '@/components/FilterButton';
import { BankTransferModal } from '../components/balance/BankTransferModal';
import { InvoiceTable } from '@/components/balance/InvoiceTable';
import { TransactionTable } from '@/components/balance/TransactionTable';
import { useClickOutside } from '@/lib/useClickOutside';
import { COGSProjection } from '@/components/balance/COGSProjection';
import { balanceService } from '@/lib/balanceService';
import { SubscriptionPageWrapper } from '@/components/subscription/SubscriptionPageWrapper';
import { useIsBlocked } from '@/components/subscription/SubscriptionGate';
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
  wise_pay_link?: string;
  file_url: string;
  invoice_type?: 'auto_generated' | 'purchase_order' | 'manual';
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
  const isBlocked = useIsBlocked();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showBankTransferModal, setShowBankTransferModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'pending'>('all');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState<'all' | 'auto_generated' | 'purchase_order'>('all');
  const [showInvoiceTypeDropdown, setShowInvoiceTypeDropdown] = useState(false);
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<'all' | 'payment' | 'refund' | 'adjustment' | 'top_up' | 'order_charge' | 'cancellation'>('all');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '14d' | '30d'>('7d');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balanceAccount, setBalanceAccount] = useState<BalanceAccount | null>(null);
  const [cogsProjectionData, setCogsProjectionData] = useState<Record<'7d' | '14d' | '30d', any>>({
    '7d': { period: '7d', total: 0, percentageChange: 0 },
    '14d': { period: '14d', total: 0, percentageChange: 0 },
    '30d': { period: '30d', total: 0, percentageChange: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [showInfoBanner, setShowInfoBanner] = useState(true);

  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const invoiceTypeDropdownRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(statusDropdownRef, () => setShowStatusDropdown(false));
  useClickOutside(invoiceTypeDropdownRef, () => setShowInvoiceTypeDropdown(false));
  useClickOutside(typeDropdownRef, () => setShowTypeDropdown(false));

  useEffect(() => {
    if (isBlocked) return;
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
  }, [searchParams, setSearchParams, isBlocked]);

  useEffect(() => {
    if (isBlocked) return;
    loadBalanceData();
  }, [isBlocked]);

  const bankDetails: BankDetails = {
    accountHolder: "Hangzhou Jiaming Yichang Technology",
    accountNumber: "****3545",
    routingNumber: "026073150",
    bankName: "Wise",
    swiftCode: "CMFGUS33"
  };

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
        wise_pay_link: (inv as any).wise_pay_link || undefined,
        invoice_type: (inv.metadata as any)?.invoice_type || (inv as any).invoice_type || 'auto_generated',
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


  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch =
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;

    const matchesType = invoiceTypeFilter === 'all' || invoice.invoice_type === invoiceTypeFilter;

    return matchesSearch && matchesStatus && matchesType;
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

  const getInvoiceTypeLabel = () => {
    switch (invoiceTypeFilter) {
      case 'all': return 'All Types';
      case 'auto_generated': return 'Shopify Orders';
      case 'purchase_order': return 'Purchase Orders';
      default: return 'All Types';
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
    <SubscriptionPageWrapper>
      <Helmet>
        <title>Wallet | Revoa</title>
      </Helmet>
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
            Fulfillment Wallet
          </h1>
          <div className="flex items-start sm:items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 sm:mt-0 flex-shrink-0"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage your prepaid balance for product fulfillment and shipping costs</p>
          </div>
        </div>

        {showInfoBanner && (
          <div className="info-banner info-banner-blue p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                  What is the Fulfillment Wallet?
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                  This balance is used to pay for product costs and shipping when orders are placed through your Shopify store. Funds are automatically deducted as orders are fulfilled by our fulfillment partner.
                </p>
              </div>
              <button
                onClick={() => setShowInfoBanner(false)}
                className="p-1 text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded-lg transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-dark p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-[#3a3a3a]">
          <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-3 sm:mb-4 whitespace-nowrap">Current Balance</h2>
          <div className="flex items-end space-x-2 mb-3 sm:mb-4">
            <span className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white">{isBlocked ? '...' : `$${currentBalance.toLocaleString()}`}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">USD</span>
          </div>
          <div className="mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-gray-100 dark:border-[#3a3a3a]">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">Suggested Balance</span>
              <span className="font-medium text-gray-900 dark:text-white">{isBlocked ? '...' : `$${suggestedBalance.toLocaleString()}`}</span>
            </div>
          </div>
          <button
            onClick={() => setShowBankTransferModal(true)}
            className="btn btn-secondary"
          >
            <Plus className="btn-icon w-4 h-4" />
            Add Balance
          </button>
        </div>

        <div className="bg-white dark:bg-dark p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-[#3a3a3a]">
          <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-3 sm:mb-4 whitespace-nowrap">Projected Fulfillment Costs</h2>
          <COGSProjection
            data={cogsProjectionData}
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
            currentBalance={currentBalance}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white whitespace-nowrap">Invoice History</h2>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-[200px] sm:flex-initial">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
            <div className="relative" ref={invoiceTypeDropdownRef}>
              <FilterButton
                icon={invoiceTypeFilter === 'purchase_order' ? Package : ShoppingCart}
                label="Type"
                selectedLabel={getInvoiceTypeLabel()}
                onClick={() => setShowInvoiceTypeDropdown(!showInvoiceTypeDropdown)}
                isActive={invoiceTypeFilter !== 'all'}
                activeCount={invoiceTypeFilter !== 'all' ? 1 : 0}
                hideLabel="md"
                isOpen={showInvoiceTypeDropdown}
              />

              {showInvoiceTypeDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark rounded-lg shadow-lg border border-gray-200 dark:border-[#3a3a3a] overflow-hidden z-50">
                  <button
                    onClick={() => {
                      setInvoiceTypeFilter('all');
                      setShowInvoiceTypeDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors"
                  >
                    <span>All Types</span>
                    {invoiceTypeFilter === 'all' && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                  </button>
                  <button
                    onClick={() => {
                      setInvoiceTypeFilter('auto_generated');
                      setShowInvoiceTypeDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Shopify Orders
                    </span>
                    {invoiceTypeFilter === 'auto_generated' && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                  </button>
                  <button
                    onClick={() => {
                      setInvoiceTypeFilter('purchase_order');
                      setShowInvoiceTypeDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Package className="w-3.5 h-3.5" />
                      Purchase Orders
                    </span>
                    {invoiceTypeFilter === 'purchase_order' && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                  </button>
                </div>
              )}
            </div>
            <div className="relative" ref={statusDropdownRef}>
              <FilterButton
                icon={Filter}
                label="Status"
                selectedLabel={statusFilter === 'all' ? 'All' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                isActive={statusFilter !== 'all'}
                activeCount={statusFilter !== 'all' ? 1 : 0}
                hideLabel="md"
                isOpen={showStatusDropdown}
              />

              {showStatusDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark rounded-lg shadow-lg border border-gray-200 dark:border-[#3a3a3a] overflow-hidden z-50">
                  <button
                    onClick={() => {
                      setStatusFilter('all');
                      setShowStatusDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors"
                  >
                    <span>All</span>
                    {statusFilter === 'all' && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter('paid');
                      setShowStatusDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors"
                  >
                    <span>Paid</span>
                    {statusFilter === 'paid' && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter('unpaid');
                      setShowStatusDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors"
                  >
                    <span>Unpaid</span>
                    {statusFilter === 'unpaid' && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter('pending');
                      setShowStatusDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors"
                  >
                    <span>Pending</span>
                    {statusFilter === 'pending' && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {loading && !isBlocked ? (
          <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a] overflow-hidden">
            <div className="relative overflow-x-auto">
              <table className="w-full whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-[#3a3a3a]">
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
                    <tr key={i} className="border-b border-gray-200 dark:border-[#3a3a3a]">
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-[#3a3a3a] rounded w-20 animate-pulse"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-[#3a3a3a] rounded w-24 animate-pulse"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-[#3a3a3a] rounded w-16 animate-pulse"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-[#3a3a3a] rounded w-16 animate-pulse"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-[#3a3a3a] rounded w-16 animate-pulse"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-5 bg-gray-200 dark:bg-[#3a3a3a] rounded-full w-16 animate-pulse"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : isBlocked ? (
          <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a] overflow-hidden">
            <div className="relative overflow-x-auto">
              <table className="w-full whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-[#3a3a3a]">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Invoice</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product Cost</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Shipping Cost</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Cost</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(4)].map((_, i) => (
                    <tr key={i} className="border-b border-gray-200 dark:border-[#3a3a3a]">
                      <td className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">...</td>
                      <td className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">...</td>
                      <td className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">...</td>
                      <td className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">...</td>
                      <td className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">...</td>
                      <td className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">...</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <InvoiceTable data={filteredInvoices} onPaymentConfirmed={loadBalanceData} />
        )}
      </div>

      <div className="border-t border-gray-200 dark:border-[#3a3a3a] my-8"></div>

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
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
            <div className="relative flex-1 sm:flex-initial" ref={typeDropdownRef}>
              <FilterButton
                icon={Filter}
                label="Type"
                selectedLabel={getTypeLabel()}
                onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                isActive={transactionTypeFilter !== 'all'}
                activeCount={transactionTypeFilter !== 'all' ? 1 : 0}
                hideLabel="md"
                isOpen={showTypeDropdown}
              />

              {showTypeDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark rounded-lg shadow-lg border border-gray-200 dark:border-[#3a3a3a] overflow-hidden z-50">
                  <button
                    onClick={() => {
                      setTransactionTypeFilter('all');
                      setShowTypeDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors"
                  >
                    <span>All</span>
                    {transactionTypeFilter === 'all' && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                  </button>
                  <button
                    onClick={() => {
                      setTransactionTypeFilter('payment');
                      setShowTypeDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors"
                  >
                    <span>Payment</span>
                    {transactionTypeFilter === 'payment' && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                  </button>
                  <button
                    onClick={() => {
                      setTransactionTypeFilter('refund');
                      setShowTypeDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors"
                  >
                    <span>Refund</span>
                    {transactionTypeFilter === 'refund' && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                  </button>
                  <button
                    onClick={() => {
                      setTransactionTypeFilter('adjustment');
                      setShowTypeDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors"
                  >
                    <span>Adjustment</span>
                    {transactionTypeFilter === 'adjustment' && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                  </button>
                  <button
                    onClick={() => {
                      setTransactionTypeFilter('top_up');
                      setShowTypeDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors"
                  >
                    <span>Top Up</span>
                    {transactionTypeFilter === 'top_up' && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                  </button>
                  <button
                    onClick={() => {
                      setTransactionTypeFilter('order_charge');
                      setShowTypeDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors"
                  >
                    <span>Order Charge</span>
                    {transactionTypeFilter === 'order_charge' && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                  </button>
                  <button
                    onClick={() => {
                      setTransactionTypeFilter('cancellation');
                      setShowTypeDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors"
                  >
                    <span>Cancellation</span>
                    {transactionTypeFilter === 'cancellation' && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {loading && !isBlocked ? (
          <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a] overflow-hidden">
            <div className="relative overflow-x-auto">
              <table className="w-full whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-[#3a3a3a]">
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
                    <tr key={i} className="border-b border-gray-200 dark:border-[#3a3a3a]">
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-[#3a3a3a] rounded w-20 animate-pulse"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-[#3a3a3a] rounded w-16 animate-pulse"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-[#3a3a3a] rounded w-16 animate-pulse"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-[#3a3a3a] rounded w-24 animate-pulse"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-5 bg-gray-200 dark:bg-[#3a3a3a] rounded-full w-16 animate-pulse"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-[#3a3a3a] rounded w-20 animate-pulse"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : isBlocked ? (
          <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a] overflow-hidden">
            <div className="relative overflow-x-auto">
              <table className="w-full whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-[#3a3a3a]">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment Method</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(4)].map((_, i) => (
                    <tr key={i} className="border-b border-gray-200 dark:border-[#3a3a3a]">
                      <td className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">...</td>
                      <td className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">...</td>
                      <td className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">...</td>
                      <td className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">...</td>
                      <td className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">...</td>
                      <td className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">...</td>
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

      {showBankTransferModal && (
        <BankTransferModal
          onClose={() => setShowBankTransferModal(false)}
          bankDetails={bankDetails}
        />
      )}
      </div>
    </SubscriptionPageWrapper>
  );
}
