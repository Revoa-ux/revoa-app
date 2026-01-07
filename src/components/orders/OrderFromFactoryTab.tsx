import React, { useState, useEffect } from 'react';
import { Truck, CheckCircle, Download, Send, ArrowRight, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { Invoice, invoiceService } from '../../lib/invoiceService';
import FactoryOrderModal from './FactoryOrderModal';
import Modal from '../../components/Modal';

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
  const orderedAmount = (invoice as any).factory_order_amount || 0;
  const availableAmount = totalAmount - orderedAmount;
  const daysSincePaid = invoice.paid_at
    ? Math.floor((new Date().getTime() - new Date(invoice.paid_at).getTime()) / (1000 * 60 * 60 * 24))
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
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
            Paid - Ready to Order
          </span>
        </div>

        {daysSincePaid > 3 && (
          <div className="flex items-center gap-2 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span className="text-sm text-amber-600 dark:text-amber-400">
              Invoice paid {daysSincePaid} days ago - consider placing factory order soon
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Paid Date</p>
            <p className="text-base font-medium text-gray-900 dark:text-white">
              {invoice.paid_at ? format(new Date(invoice.paid_at), 'MMM dd, yyyy') : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Invoice Date</p>
            <p className="text-base font-medium text-gray-900 dark:text-white">
              {format(new Date(invoice.created_at), 'MMM dd, yyyy')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
            <p className="text-base font-semibold text-gray-900 dark:text-white">
              ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Available for Order</p>
            <p className="text-base font-semibold text-green-600 dark:text-green-400">
              ${availableAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Product</th>
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
              <div className="flex justify-between text-base font-semibold pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-900 dark:text-white">Total</span>
                <span className="text-gray-900 dark:text-white">${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          {invoice.file_url && (
            <button
              onClick={() => window.open(invoice.file_url!, '_blank')}
              className="group flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

interface OrderFromFactoryTabProps {
  filteredUserId?: string;
  isSuperAdmin: boolean;
  permissions: any;
  refreshKey: number;
  searchTerm: string;
  adminFilter?: string;
  onInvoiceCountChange?: (count: number) => void;
  onRefresh?: () => void;
}

export default function OrderFromFactoryTab({
  filteredUserId,
  isSuperAdmin,
  permissions,
  refreshKey,
  searchTerm,
  adminFilter = 'all',
  onInvoiceCountChange,
  onRefresh
}: OrderFromFactoryTabProps) {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showFactoryOrderModal, setShowFactoryOrderModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsInvoice, setDetailsInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    loadInvoices();
  }, [user?.id, filteredUserId, refreshKey, adminFilter]);

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
        .eq('status', 'paid')
        .or('factory_order_placed.is.null,factory_order_placed.eq.false')
        .order('paid_at', { ascending: true });

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

        const { data: allocations } = await supabase
          .from('invoice_factory_allocations')
          .select('invoice_id, amount_allocated')
          .in('invoice_id', data.map(inv => inv.id));

        const allocationMap = new Map<string, number>();
        allocations?.forEach(alloc => {
          const current = allocationMap.get(alloc.invoice_id) || 0;
          allocationMap.set(alloc.invoice_id, current + alloc.amount_allocated);
        });

        const invoicesWithProfiles = data.map(inv => ({
          ...inv,
          user_profile: profileMap.get(inv.user_id),
          factory_order_amount: allocationMap.get(inv.id) || 0
        })).filter(inv => {
          const totalAmount = inv.total_amount || inv.amount;
          const orderedAmount = inv.factory_order_amount || 0;
          return orderedAmount < totalAmount;
        });

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

  const handleOrderFromFactory = (e: React.MouseEvent, invoice: Invoice) => {
    e.stopPropagation();
    setSelectedInvoice(invoice);
    setShowFactoryOrderModal(true);
  };

  const handleFactoryOrderSuccess = () => {
    setShowFactoryOrderModal(false);
    setSelectedInvoice(null);
    loadInvoices();
    onRefresh?.();
  };

  const handleViewDetails = (e: React.MouseEvent, invoice: Invoice) => {
    e.stopPropagation();
    setDetailsInvoice(invoice);
    setShowDetailsModal(true);
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
            <div className="w-28 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (filteredInvoices.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">
          {searchTerm ? 'No invoices match your search' : 'All paid invoices have factory orders placed'}
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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[140px]">
                Invoice
              </th>
              {!filteredUserId && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  Merchant
                </th>
              )}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                Paid Amount
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                Available
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                Paid Date
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                Total Units
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
            {filteredInvoices.map((invoice) => {
              const totalAmount = invoice.total_amount || invoice.amount;
              const orderedAmount = invoice.factory_order_amount || 0;
              const availableAmount = totalAmount - orderedAmount;
              const totalUnits = invoice.line_items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
              const lineItemCount = invoice.line_items?.length || 0;

              return (
                <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
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
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        ${availableAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {orderedAmount > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          ${orderedAmount.toFixed(2)} ordered
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {invoice.paid_at ? format(new Date(invoice.paid_at), 'MMM dd, yyyy') : 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {totalUnits}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={(e) => handleOrderFromFactory(e, invoice)}
                        className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                        title="Order from factory"
                      >
                        <Truck className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showFactoryOrderModal && selectedInvoice && (
        <FactoryOrderModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowFactoryOrderModal(false);
            setSelectedInvoice(null);
          }}
          onSuccess={handleFactoryOrderSuccess}
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
        />
      )}
    </>
  );
}
