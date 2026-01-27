import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Phone,
  ChevronDown,
  FileText,
  Receipt,
  ExternalLink,
  X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format, formatDistanceToNow } from 'date-fns';
import { ActiveQuotesModal } from './ActiveQuotesModal';

interface CollapsibleClientProfileProps {
  userId: string;
  isExpanded: boolean;
  onClose?: () => void;
}

interface ProfileData {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
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
  isExpanded,
  onClose
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
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const [showActiveQuotes, setShowActiveQuotes] = useState(false);
  const [activeQuotesCount, setActiveQuotesCount] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProfileData();
  }, [userId]);

  useEffect(() => {
    const checkScroll = () => {
      if (scrollContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        // Show indicator if there's content below (more than 50px from bottom)
        setShowScrollIndicator(scrollHeight - scrollTop - clientHeight > 50);
      }
    };

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      checkScroll();
      scrollContainer.addEventListener('scroll', checkScroll);
      // Also check on resize
      window.addEventListener('resize', checkScroll);

      return () => {
        scrollContainer.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [loading, profile, metrics]);

  const loadProfileData = async () => {
    try {
      setLoading(true);

      // Load profile
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, email, phone, company, created_at, last_login')
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
        .is('shopify_product_id', null);

      // Get chat for this user
      const { data: userChat } = await supabase
        .from('chats')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      // Load message count
      const { count: messageCount } = await supabase
        .from('messages')
        .select('*', { count: 'only', head: true })
        .eq('chat_id', userChat?.id || '')
        .is('deleted_at', null);

      // Load last interaction
      const { data: lastMessage } = await supabase
        .from('messages')
        .select('created_at')
        .eq('chat_id', userChat?.id || '')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get user's messages to determine typical response time
      const { data: userMessages } = await supabase
        .from('messages')
        .select('created_at')
        .eq('chat_id', userChat?.id || '')
        .eq('sender', 'user')
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

      // Fetch active quotes count
      const { count: quotesCount } = await supabase
        .from('product_quotes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'accepted');

      setActiveQuotesCount(quotesCount || 0);

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
      <div className="absolute inset-0 lg:relative lg:inset-auto right-0 lg:w-80 z-40 lg:z-0 bg-white dark:bg-dark border-l border-gray-200 dark:border-[#333333] flex flex-col">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        absolute inset-0 lg:relative lg:inset-auto right-0 z-40 lg:z-0
        bg-white dark:bg-dark border-l border-gray-200 dark:border-[#333333]
        flex flex-col overflow-hidden
        transition-all duration-300 ease-in-out
        ${isExpanded
          ? 'translate-x-0 lg:w-80 opacity-100'
          : 'translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0 lg:border-0'
        }
      `}
      style={{
        willChange: isExpanded ? 'auto' : 'width, opacity, transform'
      }}
    >
      {/* Header with close button - matches chat header height */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-[#333333] min-h-[70px]">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Client Profile</h3>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {/* Overview Section */}
        <div className="p-6 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-red-500 rounded-full"></div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                Overview
              </h4>
            </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Calendar className="w-4 h-4 mr-2" />
              <span className="text-xs">Signed Up</span>
            </div>
            <span className="text-sm text-gray-900 dark:text-white">
              {profile?.created_at ? `${Math.floor((new Date().getTime() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))} days ago` : 'Never'}
            </span>
          </div>

          {profile?.store_url ? (
            <div className="flex items-center text-gray-600 dark:text-gray-400 py-2">
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
          ) : (
            <div className="flex items-center text-gray-600 dark:text-gray-400 py-2">
              <Store className="w-4 h-4 mr-2" />
              <span className="text-xs">No store connected</span>
            </div>
          )}

          {profile?.phone && (
            <div className="flex items-center text-gray-600 dark:text-gray-400 py-2">
              <Phone className="w-4 h-4 mr-2" />
              <span className="text-xs">{profile.phone}</span>
            </div>
          )}

          {profile?.company && (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <Building2 className="w-4 h-4 mr-2" />
                <span className="text-sm">Company</span>
              </div>
              <span className="text-sm text-gray-900 dark:text-white">{profile.company}</span>
            </div>
          )}

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Clock className="w-4 h-4 mr-2" />
              <span className="text-xs">Last Active</span>
            </div>
            <span className="text-sm text-gray-900 dark:text-white">
              {profile?.last_login ? formatDistanceToNow(new Date(profile.last_login), { addSuffix: true }) : 'Never'}
            </span>
          </div>
          </div>

          {/* Financial Metrics */}
          <div className="border-t border-gray-200 dark:border-[#333333] pt-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-red-500 rounded-full"></div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                Financial
              </h4>
            </div>

          {/* Last Invoice Sent */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Send className="w-4 h-4 mr-2" />
              <span className="text-xs">Last Invoice Sent</span>
            </div>
            <div className="text-right">
              {metrics.last_invoice_sent_date ? (
                <>
                  <p className="text-sm text-gray-900 dark:text-white">
                    ${metrics.last_invoice_sent_amount.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(metrics.last_invoice_sent_date), { addSuffix: true })}
                  </p>
                </>
              ) : (
                <span className="text-sm text-gray-500 dark:text-gray-400">None</span>
              )}
            </div>
          </div>

          {/* Last Invoice Paid */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <CheckCircle className="w-4 h-4 mr-2" />
              <span className="text-xs">Last Invoice Paid</span>
            </div>
            <div className="text-right">
              {metrics.last_invoice_paid_date ? (
                <>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    ${metrics.last_invoice_paid_amount.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(metrics.last_invoice_paid_date), { addSuffix: true })}
                  </p>
                </>
              ) : (
                <span className="text-sm text-gray-500 dark:text-gray-400">None</span>
              )}
            </div>
          </div>

          {/* Pending Invoices */}
          {metrics.pending_invoices_count > 0 && (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <AlertCircle className="w-4 h-4 mr-2" />
                <span className="text-xs">Pending Invoices</span>
              </div>
              <div className="text-right">
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  ${metrics.pending_invoices_total.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {metrics.pending_invoices_count} invoice{metrics.pending_invoices_count > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}

          {/* Total Invoices Link */}
          <InvoicesLink userId={userId} totalInvoices={metrics.paid_invoices_count + metrics.pending_invoices_count} />

          {/* Total Fulfillment Revenue */}
          {metrics.total_fulfillment_revenue > 0 && (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <DollarSign className="w-4 h-4 mr-2" />
                <span className="text-xs">Total Fulfillment Revenue</span>
              </div>
              <span className="text-sm text-gray-900 dark:text-white">
                ${metrics.total_fulfillment_revenue.toFixed(2)}
              </span>
            </div>
          )}
          </div>

          {/* Active Quotes Section */}
          {activeQuotesCount > 0 && (
            <div className="border-t border-gray-200 dark:border-[#333333] pt-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-4 bg-red-500 rounded-full"></div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                  Quotes
                </h4>
              </div>

            <div className="w-full flex items-center justify-between py-2">
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <FileText className="w-4 h-4 mr-2" />
                <button
                  onClick={() => setShowActiveQuotes(true)}
                  className="text-xs underline hover:no-underline text-gray-900 dark:text-white transition-all"
                >
                  Active Quotes
                </button>
              </div>
              <span className="text-sm text-gray-900 dark:text-white">
                {activeQuotesCount}
              </span>
            </div>
            </div>
          )}

          {/* Order Metrics */}
          <div className="border-t border-gray-200 dark:border-[#333333] pt-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-red-500 rounded-full"></div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                Orders
              </h4>
            </div>

          {/* Unfulfilled Orders */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Package className="w-4 h-4 mr-2" />
              <span className="text-xs">Unfulfilled Orders</span>
            </div>
            <span className={`text-sm ${
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
            <span className="text-sm text-gray-900 dark:text-white">
              {metrics.fulfilled_orders}
            </span>
          </div>

          {/* Last Fulfilled */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Clock className="w-4 h-4 mr-2" />
              <span className="text-xs">Last Fulfilled</span>
            </div>
            <span className="text-sm text-gray-900 dark:text-white">
              {metrics.last_fulfillment_date ? formatDistanceToNow(new Date(metrics.last_fulfillment_date), { addSuffix: true }) : 'Never'}
            </span>
          </div>

          {/* Average Fulfillment Time */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <TrendingUp className="w-4 h-4 mr-2" />
              <span className="text-xs">Avg Fulfillment Time</span>
            </div>
            <span className="text-sm text-gray-900 dark:text-white">
              {metrics.average_fulfillment_days > 0 ? `${metrics.average_fulfillment_days} days` : 'Never'}
            </span>
          </div>
          </div>

          {/* Communication */}
          <div className="border-t border-gray-200 dark:border-[#333333] pt-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-red-500 rounded-full"></div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                Communication
              </h4>
            </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <MessageSquare className="w-4 h-4 mr-2" />
              <span className="text-xs">Total Messages</span>
            </div>
            <span className="text-sm text-gray-900 dark:text-white">
              {metrics.total_messages}
            </span>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Calendar className="w-4 h-4 mr-2" />
              <span className="text-xs">Last Interaction</span>
            </div>
            <span className="text-sm text-gray-900 dark:text-white">
              {metrics.last_interaction ? formatDistanceToNow(new Date(metrics.last_interaction), { addSuffix: true }) : 'Never'}
            </span>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Clock className="w-4 h-4 mr-2" />
              <span className="text-xs">Typically Responds At</span>
            </div>
            <span className="text-sm text-gray-900 dark:text-white">
              {metrics.typical_response_time ? (() => {
                try {
                  const [timeStr, period] = metrics.typical_response_time.split(' ');
                  const [hourStr] = timeStr.split(':');
                  let hour = parseInt(hourStr);

                  if (period === 'PM' && hour !== 12) hour += 12;
                  if (period === 'AM' && hour === 12) hour = 0;

                  const chinaHour = (hour + 8) % 24;
                  const chinaPeriod = chinaHour >= 12 ? 'PM' : 'AM';
                  const displayHour = chinaHour === 0 ? 12 : chinaHour > 12 ? chinaHour - 12 : chinaHour;

                  return `${displayHour}:00 ${chinaPeriod} China Time`;
                } catch {
                  return 'Never';
                }
              })() : 'Never'}
            </span>
          </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      {showScrollIndicator && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none z-10">
          <div className="bg-white/80 dark:bg-dark/80 backdrop-blur-sm rounded-full p-1.5 shadow-lg animate-bounce">
            <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </div>
        </div>
      )}

      {/* Active Quotes Modal */}
      {showActiveQuotes && (
        <ActiveQuotesModal
          userId={userId}
          userName={displayName}
          onClose={() => setShowActiveQuotes(false)}
        />
      )}
    </div>
  );
};

// Helper component for Invoices link
const InvoicesLink: React.FC<{ userId: string; totalInvoices: number }> = ({ userId, totalInvoices }) => {
  const navigate = useNavigate();

  return (
    <div className="w-full flex items-center justify-between py-2">
      <div className="flex items-center text-gray-600 dark:text-gray-400">
        <Receipt className="w-4 h-4 mr-2" />
        <button
          onClick={() => navigate(`/admin/invoices?userId=${userId}`)}
          className="text-xs underline hover:no-underline text-gray-900 dark:text-white transition-all"
        >
          Invoices
        </button>
      </div>
      <span className="text-sm text-gray-900 dark:text-white">
        {totalInvoices}
      </span>
    </div>
  );
};
