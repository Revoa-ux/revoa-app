import React, { useState, useEffect } from 'react';
import { CheckCircle, Download, Send, ArrowRight, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format, differenceInDays } from 'date-fns';
import { toast } from '../../lib/toast';
import { Invoice, invoiceService } from '../../lib/invoiceService';
import PaymentReconciliationModal from './PaymentReconciliationModal';
import Modal from '../../components/Modal';

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: () => void;
  onMarkAsPaid: (invoice: Invoice) => void;
}

const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onStatusChange,
  onMarkAsPaid
}) => {
  const [isSendingReminder, setIsSendingReminder] = useState(false);

  if (!invoice) return null;

  const handleSendReminder = async () => {
    try {
      setIsSendingReminder(true);
      await invoiceService.sendPaymentReminder(invoice.id);
      toast.success('Payment reminder sent');
      onStatusChange();
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error('Failed to send reminder');
    } finally {
      setIsSendingReminder(false);
    }
  };

  const totalAmount = invoice.total_amount || invoice.amount;
  const daysOverdue = invoice.status === 'overdue' && invoice.due_date
    ? Math.floor((new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invoice Details" maxWidth="max-w-3xl" noPadding>
      <div className="flex flex-col h-full">
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
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
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1).replace('_', ' ')}
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
            {invoice.paid_at && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Paid On</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">
                  {format(new Date(invoice.paid_at), 'MMM dd, yyyy')}
                </p>
              </div>
            )}
          </div>

          {invoice.line_items && invoice.line_items.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Line Items</h4>
              <div className="border border-gray-200 dark:border-[#3a3a3a] rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-dark">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Description</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Unit Price</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-dark divide-y divide-gray-200 dark:divide-gray-700">
                    {invoice.line_items.map((item: any, index: number) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.product_name || item.description}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right">${(item.cost_per_item || item.unit_price || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white text-right">${(item.total_cost || item.total_price || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
        </div>

        <div className="border-t border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-[#3a3a3a]/50 px-4 sm:px-6 py-4 flex-shrink-0">
          <div className="flex space-x-3">
            {invoice.file_url && (
              <button
                onClick={() => window.open(invoice.file_url!, '_blank')}
                className="btn btn-secondary flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium active:scale-95"
              >
                <Download className="btn-icon" />
                PDF
              </button>
            )}
            {invoice.status !== 'paid' && (
              <>
                <button
                  onClick={handleSendReminder}
                  disabled={isSendingReminder}
                  className="btn btn-secondary flex-1 flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="btn-icon" />
                  <span>{isSendingReminder ? 'Sending...' : 'Send Reminder'}</span>
                </button>
                <button
                  onClick={() => onMarkAsPaid(invoice)}
                  className="btn btn-primary group flex-1 px-5 py-2 text-sm font-medium flex items-center justify-center gap-2"
                >
                  <CheckCircle className="btn-icon" />
                  <span>Mark as Paid</span>
                  <ArrowRight className="btn-icon btn-icon-arrow" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

interface PendingPaymentsTabProps {
  filteredUserId?: string;
  isSuperAdmin: boolean;
  permissions: any;
  refreshKey: number;
  searchTerm: string;
  statusFilter?: string;
  adminFilter?: string;
  onInvoiceCountChange?: (count: number) => void;
  onRefresh?: () => void;
}

export default function PendingPaymentsTab({
  filteredUserId,
  isSuperAdmin,
  permissions,
  refreshKey,
  searchTerm,
  statusFilter = 'all',
  adminFilter = 'all',
  onInvoiceCountChange,
  onRefresh
}: PendingPaymentsTabProps) {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsInvoice, setDetailsInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    loadInvoices();
  }, [user?.id, filteredUserId, refreshKey, statusFilter, adminFilter, isSuperAdmin]);

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
        query = query.in('status', ['pending', 'unpaid', 'overdue', 'partially_paid']);
      } else if (statusFilter === 'unpaid') {
        query = query.in('status', ['pending', 'unpaid']);
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

  const handleMarkAsPaid = (e: React.MouseEvent, invoice: Invoice) => {
    e.stopPropagation();
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  const handleViewDetails = (e: React.MouseEvent, invoice: Invoice) => {
    e.stopPropagation();
    setDetailsInvoice(invoice);
    setShowDetailsModal(true);
  };

  const getStatusBadge = (status: string, daysOverdue?: number) => {
    switch (status) {
      case 'overdue':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
            {daysOverdue ? `${daysOverdue}d overdue` : 'Overdue'}
          </span>
        );
      case 'partially_paid':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">
            Partially Paid
          </span>
        );
      case 'pending':
      case 'unpaid':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-[#3a3a3a] text-gray-700 dark:text-gray-300">
            Unpaid
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-[#3a3a3a] text-gray-700 dark:text-gray-300">
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        );
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
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="px-4 py-4 flex items-center gap-4">
            <div className="w-5 h-5 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse" />
            <div className="w-24 h-4 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse" />
            <div className="w-32 h-4 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse" />
            <div className="w-20 h-4 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse" />
            <div className="flex-1">
              <div className="w-40 h-4 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse mb-1" />
              <div className="w-32 h-3 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse" />
            </div>
            <div className="w-20 h-4 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse" />
            <div className="w-24 h-6 bg-gray-200 dark:bg-[#3a3a3a] rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (filteredInvoices.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">
          {searchTerm ? 'No invoices match your search' : 'No unpaid invoices'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-[#3a3a3a]/50/50 border-b border-gray-200 dark:border-[#3a3a3a]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                Invoice
              </th>
              {!filteredUserId && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  Merchant
                </th>
              )}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                Amount Due
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                Due Date
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                Status
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-dark">
            {filteredInvoices.map((invoice) => {
              const totalAmount = invoice.total_amount || invoice.amount;
              const displayAmount = invoice.status === 'partially_paid' && invoice.remaining_amount
                ? invoice.remaining_amount
                : totalAmount;
              const daysOverdue = invoice.due_date && invoice.status === 'overdue'
                ? Math.abs(differenceInDays(new Date(), new Date(invoice.due_date)))
                : undefined;
              const lineItemCount = invoice.line_items?.length || 0;

              return (
                <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50">
                  <td className="px-4 py-4">
                    <div className="text-left">
                      <button
                        onClick={(e) => handleViewDetails(e, invoice)}
                        className="text-left text-sm font-medium text-gray-900 dark:text-white hover:text-rose-600 dark:hover:text-rose-400 underline underline-offset-2 decoration-gray-300 dark:decoration-gray-600 hover:decoration-rose-400 transition-colors"
                      >
                        {invoice.invoice_number || `INV-${invoice.id.slice(0, 8)}`}
                      </button>
                      {lineItemCount > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {lineItemCount} {lineItemCount === 1 ? 'item' : 'items'}
                        </p>
                      )}
                    </div>
                  </td>
                  {!filteredUserId && (
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {invoice.user_profile?.company || invoice.user_profile?.email || 'Unknown'}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-4 text-right">
                    <div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        ${displayAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {invoice.status === 'partially_paid' && invoice.amount_received && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          ${invoice.amount_received.toFixed(2)} received
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {invoice.due_date ? format(new Date(invoice.due_date), 'MMM dd, yyyy') : 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    {getStatusBadge(invoice.status, daysOverdue)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={(e) => handleMarkAsPaid(e, invoice)}
                        className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-md transition-colors"
                        title="Mark as paid"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showPaymentModal && selectedInvoice && user && (
        <PaymentReconciliationModal
          invoice={selectedInvoice}
          adminId={user.id}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedInvoice(null);
          }}
          onSuccess={() => {
            setShowPaymentModal(false);
            setSelectedInvoice(null);
            loadInvoices();
            onRefresh?.();
          }}
        />
      )}

      {showDetailsModal && detailsInvoice && (
        <InvoiceDetailModal
          invoice={detailsInvoice}
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setDetailsInvoice(null);
          }}
          onStatusChange={() => {
            loadInvoices();
          }}
          onMarkAsPaid={(inv) => {
            setShowDetailsModal(false);
            setDetailsInvoice(null);
            setSelectedInvoice(inv);
            setShowPaymentModal(true);
          }}
        />
      )}
    </>
  );
}
