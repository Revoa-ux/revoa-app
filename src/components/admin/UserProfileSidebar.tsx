import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Send,
  CheckCircle,
  AlertCircle,
  Clipboard,
  Receipt,
  FileEdit
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { ActiveQuotesModal } from './ActiveQuotesModal';
import { ProductTemplateSelectorModal } from './ProductTemplateSelectorModal';

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

  // Quotes
  active_quotes: number;
}

export const UserProfileSidebar: React.FC<UserProfileSidebarProps> = ({
  userId,
  onClose,
  showHeader = true
}) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showActiveQuotesModal, setShowActiveQuotesModal] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

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

      // Fetch invoices
      const { data: paidInvoices } = await supabase
        .from('invoices')
        .select('amount, created_at')
        .eq('user_id', userId)
        .eq('status', 'paid')
        .order('created_at', { ascending: false });

      const { data: pendingInvoices } = await supabase
        .from('invoices')
        .select('amount, created_at')
        .eq('user_id', userId)
        .in('status', ['pending', 'overdue'])
        .order('created_at', { ascending: false });

      const { data: allInvoices } = await supabase
        .from('invoices')
        .select('amount, created_at, status')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      const totalPaid = paidInvoices?.reduce((sum, i) => sum + Number(i.amount), 0) || 0;
      const totalPending = pendingInvoices?.reduce((sum, i) => sum + Number(i.amount), 0) || 0;

      // Get unfulfilled orders (accepted quotes that haven't been pushed to Shopify yet)
      const { count: unfulfilledCount } = await supabase
        .from('product_quotes')
        .select('*', { count: 'only', head: true })
        .eq('user_id', userId)
        .eq('status', 'accepted')
        .is('shopify_product_id', null);

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
        .select('id, unread_count_admin, last_message_at')
        .eq('user_id', userId)
        .maybeSingle();

      let messageCount = 0;
      let userMessages: any[] = [];

      if (chat?.id) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chat.id)
          .is('deleted_at', null);

        messageCount = count || 0;

        // Get user's messages to determine typical response time
        const { data } = await supabase
          .from('messages')
          .select('created_at')
          .eq('chat_id', chat.id)
          .eq('sender', 'user')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(50);

        userMessages = data || [];
      }

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
        last_fulfillment_date: lastFulfillmentDate,
        active_quotes: 0
      });

      // Fetch active quotes count
      const { count: quotesCount } = await supabase
        .from('product_quotes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'accepted');

      setStats(prev => prev ? { ...prev, active_quotes: quotesCount || 0 } : null);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setIsLoading(false);
    }
  };


  if (isLoading || !stats) {
    return (
      <div className={`${showHeader ? 'w-96' : 'w-full'} bg-white dark:bg-dark flex flex-col h-full`}>
        {showHeader && (
          <div className="p-4 border-b border-gray-200 dark:border-[#333333] flex items-center justify-between">
            <div className="h-6 w-32 bg-gray-200 dark:bg-[#2a2a2a] rounded animate-pulse" />
            <button onClick={onClose}>
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-[#2a2a2a] rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const displayName = stats.name ||
    (stats.first_name && stats.last_name ? `${stats.first_name} ${stats.last_name}` : null) ||
    stats.email.split('@')[0];

  return (
    <div className={`${showHeader ? 'w-96' : 'w-full'} bg-white dark:bg-dark flex flex-col h-full`}>
      {/* Header */}
      {showHeader && (
        <div className="p-4 border-b border-gray-200 dark:border-[#333333] flex items-center justify-end">
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* User Header */}
        <div className="px-6 py-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-20 h-20 rounded-xl bg-gray-700 dark:bg-[#4a4a4a] flex items-center justify-center">
              <span className="text-3xl font-medium text-white">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {displayName}
              </h3>
              <div className="flex items-center justify-center mt-1">
                <Store className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {stats.store_url || 'No store connected'}
                </p>
              </div>
              <div className="flex items-center justify-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                <Calendar className="w-3 h-3 mr-1" />
                Client for {formatDistanceToNow(new Date(stats.created_at))}
              </div>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div>

          {/* Overview Section */}
          <div className="px-6 pt-4 pb-4">
            <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4 -mx-6 px-6 py-2.5 bg-gray-50 dark:bg-dark/50 border-l-4 border-[#E85B81]/30">OVERVIEW</h3>
            <div className="space-y-2">
              {stats.phone && (
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <Phone className="w-4 h-4 mr-2" />
                    <span className="text-sm">Phone</span>
                  </div>
                  <span className="text-sm text-gray-900 dark:text-white">{stats.phone}</span>
                </div>
              )}
              {stats.company && (
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <Building2 className="w-4 h-4 mr-2" />
                    <span className="text-sm">Company</span>
                  </div>
                  <span className="text-sm text-gray-900 dark:text-white">{stats.company}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <Clock className="w-4 h-4 mr-2" />
                  <span className="text-sm">Last Active</span>
                </div>
                <span className="text-sm text-gray-900 dark:text-white">
                  {stats.last_login ? formatDistanceToNow(new Date(stats.last_login), { addSuffix: true }) : 'Never'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <Clock className="w-4 h-4 mr-2" />
                  <span className="text-sm">User's Current Time</span>
                </div>
                <span className="text-sm text-gray-900 dark:text-white">
                  {(() => {
                    const now = new Date();
                    const hours = now.getUTCHours();
                    const minutes = now.getMinutes();
                    const period = hours >= 12 ? 'PM' : 'AM';
                    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
                    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
                  })()}
                </span>
              </div>
            </div>
          </div>

          {/* Financial Section */}
          <div className="px-6 py-4">
            <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4 -mx-6 px-6 py-2.5 bg-gray-50 dark:bg-dark/50 border-l-4 border-[#EC7070]/30">FINANCIAL</h3>
            <div className="space-y-2">
              {/* Last Invoice Sent */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                  <Send className="w-4 h-4" />
                  <span className="text-sm">Last Invoice Sent</span>
                </div>
                <div className="text-right">
                  {stats.last_invoice_sent_date ? (
                    <>
                      <p className="text-sm text-gray-900 dark:text-white">
                        ${stats.last_invoice_sent_amount.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(stats.last_invoice_sent_date), { addSuffix: true })}
                      </p>
                    </>
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400">None</span>
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
                      <p className="text-sm text-green-600 dark:text-green-400">
                        ${stats.last_invoice_paid_amount.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(stats.last_invoice_paid_date), { addSuffix: true })}
                      </p>
                    </>
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400">None</span>
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
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      ${stats.total_pending.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {/* Invoices */}
              <div className="w-full flex items-center justify-between py-2">
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <Receipt className="w-4 h-4 mr-2" />
                  <button
                    onClick={() => {
                      navigate(`/admin/invoices?userId=${userId}`);
                      if (showHeader) onClose();
                    }}
                    className="text-sm underline hover:no-underline text-gray-900 dark:text-white transition-all"
                  >
                    Invoices
                  </button>
                </div>
                <span className="text-sm text-gray-900 dark:text-white">
                  {stats.total_invoices}
                </span>
              </div>

              {/* Active Quotes */}
              {stats.active_quotes > 0 && (
                <div className="w-full flex items-center justify-between py-2">
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <FileText className="w-4 h-4 mr-2" />
                    <button
                      onClick={() => setShowActiveQuotesModal(true)}
                      className="text-sm underline hover:no-underline text-gray-900 dark:text-white transition-all"
                    >
                      Active Quotes
                    </button>
                  </div>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {stats.active_quotes}
                  </span>
                </div>
              )}

              {/* Email Templates */}
              <div className="w-full flex items-center justify-between py-2">
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <FileEdit className="w-4 h-4 mr-2" />
                  <button
                    onClick={() => setShowTemplateSelector(true)}
                    className="text-sm underline hover:no-underline text-gray-900 dark:text-white transition-all"
                  >
                    Email Templates
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Orders Section */}
          <div className="px-6 py-4">
            <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4 -mx-6 px-6 py-2.5 bg-gray-50 dark:bg-dark/50 border-l-4 border-[#E87962]/30">ORDERS</h3>
            <div className="space-y-2">
              {/* Unfulfilled Orders */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                  <Package className="w-4 h-4" />
                  <span className="text-sm">Unfulfilled Orders</span>
                </div>
                <span className={`text-sm ${
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
                <span className="text-sm text-gray-900 dark:text-white">
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
                  <span className="text-sm text-gray-900 dark:text-white">
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
                  <span className="text-sm text-gray-500 dark:text-gray-400">
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
                  <span className="text-sm text-gray-900 dark:text-white">
                    {stats.avg_fulfillment_days} days
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Communication Section */}
          <div className="px-6 py-4">
            <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4 -mx-6 px-6 py-2.5 bg-gray-50 dark:bg-dark/50 border-l-4 border-[#E88250]/30">COMMUNICATION</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-sm">Total Messages</span>
                </div>
                <span className="text-sm text-gray-900 dark:text-white">
                  {stats.total_messages}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Last Interaction</span>
                </div>
                <span className="text-sm text-gray-900 dark:text-white">
                  {stats.last_interaction_at ? formatDistanceToNow(new Date(stats.last_interaction_at), { addSuffix: true }) : 'Never'}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Typically Responds At</span>
                </div>
                <span className="text-sm text-gray-900 dark:text-white">
                  {stats.typical_response_time ? (() => {
                    try {
                      const [timeStr, period] = stats.typical_response_time.split(' ');
                      const [hourStr] = timeStr.split(':');
                      let hour = parseInt(hourStr);

                      if (period === 'PM' && hour !== 12) hour += 12;
                      if (period === 'AM' && hour === 12) hour = 0;

                      const chinaHour = (hour + 8) % 24;
                      const chinaPeriod = chinaHour >= 12 ? 'PM' : 'AM';
                      const displayHour = chinaHour === 0 ? 12 : chinaHour > 12 ? chinaHour - 12 : chinaHour;

                      return `${displayHour}:00 ${chinaPeriod} China Time`;
                    } catch {
                      return 'N/A';
                    }
                  })() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Quotes Modal */}
      {showActiveQuotesModal && stats && (
        <ActiveQuotesModal
          userId={userId}
          userName={stats.first_name && stats.last_name ? `${stats.first_name} ${stats.last_name}` : stats.name || stats.email.split('@')[0]}
          onClose={() => setShowActiveQuotesModal(false)}
        />
      )}

      {/* Email Templates Modal */}
      {showTemplateSelector && stats && (
        <ProductTemplateSelectorModal
          isOpen={showTemplateSelector}
          onClose={() => setShowTemplateSelector(false)}
          userId={userId}
          userName={stats.first_name && stats.last_name ? `${stats.first_name} ${stats.last_name}` : stats.name || stats.email.split('@')[0]}
        />
      )}
    </div>
  );
};
