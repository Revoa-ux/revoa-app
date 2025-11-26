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
  CheckCircle
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
  company_name: string | null;
  created_at: string;
}

interface MetricsData {
  lifetime_revenue: number;
  paid_count: number;
  pending_amount: number;
  pending_count: number;
  unfulfilled_orders: number;
  total_messages: number;
  last_invoice_paid_date: string | null;
  last_invoice_paid_amount: number;
  average_fulfillment_days: number;
  last_interaction: string | null;
}

export const CollapsibleClientProfile: React.FC<CollapsibleClientProfileProps> = ({
  userId,
  isExpanded
}) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [metrics, setMetrics] = useState<MetricsData>({
    lifetime_revenue: 0,
    paid_count: 0,
    pending_amount: 0,
    pending_count: 0,
    unfulfilled_orders: 0,
    total_messages: 0,
    last_invoice_paid_date: null,
    last_invoice_paid_amount: 0,
    average_fulfillment_days: 0,
    last_interaction: null
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
        .select('first_name, last_name, email, company_name, created_at')
        .eq('id', userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
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
        .select('amount')
        .eq('user_id', userId)
        .eq('status', 'pending');

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

      // Calculate average fulfillment time
      const { data: fulfilledQuotes } = await supabase
        .from('product_quotes')
        .select('created_at, fulfilled_at')
        .eq('user_id', userId)
        .not('fulfilled_at', 'is', null);

      let avgFulfillmentDays = 0;
      if (fulfilledQuotes && fulfilledQuotes.length > 0) {
        const totalDays = fulfilledQuotes.reduce((sum, quote) => {
          const created = new Date(quote.created_at);
          const fulfilled = new Date(quote.fulfilled_at!);
          const days = (fulfilled.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0);
        avgFulfillmentDays = Math.round(totalDays / fulfilledQuotes.length);
      }

      const lifetimeRevenue = paidInvoices?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;
      const lastPaidInvoice = paidInvoices?.[0];

      setMetrics({
        lifetime_revenue: lifetimeRevenue,
        paid_count: paidInvoices?.length || 0,
        pending_amount: pendingInvoices?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0,
        pending_count: pendingInvoices?.length || 0,
        unfulfilled_orders: unfulfilledCount || 0,
        total_messages: messageCount || 0,
        last_invoice_paid_date: lastPaidInvoice?.created_at || null,
        last_invoice_paid_amount: lastPaidInvoice ? Number(lastPaidInvoice.amount) : 0,
        average_fulfillment_days: avgFulfillmentDays,
        last_interaction: lastMessage?.created_at || null
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
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Client Profile</h3>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-lg bg-gray-700 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-medium text-white">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">{displayName}</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{profile?.email}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center mt-0.5">
                <Clock className="w-3 h-3 mr-1" />
                Client for {Math.floor((new Date().getTime() - new Date(profile?.created_at || '').getTime()) / (1000 * 60 * 60 * 24))} days
              </p>
            </div>
          </div>
        </div>

        {/* Company */}
        {profile?.company_name && (
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center text-gray-600 dark:text-gray-400 mb-1">
              <Building2 className="w-4 h-4 mr-2" />
              <span className="text-xs font-medium">Company</span>
            </div>
            <p className="text-sm text-gray-900 dark:text-white ml-6">{profile.company_name}</p>
          </div>
        )}

        {/* Financial Overview */}
        <div className="p-4 space-y-3">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Financial Overview</h4>

          {/* Lifetime Revenue */}
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center text-green-600 dark:text-green-400">
                <DollarSign className="w-4 h-4 mr-1" />
                <span className="text-xs font-medium">Lifetime Revenue</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">{metrics.paid_count} invoices</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${metrics.lifetime_revenue.toFixed(2)}
            </p>
          </div>

          {/* Last Invoice Paid */}
          {metrics.last_invoice_paid_date && (
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
              <div className="flex items-center text-gray-600 dark:text-gray-400 mb-1">
                <CheckCircle className="w-4 h-4 mr-1" />
                <span className="text-xs font-medium">Last Invoice Paid</span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                ${metrics.last_invoice_paid_amount.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formatDistanceToNow(new Date(metrics.last_invoice_paid_date), { addSuffix: true })}
              </p>
            </div>
          )}

          {/* Pending Invoices */}
          {metrics.pending_count > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-600/50">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center text-yellow-600 dark:text-yellow-400">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  <span className="text-xs font-medium">Pending Invoices</span>
                </div>
                <span className="text-xs text-yellow-600 dark:text-yellow-400">{metrics.pending_count}</span>
              </div>
              <p className="text-lg font-bold text-yellow-900 dark:text-yellow-100">
                ${metrics.pending_amount.toFixed(2)}
              </p>
            </div>
          )}
        </div>

        {/* Order Metrics */}
        <div className="px-4 pb-4 space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Order Metrics</h4>

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

          {/* Average Fulfillment Time */}
          <div className="flex items-center justify-between py-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <TrendingUp className="w-4 h-4 mr-2" />
              <span className="text-xs">Avg Fulfillment Time</span>
            </div>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {metrics.average_fulfillment_days > 0
                ? `${metrics.average_fulfillment_days} days`
                : 'N/A'}
            </span>
          </div>
        </div>

        {/* Communication */}
        <div className="px-4 pb-4 space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
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
            <div className="py-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center text-gray-600 dark:text-gray-400 mb-1">
                <Calendar className="w-4 h-4 mr-2" />
                <span className="text-xs">Last Interaction</span>
              </div>
              <p className="text-xs text-gray-900 dark:text-white ml-6">
                {formatDistanceToNow(new Date(metrics.last_interaction), { addSuffix: true })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
