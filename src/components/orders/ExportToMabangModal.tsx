import React, { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, ArrowLeft, ArrowRight, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../Modal';
import { CustomCheckbox } from '../CustomCheckbox';
import { toast } from '../../lib/toast';
import * as XLSX from 'xlsx';

interface ExportToMabangModalProps {
  filteredUserId?: string;
  preSelectedOrderIds?: Set<string>;
  onClose: () => void;
  onSuccess: () => void;
}

interface OrderForExport {
  id: string;
  order_number: string;
  shopify_order_id: string;
  user_id: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address_line1: string;
  shipping_address_line2: string;
  shipping_city: string;
  shipping_state: string;
  shipping_zip: string;
  shipping_country: string;
  merchant_name?: string;
  line_items: Array<{
    product_name: string;
    variant_name: string;
    quantity: number;
  }>;
}

export default function ExportToMabangModal({ filteredUserId, preSelectedOrderIds, onClose, onSuccess }: ExportToMabangModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [orders, setOrders] = useState<OrderForExport[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [warnings, setWarnings] = useState<string[]>([]);
  const hasAppliedPreSelectionRef = useRef(false);

  useEffect(() => {
    loadOrders();
  }, [user?.id, filteredUserId]);

  const loadOrders = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .maybeSingle();

      const isSuperAdmin = profile?.is_super_admin || false;

      let query = supabase
        .from('shopify_orders')
        .select('*')
        .or('fulfillment_status.is.null,fulfillment_status.eq.unfulfilled,fulfillment_status.eq.UNFULFILLED')
        .eq('exported_to_3pl', false)
        .or('financial_status.eq.paid,financial_status.eq.PAID,financial_status.eq.authorized,financial_status.eq.AUTHORIZED')
        .is('cancelled_at', null)
        .order('created_at', { ascending: false });

      if (filteredUserId) {
        query = query.eq('user_id', filteredUserId);
      } else if (!isSuperAdmin) {
        const { data: assignments } = await supabase
          .from('user_assignments')
          .select('user_id')
          .eq('admin_id', user.id);

        if (assignments && assignments.length > 0) {
          const merchantIds = assignments.map(a => a.user_id);
          query = query.in('user_id', merchantIds);
        } else {
          setOrders([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(o => o.user_id))];
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, first_name, last_name, company, name')
          .in('id', userIds);

        const profileMap = new Map(
          profiles?.map(p => [
            p.id,
            p.company || p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown'
          ])
        );

        const { data: lineItems } = await supabase
          .from('order_line_items')
          .select('shopify_order_id, product_name, variant_name, quantity')
          .in('shopify_order_id', data.map(o => o.shopify_order_id));

        const lineItemsMap = new Map<string, any[]>();
        lineItems?.forEach(item => {
          if (!lineItemsMap.has(item.shopify_order_id)) {
            lineItemsMap.set(item.shopify_order_id, []);
          }
          lineItemsMap.get(item.shopify_order_id)!.push(item);
        });

        const ordersWithData = data.map(order => ({
          ...order,
          merchant_name: profileMap.get(order.user_id) || 'Unknown',
          line_items: lineItemsMap.get(order.shopify_order_id) || []
        }));

        setOrders(ordersWithData);

        if (!hasAppliedPreSelectionRef.current) {
          hasAppliedPreSelectionRef.current = true;

          if (preSelectedOrderIds && preSelectedOrderIds.size > 0) {
            const validPreSelected = new Set(
              ordersWithData.filter(o => preSelectedOrderIds.has(o.id)).map(o => o.id)
            );
            setSelectedOrders(validPreSelected.size > 0 ? validPreSelected : new Set(ordersWithData.map(o => o.id)));
          } else {
            setSelectedOrders(new Set(ordersWithData.map(o => o.id)));
          }
        }

        validateOrders(ordersWithData);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const validateOrders = (ordersToValidate: OrderForExport[]) => {
    const newWarnings: string[] = [];

    ordersToValidate.forEach(order => {
      if (!order.shipping_address_line1) {
        newWarnings.push(`Order #${order.order_number}: Missing shipping address`);
      }
      if (!order.shipping_city) {
        newWarnings.push(`Order #${order.order_number}: Missing city`);
      }
      if (!order.shipping_country) {
        newWarnings.push(`Order #${order.order_number}: Missing country`);
      }
      if (!order.line_items || order.line_items.length === 0) {
        newWarnings.push(`Order #${order.order_number}: No line items found`);
      }
    });

    setWarnings(newWarnings);
  };

  const convertCountryCode = (country: string): string => {
    const countryMap: Record<string, string> = {
      'United States': 'US',
      'Canada': 'CA',
      'United Kingdom': 'GB',
      'Australia': 'AU',
      'Germany': 'DE',
      'France': 'FR',
      'Italy': 'IT',
      'Spain': 'ES',
      'Netherlands': 'NL',
      'Belgium': 'BE',
      'Switzerland': 'CH',
      'Austria': 'AT',
      'Sweden': 'SE',
      'Norway': 'NO',
      'Denmark': 'DK',
      'Finland': 'FI',
      'Poland': 'PL',
      'Czech Republic': 'CZ',
      'Ireland': 'IE',
      'Portugal': 'PT',
      'Greece': 'GR',
      'Japan': 'JP',
      'South Korea': 'KR',
      'Singapore': 'SG',
      'Malaysia': 'MY',
      'Thailand': 'TH',
      'Philippines': 'PH',
      'Indonesia': 'ID',
      'Vietnam': 'VN',
      'India': 'IN',
      'China': 'CN',
      'Hong Kong': 'HK',
      'Taiwan': 'TW',
      'New Zealand': 'NZ',
      'Mexico': 'MX',
      'Brazil': 'BR',
      'Argentina': 'AR',
      'Chile': 'CL',
      'Colombia': 'CO',
      'Peru': 'PE',
      'South Africa': 'ZA',
      'United Arab Emirates': 'AE',
      'Saudi Arabia': 'SA',
      'Israel': 'IL',
      'Turkey': 'TR',
      'Russia': 'RU'
    };

    return countryMap[country] || country.substring(0, 2).toUpperCase();
  };

  const handleExport = async () => {
    if (selectedOrders.size === 0) {
      toast.error('Please select at least one order');
      return;
    }

    setExporting(true);

    try {
      const ordersToExport = orders.filter(o => selectedOrders.has(o.id));

      const excelData: any[] = [];

      ordersToExport.forEach(order => {
        if (order.line_items && order.line_items.length > 0) {
          order.line_items.forEach(item => {
            excelData.push({
              'Order Number': order.order_number,
              'Transaction Number': order.shopify_order_id,
              'Product Name': item.product_name,
              'Variant': item.variant_name || '',
              'Quantity': item.quantity,
              'Buyer Name': `${order.customer_first_name || ''} ${order.customer_last_name || ''}`.trim(),
              'Buyer Account': order.customer_email || '',
              'Phone 1': order.customer_phone || '',
              'Address 1': order.shipping_address_line1 || '',
              'Address 2': order.shipping_address_line2 || '',
              'City': order.shipping_city || '',
              'Province/State': order.shipping_state || '',
              'Postal Code': order.shipping_zip || '',
              'Country': convertCountryCode(order.shipping_country || ''),
              'Merchant': order.merchant_name || '',
            });
          });
        }
      });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const filename = `mabang_export_${timestamp}.xlsx`;

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      ws['!cols'] = [
        { wch: 15 },
        { wch: 20 },
        { wch: 35 },
        { wch: 20 },
        { wch: 10 },
        { wch: 20 },
        { wch: 25 },
        { wch: 15 },
        { wch: 30 },
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 12 },
        { wch: 10 },
        { wch: 20 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Orders');
      XLSX.writeFile(wb, filename);

      const { data: batch, error: batchError } = await supabase
        .from('mabang_export_batches')
        .insert({
          admin_id: user!.id,
          export_filename: filename,
          order_ids: ordersToExport.map(o => o.id),
          order_count: ordersToExport.length,
          merchant_ids: [...new Set(ordersToExport.map(o => o.user_id))],
          notes: `Exported ${ordersToExport.length} orders for ${[...new Set(ordersToExport.map(o => o.merchant_name))].join(', ')}`
        })
        .select()
        .single();

      if (batchError) throw batchError;

      const { error: updateError } = await supabase
        .from('shopify_orders')
        .update({
          exported_to_3pl: true,
          exported_at: new Date().toISOString(),
          exported_by_admin_id: user!.id
        })
        .in('id', ordersToExport.map(o => o.id));

      if (updateError) throw updateError;

      toast.success(`Successfully exported ${ordersToExport.length} orders to ${filename}`);
      onSuccess();
    } catch (error: any) {
      console.error('Error exporting to Mabang:', error);
      toast.error(error.message || 'Failed to export orders');
    } finally {
      setExporting(false);
    }
  };

  const toggleOrderSelection = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const toggleAll = () => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map(o => o.id)));
    }
  };

  const merchantCount = [...new Set(orders.filter(o => selectedOrders.has(o.id)).map(o => o.merchant_name))].length;

  if (loading) {
    return (
      <Modal isOpen={true} onClose={onClose} maxWidth="max-w-4xl">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-7 w-48 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse" />
            <div className="h-8 w-8 bg-gray-200 dark:bg-[#3a3a3a] rounded-lg animate-pulse" />
          </div>
          <div className="h-20 bg-gray-100 dark:bg-dark rounded-lg animate-pulse" />
          <div className="border border-gray-200 dark:border-[#3a3a3a] rounded-lg overflow-hidden">
            <div className="bg-gray-50 dark:bg-[#3a3a3a]/50/50 px-4 py-3">
              <div className="flex items-center gap-4">
                <div className="h-4 w-4 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse" />
                <div className="h-4 w-20 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse" />
                <div className="h-4 w-28 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse" />
                <div className="h-4 w-16 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse" />
              </div>
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="px-4 py-3 border-t border-gray-200 dark:border-[#3a3a3a]">
                <div className="flex items-center gap-4">
                  <div className="h-4 w-4 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse" />
                  <div className="h-4 w-24 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse" />
                  <div className="h-4 w-32 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse" />
                  <div className="h-4 w-28 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse" />
                  <div className="h-4 w-16 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={true} onClose={onClose} maxWidth="max-w-4xl">
      <div className="-m-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-[#3a3a3a]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Export to Mabang 3PL
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedOrders.size > 0
                  ? `${selectedOrders.size} of ${orders.length} orders selected`
                  : `${orders.length} orders available`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="w-12 h-12 bg-gray-100 dark:bg-dark rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No orders ready for export
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="px-6 py-4 space-y-4">
              {/* Warnings */}
              {warnings.length > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">
                        Validation Warnings ({warnings.length})
                      </h3>
                      <div className="text-xs text-amber-800 dark:text-amber-200 space-y-1 max-h-24 overflow-y-auto">
                        {warnings.slice(0, 5).map((warning, idx) => (
                          <p key={idx}>{warning}</p>
                        ))}
                        {warnings.length > 5 && (
                          <p className="font-medium">...and {warnings.length - 5} more</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark/50 rounded-lg">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedOrders.size}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Orders Selected</p>
                  </div>
                  <div className="h-10 w-px bg-gray-200 dark:bg-[#3a3a3a]" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{merchantCount}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Merchants</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Format</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Excel (.xlsx)</p>
                </div>
              </div>

              {/* Order List */}
              <div className="border border-gray-200 dark:border-[#3a3a3a] rounded-lg overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-[#3a3a3a]/50 border-b border-gray-200 dark:border-[#3a3a3a] sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <CustomCheckbox
                            checked={selectedOrders.size === orders.length && orders.length > 0}
                            onChange={toggleAll}
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                          Order #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                          Merchant
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                          Items
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-dark">
                      {orders.map(order => (
                        <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50">
                          <td className="px-4 py-3">
                            <CustomCheckbox
                              checked={selectedOrders.has(order.id)}
                              onChange={() => toggleOrderSelection(order.id)}
                            />
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                            {order.order_number.startsWith('#') ? order.order_number : `#${order.order_number}`}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            {order.merchant_name}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            {order.customer_first_name} {order.customer_last_name}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            {order.line_items?.length || 0} items
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-[#3a3a3a]/50 px-4 sm:px-6 py-4">
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  disabled={exporting}
                  className="btn btn-secondary flex-1"
                >
                  <ArrowLeft className="btn-icon btn-icon-back" />
                  Cancel
                </button>

                <button
                  onClick={handleExport}
                  disabled={selectedOrders.size === 0 || exporting}
                  className="btn btn-primary flex-1"
                >
                  {exporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      Export {selectedOrders.size} Orders
                      <ArrowRight className="btn-icon btn-icon-arrow" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
