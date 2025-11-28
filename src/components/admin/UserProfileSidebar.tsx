import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Building2,
  Calendar,
  DollarSign,
  ShoppingCart,
  FileText,
  TrendingUp,
  Store,
  Package,
  Clock,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Send,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

interface UserProfileSidebarProps {
  userId: string;
  onClose: () => void;
  showHeader?: boolean;
}

interface UserStats {
  name: string | null;
  email: string;
  phone: string | null;
  company: string | null;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  last_login: string | null;
  store_type: string | null;
  onboarding_completed_at: string | null;

  // Financial metrics
  total_transactions: number;
  total_invoices: number;
  total_paid: number;
  total_pending: number;
  last_invoice_sent_date: string | null;
  last_invoice_sent_amount: number;
  last_invoice_paid_date: string | null;
  last_invoice_paid_amount: number;
  unfulfilled_orders: number;

  // Shopify store
  store_url: string | null;
  store_status: string | null;
  store_installed_at: string | null;

  // Activity
  last_interaction_at: string | null;
  total_messages: number;
  unread_messages: number;
  typical_response_time: string | null;
  typical_response_timezone: string | null;

  // Fulfillment metrics
  total_units_fulfilled: number;
  fulfilled_orders: number;
  total_fulfillment_revenue: number;
  avg_fulfillment_days: number | null;
  last_fulfillment_date: string | null;
}

