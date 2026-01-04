import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Upload, RefreshCw, X, Clock, CheckCircle2, TrendingUp, ChevronDown, Check, Search, Users, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useClickOutside } from '../../lib/useClickOutside';
import { toast } from 'sonner';
import { CustomSelect } from '../../components/CustomSelect';
import UnfulfilledOrdersTab from '../../components/orders/UnfulfilledOrdersTab';
import FulfillmentTrackingTab from '../../components/orders/FulfillmentTrackingTab';
import AllOrdersTab from '../../components/orders/AllOrdersTab';
import ExportToMabangModal from '../../components/orders/ExportToMabangModal';
import ImportTrackingModal, { SyncFailureInfo } from '../../components/orders/ImportTrackingModal';

interface OrderPermissions {
  can_export_orders: boolean;
  can_import_tracking: boolean;
  can_sync_to_shopify: boolean;
  can_view_all_merchants: boolean;
}

interface OrderStats {
  readyToExport: number;
  exportedAwaitingTracking: number;
  trackingImportedToday: number;
  autoSyncedToday: number;
}

interface Merchant {
  id: string;
  name: string;
  orderCount: number;
}

export default function Orders() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'unfulfilled' | 'tracking' | 'all'>('unfulfilled');
  const [permissions, setPermissions] = useState<OrderPermissions | null>(null);
  const [stats, setStats] = useState<OrderStats>({
    readyToExport: 0,
    exportedAwaitingTracking: 0,
    trackingImportedToday: 0,
    autoSyncedToday: 0,
  });
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [filteredMerchantName, setFilteredMerchantName] = useState<string>('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFailure, setSyncFailure] = useState<SyncFailureInfo | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showMerchantDropdown, setShowMerchantDropdown] = useState(false);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [merchantSearchTerm, setMerchantSearchTerm] = useState('');
  const [loadingMerchants, setLoadingMerchants] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [exportStatusFilter, setExportStatusFilter] = useState<string>('all');
  const [carrierFilter, setCarrierFilter] = useState<string>('all');
  const [syncStatusFilter, setSyncStatusFilter] = useState<string>('all');
  const [fulfillmentStatusFilter, setFulfillmentStatusFilter] = useState<string>('all');
  const [allOrdersExportFilter, setAllOrdersExportFilter] = useState<string>('all');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [availableCarriers, setAvailableCarriers] = useState<string[]>([]);

  const merchantDropdownRef = useRef<HTMLDivElement>(null);
  useClickOutside(merchantDropdownRef, () => setShowMerchantDropdown(false));

  const filteredUserId = searchParams.get('userId');

  useEffect(() => {
    if (user?.id) {
      loadPermissions();
      checkSuperAdmin();
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadStats();
    }
  }, [user?.id, filteredUserId, isSuperAdmin]);

  useEffect(() => {
    if (filteredUserId) {
      loadMerchantName(filteredUserId);
    } else {
      setFilteredMerchantName('');
    }
  }, [filteredUserId]);

  useEffect(() => {
    if ((isSuperAdmin || permissions?.can_view_all_merchants) && user?.id) {
      loadMerchants();
    }
  }, [isSuperAdmin, permissions, user?.id]);

  const checkSuperAdmin = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('user_profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .maybeSingle();

    setIsSuperAdmin(data?.is_super_admin || false);
  };

  const loadPermissions = async () => {
    if (!user?.id) return;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.is_super_admin) {
      setPermissions({
        can_export_orders: true,
        can_import_tracking: true,
        can_sync_to_shopify: true,
        can_view_all_merchants: true,
      });
      return;
    }

    const { data } = await supabase
      .from('order_operation_permissions')
      .select('*')
      .eq('admin_id', user.id)
      .maybeSingle();

    if (data) {
      setPermissions({
        can_export_orders: data.can_export_orders,
        can_import_tracking: data.can_import_tracking,
        can_sync_to_shopify: data.can_sync_to_shopify,
        can_view_all_merchants: data.can_view_all_merchants,
      });
    } else {
      setPermissions({
        can_export_orders: false,
        can_import_tracking: false,
        can_sync_to_shopify: true,
        can_view_all_merchants: false,
      });
    }
  };

  const loadMerchantName = async (userId: string) => {
    const { data } = await supabase
      .from('user_profiles')
      .select('first_name, last_name, company, name')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      const name = data.company || data.name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Unknown Merchant';
      setFilteredMerchantName(name);
    }
  };

  const loadMerchants = async () => {
    if (!user?.id) return;

    try {
      setLoadingMerchants(true);

      let merchantQuery = supabase
        .from('user_profiles')
        .select('id, first_name, last_name, company, name')
        .eq('is_admin', false)
        .order('company');

      if (!isSuperAdmin) {
        const { data: assignments } = await supabase
          .from('user_assignments')
          .select('user_id')
          .eq('admin_id', user.id);

        if (assignments && assignments.length > 0) {
          const merchantIds = assignments.map(a => a.user_id);
          merchantQuery = merchantQuery.in('id', merchantIds);
        } else {
          setMerchants([]);
          setLoadingMerchants(false);
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

        merchantsWithCounts.sort((a, b) => b.orderCount - a.orderCount);
        setMerchants(merchantsWithCounts);
      }
    } catch (error) {
      console.error('Error loading merchants:', error);
    } finally {
      setLoadingMerchants(false);
    }
  };

  const loadStats = async () => {
    if (!user?.id) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let merchantIds: string[] | null = null;

      if (filteredUserId) {
        merchantIds = [filteredUserId];
      } else if (!isSuperAdmin) {
        const { data: assignments } = await supabase
          .from('user_assignments')
          .select('user_id')
          .eq('admin_id', user.id);

        if (assignments && assignments.length > 0) {
          merchantIds = assignments.map(a => a.user_id);
        } else {
          setStats({
            readyToExport: 0,
            exportedAwaitingTracking: 0,
            trackingImportedToday: 0,
            autoSyncedToday: 0,
          });
          return;
        }
      }

      let readyQuery = supabase
        .from('shopify_orders')
        .select('*', { count: 'exact', head: true })
        .or('fulfillment_status.is.null,fulfillment_status.eq.unfulfilled,fulfillment_status.eq.UNFULFILLED')
        .eq('exported_to_3pl', false)
        .or('financial_status.eq.paid,financial_status.eq.PAID,financial_status.eq.authorized,financial_status.eq.AUTHORIZED')
        .is('cancelled_at', null);

      if (merchantIds) {
        readyQuery = readyQuery.in('user_id', merchantIds);
      }

      const { count: readyToExport } = await readyQuery;

      let awaitingQuery = supabase
        .from('shopify_orders')
        .select('*', { count: 'exact', head: true })
        .eq('exported_to_3pl', true)
        .eq('tracking_imported', false);

      if (merchantIds) {
        awaitingQuery = awaitingQuery.in('user_id', merchantIds);
      }

      const { count: exportedAwaitingTracking } = await awaitingQuery;

      let importedQuery = supabase
        .from('shopify_orders')
        .select('*', { count: 'exact', head: true })
        .eq('tracking_imported', true)
        .gte('tracking_imported_at', today.toISOString());

      if (merchantIds) {
        importedQuery = importedQuery.in('user_id', merchantIds);
      }

      const { count: trackingImportedToday } = await importedQuery;

      let syncedQuery = supabase
        .from('shopify_orders')
        .select('*', { count: 'exact', head: true })
        .gte('last_synced_to_shopify_at', today.toISOString());

      if (merchantIds) {
        syncedQuery = syncedQuery.in('user_id', merchantIds);
      }

      const { count: autoSyncedToday } = await syncedQuery;

      setStats({
        readyToExport: readyToExport || 0,
        exportedAwaitingTracking: exportedAwaitingTracking || 0,
        trackingImportedToday: trackingImportedToday || 0,
        autoSyncedToday: autoSyncedToday || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleRetrySync = async (merchantId?: string) => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('shopify-sync-fulfillments', {
        body: { userId: merchantId || syncFailure?.merchantId || filteredUserId || undefined }
      });

      if (error) throw error;

      if (data?.failed > 0) {
        setSyncFailure({
          failedCount: data.failed,
          errorMessage: data.message || 'Some fulfillments failed to sync',
          merchantId: merchantId || syncFailure?.merchantId || filteredUserId || ''
        });
        toast.success(`Synced ${data.synced || 0} fulfillments, ${data.failed} still pending`);
      } else {
        setSyncFailure(null);
        toast.success(`Successfully synced ${data.synced || 0} fulfillments to Shopify`);
      }
      loadStats();
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      console.error('Error syncing to Shopify:', error);
      toast.error(error.message || 'Failed to sync to Shopify');
    } finally {
      setIsSyncing(false);
    }
  };

  const clearMerchantFilter = () => {
    searchParams.delete('userId');
    setSearchParams(searchParams);
  };

  const handleSelectMerchant = (merchantId: string | null) => {
    if (merchantId) {
      searchParams.set('userId', merchantId);
    } else {
      searchParams.delete('userId');
    }
    setSearchParams(searchParams);
    setShowMerchantDropdown(false);
  };

  const filteredMerchants = merchants.filter(m =>
    m.name.toLowerCase().includes(merchantSearchTerm.toLowerCase())
  );

  const selectedMerchant = merchants.find(m => m.id === filteredUserId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-normal text-gray-900 dark:text-gray-100">
            Order Fulfillment
          </h1>
          {filteredMerchantName && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 dark:text-gray-500">|</span>
              <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium">
                {filteredMerchantName}
              </span>
              <button
                onClick={clearMerchantFilter}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                title="Clear filter"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          )}
        </div>
        <div className="flex items-start sm:items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 sm:mt-0 flex-shrink-0"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filteredMerchantName
              ? `Managing fulfillment for ${filteredMerchantName}`
              : (
                <>
                  <span className="sm:hidden">Export orders and import tracking with Mabang</span>
                  <span className="hidden sm:inline">Export to Mabang 3PL, import tracking, and sync to Shopify</span>
                </>
              )
            }
          </p>
        </div>
      </div>

      {/* Merchant Filter and Actions Row */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Mobile: Merchant Filter + Sync Button Row */}
        <div className="flex items-center gap-2 sm:hidden">
          {(isSuperAdmin || permissions?.can_view_all_merchants) && (
            <div className="relative flex-1" ref={merchantDropdownRef}>
              <button
                onClick={() => setShowMerchantDropdown(!showMerchantDropdown)}
                className="w-full h-[38px] px-4 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center justify-between gap-2"
              >
                <Users className="w-4 h-4 text-gray-400" />
                <span className="truncate flex-1 text-left">
                  {selectedMerchant ? selectedMerchant.name : 'All Merchants'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </button>

              {showMerchantDropdown && (
                <div className="absolute left-0 z-50 w-80 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={merchantSearchTerm}
                        onChange={(e) => setMerchantSearchTerm(e.target.value)}
                        placeholder="Search merchants..."
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
                      />
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto py-1">
                    <button
                      onClick={() => handleSelectMerchant(null)}
                      className={`flex items-center justify-between w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                        !filteredUserId ? 'bg-gray-50 dark:bg-gray-700/50' : ''
                      }`}
                    >
                      <span className="text-gray-900 dark:text-white font-medium">All Merchants</span>
                      {!filteredUserId && <Check className="w-4 h-4 text-gray-900 dark:text-white" />}
                    </button>

                    <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>

                    {loadingMerchants ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        Loading merchants...
                      </div>
                    ) : filteredMerchants.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        No merchants found
                      </div>
                    ) : (
                      filteredMerchants.map((merchant) => (
                        <button
                          key={merchant.id}
                          onClick={() => handleSelectMerchant(merchant.id)}
                          className={`flex items-center justify-between w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                            filteredUserId === merchant.id ? 'bg-gray-50 dark:bg-gray-700/50' : ''
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-900 dark:text-white truncate">{merchant.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {merchant.orderCount} {merchant.orderCount === 1 ? 'order' : 'orders'} ready
                            </p>
                          </div>
                          {filteredUserId === merchant.id && <Check className="w-4 h-4 text-gray-900 dark:text-white flex-shrink-0 ml-2" />}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop: Merchant Filter Dropdown */}
        <div className="hidden sm:flex flex-row flex-wrap items-center gap-3 w-full lg:w-auto">
          {(isSuperAdmin || permissions?.can_view_all_merchants) && (
            <div className="relative" ref={merchantDropdownRef}>
              <button
                onClick={() => setShowMerchantDropdown(!showMerchantDropdown)}
                className="w-auto h-[38px] px-4 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center justify-start gap-2"
              >
                <Users className="w-4 h-4 text-gray-400" />
                <span className="truncate max-w-[180px]">
                  {selectedMerchant ? selectedMerchant.name : 'All Merchants'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </button>

              {showMerchantDropdown && (
                <div className="absolute left-0 z-50 w-80 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={merchantSearchTerm}
                        onChange={(e) => setMerchantSearchTerm(e.target.value)}
                        placeholder="Search merchants..."
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
                      />
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto py-1">
                    <button
                      onClick={() => handleSelectMerchant(null)}
                      className={`flex items-center justify-between w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                        !filteredUserId ? 'bg-gray-50 dark:bg-gray-700/50' : ''
                      }`}
                    >
                      <span className="text-gray-900 dark:text-white font-medium">All Merchants</span>
                      {!filteredUserId && <Check className="w-4 h-4 text-gray-900 dark:text-white" />}
                    </button>

                    <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>

                    {loadingMerchants ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        Loading merchants...
                      </div>
                    ) : filteredMerchants.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        No merchants found
                      </div>
                    ) : (
                      filteredMerchants.map((merchant) => (
                        <button
                          key={merchant.id}
                          onClick={() => handleSelectMerchant(merchant.id)}
                          className={`flex items-center justify-between w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                            filteredUserId === merchant.id ? 'bg-gray-50 dark:bg-gray-700/50' : ''
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-900 dark:text-white truncate">{merchant.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {merchant.orderCount} {merchant.orderCount === 1 ? 'order' : 'orders'} ready
                            </p>
                          </div>
                          {filteredUserId === merchant.id && <Check className="w-4 h-4 text-gray-900 dark:text-white flex-shrink-0 ml-2" />}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons - Desktop only (Export, Import, Sync) */}
        <div className="hidden sm:flex items-center gap-2">
          {permissions?.can_export_orders && (
            <div className="relative group">
              <button
                onClick={() => setShowExportModal(true)}
                disabled={!filteredUserId}
                className={`h-[38px] px-4 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                  !filteredUserId
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : selectedOrders.size > 0
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200/60 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Download className="w-4 h-4" />
                <span>{selectedOrders.size > 0 ? `Export ${selectedOrders.size} Orders` : 'Export to Mabang'}</span>
              </button>
              {!filteredUserId && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  Select a merchant first
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
                </div>
              )}
            </div>
          )}

          {permissions?.can_import_tracking && (
            <div className="relative group">
              <button
                onClick={() => setShowImportModal(true)}
                disabled={!filteredUserId}
                className={`h-[38px] px-4 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                  !filteredUserId
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-200/60 dark:border-gray-700/60 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200/60 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Import Tracking</span>
              </button>
              {!filteredUserId && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  Select a merchant first
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile: Export and Import buttons */}
        <div className="flex items-center gap-2 sm:hidden">
          {permissions?.can_export_orders && (
            <button
              onClick={() => setShowExportModal(true)}
              disabled={!filteredUserId}
              className={`flex-1 h-[38px] px-4 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                !filteredUserId
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : selectedOrders.size > 0
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'
                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200/60 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>{selectedOrders.size > 0 ? `Export (${selectedOrders.size})` : 'Export'}</span>
            </button>
          )}

          {permissions?.can_import_tracking && (
            <button
              onClick={() => setShowImportModal(true)}
              disabled={!filteredUserId}
              className={`flex-1 h-[38px] px-4 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                !filteredUserId
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-200/60 dark:border-gray-700/60 cursor-not-allowed'
                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200/60 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Import</span>
            </button>
          )}
        </div>
      </div>

      {/* Sync Failure Banner */}
      {syncFailure && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  Shopify Sync Failed
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  {syncFailure.failedCount} fulfillment{syncFailure.failedCount !== 1 ? 's' : ''} could not be synced to Shopify.
                </p>
                <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  <p className="font-medium">Possible reasons:</p>
                  <ul className="mt-1 space-y-0.5 list-disc list-inside">
                    <li>Shopify store connection expired</li>
                    <li>Order was already fulfilled in Shopify</li>
                    <li>Network or API rate limit issues</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:flex-shrink-0">
              <button
                onClick={() => handleRetrySync()}
                disabled={isSyncing}
                className="flex-1 sm:flex-none h-9 px-4 text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Retrying...' : 'Retry Sync'}</span>
              </button>
              <button
                onClick={() => setSyncFailure(null)}
                className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 p-4 sm:p-6 rounded-xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className={`p-1.5 sm:p-2 rounded-lg ${stats.readyToExport > 50 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
              <TrendingUp className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${stats.readyToExport > 50 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} />
            </div>
          </div>
          <div>
            <h3 className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Ready to Export</h3>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stats.readyToExport}</p>
          </div>
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Status</span>
              <span className={`text-[10px] sm:text-xs font-medium ${stats.readyToExport > 50 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                {stats.readyToExport > 50 ? 'High' : 'Normal'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 p-4 sm:p-6 rounded-xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="p-1.5 sm:p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
          <div>
            <h3 className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Awaiting Tracking</h3>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stats.exportedAwaitingTracking}</p>
          </div>
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">Exported orders</span>
              <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 sm:hidden">Orders</span>
              <span className="text-[10px] sm:text-xs font-medium text-gray-900 dark:text-gray-100">{stats.exportedAwaitingTracking}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 p-4 sm:p-6 rounded-xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="p-1.5 sm:p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
          <div>
            <h3 className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Imported Today</h3>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stats.trackingImportedToday}</p>
          </div>
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">Tracking numbers</span>
              <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 sm:hidden">Tracking</span>
              <span className="text-[10px] sm:text-xs font-medium text-gray-900 dark:text-gray-100">{stats.trackingImportedToday}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 p-4 sm:p-6 rounded-xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="p-1.5 sm:p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
          <div>
            <h3 className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Synced Today</h3>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stats.autoSyncedToday}</p>
          </div>
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">To Shopify</span>
              <span className="text-[10px] sm:text-xs font-medium text-gray-900 dark:text-gray-100">{stats.autoSyncedToday}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters - Above Tabs */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search - appears below filters on mobile, first on desktop */}
        <div className="relative flex-1 sm:max-w-md order-last sm:order-first">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search orders, customers..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
          />
        </div>

        {/* Filters - appear first on mobile */}
        {activeTab === 'unfulfilled' && (
          <CustomSelect
            value={exportStatusFilter}
            onChange={(val) => setExportStatusFilter(val as string)}
            options={[
              { value: 'all', label: 'All Export Status' },
              { value: 'ready', label: 'Ready to Export' },
              { value: 'exported', label: 'Already Exported' },
            ]}
            className="w-full sm:w-44"
          />
        )}

        {activeTab === 'tracking' && (
          <div className="flex flex-col sm:flex-row gap-3">
            <CustomSelect
              value={carrierFilter}
              onChange={(val) => setCarrierFilter(val as string)}
              options={[
                { value: 'all', label: 'All Carriers' },
                ...availableCarriers.map(c => ({ value: c, label: c }))
              ]}
              className="w-full sm:w-40"
            />
            <CustomSelect
              value={syncStatusFilter}
              onChange={(val) => setSyncStatusFilter(val as string)}
              options={[
                { value: 'all', label: 'All Sync Status' },
                { value: 'synced', label: 'Synced' },
                { value: 'pending', label: 'Pending' },
                { value: 'failed', label: 'Failed' },
              ]}
              className="w-full sm:w-40"
            />
          </div>
        )}

        {activeTab === 'all' && (
          <div className="flex flex-col sm:flex-row gap-3">
            <CustomSelect
              value={fulfillmentStatusFilter}
              onChange={(val) => setFulfillmentStatusFilter(val as string)}
              options={[
                { value: 'all', label: 'All Fulfillment Status' },
                { value: 'UNFULFILLED', label: 'Unfulfilled' },
                { value: 'FULFILLED', label: 'Fulfilled' },
                { value: 'PARTIALLY_FULFILLED', label: 'Partially Fulfilled' },
              ]}
              className="w-full sm:w-52"
            />
            <CustomSelect
              value={allOrdersExportFilter}
              onChange={(val) => setAllOrdersExportFilter(val as string)}
              options={[
                { value: 'all', label: 'All Export Status' },
                { value: 'exported', label: 'Exported to 3PL' },
                { value: 'not_exported', label: 'Not Exported' },
                { value: 'has_tracking', label: 'Has Tracking' },
                { value: 'no_tracking', label: 'No Tracking' },
              ]}
              className="w-full sm:w-44"
            />
          </div>
        )}
      </div>

      {/* Tabs and Table */}
      <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 rounded-xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('unfulfilled')}
              className={`flex-1 sm:flex-none px-3 sm:px-6 py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-1 sm:gap-2 ${
                activeTab === 'unfulfilled'
                  ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className="sm:hidden">Unfulfilled</span>
              <span className="hidden sm:inline">Unfulfilled Orders</span>
              {stats.readyToExport > 0 && (
                <span className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-semibold bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-full">
                  {stats.readyToExport}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('tracking')}
              className={`flex-1 sm:flex-none px-3 sm:px-6 py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center justify-center ${
                activeTab === 'tracking'
                  ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className="sm:hidden">Tracking</span>
              <span className="hidden sm:inline">Fulfillment Tracking</span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 sm:flex-none px-3 sm:px-6 py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center justify-center ${
                activeTab === 'all'
                  ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className="sm:hidden">All</span>
              <span className="hidden sm:inline">All Orders</span>
            </button>
          </nav>
        </div>

        <div>
          {activeTab === 'unfulfilled' && (
            <UnfulfilledOrdersTab
              filteredUserId={filteredUserId || undefined}
              isSuperAdmin={isSuperAdmin}
              permissions={permissions}
              onExport={() => setShowExportModal(true)}
              refreshKey={refreshKey}
              searchTerm={searchTerm}
              exportStatusFilter={exportStatusFilter}
              selectedOrders={selectedOrders}
              onSelectedOrdersChange={setSelectedOrders}
            />
          )}
          {activeTab === 'tracking' && (
            <FulfillmentTrackingTab
              filteredUserId={filteredUserId || undefined}
              isSuperAdmin={isSuperAdmin}
              permissions={permissions}
              refreshKey={refreshKey}
              searchTerm={searchTerm}
              carrierFilter={carrierFilter}
              syncStatusFilter={syncStatusFilter}
              onCarriersLoaded={setAvailableCarriers}
            />
          )}
          {activeTab === 'all' && (
            <AllOrdersTab
              filteredUserId={filteredUserId || undefined}
              isSuperAdmin={isSuperAdmin}
              permissions={permissions}
              refreshKey={refreshKey}
              searchTerm={searchTerm}
              fulfillmentStatusFilter={fulfillmentStatusFilter}
              exportStatusFilter={allOrdersExportFilter}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {showExportModal && (
        <ExportToMabangModal
          filteredUserId={filteredUserId || undefined}
          preSelectedOrderIds={selectedOrders.size > 0 ? selectedOrders : undefined}
          onClose={() => setShowExportModal(false)}
          onSuccess={() => {
            setShowExportModal(false);
            setSelectedOrders(new Set());
            loadStats();
            setRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {showImportModal && (
        <ImportTrackingModal
          filteredUserId={filteredUserId || undefined}
          merchants={merchants}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setShowImportModal(false)}
          onSuccess={(failure) => {
            setShowImportModal(false);
            if (failure) {
              setSyncFailure(failure);
            }
            loadStats();
            setRefreshKey(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
}
