import React, { useState, useEffect } from 'react';
import { ExternalLink, CheckCircle2, Clock, AlertCircle, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface FulfillmentTrackingTabProps {
  filteredUserId?: string;
  isSuperAdmin: boolean;
  permissions: any;
  refreshKey: number;
  searchTerm: string;
  carrierFilter: string;
  syncStatusFilter: string;
  onCarriersLoaded: (carriers: string[]) => void;
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

const SHOW_MOCK_DATA = true;

const MOCK_FULFILLMENTS: Fulfillment[] = [
  {
    id: 'mock-1',
    order_id: 'order-1',
    tracking_number: 'YT2412345678901234',
    tracking_company: 'YunExpress',
    tracking_url: null,
    shipment_status: 'in_transit',
    shipped_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    delivered_at: null,
    estimated_delivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    synced_to_shopify: false,
    synced_to_shopify_at: null,
    sync_error: null,
    order: {
      order_number: '#1042',
      shopify_order_id: 'gid://shopify/Order/1001',
      user_id: 'user-1',
      customer_first_name: 'John',
      customer_last_name: 'Smith',
      merchant_name: 'Acme Electronics'
    }
  },
  {
    id: 'mock-2',
    order_id: 'order-2',
    tracking_number: 'YT2498765432109876',
    tracking_company: 'YunExpress',
    tracking_url: null,
    shipment_status: 'in_transit',
    shipped_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    delivered_at: null,
    estimated_delivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    synced_to_shopify: true,
    synced_to_shopify_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    sync_error: null,
    order: {
      order_number: '#1043',
      shopify_order_id: 'gid://shopify/Order/1002',
      user_id: 'user-1',
      customer_first_name: 'Sarah',
      customer_last_name: 'Johnson',
      merchant_name: 'Acme Electronics'
    }
  },
  {
    id: 'mock-3',
    order_id: 'order-3',
    tracking_number: '1Z999AA10123456784',
    tracking_company: 'UPS',
    tracking_url: null,
    shipment_status: 'delivered',
    shipped_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    delivered_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    estimated_delivery: null,
    synced_to_shopify: true,
    synced_to_shopify_at: new Date().toISOString(),
    sync_error: null,
    order: {
      order_number: '#1039',
      shopify_order_id: 'gid://shopify/Order/1003',
      user_id: 'user-2',
      customer_first_name: 'Michael',
      customer_last_name: 'Brown',
      merchant_name: 'Tech Gadgets Pro'
    }
  },
  {
    id: 'mock-4',
    order_id: 'order-4',
    tracking_number: 'YT2411223344556677',
    tracking_company: 'YunExpress',
    tracking_url: null,
    shipment_status: 'pending',
    shipped_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    delivered_at: null,
    estimated_delivery: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
    synced_to_shopify: false,
    synced_to_shopify_at: null,
    sync_error: 'Connection timeout',
    order: {
      order_number: '#1044',
      shopify_order_id: 'gid://shopify/Order/1004',
      user_id: 'user-2',
      customer_first_name: 'Emily',
      customer_last_name: 'Davis',
      merchant_name: 'Tech Gadgets Pro'
    }
  },
  {
    id: 'mock-5',
    order_id: 'order-5',
    tracking_number: '420123459400110200793031234567',
    tracking_company: 'USPS',
    tracking_url: null,
    shipment_status: 'in_transit',
    shipped_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    delivered_at: null,
    estimated_delivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    synced_to_shopify: true,
    synced_to_shopify_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    sync_error: null,
    order: {
      order_number: '#1038',
      shopify_order_id: 'gid://shopify/Order/1005',
      user_id: 'user-3',
      customer_first_name: 'David',
      customer_last_name: 'Wilson',
      merchant_name: 'Home Essentials'
    }
  }
];

export default function FulfillmentTrackingTab({
  filteredUserId,
  isSuperAdmin,
  permissions,
  refreshKey,
  searchTerm,
  carrierFilter,
  syncStatusFilter,
  onCarriersLoaded
}: FulfillmentTrackingTabProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fulfillments, setFulfillments] = useState<Fulfillment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFulfillments();
  }, [user?.id, filteredUserId, refreshKey]);

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
        .from('shopify_order_fulfillments')
        .select(`
          *,
          shopify_orders!inner(
            order_number,
            shopify_order_id,
            user_id,
            customer_first_name,
            customer_last_name
          )
        `)
        .order('shipped_at', { ascending: false });

      if (filteredUserId) {
        query = query.eq('shopify_orders.user_id', filteredUserId);
      } else if (!isSuperAdmin) {
        const { data: assignments } = await supabase
          .from('user_assignments')
          .select('user_id')
          .eq('admin_id', user.id);

        if (assignments && assignments.length > 0) {
          const merchantIds = assignments.map(a => a.user_id);
          query = query.in('shopify_orders.user_id', merchantIds);
        } else {
          setFulfillments([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((f: any) => f.shopify_orders.user_id))];
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

        const fulfillmentsWithMerchants = data.map((f: any) => ({
          ...f,
          order: {
            ...f.shopify_orders,
            merchant_name: profileMap.get(f.shopify_orders.user_id) || 'Unknown'
          }
        }));

        setFulfillments(fulfillmentsWithMerchants);

        const uniqueCarriers = [...new Set(data.map((f: any) => f.tracking_company).filter(Boolean))];
        onCarriersLoaded(uniqueCarriers as string[]);
      } else if (SHOW_MOCK_DATA) {
        setFulfillments(MOCK_FULFILLMENTS);
        const mockCarriers = [...new Set(MOCK_FULFILLMENTS.map(f => f.tracking_company))];
        onCarriersLoaded(mockCarriers);
      } else {
        setFulfillments([]);
        onCarriersLoaded([]);
      }
    } catch (error) {
      console.error('Error loading fulfillments:', error);
      if (SHOW_MOCK_DATA) {
        setFulfillments(MOCK_FULFILLMENTS);
        const mockCarriers = [...new Set(MOCK_FULFILLMENTS.map(f => f.tracking_company))];
        onCarriersLoaded(mockCarriers);
      } else {
        toast.error('Failed to load fulfillments');
      }
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
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Synced
        </span>
      );
    } else if (fulfillment.sync_error) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
          <AlertCircle className="w-3 h-3 mr-1" />
          Failed
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">
          <Clock className="w-3 h-3 mr-1" />
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
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="px-4 py-4 flex items-center gap-4">
            <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="w-40 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="w-20 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
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
    <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Order #
              </th>
              {!filteredUserId && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Merchant
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Tracking Number
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Carrier
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider min-w-[120px]">
                Shipped
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Sync
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
            {filteredFulfillments.map((fulfillment) => (
              <tr key={fulfillment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-4">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {fulfillment.order.order_number.startsWith('#') ? fulfillment.order.order_number : `#${fulfillment.order.order_number}`}
                  </span>
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
                    <button
                      onClick={() => handleChatClick(fulfillment)}
                      className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
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
  );
}
