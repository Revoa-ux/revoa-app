import React, { useState, useEffect } from 'react';
import {
  Building2,
  DollarSign,
  Package,
  MessageSquare,
  Clock,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Send,
  Store,
  ExternalLink,
  Phone
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format, formatDistanceToNow } from 'date-fns';

interface CollapsibleClientProfileProps {
  userId: string;
  isExpanded: boolean;
}

interface ProfileData {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  created_at: string;
  last_login: string | null;
  store_url: string | null;
  store_status: string | null;
  store_installed_at: string | null;
}

interface MetricsData {
  paid_invoices_total: number;
  paid_invoices_count: number;
  pending_invoices_total: number;
  pending_invoices_count: number;
  last_invoice_sent_date: string | null;
  last_invoice_sent_amount: number;
  last_invoice_paid_date: string | null;
  last_invoice_paid_amount: number;
  unfulfilled_orders: number;
  fulfilled_orders: number;
  total_fulfillment_revenue: number;
  last_fulfillment_date: string | null;
  average_fulfillment_days: number;
  total_messages: number;
  last_interaction: string | null;
  typical_response_time: string | null;
  typical_response_timezone: string | null;
}

export const CollapsibleClientProfile: React.FC<CollapsibleClientProfileProps> = ({
  userId,
  isExpanded
}) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [metrics, setMetrics] = useState<MetricsData>({
    paid_invoices_total: 0,
    paid_invoices_count: 0,
    pending_invoices_total: 0,
    pending_invoices_count: 0,
    last_invoice_sent_date: null,
    last_invoice_sent_amount: 0,
    last_invoice_paid_date: null,
    last_invoice_paid_amount: 0,
    unfulfilled_orders: 0,
    fulfilled_orders: 0,
    total_fulfillment_revenue: 0,
    last_fulfillment_date: null,
    average_fulfillment_days: 0,
    total_messages: 0,
    last_interaction: null,
    typical_response_time: null,
    typical_response_timezone: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, [userId]);

  const loadProfileData = async () => {
    try {
      setLoading(true);

      // Load profile
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, email, phone, company_name, created_at, last_login')
        .eq('user_id', userId)
        .maybeSingle();

      // Load Shopify store
      const { data: shopifyData } = await supabase
        .from('shopify_installations')
        .select('store_url, status, installed_at')
        .eq('user_id', userId)
        .is('uninstalled_at', null)
        .maybeSingle();

      if (profileData) {
        setProfile({
          ...profileData,
          store_url: shopifyData?.store_url || null,
          store_status: shopifyData?.status || null,
          store_installed_at: shopifyData?.installed_at || null
        });
      }

      // Load paid invoices
      const { data: paidInvoices } = await supabase
        .from('payment_intents')
        .select('amount, created_at')
        .eq('user_id', userId)
        .eq('status', 'succeeded')
        .order('created_at', { ascending: false });

      // Load pending invoices
      const { data: pendingInvoices } = await supabase
        .from('payment_intents')
        .select('amount, created_at')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      // Load most recent invoice (any status)
      const { data: allInvoices } = await supabase
        .from('payment_intents')
        .select('amount, created_at, status')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      // Load unfulfilled orders (quotes that are accepted but not fulfilled)
      const { count: unfulfilledCount } = await supabase
        .from('product_quotes')
        .select('*', { count: 'only', head: true })
        .eq('user_id', userId)
        .eq('status', 'accepted')
        .is('fulfilled_at', null);

      // Load message count
      const { count: messageCount } = await supabase
        .from('messages')
        .select('*', { count: 'only', head: true })
        .eq('user_id', userId);

      // Load last interaction
      const { data: lastMessage } = await supabase
        .from('messages')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get user's messages to determine typical response time
      const { data: userMessages } = await supabase
        .from('messages')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      let typicalResponseTime: string | null = null;
      let typicalResponseTimezone: string | null = null;

      if (userMessages && userMessages.length >= 5) {
        const hours = userMessages.map(msg => new Date(msg.created_at).getUTCHours());
        const hourCounts: { [key: number]: number } = {};
        hours.forEach(hour => {
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });

        const mostCommonHour = Object.entries(hourCounts)
          .sort(([, a], [, b]) => b - a)[0]?.[0];

        if (mostCommonHour !== undefined) {
          const hour = parseInt(mostCommonHour);
          const timezoneOffset = Math.round((new Date().getTimezoneOffset() / 60) * -1);
          const localHour = (hour + timezoneOffset + 24) % 24;
          const period = localHour >= 12 ? 'PM' : 'AM';
          const displayHour = localHour === 0 ? 12 : localHour > 12 ? localHour - 12 : localHour;
          typicalResponseTime = `${displayHour}:00 ${period}`;

          if (hour >= 12 && hour <= 16) {
            typicalResponseTimezone = 'China Time';
          } else if (hour >= 8 && hour <= 12) {
            typicalResponseTimezone = 'EST';
          } else {
            typicalResponseTimezone = 'UTC';
          }
        }
      }

      // Fetch fulfillment data from order_line_items
      const { data: fulfilledItems } = await supabase
        .from('order_line_items')
        .select('quantity, total_cost, fulfilled_at, created_at')
        .eq('user_id', userId)
        .eq('fulfillment_status', 'fulfilled')
        .not('fulfilled_at', 'is', null);

      let avgFulfillmentDays = 0;
      let totalUnitsFulfilled = 0;
      let fulfilledOrdersCount = 0;
      let totalFulfillmentRevenue = 0;
      let lastFulfillmentDate: string | null = null;

      if (fulfilledItems && fulfilledItems.length > 0) {
        totalUnitsFulfilled = fulfilledItems.reduce((sum, item) => sum + item.quantity, 0);
        totalFulfillmentRevenue = fulfilledItems.reduce((sum, item) => sum + Number(item.total_cost), 0);

        const uniqueOrders = new Set(
          fulfilledItems.map(item => new Date(item.fulfilled_at!).toISOString())
        );
        fulfilledOrdersCount = uniqueOrders.size;

        const totalDays = fulfilledItems.reduce((sum, item) => {
          const created = new Date(item.created_at);
          const fulfilled = new Date(item.fulfilled_at!);
          const days = (fulfilled.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0);
        avgFulfillmentDays = Math.round(totalDays / fulfilledItems.length);

        const sortedByFulfilled = [...fulfilledItems].sort((a, b) =>
          new Date(b.fulfilled_at!).getTime() - new Date(a.fulfilled_at!).getTime()
        );
        lastFulfillmentDate = sortedByFulfilled[0]?.fulfilled_at || null;
      }

      const lastPaidInvoice = paidInvoices?.[0];
      const lastSentInvoice = allInvoices?.[0];

      setMetrics({
        paid_invoices_total: paidInvoices?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0,
        paid_invoices_count: paidInvoices?.length || 0,
        pending_invoices_total: pendingInvoices?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0,
        pending_invoices_count: pendingInvoices?.length || 0,
        last_invoice_sent_date: lastSentInvoice?.created_at || null,
        last_invoice_sent_amount: lastSentInvoice ? Number(lastSentInvoice.amount) : 0,
        last_invoice_paid_date: lastPaidInvoice?.created_at || null,
        last_invoice_paid_amount: lastPaidInvoice ? Number(lastPaidInvoice.amount) : 0,
        unfulfilled_orders: unfulfilledCount || 0,
        fulfilled_orders: fulfilledOrdersCount,
        total_fulfillment_revenue: totalFulfillmentRevenue,
        last_fulfillment_date: lastFulfillmentDate,
        average_fulfillment_days: avgFulfillmentDays,
        total_messages: messageCount || 0,
        last_interaction: lastMessage?.created_at || null,
        typical_response_time: typicalResponseTime,
        typical_response_timezone: typicalResponseTimezone
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const displayName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile?.email || 'Unknown User';

  const initials = profile?.first_name && profile?.last_name
    ? `${profile.first_name[0]}${profile.last_name[0]}`
    : (profile?.email?.[0] || 'U').toUpperCase();

  if (!isExpanded) {
    return null;
  }

  if (loading) {
    return (
      <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Client Profile</h3>
        </div>

        {/* Overview Section */}
        <div className="px-4 py-4 space-y-3 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Overview</h4>

          {profile?.phone && (
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Phone className="w-4 h-4 mr-2" />
              <span className="text-xs">{profile.phone}</span>
            </div>
          )}

          {profile?.company_name && (
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Building2 className="w-4 h-4 mr-2" />
              <span className="text-xs">{profile.company_name}</span>
            </div>
          )}

          {profile?.last_login && (
            <div className="flex items-center justify-between">
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4 mr-2" />
                <span className="text-xs">Last Active</span>
              </div>
              <span className="text-xs text-gray-900 dark:text-white">
                {formatDistanceToNow(new Date(profile.last_login), { addSuffix: true })}
              </span>
            </div>
          )}
        </div>

        {/* Financial Metrics */}
        <div className="px-4 py-4 space-y-3 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Financial</h4>

          {/* Last Invoice Sent */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Send className="w-4 h-4 mr-2" />
              <span className="text-xs">Last Invoice Sent</span>
            </div>
            <div className="text-right">
              {metrics.last_invoice_sent_date ? (
                <>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    ${metrics.last_invoice_sent_amount.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(metrics.last_invoice_sent_date), { addSuffix: true })}
                  </p>
                </>
              ) : (
                <span className="text-xs text-gray-500 dark:text-gray-400">None</span>
              )}
            </div>
          </div>

          {/* Last Invoice Paid */}
          <div className="flex items-center justify-between py-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <CheckCircle className="w-4 h-4 mr-2" />
              <span className="text-xs">Last Invoice Paid</span>
            </div>
            <div className="text-right">
              {metrics.last_invoice_paid_date ? (
                <>
                  <p className="text-sm font-bold text-green-600 dark:text-green-400">
                    ${metrics.last_invoice_paid_amount.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(metrics.last_invoice_paid_date), { addSuffix: true })}
                  </p>
                </>
              ) : (
                <span className="text-xs text-gray-500 dark:text-gray-400">None</span>
              )}
            </div>
          </div>

          {/* Pending Invoices */}
          {metrics.pending_invoices_count > 0 && (
            <div className="flex items-center justify-between py-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <AlertCircle className="w-4 h-4 mr-2" />
                <span className="text-xs">Pending Invoices</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
                  ${metrics.pending_invoices_total.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {metrics.pending_invoices_count} invoice{metrics.pending_invoices_count > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Order Metrics */}
        <div className="px-4 py-4 space-y-3 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Orders</h4>

          {/* Unfulfilled Orders */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Package className="w-4 h-4 mr-2" />
              <span className="text-xs">Unfulfilled Orders</span>
            </div>
            <span className={`text-sm font-bold ${
              metrics.unfulfilled_orders > 0
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-gray-900 dark:text-white'
            }`}>
              {metrics.unfulfilled_orders}
            </span>
          </div>

          {/* Fulfilled Orders */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <CheckCircle className="w-4 h-4 mr-2" />
              <span className="text-xs">Fulfilled Orders</span>
            </div>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {metrics.fulfilled_orders}
            </span>
          </div>

          {/* Total Fulfillment Revenue */}
          {metrics.total_fulfillment_revenue > 0 && (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <DollarSign className="w-4 h-4 mr-2" />
                <span className="text-xs">Total Fulfillment Revenue</span>
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                ${metrics.total_fulfillment_revenue.toFixed(2)}
              </span>
            </div>
          )}

          {/* Last Fulfilled */}
          {metrics.last_fulfillment_date && (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4 mr-2" />
                <span className="text-xs">Last Fulfilled</span>
              </div>
              <span className="text-xs text-gray-900 dark:text-white">
                {formatDistanceToNow(new Date(metrics.last_fulfillment_date), { addSuffix: true })}
              </span>
            </div>
          )}

          {/* Average Fulfillment Time */}
          {metrics.average_fulfillment_days > 0 && (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <TrendingUp className="w-4 h-4 mr-2" />
                <span className="text-xs">Avg Fulfillment Time</span>
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {metrics.average_fulfillment_days} days
              </span>
            </div>
          )}
        </div>

        {/* Store Section */}
        {profile?.store_url && (
          <div className="px-4 py-4 space-y-3 border-b border-gray-200 dark:border-gray-700">
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Shopify Store</h4>

            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Store className="w-4 h-4 mr-2" />
              <a
                href={`https://${profile.store_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-pink-600 hover:text-pink-700 flex items-center"
              >
                {profile.store_url}
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>

            {profile?.store_status && (
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-gray-600 dark:text-gray-400">Status</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  profile.store_status === 'active'
                    ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-gray-50 text-gray-700 dark:bg-gray-900/50 dark:text-gray-400'
                }`}>
                  {profile.store_status}
                </span>
              </div>
            )}

            {profile?.store_installed_at && (
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-gray-600 dark:text-gray-400">Connected</span>
                <span className="text-xs text-gray-900 dark:text-white">
                  {formatDistanceToNow(new Date(profile.store_installed_at), { addSuffix: true })}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Communication */}
        <div className="px-4 py-4 space-y-3">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Communication</h4>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <MessageSquare className="w-4 h-4 mr-2" />
              <span className="text-xs">Total Messages</span>
            </div>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {metrics.total_messages}
            </span>
          </div>

          {metrics.last_interaction && (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4 mr-2" />
                <span className="text-xs">Last Interaction</span>
              </div>
              <span className="text-xs text-gray-900 dark:text-white">
                {formatDistanceToNow(new Date(metrics.last_interaction), { addSuffix: true })}
              </span>
            </div>
          )}

          {metrics.typical_response_time && (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4 mr-2" />
                <span className="text-xs">Typically Responds At</span>
              </div>
              <span className="text-xs text-gray-900 dark:text-white">
                {metrics.typical_response_time} {metrics.typical_response_timezone}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
