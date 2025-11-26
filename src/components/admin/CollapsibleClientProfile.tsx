import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Building2,
  DollarSign,
  Package,
  MessageSquare,
  Clock,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface CollapsibleClientProfileProps {
  userId: string;
  isExpanded: boolean;
  onToggle: () => void;
}

interface ProfileData {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company_name: string | null;
  created_at: string;
}

interface FinancialData {
  lifetime_revenue: number;
  paid_invoices: number;
  pending_invoices: number;
  units_fulfilled: number;
  total_messages: number;
  last_interaction: string | null;
}

export const CollapsibleClientProfile: React.FC<CollapsibleClientProfileProps> = ({
  userId,
  isExpanded,
  onToggle
}) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [financial, setFinancial] = useState<FinancialData>({
    lifetime_revenue: 0,
    paid_invoices: 0,
    pending_invoices: 0,
    units_fulfilled: 0,
    total_messages: 0,
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
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Load financial data - paid invoices only
      const { data: paidInvoices } = await supabase
        .from('payment_intents')
        .select('amount')
        .eq('user_id', userId)
        .eq('status', 'succeeded');

      const { data: pendingInvoices } = await supabase
        .from('payment_intents')
        .select('amount')
        .eq('user_id', userId)
        .eq('status', 'pending');

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
        .single();

      setFinancial({
        lifetime_revenue: paidInvoices?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0,
        paid_invoices: paidInvoices?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0,
        pending_invoices: pendingInvoices?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0,
        units_fulfilled: 0, // TODO: Calculate from actual fulfillment data
        total_messages: messageCount || 0,
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

  if (loading) {
    return (
      <div className={`relative bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 ${
        isExpanded ? 'w-80' : 'w-16'
      }`}>
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-700 dark:bg-gray-600" />
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white" />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 ${
      isExpanded ? 'w-80' : 'w-16'
    }`}>
      {/* Vertical divider line */}
      <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -left-3 top-4 z-10 w-6 h-6 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
      >
        {isExpanded ? (
          <ChevronRight className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
        )}
      </button>

      {/* Collapsed View */}
      {!isExpanded && (
        <div className="flex flex-col items-center py-4 space-y-4">
          <div className="w-10 h-10 rounded-lg bg-gray-700 dark:bg-gray-600 flex items-center justify-center">
            <span className="text-sm font-medium text-white">{initials}</span>
          </div>
        </div>
      )}

      {/* Expanded View */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Client Profile</h3>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-lg bg-gray-700 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-medium text-white">{initials}</span>
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">{displayName}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{profile?.email}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center mt-0.5">
                  <Clock className="w-3 h-3 mr-1" />
                  Client for {Math.floor((new Date().getTime() - new Date(profile?.created_at || '').getTime()) / (1000 * 60 * 60))} hours
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

          {/* Financial Metrics */}
          <div className="p-4 space-y-3">
            <div className="bg-gray-700/50 dark:bg-gray-700/30 rounded-lg p-3 border border-gray-600/50 dark:border-gray-600">
              <div className="flex items-center text-green-500 dark:text-green-400 mb-1">
                <DollarSign className="w-4 h-4 mr-1" />
                <span className="text-xs font-medium">Lifetime Revenue</span>
              </div>
              <p className="text-xl font-bold text-white dark:text-white">
                ${financial.lifetime_revenue.toFixed(2)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-400 mt-1">
                From {Math.floor(financial.paid_invoices / (financial.lifetime_revenue || 1))} paid invoices
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-700/50 dark:bg-gray-700/30 rounded-lg p-2.5 border border-green-600/50 dark:border-green-600/50">
                <p className="text-xs text-green-500 dark:text-green-400 mb-0.5">Paid</p>
                <p className="text-lg font-bold text-white dark:text-white">
                  ${financial.paid_invoices.toFixed(0)}
                </p>
              </div>
              <div className="bg-gray-700/50 dark:bg-gray-700/30 rounded-lg p-2.5 border border-yellow-600/50 dark:border-yellow-600/50">
                <p className="text-xs text-yellow-500 dark:text-yellow-400 mb-0.5">Pending</p>
                <p className="text-lg font-bold text-white dark:text-white">
                  ${financial.pending_invoices.toFixed(0)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <Package className="w-4 h-4 mr-2" />
                <span className="text-xs">Units Fulfilled</span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {financial.units_fulfilled}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <MessageSquare className="w-4 h-4 mr-2" />
                <span className="text-xs">Total Messages</span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {financial.total_messages}
              </span>
            </div>

            {financial.last_interaction && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">Last Interaction</p>
                <p className="text-sm text-gray-900 dark:text-white mt-0.5">
                  {format(new Date(financial.last_interaction), 'MMM d, h:mm a')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
