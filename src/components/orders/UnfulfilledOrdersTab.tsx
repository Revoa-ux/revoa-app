import React, { useState, useEffect } from 'react';
import { Search, Download, ChevronDown, ChevronRight, ExternalLink, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { CustomSelect } from '../CustomSelect';
import { CustomCheckbox } from '../CustomCheckbox';
import { toast } from 'sonner';

interface UnfulfilledOrdersTabProps {
  filteredUserId?: string;
  isSuperAdmin: boolean;
  permissions: any;
  onExport: () => void;
  refreshKey: number;
}

interface Order {
  id: string;
  order_number: string;
  shopify_order_id: string;
  user_id: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_city: string;
  shipping_state: string;
  shipping_country: string;
  shipping_address_line1: string;
  shipping_address_line2: string;
  total_price: number;
  created_at: string;
  exported_to_3pl: boolean;
  exported_at: string | null;
  merchant_name?: string;
  line_items?: Array<{
    product_name: string;
    variant_name: string;
    quantity: number;
  }>;
}

export default function UnfulfilledOrdersTab({
  filteredUserId,
  isSuperAdmin,
  permissions,
  onExport,
  refreshKey
}: UnfulfilledOrdersTabProps) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [exportStatusFilter, setExportStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadOrders();
  }, [user?.id, filteredUserId, refreshKey]);

  const loadOrders = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      let query = supabase
        .from('shopify_orders')
        .select('*')
        .or('fulfillment_status.is.null,fulfillment_status.eq.unfulfilled,fulfillment_status.eq.UNFULFILLED')
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

        const orderIds = data.map(o => o.id);
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

  const toggleOrderSelection = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const toggleAllOrders = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const toggleOrderExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const filteredOrders = orders.filter(order => {
    const searchMatch =
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${order.customer_first_name || ''} ${order.customer_last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.merchant_name?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!searchMatch) return false;

    if (exportStatusFilter === 'ready' && order.exported_to_3pl) return false;
    if (exportStatusFilter === 'exported' && !order.exported_to_3pl) return false;

    return true;
  });

  const exportStatusOptions = [
    { value: 'all', label: 'All Orders' },
    { value: 'ready', label: 'Ready to Export' },
    { value: 'exported', label: 'Already Exported' },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            <div className="h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
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
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search orders..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
            />
          </div>

          <CustomSelect
            value={exportStatusFilter}
            onChange={(val) => setExportStatusFilter(val as string)}
            options={exportStatusOptions}
            className="w-full sm:w-48"
          />
        </div>

        {selectedOrders.size > 0 && permissions?.can_export_orders && (
          <button
            onClick={onExport}
            className="h-[38px] px-4 text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export Selected ({selectedOrders.size})</span>
            <span className="sm:hidden">Export ({selectedOrders.size})</span>
          </button>
        )}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm ? 'No orders match your search' : 'No unfulfilled orders'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-3 sm:px-4 py-3 text-left">
                  <CustomCheckbox
                    checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                    onChange={toggleAllOrders}
                  />
                </th>
                <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Order #
                </th>
                {!filteredUserId && (
                  <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Merchant
                  </th>
                )}
                <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="hidden xl:table-cell px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Shipping Address
                </th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {filteredOrders.map((order) => (
                <React.Fragment key={order.id}>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-3 sm:px-4 py-3 sm:py-4">
                      <CustomCheckbox
                        checked={selectedOrders.has(order.id)}
                        onChange={() => toggleOrderSelection(order.id)}
                      />
                    </td>
                    <td className="px-3 sm:px-4 py-3 sm:py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleOrderExpansion(order.id)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          {expandedOrders.has(order.id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {order.order_number.startsWith('#') ? order.order_number : `#${order.order_number}`}
                        </span>
                      </div>
                    </td>
                    {!filteredUserId && (
                      <td className="hidden lg:table-cell px-4 py-4">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {order.merchant_name}
                        </span>
                      </td>
                    )}
                    <td className="hidden sm:table-cell px-4 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {format(new Date(order.created_at), 'MMM d, yyyy')}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 sm:py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[120px] sm:max-w-none">
                          {order.customer_first_name} {order.customer_last_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px] sm:max-w-none">
                          {order.customer_email}
                        </p>
                      </div>
                    </td>
                    <td className="hidden xl:table-cell px-4 py-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <p>{order.shipping_city}, {order.shipping_state}</p>
                        <p className="text-xs">{order.shipping_country}</p>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-4 py-4">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        ${order.total_price?.toFixed(2) || '0.00'}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 sm:py-4">
                      {order.exported_to_3pl ? (
                        <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                          <span className="hidden sm:inline">Exported {order.exported_at && format(new Date(order.exported_at), 'MM/dd')}</span>
                          <span className="sm:hidden">Done</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          <span className="hidden sm:inline">Ready to Export</span>
                          <span className="sm:hidden">Ready</span>
                        </span>
                      )}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/admin/chat?orderId=${order.shopify_order_id}`}
                          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                          title="View in Chat"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Link>
                        <a
                          href={`https://${order.shopify_order_id?.split('/')[0]}/admin/orders/${order.shopify_order_id?.split('/').pop()}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                          title="View in Shopify"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                  {expandedOrders.has(order.id) && order.line_items && order.line_items.length > 0 && (
                    <tr>
                      <td colSpan={filteredUserId ? 8 : 9} className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                            Order Items
                          </p>
                          {order.line_items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <div className="flex-1">
                                <span className="text-gray-900 dark:text-white font-medium">
                                  {item.product_name}
                                </span>
                                {item.variant_name && (
                                  <span className="text-gray-500 dark:text-gray-400 ml-2">
                                    ({item.variant_name})
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
                                <span>Qty: {item.quantity}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
