import React, { useState, useEffect } from 'react';
import { Eye, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { Invoice } from '../../lib/invoiceService';
import PaymentReconciliationModal from './PaymentReconciliationModal';
import Modal from '../../components/Modal';

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
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsInvoice, setDetailsInvoice] = useState<Invoice | null>(null);

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
        query = query.in('status', ['pending', 'unpaid', 'overdue', 'partially_paid']);
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
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            Unpaid
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
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
            <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="flex-1">
              <div className="w-40 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" />
              <div className="w-32 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="w-24 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
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
          <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Invoice
              </th>
              {!filteredUserId && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Merchant
                </th>
              )}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Amount Due
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Due Date
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
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
                <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-4">
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {invoice.invoice_number || `INV-${invoice.id.slice(0, 8)}`}
                      </span>
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
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={(e) => handleViewDetails(e, invoice)}
                        className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleMarkAsPaid(e, invoice)}
                        className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                        title="Mark as paid"
                      >
                        <DollarSign className="w-4 h-4" />
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
          }}
        />
      )}

      {showDetailsModal && detailsInvoice && (
        <Modal
          title={`Invoice ${detailsInvoice.invoice_number || `INV-${detailsInvoice.id.slice(0, 8)}`}`}
          onClose={() => {
            setShowDetailsModal(false);
            setDetailsInvoice(null);
          }}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Merchant</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {detailsInvoice.user_profile?.company || detailsInvoice.user_profile?.email || 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Amount</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  ${(detailsInvoice.total_amount || detailsInvoice.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Due Date</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {detailsInvoice.due_date ? format(new Date(detailsInvoice.due_date), 'MMM dd, yyyy') : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                  {detailsInvoice.status.replace('_', ' ')}
                </p>
              </div>
            </div>

            {detailsInvoice.line_items && detailsInvoice.line_items.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Line Items</p>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2">
                  {detailsInvoice.line_items.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex-1">
                        <span className="text-gray-900 dark:text-white font-medium">
                          {item.product_name || item.description}
                        </span>
                        {item.variant_name && (
                          <span className="text-gray-500 dark:text-gray-400 ml-2">
                            ({item.variant_name})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
                        <span>Qty: {item.quantity}</span>
                        <span>${(item.total_cost || item.total_price || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
