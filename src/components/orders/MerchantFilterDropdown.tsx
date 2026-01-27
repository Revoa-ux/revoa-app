import React, { useState, useEffect } from 'react';
import { Filter, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { FilterButton } from '@/components/FilterButton';

interface MerchantFilterDropdownProps {
  currentUserId: string | null;
  onSelectMerchant: (userId: string | null) => void;
}

interface Merchant {
  id: string;
  name: string;
  orderCount: number;
}

export default function MerchantFilterDropdown({ currentUserId, onSelectMerchant }: MerchantFilterDropdownProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMerchants();
  }, [user?.id]);

  const loadMerchants = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Check if super admin
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .maybeSingle();

      const isSuperAdmin = profile?.is_super_admin || false;

      let merchantQuery = supabase
        .from('user_profiles')
        .select('id, first_name, last_name, company, name')
        .order('company');

      if (!isSuperAdmin) {
        // Get assigned merchants
        const { data: assignments } = await supabase
          .from('user_assignments')
          .select('user_id')
          .eq('admin_id', user.id);

        if (assignments && assignments.length > 0) {
          const merchantIds = assignments.map(a => a.user_id);
          merchantQuery = merchantQuery.in('id', merchantIds);
        } else {
          setMerchants([]);
          setLoading(false);
          return;
        }
      }

      const { data: merchantData } = await merchantQuery;

      if (merchantData) {
        const merchantsWithCounts = await Promise.all(
          merchantData.map(async (m: any) => {
            const { count } = await supabase
              .from('shopify_orders')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', m.id)
              .or('fulfillment_status.is.null,fulfillment_status.eq.unfulfilled,fulfillment_status.eq.UNFULFILLED')
              .eq('exported_to_3pl', false);

            return {
              id: m.id,
              name: m.company || m.name || `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Unknown',
              orderCount: count || 0,
            };
          })
        );

        // Sort by order count descending
        merchantsWithCounts.sort((a, b) => b.orderCount - a.orderCount);
        setMerchants(merchantsWithCounts);
      }
    } catch (error) {
      console.error('Error loading merchants:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMerchants = merchants.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedMerchant = merchants.find(m => m.id === currentUserId);
  const selectedLabel = selectedMerchant ? selectedMerchant.name : 'All';
  const isFiltered = currentUserId !== null;

  return (
    <div className="relative">
      <FilterButton
        icon={Filter}
        label="Merchant"
        selectedLabel={selectedLabel}
        onClick={() => setIsOpen(!isOpen)}
        isActive={isFiltered}
        activeCount={isFiltered ? 1 : 0}
        hideLabel="md"
      />

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg shadow-xl z-20">
            <div className="p-3 border-b border-gray-200 dark:border-[#3a3a3a]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search merchants..."
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {/* All Merchants Option */}
              <button
                onClick={() => {
                  onSelectMerchant(null);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-[#3a3a3a] transition-colors ${
                  !currentUserId ? 'bg-rose-50 dark:bg-rose-900/20' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    All Merchants
                  </span>
                  {!currentUserId && (
                    <div className="w-2 h-2 bg-rose-500 dark:bg-rose-400 rounded-full" />
                  )}
                </div>
              </button>

              {/* Merchant List */}
              {loading ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  Loading merchants...
                </div>
              ) : filteredMerchants.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  No merchants found
                </div>
              ) : (
                filteredMerchants.map((merchant) => (
                  <button
                    key={merchant.id}
                    onClick={() => {
                      onSelectMerchant(merchant.id);
                      setIsOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-[#3a3a3a] transition-colors ${
                      currentUserId === merchant.id ? 'bg-rose-50 dark:bg-rose-900/20' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {merchant.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {merchant.orderCount} {merchant.orderCount === 1 ? 'order' : 'orders'} ready
                        </p>
                      </div>
                      {currentUserId === merchant.id && (
                        <div className="w-2 h-2 bg-rose-500 dark:bg-rose-400 rounded-full ml-2" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
