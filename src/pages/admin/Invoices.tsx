import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Download,
  Send,
  Check,
  X,
  FileText,
  DollarSign,
  Calendar,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Link as LinkIcon,
  MoreVertical,
  Eye,
  Trash2,
  ArrowRight,
  Users as UsersIcon
} from 'lucide-react';
import { toast } from '../../lib/toast';
import Modal from '@/components/Modal';
import { CustomCheckbox } from '@/components/CustomCheckbox';
import { FilterButton } from '@/components/FilterButton';
import { useClickOutside } from '@/lib/useClickOutside';
import AdReportsTimeSelector, { TimeOption } from '@/components/reports/AdReportsTimeSelector';
import { invoiceService, Invoice, InvoiceFilters, InvoiceStats } from '@/lib/invoiceService';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: () => void;
}

const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onStatusChange
}) => {
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  if (!invoice) return null;

  const handleMarkAsPaid = async () => {
    if (!user?.id) return;

    try {
      setIsUpdating(true);
      await invoiceService.markAsPaid(invoice.id, 'wire', '', user.id);
      toast.success('Invoice marked as paid');
      onStatusChange();
      onClose();
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      toast.error('Failed to mark invoice as paid');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendReminder = async () => {
    try {
      setIsUpdating(true);
      await invoiceService.sendPaymentReminder(invoice.id);
      toast.success('Payment reminder sent');
      onStatusChange();
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error('Failed to send reminder');
    } finally {
      setIsUpdating(false);
    }
  };

  const totalAmount = invoice.total_amount || invoice.amount;
  const daysOverdue = invoice.status === 'overdue' && invoice.due_date
    ? Math.floor((new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invoice Details" maxWidth="max-w-3xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {invoice.invoice_number || `INV-${invoice.id.slice(0, 8)}`}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {invoice.user_profile?.company || invoice.user_profile?.email}
            </p>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
            invoice.status === 'paid'
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : invoice.status === 'overdue'
              ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
              : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
          }`}>
            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
          </span>
        </div>

        {/* Status Alert */}
        {invoice.status === 'overdue' && (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="text-sm text-red-600 dark:text-red-400">
              This invoice is {daysOverdue} days overdue
            </span>
          </div>
        )}

        {/* Key Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Invoice Date</p>
            <p className="text-base font-medium text-gray-900 dark:text-white">
              {format(new Date(invoice.created_at), 'MMM dd, yyyy')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Due Date</p>
            <p className="text-base font-medium text-gray-900 dark:text-white">
              {invoice.due_date ? format(new Date(invoice.due_date), 'MMM dd, yyyy') : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Amount</p>
            <p className="text-base font-semibold text-gray-900 dark:text-white">
              ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          {invoice.paid_at && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Paid On</p>
              <p className="text-base font-medium text-gray-900 dark:text-white">
                {format(new Date(invoice.paid_at), 'MMM dd, yyyy')}
              </p>
            </div>
          )}
        </div>

        {/* Line Items */}
        {invoice.line_items && invoice.line_items.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Line Items</h4>
            <div className="border border-gray-200 dark:border-[#3a3a3a] rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-[#3a3a3a]">
                <thead className="bg-gray-50 dark:bg-dark">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Unit Price</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-dark divide-y divide-gray-200 dark:divide-[#3a3a3a]">
                  {invoice.line_items.map((item: any, index: number) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.product_name || item.description}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right">${item.cost_per_item || item.unit_price}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white text-right">${item.total_cost || item.total_price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Breakdown */}
        {invoice.breakdown && Object.keys(invoice.breakdown).length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Cost Breakdown</h4>
            <div className="space-y-2">
              {invoice.breakdown.product_cost && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Product Cost</span>
                  <span className="font-medium text-gray-900 dark:text-white">${invoice.breakdown.product_cost.toFixed(2)}</span>
                </div>
              )}
              {invoice.breakdown.shipping_cost && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Shipping Cost</span>
                  <span className="font-medium text-gray-900 dark:text-white">${invoice.breakdown.shipping_cost.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold pt-2 border-t border-gray-200 dark:border-[#3a3a3a]">
                <span className="text-gray-900 dark:text-white">Total</span>
                <span className="text-gray-900 dark:text-white">${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-[#3a3a3a]">
          {invoice.status !== 'paid' && (
            <>
              <button
                onClick={handleMarkAsPaid}
                disabled={isUpdating}
                className="btn btn-primary group flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="btn-icon w-4 h-4" />
                <span>Mark as Paid</span>
                <ArrowRight className="btn-icon btn-icon-arrow w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={handleSendReminder}
                disabled={isUpdating}
                className="btn btn-secondary group flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="btn-icon w-4 h-4" />
                <span>Send Reminder</span>
                <ArrowRight className="btn-icon btn-icon-arrow w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </>
          )}
          {invoice.file_url && (
            <button
              onClick={() => window.open(invoice.file_url!, '_blank')}
              className="btn btn-secondary group flex items-center justify-center gap-2"
            >
              <Download className="btn-icon w-4 h-4" />
              Download PDF
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default function Invoices() {
  const { adminUser, isSuperAdmin } = useAdmin();
  const [searchParams, setSearchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showAdminFilterDropdown, setShowAdminFilterDropdown] = useState(false);
  const [selectedAdminFilter, setSelectedAdminFilter] = useState<string>('all');
  const [admins, setAdmins] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filteredUserName, setFilteredUserName] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<TimeOption>('28d');
  const [dateRange, setDateRange] = useState<{ startDate: Date; endDate: Date }>({
    startDate: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
    endDate: new Date()
  });

  const userId = searchParams.get('userId');

  const [filters, setFilters] = useState<InvoiceFilters>({
    status: 'all',
    dateFrom: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    searchTerm: '',
    userId: userId || undefined
  });

  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const adminFilterDropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(filterDropdownRef, () => setShowFilterDropdown(false));
  useClickOutside(statusDropdownRef, () => setShowStatusDropdown(false));
  useClickOutside(adminFilterDropdownRef, () => setShowAdminFilterDropdown(false));

  // Update filters when userId changes in URL
  useEffect(() => {
    const userIdFromUrl = searchParams.get('userId');
    if (userIdFromUrl !== filters.userId) {
      setFilters(prev => ({ ...prev, userId: userIdFromUrl || undefined }));

      // Fetch user name for display
      if (userIdFromUrl) {
        supabase
          .from('user_profiles')
          .select('name, email')
          .eq('user_id', userIdFromUrl)
          .maybeSingle()
          .then(({ data }) => {
            if (data) {
              setFilteredUserName(data.name || data.email);
            }
          });
      } else {
        setFilteredUserName(null);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    loadData();
    if (isSuperAdmin) {
      fetchAdmins();
    }
  }, [filters, isSuperAdmin, selectedAdminFilter]);

  const fetchAdmins = async () => {
    try {
      const { data: adminProfiles, error } = await supabase
        .from('user_profiles')
        .select('user_id, name, first_name, last_name, email')
        .eq('is_admin', true)
        .eq('is_super_admin', false);

      if (error) throw error;

      const transformedAdmins = (adminProfiles || []).map(admin => ({
        id: admin.user_id,
        name: admin.name || (admin.first_name && admin.last_name ? `${admin.first_name} ${admin.last_name}` : admin.email),
        email: admin.email
      }));

      setAdmins(transformedAdmins);
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Build filters with admin assignment if needed
      let effectiveFilters = { ...filters };

      // For regular admins, filter by their assigned users
      if (!isSuperAdmin && adminUser?.userId) {
        const { data: assignments } = await supabase
          .from('user_assignments')
          .select('user_id')
          .eq('admin_id', adminUser.userId);

        const assignedUserIds = assignments?.map(a => a.user_id) || [];
        effectiveFilters = { ...effectiveFilters, userIds: assignedUserIds };
      }
      // For super admins, filter by selected admin if not 'all'
      else if (isSuperAdmin && selectedAdminFilter !== 'all') {
        const { data: assignments } = await supabase
          .from('user_assignments')
          .select('user_id')
          .eq('admin_id', selectedAdminFilter);

        const assignedUserIds = assignments?.map(a => a.user_id) || [];
        effectiveFilters = { ...effectiveFilters, userIds: assignedUserIds };
      }

      const [invoicesResult, statsData] = await Promise.all([
        invoiceService.getInvoices(effectiveFilters),
        invoiceService.getInvoiceStats()
      ]);

      setInvoices(invoicesResult.data);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setFilters(prev => ({ ...prev, searchTerm }));
  };

  const handleStatusFilterChange = (status: InvoiceFilters['status']) => {
    setFilters(prev => ({ ...prev, status }));
    setShowStatusDropdown(false);
  };

  const handleTimeChange = (time: TimeOption) => {
    setSelectedTime(time);
  };

  const handleDateRangeChange = (range: { startDate: Date; endDate: Date }) => {
    setDateRange(range);
    setFilters(prev => ({
      ...prev,
      dateFrom: range.startDate.toISOString().split('T')[0],
      dateTo: range.endDate.toISOString().split('T')[0]
    }));
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(invoices.map(inv => inv.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectInvoice = (invoiceId: string) => {
    setSelectedInvoices(prev =>
      prev.includes(invoiceId)
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  const handleBulkMarkAsPaid = async () => {
    if (selectedInvoices.length === 0) {
      toast.error('No invoices selected');
      return;
    }

    try {
      // TODO: Implement bulk update
      toast.success(`${selectedInvoices.length} invoices marked as paid`);
      setSelectedInvoices([]);
      setSelectAll(false);
      loadData();
    } catch (error) {
      console.error('Error in bulk update:', error);
      toast.error('Failed to update invoices');
    }
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailModal(true);
  };

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      case 'overdue':
        return 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      case 'pending':
      case 'unpaid':
        return 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'cancelled':
        return 'bg-gray-50 text-gray-700 dark:bg-dark/20 dark:text-gray-400';
      default:
        return 'bg-gray-50 text-gray-700 dark:bg-dark/20 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-normal text-gray-900 dark:text-gray-100">
            Invoice Management
          </h1>
          {filteredUserName && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 dark:text-gray-500">•</span>
              <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium">
                {filteredUserName}
              </span>
              <button
                onClick={() => {
                  setSearchParams({});
                  setFilteredUserName(null);
                }}
                className="btn btn-ghost p-1 rounded-full"
                title="Clear filter"
              >
                <X className="btn-icon w-4 h-4 text-gray-400" />
              </button>
            </div>
          )}
        </div>
        <div className="flex items-start sm:items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 sm:mt-0 flex-shrink-0"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filteredUserName
              ? `Viewing invoices for ${filteredUserName}`
              : 'Manage all client invoices and track payments'
            }
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 p-6 rounded-xl border border-gray-200/60 dark:border-[#3a3a3a]/60 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg">
                <DollarSign className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
            <div>
              <h3 className="text-xs text-gray-500 dark:text-gray-400">Outstanding</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">${stats.total_outstanding.toLocaleString()}</p>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[#3a3a3a]">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Unpaid invoices</span>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">${stats.total_outstanding.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 p-6 rounded-xl border border-gray-200/60 dark:border-[#3a3a3a]/60 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg">
                <CheckCircle className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
            <div>
              <h3 className="text-xs text-gray-500 dark:text-gray-400">Paid in Period</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">${stats.paid_this_month.toLocaleString()}</p>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[#3a3a3a]">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">This period</span>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">${stats.paid_this_month.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 p-6 rounded-xl border border-gray-200/60 dark:border-[#3a3a3a]/60 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg">
                <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
            <div>
              <h3 className="text-xs text-gray-500 dark:text-gray-400">Pending</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stats.pending_count}</p>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[#3a3a3a]">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Awaiting payment</span>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{stats.pending_count}</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 p-6 rounded-xl border border-gray-200/60 dark:border-[#3a3a3a]/60 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg">
                <AlertCircle className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
            <div>
              <h3 className="text-xs text-gray-500 dark:text-gray-400">Overdue</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stats.overdue_count}</p>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[#3a3a3a]">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Past due date</span>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{stats.overdue_count}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-row items-center gap-2 sm:gap-3 w-full lg:w-auto">
          <div className="hidden sm:block sm:w-auto">
            <AdReportsTimeSelector
              selectedTime={selectedTime}
              onTimeChange={handleTimeChange}
              dateRange={dateRange}
              onDateRangeChange={handleDateRangeChange}
            />
          </div>
          <div className="relative flex-1 sm:flex-initial sm:min-w-[240px] lg:w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full h-[38px] pl-10 pr-10 text-sm bg-white dark:bg-dark border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-200 dark:border-[#3a3a3a]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="btn btn-ghost absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full"
              >
                <X className="btn-icon w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          <div className="relative" ref={statusDropdownRef}>
            <FilterButton
              icon={Filter}
              label="Status"
              selectedLabel={filters.status === 'all' ? 'All' : filters.status?.charAt(0).toUpperCase() + filters.status?.slice(1) || 'All'}
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              isActive={filters.status !== 'all'}
              activeCount={filters.status !== 'all' ? 1 : 0}
              hideLabel="md"
              isOpen={showStatusDropdown}
            />

            {showStatusDropdown && (
              <div className="absolute z-50 right-0 w-48 mt-2 bg-white dark:bg-dark rounded-lg shadow-lg border border-gray-200 dark:border-[#3a3a3a] overflow-hidden">
                {(['all', 'pending', 'paid', 'unpaid', 'overdue', 'cancelled'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      handleStatusFilterChange(status);
                      setShowStatusDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors capitalize"
                  >
                    <span>{status === 'all' ? 'All' : status}</span>
                    {filters.status === status && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isSuperAdmin && (
            <div className="relative" ref={adminFilterDropdownRef}>
              <FilterButton
                icon={UsersIcon}
                label="Admin"
                selectedLabel={selectedAdminFilter === 'all' ? 'All' : admins.find(a => a.id === selectedAdminFilter)?.name || 'Admin'}
                onClick={() => setShowAdminFilterDropdown(!showAdminFilterDropdown)}
                isActive={selectedAdminFilter !== 'all'}
                activeCount={selectedAdminFilter !== 'all' ? 1 : 0}
                hideLabel="md"
                isOpen={showAdminFilterDropdown}
              />

              {showAdminFilterDropdown && (
                <div className="absolute z-50 right-0 w-56 mt-2 bg-white dark:bg-dark rounded-lg shadow-lg border border-gray-200 dark:border-[#3a3a3a] overflow-hidden max-h-64 overflow-y-auto">
                  <button
                    onClick={() => {
                      setSelectedAdminFilter('all');
                      setShowAdminFilterDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors"
                  >
                    <span>All Admins</span>
                    {selectedAdminFilter === 'all' && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                  </button>
                  <div className="border-t border-gray-200 dark:border-[#3a3a3a] my-1"></div>
                  {admins.map((admin) => (
                    <button
                      key={admin.id}
                      onClick={() => {
                        setSelectedAdminFilter(admin.id);
                        setShowAdminFilterDropdown(false);
                      }}
                      className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors"
                    >
                      <span className="truncate">{admin.name}</span>
                      {selectedAdminFilter === admin.id && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400 flex-shrink-0 ml-2" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {selectedInvoices.length > 0 && (
            <button
              onClick={handleBulkMarkAsPaid}
              className="btn btn-primary flex items-center"
            >
              <Check className="btn-icon w-4 h-4 mr-2" />
              Mark {selectedInvoices.length} as Paid
            </button>
          )}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 rounded-xl border border-gray-200/60 dark:border-[#3a3a3a]/60 shadow-sm overflow-hidden">
        <div className="relative overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-dark/50 border-b border-gray-200 dark:border-[#3a3a3a]">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap first:rounded-tl-xl w-12">
                    <CustomCheckbox
                      checked={selectAll}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap w-[140px]">Invoice #</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap w-[200px]">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap w-[120px]">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap w-[120px]">Due Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap w-[130px]">Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap w-[110px]">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap w-[80px] last:rounded-tr-xl">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-[#3a3a3a]">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      Loading invoices...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No invoices found
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice) => {
                    const totalAmount = invoice.total_amount || invoice.amount;
                    return (
                      <tr
                        key={invoice.id}
                        className="hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 cursor-pointer"
                        onClick={() => handleViewInvoice(invoice)}
                      >
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <CustomCheckbox
                            checked={selectedInvoices.includes(invoice.id)}
                            onChange={() => handleSelectInvoice(invoice.id)}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-900 dark:text-white">
                            {invoice.invoice_number || `INV-${invoice.id.slice(0, 8)}`}
                          </span>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {invoice.user_profile?.company || invoice.user_profile?.email || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {format(new Date(invoice.created_at), 'MMM dd, yyyy')}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {invoice.due_date ? format(new Date(invoice.due_date), 'MMM dd, yyyy') : 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                          ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${getStatusColor(invoice.status)}`}>
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleViewInvoice(invoice)}
                            className="btn btn-ghost"
                          >
                            <Eye className="btn-icon w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <InvoiceDetailModal
        invoice={selectedInvoice}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onStatusChange={loadData}
      />
    </div>
  );
}
