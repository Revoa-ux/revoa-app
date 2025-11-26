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
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

interface UserProfileSidebarProps {
  userId: string;
  onClose: () => void;
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

  // Financial metrics (OUR revenue from platform fees)
  total_transactions: number;
  total_invoices: number;
  total_paid: number;
  total_pending: number;
  our_revenue: number; // Platform fees from paid invoices

  // Shopify store
  store_url: string | null;
  store_status: string | null;
  store_installed_at: string | null;

  // Activity
  last_interaction_at: string | null;
  total_messages: number;
  unread_messages: number;

  // Fulfillment metrics
  total_units_fulfilled: number;
  avg_fulfillment_days: number | null;
  last_fulfillment_date: string | null;
}

export const UserProfileSidebar: React.FC<UserProfileSidebarProps> = ({
  userId,
  onClose
}) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({
    overview: true,
    financial: true,
    activity: true,
    store: true
  });

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

      // Fetch invoices with payment intents to get platform fees
      const { data: invoices } = await supabase
        .from('invoices')
        .select('amount, status, paid_at, metadata, created_at')
        .eq('user_id', userId);

      const paidInvoices = invoices?.filter(i => i.status === 'paid') || [];
      const totalPaid = paidInvoices.reduce((sum, i) => sum + parseFloat(i.amount || '0'), 0);
      const totalPending = invoices
        ?.filter(i => i.status === 'pending')
        .reduce((sum, i) => sum + parseFloat(i.amount || '0'), 0) || 0;

      // Get platform fees (our revenue) from payment intents
      const { data: payments } = await supabase
        .from('payment_intents')
        .select('platform_fee, created_at')
        .eq('user_id', userId)
        .eq('status', 'succeeded');

      const ourRevenue = payments?.reduce(
        (sum, p) => sum + parseFloat(p.platform_fee || '0'),
        0
      ) || 0;

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

      // Fetch fulfillment data from invoices
      const fulfilledInvoices = paidInvoices.filter(i => i.paid_at);

      let avgFulfillmentDays: number | null = null;
      let lastFulfillmentDate: string | null = null;
      let totalUnits = 0;

      if (fulfilledInvoices.length > 0) {
        // Calculate average fulfillment time (days between created_at and paid_at)
        const fulfillmentDays = fulfilledInvoices
          .filter(i => i.created_at && i.paid_at)
          .map(i => {
            const created = new Date(i.created_at!);
            const paid = new Date(i.paid_at!);
            return (paid.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
          });

        if (fulfillmentDays.length > 0) {
          avgFulfillmentDays = fulfillmentDays.reduce((sum, days) => sum + days, 0) / fulfillmentDays.length;
        }

        // Get last fulfillment date
        const sortedByPaidDate = [...fulfilledInvoices].sort((a, b) =>
          new Date(b.paid_at!).getTime() - new Date(a.paid_at!).getTime()
        );
        lastFulfillmentDate = sortedByPaidDate[0]?.paid_at || null;

        // Count units from metadata
        totalUnits = fulfilledInvoices.reduce(
          (sum, i) => sum + (i.metadata?.units || 0),
          0
        );
      }

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
        total_invoices: assignment?.total_invoices || 0,
        total_paid: totalPaid,
        total_pending: totalPending,
        our_revenue: ourRevenue,

        store_url: shopify?.store_url || null,
        store_status: shopify?.status || null,
        store_installed_at: shopify?.installed_at || null,

        last_interaction_at: assignment?.last_interaction_at || chat?.last_message_at || null,
        total_messages: messageCount || 0,
        unread_messages: chat?.unread_count_admin || 0,

        total_units_fulfilled: totalUnits,
        avg_fulfillment_days: avgFulfillmentDays,
        last_fulfillment_date: lastFulfillmentDate
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (isLoading || !stats) {
    return (
      <div className="w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
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
    <div className="w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Client Profile</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* User Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center">
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

        {/* Overview Section */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => toggleSection('overview')}
            className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-900 dark:text-white">Overview</span>
            {expandedSections.overview ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          {expandedSections.overview && (
            <div className="px-6 pb-4 space-y-3">
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
            </div>
          )}
        </div>

        {/* Financial Section */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => toggleSection('financial')}
            className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-900 dark:text-white">Financial</span>
            {expandedSections.financial ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          {expandedSections.financial && (
            <div className="px-6 pb-4 space-y-3">
              <div className="p-4 bg-gradient-to-br from-pink-50 to-red-50 dark:from-pink-900/20 dark:to-red-900/20 rounded-lg border border-pink-200 dark:border-pink-800">
                <div className="flex items-center space-x-2 text-pink-600 dark:text-pink-400 mb-2">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs font-medium">Our Revenue (Platform Fees)</span>
                </div>
                <p className="text-2xl font-bold text-pink-700 dark:text-pink-300">
                  ${stats.our_revenue.toLocaleString()}
                </p>
                <p className="text-xs text-pink-600 dark:text-pink-400 mt-1">From {stats.total_invoices} invoices</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-xs text-green-600 dark:text-green-400 mb-1">Paid</p>
                  <p className="text-base font-semibold text-green-700 dark:text-green-300">
                    ${stats.total_paid.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-1">Pending</p>
                  <p className="text-base font-semibold text-yellow-700 dark:text-yellow-300">
                    ${stats.total_pending.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2">
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                    <Package className="w-4 h-4" />
                    <span className="text-sm">Units Fulfilled</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {stats.total_units_fulfilled}
                  </span>
                </div>
                {stats.avg_fulfillment_days !== null && (
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">Avg Fulfillment Time</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {Math.round(stats.avg_fulfillment_days)} days
                    </span>
                  </div>
                )}
                {stats.last_fulfillment_date && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Last Fulfillment</span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {formatDistanceToNow(new Date(stats.last_fulfillment_date), { addSuffix: true })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Store Section */}
        {stats.store_url && (
          <div className="border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => toggleSection('store')}
              className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <span className="text-sm font-medium text-gray-900 dark:text-white">Shopify Store</span>
              {expandedSections.store ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            {expandedSections.store && (
              <div className="px-6 pb-4 space-y-3">
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
            )}
          </div>
        )}

        {/* Activity Section */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => toggleSection('activity')}
            className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-900 dark:text-white">Activity</span>
            {expandedSections.activity ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          {expandedSections.activity && (
            <div className="px-6 pb-4 space-y-3">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
