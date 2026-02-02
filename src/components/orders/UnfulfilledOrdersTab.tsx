import React, { useState, useEffect } from 'react';
import { ExternalLink, MessageSquare, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { CustomCheckbox } from '../CustomCheckbox';
import { toast } from '../../lib/toast';
import Modal from '../../components/Modal';

interface UnfulfilledOrdersTabProps {
  filteredUserId?: string;
  isSuperAdmin: boolean;
  permissions: any;
  onExport: () => void;
  refreshKey: number;
  searchTerm: string;
  selectedOrders: Set<string>;
  onSelectedOrdersChange: (orders: Set<string>) => void;
  onRefresh?: () => void;
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
  selectedOrders,
  onSelectedOrdersChange,
  onRefresh
}: UnfulfilledOrdersTabProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

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
        .eq('factory_order_confirmed', true)
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

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
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
    if (order.exported_to_3pl) return false;

    const searchMatch =
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${order.customer_first_name || ''} ${order.customer_last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.merchant_name?.toLowerCase().includes(searchTerm.toLowerCase());

    return searchMatch;
  });

  if (loading) {
    return (
      <div className="divide-y divide-gray-200 dark:divide-[#333333]">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="px-4 py-4 flex items-center gap-4">
            <div className="w-5 h-5 bg-gray-200 dark:bg-[#2a2a2a] rounded animate-pulse" />
            <div className="w-24 h-4 bg-gray-200 dark:bg-[#2a2a2a] rounded animate-pulse" />
            <div className="w-32 h-4 bg-gray-200 dark:bg-[#2a2a2a] rounded animate-pulse" />
            <div className="w-20 h-4 bg-gray-200 dark:bg-[#2a2a2a] rounded animate-pulse" />
            <div className="flex-1">
              <div className="w-40 h-4 bg-gray-200 dark:bg-[#2a2a2a] rounded animate-pulse mb-1" />
              <div className="w-32 h-3 bg-gray-200 dark:bg-[#2a2a2a] rounded animate-pulse" />
            </div>
            <div className="w-20 h-4 bg-gray-200 dark:bg-[#2a2a2a] rounded animate-pulse" />
            <div className="w-24 h-6 bg-gray-200 dark:bg-[#2a2a2a] rounded-full animate-pulse" />
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
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-dark/50 border-b border-gray-200 dark:border-[#333333]">
            <tr>
              <th className="px-4 py-3 text-left whitespace-nowrap">
                <CustomCheckbox
                  checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                  onChange={toggleAllOrders}
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                Order #
              </th>
              {!filteredUserId && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  Merchant
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[120px]">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                Customer
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                Location
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                Value
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-[#333333] bg-white dark:bg-dark">
            {filteredOrders.map((order) => (
              <React.Fragment key={order.id}>
                <tr className="hover:bg-gray-50 dark:hover:bg-[#2a2a2a]/50">
                  <td className="px-4 py-4">
                    <CustomCheckbox
                      checked={selectedOrders.has(order.id)}
                      onChange={() => toggleOrderSelection(order.id)}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => handleViewDetails(order)}
                      className="text-sm font-medium text-gray-900 dark:text-white hover:text-rose-600 dark:hover:text-rose-400 underline underline-offset-2 decoration-gray-300 dark:decoration-gray-600 hover:decoration-rose-400 transition-colors"
                    >
                      {order.order_number.startsWith('#') ? order.order_number : `#${order.order_number}`}
                    </button>
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
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-[#2a2a2a] text-gray-800 dark:text-gray-200 whitespace-nowrap">
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
                      {!order.exported_to_3pl && (
                        <button
                          onClick={() => {
                            onSelectedOrdersChange(new Set([order.id]));
                            onExport();
                          }}
                          className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-md transition-colors"
                          title="Export to 3PL"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleChatClick(order)}
                        className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-md transition-colors"
                        title="Message"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      {getShopifyOrderUrl(order) && (
                        <a
                          href={getShopifyOrderUrl(order)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-md transition-colors"
                          title="View in Shopify"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {showDetailsModal && selectedOrder && (
        <Modal
          isOpen={showDetailsModal}
          title={`Order ${selectedOrder.order_number.startsWith('#') ? selectedOrder.order_number : `#${selectedOrder.order_number}`}`}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedOrder(null);
          }}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Customer Information</h4>
                  <div className="bg-gray-50 dark:bg-dark/50 rounded-lg p-4 space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Name</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedOrder.customer_first_name} {selectedOrder.customer_last_name}
                      </p>
                      {selectedOrder.is_repeat_customer && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 mt-1">
                          Repeat Customer {selectedOrder.order_count ? `(${selectedOrder.order_count})` : ''}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                      <a href={`mailto:${selectedOrder.customer_email}`} className="text-sm font-medium text-rose-600 dark:text-rose-400 hover:underline break-all">
                        {selectedOrder.customer_email || 'Not provided'}
                      </a>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                      {selectedOrder.customer_phone ? (
                        <a href={`tel:${selectedOrder.customer_phone}`} className="text-sm font-medium text-gray-900 dark:text-white hover:text-rose-600 dark:hover:text-rose-400">
                          {selectedOrder.customer_phone}
                        </a>
                      ) : (
                        <p className="text-sm text-gray-400 dark:text-gray-500 italic">Not provided</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Shipping Address</h4>
                  <div className="bg-gray-50 dark:bg-dark/50 rounded-lg p-4">
                    {selectedOrder.shipping_address_line1 ? (
                      <>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {selectedOrder.customer_first_name} {selectedOrder.customer_last_name}
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                          {selectedOrder.shipping_address_line1}
                        </p>
                        {selectedOrder.shipping_address_line2 && (
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {selectedOrder.shipping_address_line2}
                          </p>
                        )}
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {[selectedOrder.shipping_city, selectedOrder.shipping_state, selectedOrder.shipping_zip].filter(Boolean).join(', ')}
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {selectedOrder.shipping_country}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">No shipping address provided</p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Billing Address</h4>
                  <div className="bg-gray-50 dark:bg-dark/50 rounded-lg p-4">
                    {selectedOrder.billing_address_line1 ? (
                      <>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {selectedOrder.billing_address_line1}
                        </p>
                        {selectedOrder.billing_address_line2 && (
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {selectedOrder.billing_address_line2}
                          </p>
                        )}
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {[selectedOrder.billing_city, selectedOrder.billing_state, selectedOrder.billing_zip].filter(Boolean).join(', ')}
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {selectedOrder.billing_country}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">Same as shipping address</p>
                    )}
                  </div>
                </div>

                {selectedOrder.note && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Customer Note</h4>
                    <div className="bg-gray-50 dark:bg-dark/50 rounded-lg p-4">
                      <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{selectedOrder.note}"</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Order Details</h4>
                  <div className="bg-gray-50 dark:bg-dark/50 rounded-lg p-4 space-y-3">
                    {!filteredUserId && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Merchant</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {selectedOrder.merchant_name || 'Unknown'}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Order Date</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {format(new Date(selectedOrder.ordered_at || selectedOrder.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Fulfillment Status</p>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          selectedOrder.fulfillment_status === 'fulfilled'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                        }`}>
                          {selectedOrder.fulfillment_status || 'Unfulfilled'}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Payment Status</p>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          selectedOrder.financial_status === 'paid'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                        }`}>
                          {selectedOrder.financial_status || 'Pending'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Export Status</p>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        selectedOrder.export_status === 'exported'
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                      }`}>
                        {selectedOrder.export_status === 'exported' ? 'Exported' : 'Ready to Export'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Order Summary</h4>
                  <div className="bg-gray-50 dark:bg-dark/50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                      <span className="text-gray-900 dark:text-white">${(selectedOrder.subtotal_price || 0).toFixed(2)}</span>
                    </div>
                    {(selectedOrder.total_shipping || 0) > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Shipping</span>
                        <span className="text-gray-900 dark:text-white">${selectedOrder.total_shipping.toFixed(2)}</span>
                      </div>
                    )}
                    {(selectedOrder.total_tax || 0) > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Tax</span>
                        <span className="text-gray-900 dark:text-white">${selectedOrder.total_tax.toFixed(2)}</span>
                      </div>
                    )}
                    {(selectedOrder.total_discounts || 0) > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-red-500 dark:text-red-400">Discount</span>
                        <span className="text-red-600 dark:text-red-400">-${selectedOrder.total_discounts.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200 dark:border-[#333333]">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">Total</span>
                      <span className="font-semibold text-gray-900 dark:text-white">${(selectedOrder.total_price || 0).toFixed(2)}</span>
                    </div>
                    {selectedOrder.discount_codes && selectedOrder.discount_codes.length > 0 && (
                      <div className="pt-2 border-t border-gray-200 dark:border-[#333333]">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Discount Codes</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedOrder.discount_codes.map((code: string, idx: number) => (
                            <span key={idx} className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300">
                              {code}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {selectedOrder.line_items && selectedOrder.line_items.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Order Items ({selectedOrder.line_items.length})</h4>
                    <div className="bg-gray-50 dark:bg-dark/50 rounded-lg p-4 space-y-3 max-h-48 overflow-y-auto">
                      {selectedOrder.line_items.map((item, idx) => (
                        <div key={idx} className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {item.product_name}
                            </p>
                            {item.variant_name && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {item.variant_name}
                              </p>
                            )}
                            {item.sku && (
                              <p className="text-xs font-mono text-gray-400 dark:text-gray-500">
                                SKU: {item.sku}
                              </p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              x{item.quantity}
                            </p>
                            {item.price && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                ${(item.price * item.quantity).toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {getShopifyOrderUrl(selectedOrder) && (
              <div className="pt-2 border-t border-gray-200 dark:border-[#333333]">
                <a
                  href={getShopifyOrderUrl(selectedOrder)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  View in Shopify
                </a>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
