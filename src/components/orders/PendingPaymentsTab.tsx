import React, { useState, useEffect } from 'react';
import { Send, Eye, AlertCircle, Clock, CheckCircle, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { invoiceService, Invoice } from '../../lib/invoiceService';
import Modal from '../Modal';

interface PendingPaymentsTabProps {
  filteredUserId?: string;
  isSuperAdmin: boolean;
  permissions: any;
  refreshKey: number;
  searchTerm: string;
  statusFilter?: string;
  adminFilter?: string;
  onInvoiceCountChange?: (count: number) => void;
}

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

  const totalAmount = invoice.total_amount || invoice.amount;
  const daysOverdue = invoice.status === 'overdue' && invoice.due_date
    ? Math.floor((new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invoice Details" maxWidth="max-w-3xl">
      <div className="space-y-6">
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

        {invoice.status === 'overdue' && (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="text-sm text-red-600 dark:text-red-400">
              This invoice is {daysOverdue} days overdue
            </span>
          </div>
        )}

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
        </div>

        {invoice.line_items && invoice.line_items.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Line Items</h4>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Unit Price</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
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

        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          {invoice.status !== 'paid' && (
            <button
              onClick={handleMarkAsPaid}
              disabled={isUpdating}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Mark as Paid</span>
            </button>
          )}
          <button
            onClick={() => {
              toast.info('Invoice download feature coming soon');
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Download Invoice</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default function PendingPaymentsTab({
  filteredUserId,
  isSuperAdmin,
  permissions,
  refreshKey,
  searchTerm,
  statusFilter = 'all',
  adminFilter = 'all',
  onInvoiceCountChange
}: PendingPaymentsTabProps) {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, [user?.id, filteredUserId, refreshKey, statusFilter, adminFilter]);

  const loadInvoices = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      let merchantIds: string[] | null = null;

      if (filteredUserId) {
        merchantIds = [filteredUserId];
      } else if (adminFilter !== 'all') {
        const { data: assignments } = await supabase
          .from('user_assignments')
          .select('user_id')
          .eq('admin_id', adminFilter);

        if (assignments && assignments.length > 0) {
          merchantIds = assignments.map(a => a.user_id);
        } else {
          setInvoices([]);
          setLoading(false);
          onInvoiceCountChange?.(0);
          return;
        }
      } else if (!isSuperAdmin) {
        const { data: assignments } = await supabase
          .from('user_assignments')
          .select('user_id')
          .eq('admin_id', user.id);

        if (assignments && assignments.length > 0) {
          merchantIds = assignments.map(a => a.user_id);
        } else {
          setInvoices([]);
          setLoading(false);
          onInvoiceCountChange?.(0);
          return;
        }
      }

      let query = supabase
        .from('invoices')
        .select('*')
        .order('due_date', { ascending: true });

      if (statusFilter === 'all') {
        query = query.in('status', ['pending', 'unpaid', 'overdue', 'paid', 'cancelled']);
      } else {
        query = query.eq('status', statusFilter);
      }

      if (merchantIds) {
        query = query.in('user_id', merchantIds);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(inv => inv.user_id))];
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, email, first_name, last_name, company')
          .in('id', userIds);

        const profileMap = new Map(
          profiles?.map(p => [p.id, {
            email: p.email,
            first_name: p.first_name,
            last_name: p.last_name,
            company: p.company
          }])
        );

        const invoicesWithProfiles = data.map(inv => ({
          ...inv,
          user_profile: profileMap.get(inv.user_id)
        }));

        setInvoices(invoicesWithProfiles);
        onInvoiceCountChange?.(invoicesWithProfiles.length);
      } else {
        setInvoices([]);
        onInvoiceCountChange?.(0);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async (e: React.MouseEvent, invoiceId: string) => {
    e.stopPropagation();

    try {
      setSendingReminder(invoiceId);
      await invoiceService.sendPaymentReminder(invoiceId);
      toast.success('Payment reminder sent');
      loadInvoices();
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error('Failed to send reminder');
    } finally {
      setSendingReminder(null);
    }
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      case 'pending':
      case 'unpaid':
        return 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'paid':
        return 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      case 'cancelled':
        return 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
      default:
        return 'bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      inv.invoice_number?.toLowerCase().includes(term) ||
      inv.user_profile?.company?.toLowerCase().includes(term) ||
      inv.user_profile?.email?.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        Loading invoices...
      </div>
    );
  }

  if (filteredInvoices.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          {searchTerm ? 'No invoices match your search' : 'No pending payments'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Invoice #</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Merchant</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Due Date</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Days</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredInvoices.map((invoice) => {
              const totalAmount = invoice.total_amount || invoice.amount;
              const daysUntilDue = invoice.due_date
                ? differenceInDays(new Date(invoice.due_date), new Date())
                : null;
              const isOverdue = daysUntilDue !== null && daysUntilDue < 0;

              return (
                <tr
                  key={invoice.id}
                  onClick={() => handleViewInvoice(invoice)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {invoice.invoice_number || `INV-${invoice.id.slice(0, 8)}`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {invoice.user_profile?.company || invoice.user_profile?.email || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {invoice.due_date ? format(new Date(invoice.due_date), 'MMM dd, yyyy') : 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {daysUntilDue !== null && (
                      <span className={`text-sm font-medium ${
                        isOverdue
                          ? 'text-red-600 dark:text-red-400'
                          : daysUntilDue <= 3
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {isOverdue ? `${Math.abs(daysUntilDue)}d overdue` : `${daysUntilDue}d`}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${getStatusColor(invoice.status)}`}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={(e) => handleSendReminder(e, invoice.id)}
                        disabled={sendingReminder === invoice.id}
                        className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                        title="Send payment reminder"
                      >
                        <Send className={`w-4 h-4 ${sendingReminder === invoice.id ? 'animate-pulse' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleViewInvoice(invoice)}
                        className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <InvoiceDetailModal
        invoice={selectedInvoice}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onStatusChange={loadInvoices}
      />
    </>
  );
}
