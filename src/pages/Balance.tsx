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
import { TopUpModal } from '../components/balance/TopUpModal';
import { AutoTopUpModal } from '../components/balance/AutoTopUpModal';
import { BankTransferModal } from '../components/balance/BankTransferModal';  
import { InvoiceTable } from '@/components/balance/InvoiceTable';
import { TransactionTable } from '@/components/balance/TransactionTable';
import { useClickOutside } from '@/lib/useClickOutside';
import { COGSProjection } from '@/components/balance/COGSProjection';

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
  type: 'payment' | 'refund' | 'adjustment' | 'top_up';
  amount: number;
  payment_method: string;
  status: string;
  reference?: string;
}

export default function Balance() {
  const [expandedPaymentMethod, setExpandedPaymentMethod] = useState<string | null>(null);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showAutoTopUpModal, setShowAutoTopUpModal] = useState(false);  
  const [searchTerm, setSearchTerm] = useState('');  
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'pending'>('all');  
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<'all' | 'payment' | 'refund' | 'adjustment' | 'top_up'>('all');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '14d' | '30d'>('7d');
  
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  
  useClickOutside(statusDropdownRef, () => setShowStatusDropdown(false));
  useClickOutside(typeDropdownRef, () => setShowTypeDropdown(false));

  const [invoices, setInvoices] = useState<Invoice[]>([  
    {
      id: '1',
      date: '2024-03-15',
      invoice_number: 'INV-001',
      product_cost: 1800,
      shipping_cost: 250,
      total_cost: 2050,
      status: 'pending',
      payment_link: 'https://wise.com/pay/r/ABC123',
      file_url: '#'
    },
    {
      id: '2',
      date: '2024-03-10',
      invoice_number: 'INV-002',
      product_cost: 1200,
      shipping_cost: 180,
      total_cost: 1380,
      status: 'paid',
      file_url: '#'
    },
    {
      id: '3',
      date: '2024-03-05',
      invoice_number: 'INV-003',
      product_cost: 2500,
      shipping_cost: 320,
      total_cost: 2820,
      status: 'unpaid',
      payment_link: 'https://wise.com/pay/r/XYZ789',
      file_url: '#'
    }
  ]);

  const [transactions, setTransactions] = useState<Transaction[]>([  
    {
      id: '1',
      date: '2024-03-15',
      type: 'payment',
      amount: 2050,
      payment_method: 'bank_transfer',
      status: 'pending',
      reference: 'INV-001'
    },
    {
      id: '2',
      date: '2024-03-10',
      type: 'payment',
      amount: 1380,
      payment_method: 'card',
      status: 'completed',
      reference: 'INV-002'
    },
    {
      id: '3',
      date: '2024-03-05',
      type: 'payment',
      amount: 2820,
      payment_method: 'bank_transfer',
      status: 'pending',
      reference: 'INV-003'
    },
    {
      id: '4',
      date: '2024-03-01',
      type: 'top_up',
      amount: 10000,
      payment_method: 'card',
      status: 'completed',
      reference: 'TOP-001'
    },
    {
      id: '5',
      date: '2024-02-25',
      type: 'top_up',
      amount: 5000,
      payment_method: 'paypal',
      status: 'completed',
      reference: 'TOP-002'
    }
  ]);

  const bankDetails: BankDetails = {
    accountHolder: "Hangzhou Jiaming Yichang Technology",
    accountNumber: "****3545",
    routingNumber: "026073150",
    bankName: "Wise",
    swiftCode: "CMFGUS33"
  };

  const currentBalance = 24892; // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const projectedExpenses = 29475;  
  const suggestedBalance = 126322.50; // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const suggestedTopUp = suggestedBalance - currentBalance;

  const cogsProjectionData = {
    '7d': {
      period: '7d',
      total: 29475,
      percentageChange: 8.5
    },
    '14d': {
      period: '14d',
      total: 58950,
      percentageChange: 7.2
    },
    '30d': {
      period: '30d',
      total: 126322,
      percentageChange: 5.8
    }
  };

  const handleTopUp = async (amount: number, method: string) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Balance topped up successfully', {
        description: `Added $${amount.toLocaleString()} via ${method.replace('_', ' ')}`
      });
    } catch (error) {
      toast.error('Failed to top up balance');
      throw error;
    }
  };

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

  const handlePaymentMethodClick = () => {
    setShowTopUpModal(true);
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
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
          Balance Management
        </h1>
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Real-time balance monitoring and management</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Current Balance</h2>
          <div className="flex items-end space-x-2 mb-4">
            <span className="text-3xl font-semibold text-gray-900 dark:text-white">${currentBalance.toLocaleString()}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">USD</span>
          </div>
          <div className="mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Suggested Balance</span>
              <span className="font-medium text-gray-900 dark:text-white">${suggestedBalance.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowTopUpModal(true)}
              className="flex-1 px-4 py-2 text-white rounded-lg transition-colors flex items-center justify-center bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 focus:outline-none"
            >
              <Plus className="w-4 h-4 mr-2" />
              Manually Top Up
            </button>
            <button
              onClick={() => setShowAutoTopUpModal(true)}
              className="flex-1 px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors flex items-center justify-center focus:outline-none"
            >
              <Bell className="w-4 h-4 mr-2" />
              Auto Top-up
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Projected Fulfillment Costs</h2>
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
            onClick={handlePaymentMethodClick}
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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Invoice History</h2>
          <div className="flex items-center space-x-4">
            <div className="relative w-[280px]">
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
            <div className="relative" ref={statusDropdownRef}>
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="filter-button min-w-[180px] rounded-lg"
              >
                <div className="flex items-center">
                  <Filter className="w-4 h-4 text-gray-400 mr-2" />
                  <span>Status: {getStatusLabel()}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              
              {showStatusDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  <button
                    onClick={() => {
                      setStatusFilter('all');
                      setShowStatusDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <span>Pending</span>
                    {statusFilter === 'pending' && <Check className="w-4 h-4 text-primary-500" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <InvoiceTable data={filteredInvoices} />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Transaction History</h2>
          <div className="flex items-center space-x-4">
            <div className="relative w-[280px]">
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
            <div className="relative" ref={typeDropdownRef}>
              <button
                onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                className="filter-button min-w-[180px] rounded-lg"
              >
                <div className="flex items-center">
                  <Filter className="w-4 h-4 text-gray-400 mr-2" />
                  <span>Type: {getTypeLabel()}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              
              {showTypeDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  <button
                    onClick={() => {
                      setTransactionTypeFilter('all');
                      setShowTypeDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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
                </div>
              )}
            </div>
          </div>
        </div>
        <TransactionTable data={filteredTransactions} />
      </div>

      {showTopUpModal && (
        <TopUpModal
          onClose={() => setShowTopUpModal(false)}
          onTopUp={handleTopUp}
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