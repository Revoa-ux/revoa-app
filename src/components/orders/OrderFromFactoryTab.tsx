import React, { useState, useEffect } from 'react';
import { Factory, CheckCircle, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Invoice } from '../../lib/invoiceService';
import FactoryOrderModal from './FactoryOrderModal';

interface OrderFromFactoryTabProps {
  filteredUserId?: string;
  isSuperAdmin: boolean;
  permissions: any;
  refreshKey: number;
  searchTerm: string;
  onInvoiceCountChange?: (count: number) => void;
}

export default function OrderFromFactoryTab({
  filteredUserId,
  isSuperAdmin,
  permissions,
  refreshKey,
  searchTerm,
  onInvoiceCountChange
}: OrderFromFactoryTabProps) {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showFactoryOrderModal, setShowFactoryOrderModal] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, [user?.id, filteredUserId, refreshKey]);

  const loadInvoices = async () => {
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
          setInvoices([]);
          setLoading(false);
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

  const handleOrderFromFactory = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowFactoryOrderModal(true);
  };

  const handleFactoryOrderSuccess = () => {
    setShowFactoryOrderModal(false);
    setSelectedInvoice(null);
    loadInvoices();
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
        Loading paid invoices...
      </div>
    );
  }

  if (filteredInvoices.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-50 dark:bg-green-900/20 mb-4">
          <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <p className="text-gray-500 dark:text-gray-400">
          {searchTerm ? 'No invoices match your search' : 'All paid invoices have factory orders placed'}
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
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Paid Amount</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Available</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Paid Date</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Items</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredInvoices.map((invoice) => {
              const totalAmount = invoice.total_amount || invoice.amount;
              const orderedAmount = invoice.factory_order_amount || 0;
              const availableAmount = totalAmount - orderedAmount;
              const lineItemCount = invoice.line_items?.length || 0;

              return (
                <tr
                  key={invoice.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
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
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      ${availableAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {orderedAmount > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        (${orderedAmount.toFixed(2)} ordered)
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {invoice.paid_at ? format(new Date(invoice.paid_at), 'MMM dd, yyyy') : 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs text-gray-600 dark:text-gray-400">
                      <Package className="w-3 h-3" />
                      {lineItemCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleOrderFromFactory(invoice)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-all active:scale-95"
                    >
                      <Factory className="w-4 h-4" />
                      Order
                    </button>
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
    </>
  );
}
