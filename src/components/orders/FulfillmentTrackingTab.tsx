import React, { useState, useEffect } from 'react';
import { Search, ExternalLink, RefreshCw, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import Button from '../Button';
import { toast } from 'sonner';

interface FulfillmentTrackingTabProps {
  filteredUserId?: string;
  isSuperAdmin: boolean;
  permissions: any;
  refreshKey: number;
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

export default function FulfillmentTrackingTab({
  filteredUserId,
  isSuperAdmin,
  permissions,
  refreshKey
}: FulfillmentTrackingTabProps) {
  const { user } = useAuth();
  const [fulfillments, setFulfillments] = useState<Fulfillment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [carrierFilter, setCarrierFilter] = useState<string>('all');
  const [syncStatusFilter, setSyncStatusFilter] = useState<string>('all');
  const [syncing, setSyncing] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadFulfillments();
  }, [user?.id, filteredUserId, refreshKey]);

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

      // Build filter for merchant access
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

      if (data) {
        // Get merchant names
        const userIds = [...new Set(data.map((f: any) => f.shopify_orders.user_id))];
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, first_name, last_name, business_name')
          .in('id', userIds);

        const profileMap = new Map(
          profiles?.map(p => [
            p.id,
            p.business_name || `${p.first_name || ''} ${p.last_name || ''}`.trim()
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
      }
    } catch (error) {
      console.error('Error loading fulfillments:', error);
      toast.error('Failed to load fulfillments');
    } finally {
      setLoading(false);
    }
  };

  const handleResync = async (fulfillmentId: string) => {
    if (!permissions?.can_sync_to_shopify) {
      toast.error('You do not have permission to sync to Shopify');
      return;
    }

    setSyncing(prev => new Set(prev).add(fulfillmentId));

    try {
      const { error } = await supabase.functions.invoke('shopify-sync-fulfillments', {
        body: { fulfillmentId }
      });

      if (error) throw error;

      toast.success('Fulfillment synced to Shopify');
      loadFulfillments();
    } catch (error: any) {
      console.error('Error syncing fulfillment:', error);
      toast.error(error.message || 'Failed to sync fulfillment');
    } finally {
      setSyncing(prev => {
        const next = new Set(prev);
        next.delete(fulfillmentId);
        return next;
      });
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
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Synced
        </span>
      );
    } else if (fulfillment.sync_error) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200">
          <AlertCircle className="w-3 h-3 mr-1" />
          Failed
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </span>
      );
    }
  };

  const filteredFulfillments = fulfillments.filter(f => {
    // Search filter
    const searchMatch =
      f.order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.tracking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.order.customer_first_name + ' ' + f.order.customer_last_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.order.merchant_name?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!searchMatch) return false;

    // Carrier filter
    if (carrierFilter !== 'all' && f.tracking_company !== carrierFilter) return false;

    // Sync status filter
    if (syncStatusFilter === 'synced' && !f.synced_to_shopify) return false;
    if (syncStatusFilter === 'pending' && f.synced_to_shopify) return false;
    if (syncStatusFilter === 'failed' && !f.sync_error) return false;

    return true;
  });

  const carriers = [...new Set(fulfillments.map(f => f.tracking_company))].filter(Boolean);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-400 mt-4">Loading fulfillments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search orders, tracking numbers..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={carrierFilter}
          onChange={(e) => setCarrierFilter(e.target.value)}
          className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Carriers</option>
          {carriers.map(carrier => (
            <option key={carrier} value={carrier}>{carrier}</option>
          ))}
        </select>

        <select
          value={syncStatusFilter}
          onChange={(e) => setSyncStatusFilter(e.target.value)}
          className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="synced">Synced</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Fulfillments Table */}
      {filteredFulfillments.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm ? 'No fulfillments match your search' : 'No fulfillments found'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Shipped Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Shopify Sync
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredFulfillments.map((fulfillment) => (
                <tr key={fulfillment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-4">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      #{fulfillment.order.order_number}
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
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      {fulfillment.tracking_number}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {fulfillment.tracking_company}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {format(new Date(fulfillment.shipped_at), 'MMM d, yyyy')}
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
                    {permissions?.can_sync_to_shopify && !fulfillment.synced_to_shopify && (
                      <Button
                        onClick={() => handleResync(fulfillment.id)}
                        disabled={syncing.has(fulfillment.id)}
                        size="sm"
                        className="text-xs"
                      >
                        <RefreshCw className={`w-3 h-3 mr-1 ${syncing.has(fulfillment.id) ? 'animate-spin' : ''}`} />
                        {syncing.has(fulfillment.id) ? 'Syncing...' : 'Re-sync'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