export const UserProfileSidebar: React.FC<UserProfileSidebarProps> = ({
  userId,
  onClose,
  showHeader = true
}) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUserStats();
  }, [userId]);

  const fetchUserStats = async () => {
    try {
      setIsLoading(true);

      // Fetch user profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Fetch assignment data
      const { data: assignment } = await supabase
        .from('user_assignments')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      // Fetch payment intents for invoices
      const { data: paidInvoices } = await supabase
        .from('payment_intents')
        .select('amount, created_at')
        .eq('user_id', userId)
        .eq('status', 'succeeded')
        .order('created_at', { ascending: false });

      const { data: pendingInvoices } = await supabase
        .from('payment_intents')
        .select('amount, created_at')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      const { data: allInvoices } = await supabase
        .from('payment_intents')
        .select('amount, created_at, status')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      const totalPaid = paidInvoices?.reduce((sum, i) => sum + Number(i.amount), 0) || 0;
      const totalPending = pendingInvoices?.reduce((sum, i) => sum + Number(i.amount), 0) || 0;

      // Get unfulfilled orders
      const { count: unfulfilledCount } = await supabase
        .from('product_quotes')
        .select('*', { count: 'only', head: true })
        .eq('user_id', userId)
        .eq('status', 'accepted')
        .is('fulfilled_at', null);

      // Fetch Shopify store
      const { data: shopify } = await supabase
        .from('shopify_installations')
        .select('store_url, status, installed_at')
        .eq('user_id', userId)
        .is('uninstalled_at', null)
        .maybeSingle();

      // Fetch chat activity
      const { data: chat } = await supabase
        .from('chats')
        .select('unread_count_admin, last_message_at')
        .eq('user_id', userId)
        .maybeSingle();

      const { count: messageCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_id', chat?.id || '')
        .is('deleted_at', null);

      // Get user's messages to determine typical response time
      const { data: userMessages } = await supabase
        .from('messages')
        .select('created_at')
        .eq('chat_id', chat?.id || '')
        .eq('sender_id', userId)
        .is('deleted_at', null)
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

          // Detect timezone based on hour pattern (simplified)
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

      // Calculate fulfillment metrics
      let avgFulfillmentDays: number | null = null;
      let lastFulfillmentDate: string | null = null;
      let totalUnitsFulfilled = 0;
      let fulfilledOrdersCount = 0;
      let totalFulfillmentRevenue = 0;

      if (fulfilledItems && fulfilledItems.length > 0) {
        // Calculate total units and revenue
        totalUnitsFulfilled = fulfilledItems.reduce((sum, item) => sum + item.quantity, 0);
        totalFulfillmentRevenue = fulfilledItems.reduce((sum, item) => sum + Number(item.total_cost), 0);

        // Count unique orders (group by date/time)
        const uniqueOrders = new Set(
          fulfilledItems.map(item => new Date(item.fulfilled_at!).toISOString())
        );
        fulfilledOrdersCount = uniqueOrders.size;

        // Calculate average fulfillment days
        const totalDays = fulfilledItems.reduce((sum, item) => {
          const created = new Date(item.created_at);
          const fulfilled = new Date(item.fulfilled_at!);
          const days = (fulfilled.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0);
        avgFulfillmentDays = Math.round(totalDays / fulfilledItems.length);

        // Get most recent fulfillment date
        const sortedByFulfilled = [...fulfilledItems].sort((a, b) =>
          new Date(b.fulfilled_at!).getTime() - new Date(a.fulfilled_at!).getTime()
        );
        lastFulfillmentDate = sortedByFulfilled[0]?.fulfilled_at || null;
      }

      const lastPaidInvoice = paidInvoices?.[0];
      const lastSentInvoice = allInvoices?.[0];

      setStats({
        name: profile?.name || null,
        email: profile?.email || '',
        phone: profile?.phone || null,
        company: profile?.company || null,
        first_name: profile?.first_name || null,
        last_name: profile?.last_name || null,
        created_at: profile?.created_at || new Date().toISOString(),
        last_login: profile?.last_login || null,
        store_type: profile?.store_type || null,
        onboarding_completed_at: profile?.onboarding_completed_at || null,

        total_transactions: parseFloat(assignment?.total_transactions || '0'),
        total_invoices: (paidInvoices?.length || 0) + (pendingInvoices?.length || 0),
        total_paid: totalPaid,
        total_pending: totalPending,
        last_invoice_sent_date: lastSentInvoice?.created_at || null,
        last_invoice_sent_amount: lastSentInvoice ? Number(lastSentInvoice.amount) : 0,
        last_invoice_paid_date: lastPaidInvoice?.created_at || null,
        last_invoice_paid_amount: lastPaidInvoice ? Number(lastPaidInvoice.amount) : 0,
        unfulfilled_orders: unfulfilledCount || 0,

        store_url: shopify?.store_url || null,
        store_status: shopify?.status || null,
        store_installed_at: shopify?.installed_at || null,

        last_interaction_at: assignment?.last_interaction_at || chat?.last_message_at || null,
        total_messages: messageCount || 0,
        unread_messages: chat?.unread_count_admin || 0,
        typical_response_time: typicalResponseTime,
        typical_response_timezone: typicalResponseTimezone,

        total_units_fulfilled: totalUnitsFulfilled,
        fulfilled_orders: fulfilledOrdersCount,
        total_fulfillment_revenue: totalFulfillmentRevenue,
        avg_fulfillment_days: avgFulfillmentDays,
        last_fulfillment_date: lastFulfillmentDate
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setIsLoading(false);
    }
  };


  if (isLoading || !stats) {
    return (
      <div className={`${showHeader ? 'w-96' : 'w-full'} bg-white dark:bg-gray-800 flex flex-col h-full`}>
        {showHeader && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <button onClick={onClose}>
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const displayName = stats.name ||
    (stats.first_name && stats.last_name ? `${stats.first_name} ${stats.last_name}` : null) ||
    stats.email.split('@')[0];

  return (
    <div className={`${showHeader ? 'w-96' : 'w-full'} bg-white dark:bg-gray-800 flex flex-col h-full`}>
      {/* Header */}
      {showHeader && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Client Profile</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* User Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-lg bg-gray-700 dark:bg-gray-600 flex items-center justify-center">
              <span className="text-2xl font-medium text-white">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {displayName}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{stats.email}</p>
              <div className="flex items-center mt-1 text-xs text-gray-500 dark:text-gray-400">
                <Calendar className="w-3 h-3 mr-1" />
                Client for {formatDistanceToNow(new Date(stats.created_at))}
              </div>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div>

          {/* Overview Section */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Overview</h3>
            <div className="space-y-3">
              {stats.phone && (
                <div className="flex items-start space-x-3">
                  <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                    <p className="text-sm text-gray-900 dark:text-white">{stats.phone}</p>
                  </div>
                </div>
              )}
              {stats.company && (
                <div className="flex items-start space-x-3">
                  <Building2 className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Company</p>
                    <p className="text-sm text-gray-900 dark:text-white">{stats.company}</p>
                  </div>
                </div>
              )}
              {stats.last_login && (
                <div className="flex items-start space-x-3">
                  <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Last Active</p>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {formatDistanceToNow(new Date(stats.last_login), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start space-x-3">
                <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">User's Current Time</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {(() => {
                      const now = new Date();
                      const hours = now.getUTCHours();
                      const minutes = now.getMinutes();
                      const period = hours >= 12 ? 'PM' : 'AM';
                      const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
                      return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
                    })()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Section */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Financial</h3>
            <div className="space-y-3">
              {/* Last Invoice Sent */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                  <Send className="w-4 h-4" />
                  <span className="text-sm">Last Invoice Sent</span>
                </div>
                <div className="text-right">
                  {stats.last_invoice_sent_date ? (
                    <>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        ${stats.last_invoice_sent_amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(stats.last_invoice_sent_date), { addSuffix: true })}
                      </p>
                    </>
                  ) : (
                    <span className="text-xs text-gray-500 dark:text-gray-400">None</span>
                  )}
                </div>
              </div>

              {/* Last Invoice Paid */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Last Invoice Paid</span>
                </div>
                <div className="text-right">
                  {stats.last_invoice_paid_date ? (
                    <>
                      <p className="text-sm font-bold text-green-600 dark:text-green-400">
                        ${stats.last_invoice_paid_amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(stats.last_invoice_paid_date), { addSuffix: true })}
                      </p>
                    </>
                  ) : (
                    <span className="text-xs text-gray-500 dark:text-gray-400">None</span>
                  )}
                </div>
              </div>

              {/* Pending Invoices */}
              {stats.total_pending > 0 && (
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">Pending Invoices</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
                      ${stats.total_pending.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {/* Unfulfilled Orders */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                  <Package className="w-4 h-4" />
                  <span className="text-sm">Unfulfilled Orders</span>
                </div>
                <span className={`text-sm font-bold ${
                  stats.unfulfilled_orders > 0
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {stats.unfulfilled_orders}
                </span>
              </div>

              {/* Fulfilled Orders */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Fulfilled Orders</span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {stats.fulfilled_orders}
                </span>
              </div>

              {/* Total Fulfillment Revenue */}
              {stats.total_fulfillment_revenue > 0 && (
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-sm">Total Fulfillment Revenue</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    ${stats.total_fulfillment_revenue.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Last Fulfilled */}
              {stats.last_fulfillment_date && (
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Last Fulfilled</span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(stats.last_fulfillment_date), { addSuffix: true })}
                  </span>
                </div>
              )}

              {/* Average Fulfillment Time */}
              {stats.avg_fulfillment_days !== null && (
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm">Avg Fulfillment Time</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {stats.avg_fulfillment_days} days
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Store Section */}
          {stats.store_url && (
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Shopify Store</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Store className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Store URL</p>
                    <a
                      href={`https://${stats.store_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-pink-600 hover:text-pink-700 flex items-center"
                    >
                      {stats.store_url}
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </div>
                </div>
                {stats.store_status && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      stats.store_status === 'active'
                        ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-gray-50 text-gray-700 dark:bg-gray-900/50 dark:text-gray-400'
                    }`}>
                      {stats.store_status}
                    </span>
                  </div>
                )}
                {stats.store_installed_at && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Connected</span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {formatDistanceToNow(new Date(stats.store_installed_at), { addSuffix: true })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Activity Section */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Activity</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-sm">Total Messages</span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {stats.total_messages}
                </span>
              </div>
              {stats.unread_messages > 0 && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Unread</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                    {stats.unread_messages}
                  </span>
                </div>
              )}
              {stats.last_interaction_at && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Last Interaction</span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {formatDistanceToNow(new Date(stats.last_interaction_at), { addSuffix: true })}
                  </span>
                </div>
              )}
              {stats.typical_response_time && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Typically Responds At</span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {stats.typical_response_time} {stats.typical_response_timezone}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
