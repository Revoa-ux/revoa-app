import React, { useState, useEffect } from 'react';
import { ExternalLink, CheckCircle2, Clock, AlertCircle, MessageSquare, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from '../../lib/toast';
import Modal from '../../components/Modal';
import { getShopifyOrderUrl } from '../../lib/shopifyOrders';

interface FulfillmentTrackingTabProps {
  filteredUserId?: string;
  isSuperAdmin: boolean;
  permissions: any;
  refreshKey: number;
  searchTerm: string;
  carrierFilter: string;
  syncStatusFilter: string;
  onCarriersLoaded: (carriers: string[]) => void;
  onImport: () => void;
  onRefresh?: () => void;
}

interface Fulfillment {
  id: string;
  order_id: string;
  tracking_number: string;
  tracking_company: string;
  tracking_url: string | null;
  shipment_status: string;
  shipped_at: string;
  delivered_at: string | null;
  estimated_delivery: string | null;
  synced_to_shopify: boolean;
  synced_to_shopify_at: string | null;
  sync_error: string | null;
  order: {
    order_number: string;
    shopify_order_id: string;
    user_id: string;
    customer_first_name: string;
    customer_last_name: string;
    merchant_name?: string;
  };
}

interface OrderDetails {
  id: string;
  order_number: string;
  customer_first_name: string | null;
  customer_last_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  shipping_address_line1: string | null;
  shipping_address_line2: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_zip: string | null;
  shipping_country: string | null;
  billing_address_line1: string | null;
  billing_address_line2: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_zip: string | null;
  billing_country: string | null;
  total_price: number;
  subtotal_price: number;
  total_tax: number;
  total_shipping: number;
  total_discounts: number;
  discount_codes: string[];
  ordered_at: string;
  created_at: string;
  fulfillment_status: string | null;
  financial_status: string | null;
  is_repeat_customer: boolean;
  order_count: number;
  note: string | null;
  merchant_name?: string;
  shopify_domain?: string;
  shopify_order_id?: string;
  line_items?: any[];
}

export default function FulfillmentTrackingTab({
  filteredUserId,
  isSuperAdmin,
  permissions,
  refreshKey,
  searchTerm,
  carrierFilter,
  syncStatusFilter,
  onCarriersLoaded,
  onImport,
  onRefresh
}: FulfillmentTrackingTabProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fulfillments, setFulfillments] = useState<Fulfillment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  useEffect(() => {
    loadFulfillments();
  }, [user?.id, filteredUserId, refreshKey]);

  const loadOrderDetails = async (fulfillment: Fulfillment) => {
    setLoadingOrder(true);
    setShowDetailsModal(true);

    try {
      const { data: order, error } = await supabase
        .from('shopify_orders')
        .select(`
          id,
          order_number,
          customer_first_name,
          customer_last_name,
          customer_email,
          customer_phone,
          shipping_address_line1,
          shipping_address_line2,
          shipping_city,
          shipping_state,
          shipping_zip,
          shipping_country,
          billing_address_line1,
          billing_address_line2,
          billing_city,
          billing_state,
          billing_zip,
          billing_country,
          total_price,
          subtotal_price,
          total_tax,
          total_shipping,
          total_discounts,
          discount_codes,
          ordered_at,
          created_at,
          fulfillment_status,
          financial_status,
          is_repeat_customer,
          order_count,
          note,
          shopify_order_id
        `)
        .eq('shopify_order_id', fulfillment.order.shopify_order_id)
        .maybeSingle();

      if (error) throw error;

      if (order) {
        const { data: lineItems } = await supabase
          .from('order_line_items')
          .select('*')
          .eq('shopify_order_id', order.shopify_order_id);

        setSelectedOrder({
          ...order,
          merchant_name: fulfillment.order.merchant_name,
          line_items: lineItems || []
        });
      } else {
        toast.error('Order not found');
        setShowDetailsModal(false);
      }
    } catch (error) {
      console.error('Error loading order details:', error);
      toast.error('Failed to load order details');
      setShowDetailsModal(false);
    } finally {
      setLoadingOrder(false);
    }
  };

  const handleChatClick = async (fulfillment: Fulfillment) => {
    try {
      const { data: existingThread } = await supabase
        .from('chat_threads')
        .select('id, chat_id')
        .eq('shopify_order_id', fulfillment.order.shopify_order_id)
        .maybeSingle();

      if (existingThread) {
        navigate(`/admin/chat?chatId=${existingThread.chat_id}&threadId=${existingThread.id}`);
      } else {
        const { data: chat } = await supabase
          .from('chats')
          .select('id')
          .eq('user_id', fulfillment.order.user_id)
          .maybeSingle();

        if (chat) {
          navigate(`/admin/chat?chatId=${chat.id}&createThread=order&orderId=${fulfillment.order.shopify_order_id}`);
        } else {
          toast.error('No chat found for this merchant');
        }
      }
    } catch (error) {
      console.error('Error navigating to chat:', error);
      toast.error('Failed to open chat');
    }
  };

  const loadFulfillments = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      let query = supabase
        .from('shopify_orders')
        .select('*')
        .eq('exported_to_3pl', true)
        .or('tracking_imported.is.null,tracking_imported.eq.false')
        .is('cancelled_at', null)
        .order('exported_at', { ascending: false });

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
          setFulfillments([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((order: any) => order.user_id))];
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

        const ordersWithMerchants = data.map((order: any) => ({
          id: order.id,
          order_id: order.id,
          tracking_number: null,
          tracking_company: null,
          tracking_url: null,
          shipment_status: 'pending_tracking',
          shipped_at: order.exported_at,
          delivered_at: null,
          estimated_delivery: null,
          synced_to_shopify: false,
          synced_to_shopify_at: null,
          sync_error: null,
          order: {
            order_number: order.order_number,
            shopify_order_id: order.shopify_order_id,
            user_id: order.user_id,
            customer_first_name: order.customer_first_name,
            customer_last_name: order.customer_last_name,
            merchant_name: profileMap.get(order.user_id) || 'Unknown'
          }
        }));

        setFulfillments(ordersWithMerchants);
        onCarriersLoaded([]);
      } else {
        setFulfillments([]);
        onCarriersLoaded([]);
      }
    } catch (error) {
      console.error('Error loading fulfillments:', error);
      toast.error('Failed to load fulfillments');
    } finally {
      setLoading(false);
    }
  };

  const getTrackingUrl = (trackingNumber: string, carrier: string) => {
    const carrierUrls: Record<string, string> = {
      'USPS': `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
      'UPS': `https://www.ups.com/track?tracknum=${trackingNumber}`,
      'FedEx': `https://www.fedex.com/fedextrack/?tracknumbers=${trackingNumber}`,
      'DHL': `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
      'YunExpress': `https://www.yuntrack.com/Track/Index/${trackingNumber}`,
    };

    return carrierUrls[carrier] || `https://www.google.com/search?q=${trackingNumber}+tracking`;
  };

  const getSyncStatusBadge = (fulfillment: Fulfillment) => {
    if (fulfillment.synced_to_shopify) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 w-fit">
          <CheckCircle2 className="w-3 h-3" />
          Synced
        </span>
      );
    } else if (fulfillment.sync_error) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 w-fit">
          <AlertCircle className="w-3 h-3" />
          Failed
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 w-fit">
          <Clock className="w-3 h-3" />
          Pending
        </span>
      );
    }
  };

  const filteredFulfillments = fulfillments.filter(f => {
    const searchMatch =
      f.order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.tracking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${f.order.customer_first_name || ''} ${f.order.customer_last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.order.merchant_name?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!searchMatch) return false;

    if (carrierFilter !== 'all' && f.tracking_company !== carrierFilter) return false;

    if (syncStatusFilter === 'synced' && !f.synced_to_shopify) return false;
    if (syncStatusFilter === 'pending' && (f.synced_to_shopify || f.sync_error)) return false;
    if (syncStatusFilter === 'failed' && !f.sync_error) return false;

    return true;
  });

  if (loading) {
    return (
      <div className="divide-y divide-gray-200 dark:divide-[#333333]">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="px-4 py-4 flex items-center gap-4">
            <div className="w-24 h-4 bg-gray-200 dark:bg-[#2a2a2a] rounded animate-pulse" />
            <div className="w-32 h-4 bg-gray-200 dark:bg-[#2a2a2a] rounded animate-pulse" />
            <div className="w-40 h-4 bg-gray-200 dark:bg-[#2a2a2a] rounded animate-pulse" />
            <div className="w-20 h-4 bg-gray-200 dark:bg-[#2a2a2a] rounded animate-pulse" />
            <div className="w-24 h-4 bg-gray-200 dark:bg-[#2a2a2a] rounded animate-pulse" />
            <div className="w-20 h-6 bg-gray-200 dark:bg-[#2a2a2a] rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (filteredFulfillments.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">
          {searchTerm ? 'No fulfillments match your search' : 'No fulfillments found'}
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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                Order #
              </th>
              {!filteredUserId && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  Merchant
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                Customer
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                Tracking Number
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                Carrier
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[120px]">
                Shipped
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                Sync
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-[#333333] bg-white dark:bg-dark">
            {filteredFulfillments.map((fulfillment) => (
              <tr
                key={fulfillment.id}
                className="hover:bg-gray-50 dark:hover:bg-[#2a2a2a]/50 cursor-pointer"
                onClick={() => loadOrderDetails(fulfillment)}
              >
                <td className="px-4 py-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      loadOrderDetails(fulfillment);
                    }}
                    className="text-sm font-medium text-gray-900 dark:text-white hover:text-rose-600 dark:hover:text-rose-400 underline underline-offset-2 decoration-gray-300 dark:decoration-gray-600 hover:decoration-rose-400 transition-colors"
                  >
                    {fulfillment.order.order_number.startsWith('#') ? fulfillment.order.order_number : `#${fulfillment.order.order_number}`}
                  </button>
                </td>
                {!filteredUserId && (
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {fulfillment.order.merchant_name}
                    </span>
                  </td>
                )}
                <td className="px-4 py-4">
                  <span className="text-sm text-gray-900 dark:text-white">
                    {fulfillment.order.customer_first_name} {fulfillment.order.customer_last_name}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <a
                    href={getTrackingUrl(fulfillment.tracking_number, fulfillment.tracking_company)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-900 dark:text-white hover:underline flex items-center gap-1"
                  >
                    {fulfillment.tracking_number}
                    <ExternalLink className="w-3 h-3 text-gray-400" />
                  </a>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {fulfillment.tracking_company}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {fulfillment.shipped_at ? format(new Date(fulfillment.shipped_at), 'MMM d, yyyy') : '-'}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-col gap-1">
                    {getSyncStatusBadge(fulfillment)}
                    {fulfillment.sync_error && (
                      <p className="text-xs text-red-600 dark:text-red-400" title={fulfillment.sync_error}>
                        {fulfillment.sync_error.substring(0, 30)}...
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    {!fulfillment.synced_to_shopify && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onImport();
                        }}
                        className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-md transition-colors"
                        title="Import tracking"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChatClick(fulfillment);
                      }}
                      className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-md transition-colors"
                      title="Message"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showDetailsModal && (
        <Modal
          isOpen={showDetailsModal}
          title={selectedOrder ? `Order ${selectedOrder.order_number.startsWith('#') ? selectedOrder.order_number : `#${selectedOrder.order_number}`}` : 'Loading...'}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedOrder(null);
          }}
          maxWidth="max-w-3xl"
        >
          {loadingOrder ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            </div>
          ) : selectedOrder ? (
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
                        {selectedOrder.line_items.map((item: any, idx: number) => (
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
                              {item.unit_price && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  ${(item.unit_price * item.quantity).toFixed(2)}
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

              {selectedOrder.id && (
                <div className="pt-2 border-t border-gray-200 dark:border-[#333333]">
                  <button
                    onClick={async () => {
                      const url = await getShopifyOrderUrl(selectedOrder.id);
                      if (url) window.open(url, '_blank');
                    }}
                    className="inline-flex items-center gap-2 text-sm text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-medium"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View in Shopify
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </Modal>
      )}
    </>
  );
}
