import React, { useState, useEffect } from 'react';
import { Factory, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Invoice } from '../../lib/invoiceService';
import FactoryOrderModal from './FactoryOrderModal';
import Modal from '../../components/Modal';

interface OrderFromFactoryTabProps {
  filteredUserId?: string;
  isSuperAdmin: boolean;
  permissions: any;
  refreshKey: number;
  searchTerm: string;
  adminFilter?: string;
  onInvoiceCountChange?: (count: number) => void;
}

export default function OrderFromFactoryTab({
  filteredUserId,
  isSuperAdmin,
  permissions,
  refreshKey,
  searchTerm,
  adminFilter = 'all',
  onInvoiceCountChange
}: OrderFromFactoryTabProps) {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showFactoryOrderModal, setShowFactoryOrderModal] = useState(false);
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());
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
  };

  const handleViewDetails = (e: React.MouseEvent, invoice: Invoice) => {
    e.stopPropagation();
    setDetailsInvoice(invoice);
    setShowDetailsModal(true);
  };

  const toggleExpansion = (invoiceId: string) => {
    const newExpanded = new Set(expandedInvoices);
    if (newExpanded.has(invoiceId)) {
      newExpanded.delete(invoiceId);
    } else {
      newExpanded.add(invoiceId);
    }
    setExpandedInvoices(newExpanded);
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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Invoice
              </th>
              {!filteredUserId && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Merchant
                </th>
              )}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Paid Amount
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Available
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Paid Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Items
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
            {filteredInvoices.map((invoice) => {
              const totalAmount = invoice.total_amount || invoice.amount;
              const orderedAmount = invoice.factory_order_amount || 0;
              const availableAmount = totalAmount - orderedAmount;
              const lineItemCount = invoice.line_items?.length || 0;

              return (
                <React.Fragment key={invoice.id}>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleExpansion(invoice.id)}
                          className="p-1.5 -m-1 text-gray-400 rounded"
                        >
                          <ChevronRight className={`w-4 h-4 transition-transform ${expandedInvoices.has(invoice.id) ? 'rotate-90' : ''}`} />
                        </button>
                        <button
                          onClick={(e) => handleViewDetails(e, invoice)}
                          className="text-sm font-medium text-gray-900 dark:text-white hover:text-rose-600 dark:hover:text-rose-400 underline underline-offset-2 decoration-gray-300 dark:decoration-gray-600 hover:decoration-rose-400 transition-colors"
                        >
                          {invoice.invoice_number || `INV-${invoice.id.slice(0, 8)}`}
                        </button>
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
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {lineItemCount} {lineItemCount === 1 ? 'product' : 'products'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={(e) => handleOrderFromFactory(e, invoice)}
                          className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                          title="Order from factory"
                        >
                          <Factory className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedInvoices.has(invoice.id) && (
                    <tr>
                      <td colSpan={filteredUserId ? 6 : 7} className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                            Line Items
                          </p>
                          {invoice.line_items && invoice.line_items.length > 0 ? (
                            invoice.line_items.map((item: any, idx: number) => (
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
                            ))
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400">No line items found</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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
        <Modal
          isOpen={showDetailsModal}
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
                <p className="text-sm text-gray-500 dark:text-gray-400">Paid Date</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {detailsInvoice.paid_at ? format(new Date(detailsInvoice.paid_at), 'MMM dd, yyyy') : 'N/A'}
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
