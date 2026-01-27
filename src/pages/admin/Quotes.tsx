import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Filter,
  Check,
  X,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users as UsersIcon
} from 'lucide-react';
import { toast } from '../../lib/toast';
import { useClickOutside } from '@/lib/useClickOutside';
import { supabase } from '@/lib/supabase';
import { NewProcessQuoteModal } from '@/components/admin/NewProcessQuoteModal';
import { QuoteVariant } from '@/types/quotes';
import { getStatusText } from '@/components/quotes/QuoteStatus';
import { FilterButton } from '@/components/FilterButton';
import { useAdmin } from '@/contexts/AdminContext';

interface Quote {
  id: string;
  productUrl: string;
  platform: 'aliexpress' | 'amazon' | 'other';
  productName: string;
  requestDate: string;
  status: 'quote_pending' | 'quoted' | 'rejected' | 'expired' | 'accepted' | 'pending_reacceptance' | 'synced_with_shopify' | 'cancelled';
  variants?: QuoteVariant[];
  expiresIn?: number;
  shopifyProductId?: string;
  shopDomain?: string;
  userId?: string;
  productId?: string;
  userName?: string;
  userEmail?: string;
}

export default function AdminQuotes() {
  const { adminUser, isSuperAdmin } = useAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Quote['status'] | 'all'>('all');
  const [selectedAdminFilter, setSelectedAdminFilter] = useState<string>('all');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showAdminFilterDropdown, setShowAdminFilterDropdown] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [admins, setAdmins] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [quoteStats, setQuoteStats] = useState({
    avgResponseTime: 0,
    avgProcessTime: 0,
    pendingCount: 0
  });

  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const adminFilterDropdownRef = useRef<HTMLDivElement>(null);
  useClickOutside(statusDropdownRef, () => setShowStatusDropdown(false));
  useClickOutside(adminFilterDropdownRef, () => setShowAdminFilterDropdown(false));

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(true);

  useEffect(() => {
    fetchQuotes();
    if (isSuperAdmin) {
      fetchAdmins();
      fetchQuoteStats();
    }
  }, [isSuperAdmin, selectedAdminFilter]);

  const fetchAdmins = async () => {
    try {
      const { data: adminProfiles, error } = await supabase
        .from('user_profiles')
        .select('user_id, name, first_name, last_name, email')
        .eq('is_admin', true)
        .eq('is_super_admin', false);

      if (error) throw error;

      const transformedAdmins = (adminProfiles || []).map(admin => ({
        id: admin.user_id,
        name: admin.name || (admin.first_name && admin.last_name ? `${admin.first_name} ${admin.last_name}` : admin.email),
        email: admin.email
      }));

      setAdmins(transformedAdmins);
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  const fetchQuoteStats = async () => {
    try {
      // Get pending quotes count
      const { count: pendingCount } = await supabase
        .from('product_quotes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'quote_pending');

      // Calculate average response time (time from created to quoted status)
      const { data: quotedQuotes } = await supabase
        .from('product_quotes')
        .select('created_at, updated_at')
        .eq('status', 'quoted')
        .limit(100);

      let avgResponseTime = 0;
      if (quotedQuotes && quotedQuotes.length > 0) {
        const totalTime = quotedQuotes.reduce((acc, quote) => {
          const created = new Date(quote.created_at).getTime();
          const updated = new Date(quote.updated_at).getTime();
          return acc + (updated - created);
        }, 0);
        avgResponseTime = Math.round(totalTime / quotedQuotes.length / (1000 * 60 * 60)); // Convert to hours
      }

      // Calculate average process time (similar but for accepted quotes)
      const { data: acceptedQuotes } = await supabase
        .from('product_quotes')
        .select('created_at, updated_at')
        .eq('status', 'accepted')
        .limit(100);

      let avgProcessTime = 0;
      if (acceptedQuotes && acceptedQuotes.length > 0) {
        const totalTime = acceptedQuotes.reduce((acc, quote) => {
          const created = new Date(quote.created_at).getTime();
          const updated = new Date(quote.updated_at).getTime();
          return acc + (updated - created);
        }, 0);
        avgProcessTime = Math.round(totalTime / acceptedQuotes.length / (1000 * 60 * 60)); // Convert to hours
      }

      setQuoteStats({
        avgResponseTime,
        avgProcessTime,
        pendingCount: pendingCount || 0
      });
    } catch (error) {
      console.error('Error fetching quote stats:', error);
    }
  };

  const fetchQuotes = async () => {
    try {
      setIsLoadingQuotes(true);

      // For super admins with no filter, get all quotes
      if (isSuperAdmin && selectedAdminFilter === 'all') {
        const { data: quotesData, error: quotesError } = await supabase
          .from('product_quotes')
          .select('*')
          .order('created_at', { ascending: false });

        if (quotesError) {
          console.error('Error fetching quotes:', quotesError);
          throw quotesError;
        }

        // Fetch user profiles for all user_ids
        const userIds = [...new Set(quotesData?.map(q => q.user_id).filter(Boolean) || [])];
        const { data: usersData, error: usersError } = await supabase
          .from('user_profiles')
          .select('id, name, email')
          .in('id', userIds);

        if (usersError) {
          console.error('Error fetching user profiles:', usersError);
        }

        // Create a map of user_id to user data
        const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);

        const transformedQuotes: Quote[] = (quotesData || []).map(quote => {
          const userProfile = usersMap.get(quote.user_id);

          // Calculate days until expiration
          let expiresIn: number | undefined;
          if (quote.expires_at) {
            const expiresAt = new Date(quote.expires_at);
            const now = new Date();
            const diffTime = expiresAt.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            expiresIn = diffDays > 0 ? diffDays : 0;
          }

          return {
            id: quote.id,
            productUrl: quote.product_url || '',
            platform: quote.platform as Quote['platform'] || 'other',
            productName: quote.product_name || 'Unknown Product',
            requestDate: quote.created_at ? new Date(quote.created_at).toLocaleDateString() : '',
            status: quote.status as Quote['status'] || 'quote_pending',
            variants: quote.variants || [],
            expiresIn,
            shopifyProductId: quote.shopify_product_id,
            shopDomain: quote.shop_domain,
            userId: quote.user_id,
            userName: userProfile?.name || 'Unknown User',
            userEmail: userProfile?.email || ''
          };
        });

        setQuotes(transformedQuotes);
        setIsLoadingQuotes(false);
        return;
      }

      // For admins with filters, get assigned user IDs first
      let assignedUserIds: string[] = [];

      if (!isSuperAdmin && adminUser?.userId) {
        // Regular admin - get their assigned users
        const { data: assignments, error: assignError } = await supabase
          .from('user_assignments')
          .select('user_id')
          .eq('admin_id', adminUser.userId);

        if (assignError) throw assignError;
        assignedUserIds = assignments?.map(a => a.user_id) || [];
      } else if (isSuperAdmin && selectedAdminFilter !== 'all') {
        // Super admin with filter - get that admin's assigned users
        const { data: assignments, error: assignError } = await supabase
          .from('user_assignments')
          .select('user_id')
          .eq('admin_id', selectedAdminFilter);

        if (assignError) throw assignError;
        assignedUserIds = assignments?.map(a => a.user_id) || [];
      }

      // If no assigned users, return empty array
      if (assignedUserIds.length === 0) {
        setQuotes([]);
        setIsLoadingQuotes(false);
        return;
      }

      // Fetch quotes for assigned users
      const { data: quotesData, error: quotesError } = await supabase
        .from('product_quotes')
        .select('*')
        .in('user_id', assignedUserIds)
        .order('created_at', { ascending: false});

      if (quotesError) {
        console.error('Error fetching quotes:', quotesError);
        throw quotesError;
      }

      // Fetch user profiles for assigned users
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, name, email')
        .in('id', assignedUserIds);

      if (usersError) {
        console.error('Error fetching user profiles:', usersError);
      }

      // Create a map of user_id to user data
      const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);

      const transformedQuotes: Quote[] = (quotesData || []).map(quote => {
        const userProfile = usersMap.get(quote.user_id);

        // Calculate days until expiration
        let expiresIn: number | undefined;
        if (quote.expires_at) {
          const expiresAt = new Date(quote.expires_at);
          const now = new Date();
          const diffTime = expiresAt.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          expiresIn = diffDays > 0 ? diffDays : 0;
        }

        return {
          id: quote.id,
          productUrl: quote.product_url || '',
          platform: quote.platform as Quote['platform'] || 'other',
          productName: quote.product_name || 'Unknown Product',
          requestDate: quote.created_at ? new Date(quote.created_at).toLocaleDateString() : '',
          status: quote.status as Quote['status'] || 'quote_pending',
          variants: quote.variants || [],
          expiresIn,
          shopifyProductId: quote.shopify_product_id,
          shopDomain: quote.shop_domain,
          userId: quote.user_id,
          userName: userProfile?.name || 'Unknown User',
          userEmail: userProfile?.email || ''
        };
      });

      setQuotes(transformedQuotes);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      toast.error('Failed to load quotes');
    } finally {
      setIsLoadingQuotes(false);
    }
  };

  const handleProcessQuote = async (variants: QuoteVariant[], policies: any, shippingTimeframe?: { min: number; max: number }) => {
    if (!selectedQuote) return;

    try {
      const updateData: any = {
        status: 'quoted',
        variants: variants,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      // Add policies if they exist
      if (policies) {
        updateData.warranty_days = policies.warrantyDays;
        updateData.covers_lost_items = policies.coversLostItems;
        updateData.covers_damaged_items = policies.coversDamagedItems;
        updateData.covers_late_delivery = policies.coversLateDelivery;
      }

      // Add shipping timeframe if provided
      if (shippingTimeframe) {
        updateData.shipping_timeframe_min = shippingTimeframe.min;
        updateData.shipping_timeframe_max = shippingTimeframe.max;
      }

      const { error } = await supabase
        .from('product_quotes')
        .update(updateData)
        .eq('id', selectedQuote.id);

      if (error) throw error;

      toast.success('Quote processed and sent to merchant');
      setSelectedQuote(null);
      fetchQuotes();
    } catch (error) {
      console.error('Error processing quote:', error);
      toast.error('Failed to process quote');
    }
  };


  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch =
      quote.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;

    // Admin filter is only for super admins
    const matchesAdminFilter = !isSuperAdmin || selectedAdminFilter === 'all';

    return matchesSearch && matchesStatus && matchesAdminFilter;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-normal text-gray-900 dark:text-gray-100 mb-2">
          Quote Requests
        </h1>
        <div className="flex items-start sm:items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 sm:mt-0 flex-shrink-0"></div>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
            Process and manage customer quote requests
          </p>
        </div>
      </div>

      {isSuperAdmin && (
        <div className="flex flex-row gap-4 md:gap-6 overflow-x-auto pb-1">
          <div className="flex-1 min-w-[180px] bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 p-4 sm:p-6 rounded-xl border border-gray-200/60 dark:border-[#3a3a3a]/60 shadow-sm">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="p-2 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg">
                <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
            <div>
              <h3 className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Avg Response Time</h3>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{quoteStats.avgResponseTime}h</p>
            </div>
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100 dark:border-[#3a3a3a]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Time to first quote</span>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{quoteStats.avgResponseTime}h</span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-[180px] bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 p-4 sm:p-6 rounded-xl border border-gray-200/60 dark:border-[#3a3a3a]/60 shadow-sm">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="p-2 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
            <div>
              <h3 className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Avg Process Time</h3>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{quoteStats.avgProcessTime}h</p>
            </div>
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100 dark:border-[#3a3a3a]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Time to acceptance</span>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{quoteStats.avgProcessTime}h</span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-[180px] bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 p-4 sm:p-6 rounded-xl border border-gray-200/60 dark:border-[#3a3a3a]/60 shadow-sm">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="p-2 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg">
                <AlertCircle className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
            <div>
              <h3 className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Pending Quotes</h3>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{quoteStats.pendingCount}</p>
            </div>
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100 dark:border-[#3a3a3a]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Awaiting response</span>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{quoteStats.pendingCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial sm:w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search quotes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-[38px] pl-10 pr-10 text-sm bg-white dark:bg-dark border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-200 dark:border-[#3a3a3a]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          <div className="relative" ref={statusDropdownRef}>
            <FilterButton
              icon={Filter}
              label="Status"
              selectedLabel={statusFilter === 'all' ? 'All' : getStatusText(statusFilter)}
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              isActive={statusFilter !== 'all'}
              activeCount={statusFilter !== 'all' ? 1 : 0}
              hideLabel="md"
              isOpen={showStatusDropdown}
            />

            {showStatusDropdown && (
              <div className="absolute z-50 w-48 mt-2 bg-white dark:bg-dark rounded-lg shadow-lg border border-gray-200 dark:border-[#3a3a3a] py-1">
                {(['all', 'quote_pending', 'quoted', 'accepted', 'rejected', 'expired'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      setShowStatusDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50"
                  >
                    <span>{status === 'all' ? 'All' : getStatusText(status)}</span>
                    {statusFilter === status && <Check className="w-4 h-4 text-rose-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isSuperAdmin && (
            <div className="relative" ref={adminFilterDropdownRef}>
              <FilterButton
                icon={UsersIcon}
                label="Admin"
                selectedLabel={
                  selectedAdminFilter === 'all'
                    ? 'All'
                    : admins.find(a => a.id === selectedAdminFilter)?.name || 'Admin'
                }
                onClick={() => setShowAdminFilterDropdown(!showAdminFilterDropdown)}
                isActive={selectedAdminFilter !== 'all'}
                activeCount={selectedAdminFilter !== 'all' ? 1 : 0}
                hideLabel="md"
                isOpen={showAdminFilterDropdown}
              />

              {showAdminFilterDropdown && (
                <div className="absolute z-50 w-56 mt-2 bg-white dark:bg-dark rounded-lg shadow-lg border border-gray-200 dark:border-[#3a3a3a] py-1 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => {
                      setSelectedAdminFilter('all');
                      setShowAdminFilterDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50"
                  >
                    <span>All Admins</span>
                    {selectedAdminFilter === 'all' && <Check className="w-4 h-4 text-primary-500" />}
                  </button>
                  <div className="border-t border-gray-200 dark:border-[#3a3a3a] my-1"></div>
                  {admins.map((admin) => (
                    <button
                      key={admin.id}
                      onClick={() => {
                        setSelectedAdminFilter(admin.id);
                        setShowAdminFilterDropdown(false);
                      }}
                      className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50"
                    >
                      <span className="truncate">{admin.name}</span>
                      {selectedAdminFilter === admin.id && <Check className="w-4 h-4 text-primary-500 flex-shrink-0 ml-2" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 rounded-xl border border-gray-200/60 dark:border-[#3a3a3a]/60 shadow-sm overflow-visible">
        <div className="overflow-x-auto rounded-xl">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-dark/50 border-b border-gray-200 dark:border-[#3a3a3a]">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 first:rounded-tl-xl">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 last:rounded-tr-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-[#3a3a3a]">
              {filteredQuotes.map((quote, index) => (
                <tr key={quote.id} className="hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50">
                  <td className={`px-6 py-4 ${index === filteredQuotes.length - 1 ? 'rounded-bl-xl' : ''}`}>
                    <a
                      href={
                        quote.shopifyProductId && quote.shopDomain
                          ? `https://${quote.shopDomain}/admin/products/${quote.shopifyProductId}`
                          : quote.productUrl
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 flex items-center"
                    >
                      {quote.productName}
                      <ExternalLink className="w-3 h-3 ml-1.5" />
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-900 dark:text-gray-100">
                        {quote.userName || 'Unknown'}
                      </span>
                      {quote.userEmail && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {quote.userEmail}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(quote.requestDate).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs whitespace-nowrap ${
                      quote.status === 'quote_pending'
                        ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                        : quote.status === 'quoted'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : quote.status === 'accepted'
                        ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : quote.status === 'rejected'
                        ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        : 'bg-gray-50 text-gray-700 dark:bg-[#3a3a3a]/50 dark:text-gray-300'
                    }`}>
                      {quote.status === 'synced_with_shopify' ? 'Synced' : quote.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-right ${index === filteredQuotes.length - 1 ? 'rounded-br-xl' : ''}`}>
                    {quote.status === 'quote_pending' ? (
                      <button
                        onClick={() => setSelectedQuote(quote)}
                        className="text-xs text-gray-900 hover:text-gray-700 dark:text-gray-100 dark:hover:text-gray-300 underline hover:no-underline"
                      >
                        Process
                      </button>
                    ) : quote.status === 'quoted' ? (
                      <button
                        onClick={() => setSelectedQuote(quote)}
                        className="text-xs text-gray-900 hover:text-gray-700 dark:text-gray-100 dark:hover:text-gray-300 underline hover:no-underline"
                      >
                        Edit
                      </button>
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedQuote && (
        <NewProcessQuoteModal
          quote={selectedQuote}
          onClose={() => setSelectedQuote(null)}
          onSubmit={handleProcessQuote}
        />
      )}
    </div>
  );
}
