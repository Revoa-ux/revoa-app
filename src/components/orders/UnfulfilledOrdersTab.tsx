import React, { useState, useEffect } from 'react';
import { ChevronRight, ExternalLink, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { CustomCheckbox } from '../CustomCheckbox';
import { toast } from 'sonner';

interface UnfulfilledOrdersTabProps {
  filteredUserId?: string;
  isSuperAdmin: boolean;
  permissions: any;
  onExport: () => void;
  refreshKey: number;
  searchTerm: string;
  exportStatusFilter: string;
  selectedOrders: Set<string>;
  onSelectedOrdersChange: (orders: Set<string>) => void;
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
  shopify_domain?: string;
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
  refreshKey,
  searchTerm,
  exportStatusFilter,
  selectedOrders,
  onSelectedOrdersChange
}: UnfulfilledOrdersTabProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

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

        const { data: installations } = await supabase
          .from('shopify_installations')
          .select('user_id, shop_domain')
          .in('user_id', userIds);

        const domainMap = new Map(
          installations?.map(i => [i.user_id, i.shop_domain])
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

        const ordersWithData = data.map(order => {
          const items = lineItemsMap.get(order.shopify_order_id) || [];
          console.log('Order:', order.order_number, 'Line items:', items);
          return {
            ...order,
            merchant_name: profileMap.get(order.user_id) || 'Unknown',
            shopify_domain: domainMap.get(order.user_id),
            line_items: items
          };
        });

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
    onSelectedOrdersChange(newSelected);
  };

  const toggleAllOrders = () => {
    if (selectedOrders.size === filteredOrders.length) {
      onSelectedOrdersChange(new Set());
    } else {
      onSelectedOrdersChange(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const toggleOrderExpansion = (orderId: string) => {
    console.log('Toggle expansion for order:', orderId);
    console.log('Current expanded orders:', expandedOrders);
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
      console.log('Collapsing order:', orderId);
    } else {
      newExpanded.add(orderId);
      console.log('Expanding order:', orderId);
    }
    console.log('New expanded orders:', newExpanded);
    setExpandedOrders(newExpanded);
  };

  const handleChatClick = async (order: Order) => {
    try {
      const { data: existingThread } = await supabase
        .from('chat_threads')
        .select('id, chat_id')
        .eq('shopify_order_id', order.shopify_order_id)
        .maybeSingle();

      if (existingThread) {
        navigate(`/admin/chat?chatId=${existingThread.chat_id}&threadId=${existingThread.id}`);
      } else {
        const { data: chat } = await supabase
          .from('chats')
          .select('id')
          .eq('user_id', order.user_id)
          .maybeSingle();

        if (chat) {
          navigate(`/admin/chat?chatId=${chat.id}&createThread=order&orderId=${order.shopify_order_id}`);
        } else {
          toast.error('No chat found for this merchant');
        }
      }
    } catch (error) {
      console.error('Error navigating to chat:', error);
      toast.error('Failed to open chat');
    }
  };

  const getShopifyOrderUrl = (order: Order) => {
    if (order.shopify_domain) {
      const orderId = order.shopify_order_id?.split('/').pop();
      return `https://${order.shopify_domain}/admin/orders/${orderId}`;
    }
    return null;
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

  if (filteredOrders.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">
          {searchTerm ? 'No orders match your search' : 'No unfulfilled orders'}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-4 py-3 text-left">
                <CustomCheckbox
                  checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                  onChange={toggleAllOrders}
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Order #
              </th>
              {!filteredUserId && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Merchant
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Location
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Value
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
            {filteredOrders.map((order) => (
              <React.Fragment key={order.id}>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-4">
                    <CustomCheckbox
                      checked={selectedOrders.has(order.id)}
                      onChange={() => toggleOrderSelection(order.id)}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleOrderExpansion(order.id);
                        }}
                        className="p-1.5 -m-1 text-gray-400 rounded"
                      >
                        <ChevronRight className={`w-4 h-4 transition-transform ${expandedOrders.has(order.id) ? 'rotate-90' : ''}`} />
                      </button>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {order.order_number.startsWith('#') ? order.order_number : `#${order.order_number}`}
                      </span>
                    </div>
                  </td>
                  {!filteredUserId && (
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {order.merchant_name}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {format(new Date(order.created_at), 'MMM d, yyyy')}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {order.customer_first_name} {order.customer_last_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {order.customer_email}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <p>{order.shipping_city}, {order.shipping_state}</p>
                      <p className="text-xs">{order.shipping_country}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      ${order.total_price?.toFixed(2) || '0.00'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {order.exported_to_3pl ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 whitespace-nowrap">
                        Exported {order.exported_at && format(new Date(order.exported_at), 'MM/dd')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 whitespace-nowrap">
                        Ready
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleChatClick(order)}
                        className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                        title="Message"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      {getShopifyOrderUrl(order) && (
                        <a
                          href={getShopifyOrderUrl(order)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                          title="View in Shopify"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
                {expandedOrders.has(order.id) && (
                  <tr>
                    <td colSpan={filteredUserId ? 8 : 9} className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                          Order Items
                        </p>
                        {order.line_items && order.line_items.length > 0 ? (
                          order.line_items.map((item, idx) => (
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
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400">No line items found</p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
    </div>
  );
}
