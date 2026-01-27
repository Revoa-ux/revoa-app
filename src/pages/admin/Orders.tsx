import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Upload, RefreshCw, X, ChevronDown, Check, Search, Users, AlertTriangle, AlertCircle, Package, Truck, DollarSign, Factory, FileText, Filter, Receipt, Clock, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useClickOutside } from '../../lib/useClickOutside';
import { FilterButton } from '@/components/FilterButton';
import { toast } from '../../lib/toast';
import UnfulfilledOrdersTab from '../../components/orders/UnfulfilledOrdersTab';
import FulfillmentTrackingTab from '../../components/orders/FulfillmentTrackingTab';
import AllOrdersTab from '../../components/orders/AllOrdersTab';
import PendingPaymentsTab from '../../components/orders/PendingPaymentsTab';
import OrderFromFactoryTab from '../../components/orders/OrderFromFactoryTab';
import ExportToMabangModal from '../../components/orders/ExportToMabangModal';
import ImportTrackingModal, { SyncFailureInfo } from '../../components/orders/ImportTrackingModal';

interface OrderPermissions {
  can_export_orders: boolean;
  can_import_tracking: boolean;
  can_sync_to_shopify: boolean;
  can_view_all_merchants: boolean;
}

interface OrderStats {
  pendingPayments: number;
  awaitingFactoryOrder: number;
  readyToExport: number;
  exportedAwaitingTracking: number;
  trackingImportedToday: number;
  autoSyncedToday: number;
  outstandingAmount: number;
  paidInPeriod: number;
  pendingCount: number;
  overdueCount: number;
  paidNotOrderedAmount: number;
  readyToExportValue: number;
  needsTrackingNotSynced: number;
}

interface Merchant {
  id: string;
  name: string;
  orderCount: number;
}

export default function Orders() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'payments' | 'factory' | 'unfulfilled' | 'tracking'>('payments');
  const [permissions, setPermissions] = useState<OrderPermissions | null>(null);
  const [stats, setStats] = useState<OrderStats>({
    pendingPayments: 0,
    awaitingFactoryOrder: 0,
    readyToExport: 0,
    exportedAwaitingTracking: 0,
    trackingImportedToday: 0,
    autoSyncedToday: 0,
    outstandingAmount: 0,
    paidInPeriod: 0,
    pendingCount: 0,
    overdueCount: 0,
    paidNotOrderedAmount: 0,
    readyToExportValue: 0,
    needsTrackingNotSynced: 0,
  });
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isSuperAdminLoaded, setIsSuperAdminLoaded] = useState(false);
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
  const [hasSelectedMerchant, setHasSelectedMerchant] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [carrierFilter, setCarrierFilter] = useState<string>('all');
  const [syncStatusFilter, setSyncStatusFilter] = useState<string>('all');
  const [fulfillmentStatusFilter, setFulfillmentStatusFilter] = useState<string>('all');
  const [allOrdersExportFilter, setAllOrdersExportFilter] = useState<string>('all');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [availableCarriers, setAvailableCarriers] = useState<string[]>([]);

  const [showCarrierDropdown, setShowCarrierDropdown] = useState(false);
  const [showSyncStatusDropdown, setShowSyncStatusDropdown] = useState(false);
  const [showFulfillmentStatusDropdown, setShowFulfillmentStatusDropdown] = useState(false);
  const [showAllOrdersExportDropdown, setShowAllOrdersExportDropdown] = useState(false);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('all');
  const [showInvoiceStatusDropdown, setShowInvoiceStatusDropdown] = useState(false);
  const [adminFilter, setAdminFilter] = useState<string>('all');
  const [showAdminDropdown, setShowAdminDropdown] = useState(false);
  const [admins, setAdmins] = useState<{ id: string; name: string }[]>([]);

  const merchantDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMerchantDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMerchantDropdownMenuRef = useRef<HTMLDivElement>(null);
  const carrierDropdownRef = useRef<HTMLDivElement>(null);
  const syncStatusDropdownRef = useRef<HTMLDivElement>(null);
  const fulfillmentStatusDropdownRef = useRef<HTMLDivElement>(null);
  const allOrdersExportDropdownRef = useRef<HTMLDivElement>(null);
  const invoiceStatusDropdownRef = useRef<HTMLDivElement>(null);
  const adminDropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(merchantDropdownRef, () => setShowMerchantDropdown(false), [mobileMerchantDropdownMenuRef]);
  useClickOutside(carrierDropdownRef, () => setShowCarrierDropdown(false));
  useClickOutside(syncStatusDropdownRef, () => setShowSyncStatusDropdown(false));
  useClickOutside(fulfillmentStatusDropdownRef, () => setShowFulfillmentStatusDropdown(false));
  useClickOutside(allOrdersExportDropdownRef, () => setShowAllOrdersExportDropdown(false));
  useClickOutside(invoiceStatusDropdownRef, () => setShowInvoiceStatusDropdown(false));
  useClickOutside(adminDropdownRef, () => setShowAdminDropdown(false));

  const filteredUserId = searchParams.get('userId');

  useEffect(() => {
    if (user?.id) {
      loadPermissions();
      checkSuperAdmin();
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id && isSuperAdminLoaded) {
      loadStats();
    }
  }, [user?.id, filteredUserId, isSuperAdmin, isSuperAdminLoaded, refreshKey]);

  useEffect(() => {
    if (filteredUserId) {
      loadMerchantName(filteredUserId);
      setHasSelectedMerchant(true);
    } else {
      setFilteredMerchantName('');
    }
  }, [filteredUserId]);

  useEffect(() => {
    if ((isSuperAdmin || permissions?.can_view_all_merchants) && user?.id) {
      loadMerchants();
    }
  }, [isSuperAdmin, permissions, user?.id]);

  useEffect(() => {
    if (isSuperAdmin) {
      loadAdmins();
    }
  }, [isSuperAdmin]);

  const loadAdmins = async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, email')
      .eq('is_admin', true)
      .order('first_name');

    if (data) {
      setAdmins(data.map(a => ({
        id: a.id,
        name: `${a.first_name || ''} ${a.last_name || ''}`.trim() || a.email || 'Unknown Admin'
      })));
    }
  };

  const checkSuperAdmin = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('user_profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .maybeSingle();

    setIsSuperAdmin(data?.is_super_admin || false);
    setIsSuperAdminLoaded(true);
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
      setIsLoadingStats(true);
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
            pendingPayments: 0,
            awaitingFactoryOrder: 0,
            readyToExport: 0,
            exportedAwaitingTracking: 0,
            trackingImportedToday: 0,
            autoSyncedToday: 0,
            outstandingAmount: 0,
            paidInPeriod: 0,
            pendingCount: 0,
            overdueCount: 0,
            paidNotOrderedAmount: 0,
            readyToExportValue: 0,
            needsTrackingNotSynced: 0,
          });
          return;
        }
      }

      let pendingPaymentsQuery = supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'unpaid', 'overdue']);

      if (merchantIds) {
        pendingPaymentsQuery = pendingPaymentsQuery.in('user_id', merchantIds);
      }

      const { count: pendingPayments } = await pendingPaymentsQuery;

      let factoryOrderQuery = supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'paid')
        .or('factory_order_placed.is.null,factory_order_placed.eq.false');

      if (merchantIds) {
        factoryOrderQuery = factoryOrderQuery.in('user_id', merchantIds);
      }

      const { count: awaitingFactoryOrder } = await factoryOrderQuery;

      let readyQuery = supabase
        .from('shopify_orders')
        .select('*', { count: 'exact', head: true })
        .or('fulfillment_status.is.null,fulfillment_status.eq.unfulfilled,fulfillment_status.eq.UNFULFILLED')
        .eq('exported_to_3pl', false)
        .eq('factory_order_confirmed', true)
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
        .or('tracking_imported.is.null,tracking_imported.eq.false')
        .is('cancelled_at', null);

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

      let outstandingQuery = supabase
        .from('invoices')
        .select('total_amount')
        .in('status', ['pending', 'unpaid', 'overdue']);

      if (merchantIds) {
        outstandingQuery = outstandingQuery.in('user_id', merchantIds);
      }

      const { data: outstandingInvoices } = await outstandingQuery;
      const outstandingAmount = outstandingInvoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let paidQuery = supabase
        .from('invoices')
        .select('total_amount')
        .eq('status', 'paid')
        .gte('paid_at', thirtyDaysAgo.toISOString());

      if (merchantIds) {
        paidQuery = paidQuery.in('user_id', merchantIds);
      }

      const { data: paidInvoices } = await paidQuery;
      const paidInPeriod = paidInvoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;

      let pendingCountQuery = supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'unpaid']);

      if (merchantIds) {
        pendingCountQuery = pendingCountQuery.in('user_id', merchantIds);
      }

      const { count: pendingCount } = await pendingCountQuery;

      let overdueCountQuery = supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'overdue');

      if (merchantIds) {
        overdueCountQuery = overdueCountQuery.in('user_id', merchantIds);
      }

      const { count: overdueCount } = await overdueCountQuery;

      let paidNotOrderedQuery = supabase
        .from('invoices')
        .select('total_amount, factory_order_amount')
        .eq('status', 'paid')
        .or('factory_order_placed.is.null,factory_order_placed.eq.false');

      if (merchantIds) {
        paidNotOrderedQuery = paidNotOrderedQuery.in('user_id', merchantIds);
      }

      const { data: paidNotOrderedInvoices } = await paidNotOrderedQuery;
      const paidNotOrderedAmount = paidNotOrderedInvoices?.reduce((sum, inv) => {
        const total = inv.total_amount || 0;
        const ordered = inv.factory_order_amount || 0;
        return sum + (total - ordered);
      }, 0) || 0;

      let readyToExportValueQuery = supabase
        .from('shopify_orders')
        .select('total_price')
        .or('fulfillment_status.is.null,fulfillment_status.eq.unfulfilled,fulfillment_status.eq.UNFULFILLED')
        .eq('exported_to_3pl', false)
        .eq('factory_order_confirmed', true)
        .or('financial_status.eq.paid,financial_status.eq.PAID,financial_status.eq.authorized,financial_status.eq.AUTHORIZED')
        .is('cancelled_at', null);

      if (merchantIds) {
        readyToExportValueQuery = readyToExportValueQuery.in('user_id', merchantIds);
      }

      const { data: readyToExportOrders } = await readyToExportValueQuery;
      const readyToExportValue = readyToExportOrders?.reduce((sum, order) => sum + (parseFloat(order.total_price) || 0), 0) || 0;

      const { count: needsTrackingNotSynced } = await awaitingQuery;

      setStats({
        pendingPayments: pendingPayments || 0,
        awaitingFactoryOrder: awaitingFactoryOrder || 0,
        readyToExport: readyToExport || 0,
        exportedAwaitingTracking: exportedAwaitingTracking || 0,
        trackingImportedToday: trackingImportedToday || 0,
        autoSyncedToday: autoSyncedToday || 0,
        outstandingAmount,
        paidInPeriod,
        pendingCount: pendingCount || 0,
        overdueCount: overdueCount || 0,
        paidNotOrderedAmount,
        readyToExportValue,
        needsTrackingNotSynced: needsTrackingNotSynced || 0,
      });
      setIsLoadingStats(false);
    } catch (error) {
      console.error('Error loading stats:', error);
      setIsLoadingStats(false);
    }
  };

  const handleRefreshAll = () => {
    loadStats();
    setRefreshKey(prev => prev + 1);
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
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('userId');
    setSearchParams(newParams);
  };

  const handleSelectMerchant = (merchantId: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (merchantId) {
      newParams.set('userId', merchantId);
    } else {
      newParams.delete('userId');
    }
    setSearchParams(newParams);
    setShowMerchantDropdown(false);
    setHasSelectedMerchant(true);
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
              <span className="px-3 py-1 bg-gray-100 dark:bg-dark text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium">
                {filteredMerchantName}
              </span>
              <button
                onClick={clearMerchantFilter}
                className="p-1 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-full transition-colors"
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
            <div className="relative flex-1" ref={mobileMerchantDropdownRef}>
              <FilterButton
                icon={Users}
                label="Merchant"
                selectedLabel={selectedMerchant ? selectedMerchant.name : 'All'}
                onClick={() => setShowMerchantDropdown(!showMerchantDropdown)}
                isActive={!!filteredUserId}
                activeCount={filteredUserId ? 1 : 0}
                fullWidth
                hideLabel="never"
                isOpen={showMerchantDropdown}
              />

              {showMerchantDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40 sm:hidden"
                    onClick={() => setShowMerchantDropdown(false)}
                  />
                  <div
                    ref={mobileMerchantDropdownMenuRef}
                    className="absolute left-0 right-0 z-50 mt-2 bg-white dark:bg-dark rounded-lg shadow-lg border border-gray-200 dark:border-[#3a3a3a] overflow-hidden sm:hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                  <div className="p-3 border-b border-gray-200 dark:border-[#3a3a3a]">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={merchantSearchTerm}
                          onChange={(e) => setMerchantSearchTerm(e.target.value)}
                          placeholder="Search merchants..."
                          className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMerchantDropdown(false);
                        }}
                        className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 touch-manipulation"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto overscroll-contain">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectMerchant(null);
                      }}
                      className={`flex items-center justify-between w-full px-4 py-2.5 text-sm text-left active:bg-gray-100 dark:active:bg-[#4a4a4a]/50 transition-colors touch-manipulation ${
                        !filteredUserId ? 'bg-gray-50 dark:bg-[#3a3a3a]/50' : ''
                      }`}
                    >
                      <span className="text-gray-900 dark:text-white font-medium">All Merchants</span>
                      {!filteredUserId && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                    </button>

                    <div className="border-t border-gray-200 dark:border-[#3a3a3a]"></div>

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
                          type="button"
                          key={merchant.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectMerchant(merchant.id);
                          }}
                          className={`flex items-center justify-between w-full px-4 py-2.5 text-sm text-left active:bg-gray-100 dark:active:bg-[#4a4a4a]/50 transition-colors touch-manipulation ${
                            filteredUserId === merchant.id ? 'bg-gray-50 dark:bg-[#3a3a3a]/50' : ''
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-900 dark:text-white truncate">{merchant.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {merchant.orderCount} {merchant.orderCount === 1 ? 'order' : 'orders'} ready
                            </p>
                          </div>
                          {filteredUserId === merchant.id && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400 flex-shrink-0 ml-2" />}
                        </button>
                      ))
                    )}
                  </div>
                </div>
                </>
              )}
            </div>
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className={`relative overflow-hidden bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 p-4 rounded-xl border border-gray-200/60 dark:border-[#3a3a3a]/60 shadow-sm transition-all ${isLoadingStats ? 'animate-pulse' : ''}`}>
          {isLoadingStats && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 dark:via-[#3a3a3a]/50 to-transparent animate-shimmer"
                 style={{
                   backgroundSize: '200% 100%',
                   animation: 'shimmer 2s infinite'
                 }}
            />
          )}
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg">
              <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Waiting Payment</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {isLoadingStats ? '...' : `$${stats.outstandingAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          </p>
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#3a3a3a]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">Invoices</span>
              <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{isLoadingStats ? '...' : stats.pendingPayments}</span>
            </div>
          </div>
        </div>

        <div className={`relative overflow-hidden bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 p-4 rounded-xl border border-gray-200/60 dark:border-[#3a3a3a]/60 shadow-sm transition-all ${isLoadingStats ? 'animate-pulse' : ''}`}>
          {isLoadingStats && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 dark:via-[#3a3a3a]/50 to-transparent animate-shimmer"
                 style={{
                   backgroundSize: '200% 100%',
                   animation: 'shimmer 2s infinite'
                 }}
            />
          )}
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg">
              <Factory className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Ready To Order</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {isLoadingStats ? '...' : `$${stats.paidNotOrderedAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          </p>
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#3a3a3a]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">Paid invoices</span>
              <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{isLoadingStats ? '...' : stats.awaitingFactoryOrder}</span>
            </div>
          </div>
        </div>

        <div className={`relative overflow-hidden bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 p-4 rounded-xl border border-gray-200/60 dark:border-[#3a3a3a]/60 shadow-sm transition-all ${isLoadingStats ? 'animate-pulse' : ''}`}>
          {isLoadingStats && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 dark:via-[#3a3a3a]/50 to-transparent animate-shimmer"
                 style={{
                   backgroundSize: '200% 100%',
                   animation: 'shimmer 2s infinite'
                 }}
            />
          )}
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg">
              <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Ready To Export</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {isLoadingStats ? '...' : `$${stats.readyToExportValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          </p>
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#3a3a3a]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">Orders</span>
              <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{isLoadingStats ? '...' : stats.readyToExport}</span>
            </div>
          </div>
        </div>

        <div className={`relative overflow-hidden bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 p-4 rounded-xl border border-gray-200/60 dark:border-[#3a3a3a]/60 shadow-sm transition-all ${isLoadingStats ? 'animate-pulse' : ''}`}>
          {isLoadingStats && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 dark:via-[#3a3a3a]/50 to-transparent animate-shimmer"
                 style={{
                   backgroundSize: '200% 100%',
                   animation: 'shimmer 2s infinite'
                 }}
            />
          )}
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg">
              <Truck className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Needs Tracking</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {isLoadingStats ? '...' : stats.needsTrackingNotSynced}
          </p>
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#3a3a3a]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">Synced today</span>
              <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{isLoadingStats ? '...' : stats.autoSyncedToday}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters - Above Tabs */}
      <div className="flex flex-row items-center gap-3">
        {/* Merchant Filter - Desktop (left of search) */}
        {(isSuperAdmin || permissions?.can_view_all_merchants) && (
          <div className="hidden sm:block relative" ref={merchantDropdownRef}>
            <FilterButton
              icon={Users}
              label="Merchant"
              selectedLabel={selectedMerchant ? selectedMerchant.name : 'All Merchants'}
              onClick={() => setShowMerchantDropdown(!showMerchantDropdown)}
              isActive={!!filteredUserId}
              activeCount={filteredUserId ? 1 : 0}
              hideLabel="sm"
              isOpen={showMerchantDropdown}
            />

            {showMerchantDropdown && (
              <div className="absolute left-0 z-50 w-80 mt-2 bg-white dark:bg-dark rounded-lg shadow-lg border border-gray-200 dark:border-[#3a3a3a] overflow-hidden">
                <div className="p-3 border-b border-gray-200 dark:border-[#3a3a3a]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={merchantSearchTerm}
                      onChange={(e) => setMerchantSearchTerm(e.target.value)}
                      placeholder="Search merchants..."
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
                    />
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto">
                  <button
                    onClick={() => handleSelectMerchant(null)}
                    className={`flex items-center justify-between w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors ${
                      !filteredUserId ? 'bg-gray-50 dark:bg-[#3a3a3a]/50' : ''
                    }`}
                  >
                    <span className="text-gray-900 dark:text-white font-medium">All Merchants</span>
                    {!filteredUserId && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                  </button>

                  <div className="border-t border-gray-200 dark:border-[#3a3a3a]"></div>

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
                        className={`flex items-center justify-between w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors ${
                          filteredUserId === merchant.id ? 'bg-gray-50 dark:bg-[#3a3a3a]/50' : ''
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 dark:text-white truncate">{merchant.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {merchant.orderCount} {merchant.orderCount === 1 ? 'order' : 'orders'} ready
                          </p>
                        </div>
                        {filteredUserId === merchant.id && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400 flex-shrink-0 ml-2" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search */}
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search invoices and orders..."
            className="w-full h-[38px] pl-10 pr-4 bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
          />
        </div>

        {/* Filters */}
        {activeTab === 'payments' && (
          <div className="flex flex-row gap-2 sm:gap-3">
            <div className="relative" ref={invoiceStatusDropdownRef}>
              <FilterButton
                icon={Filter}
                label="Status"
                selectedLabel={
                  invoiceStatusFilter === 'all' ? 'All' :
                  invoiceStatusFilter.charAt(0).toUpperCase() + invoiceStatusFilter.slice(1)
                }
                onClick={() => setShowInvoiceStatusDropdown(!showInvoiceStatusDropdown)}
                isActive={invoiceStatusFilter !== 'all'}
                activeCount={invoiceStatusFilter !== 'all' ? 1 : 0}
                hideLabel="md"
                isOpen={showInvoiceStatusDropdown}
              />
              {showInvoiceStatusDropdown && (
                <div className="absolute right-0 sm:left-0 z-50 w-48 mt-2 bg-white dark:bg-dark rounded-lg shadow-lg border border-gray-200 dark:border-[#3a3a3a] overflow-hidden">
                  {[
                    { value: 'all', label: 'All Status' },
                    { value: 'unpaid', label: 'Unpaid' },
                    { value: 'overdue', label: 'Overdue' },
                    { value: 'partially_paid', label: 'Partially Paid' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setInvoiceStatusFilter(option.value);
                        setShowInvoiceStatusDropdown(false);
                      }}
                      className={`flex items-center justify-between w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors ${
                        invoiceStatusFilter === option.value ? 'bg-gray-50 dark:bg-[#3a3a3a]/50' : ''
                      }`}
                    >
                      <span className="text-gray-900 dark:text-white">{option.label}</span>
                      {invoiceStatusFilter === option.value && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isSuperAdmin && (
              <div className="relative" ref={adminDropdownRef}>
                <FilterButton
                  icon={Users}
                  label="Admin"
                  selectedLabel={
                    adminFilter === 'all' ? 'All Admins' :
                    admins.find(a => a.id === adminFilter)?.name || 'Admin'
                  }
                  onClick={() => setShowAdminDropdown(!showAdminDropdown)}
                  isActive={adminFilter !== 'all'}
                  activeCount={adminFilter !== 'all' ? 1 : 0}
                  hideLabel="md"
                  isOpen={showAdminDropdown}
                />
                {showAdminDropdown && (
                  <div className="absolute right-0 sm:left-0 z-50 w-56 mt-2 bg-white dark:bg-dark rounded-lg shadow-lg border border-gray-200 dark:border-[#3a3a3a] overflow-hidden max-h-64 overflow-y-auto">
                    <button
                      onClick={() => {
                        setAdminFilter('all');
                        setShowAdminDropdown(false);
                      }}
                      className={`flex items-center justify-between w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors ${
                        adminFilter === 'all' ? 'bg-gray-50 dark:bg-[#3a3a3a]/50' : ''
                      }`}
                    >
                      <span className="text-gray-900 dark:text-white">All Admins</span>
                      {adminFilter === 'all' && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                    </button>
                    {admins.map((admin) => (
                      <button
                        key={admin.id}
                        onClick={() => {
                          setAdminFilter(admin.id);
                          setShowAdminDropdown(false);
                        }}
                        className={`flex items-center justify-between w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors ${
                          adminFilter === admin.id ? 'bg-gray-50 dark:bg-[#3a3a3a]/50' : ''
                        }`}
                      >
                        <span className="text-gray-900 dark:text-white">{admin.name}</span>
                        {adminFilter === admin.id && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'factory' && isSuperAdmin && (
          <div className="relative" ref={adminDropdownRef}>
            <FilterButton
              icon={Users}
              label="Admin"
              selectedLabel={
                adminFilter === 'all' ? 'All Admins' :
                admins.find(a => a.id === adminFilter)?.name || 'Admin'
              }
              onClick={() => setShowAdminDropdown(!showAdminDropdown)}
              isActive={adminFilter !== 'all'}
              activeCount={adminFilter !== 'all' ? 1 : 0}
              hideLabel="sm"
              isOpen={showAdminDropdown}
            />
            {showAdminDropdown && (
              <div className="absolute right-0 sm:left-0 z-50 w-56 mt-2 bg-white dark:bg-dark rounded-lg shadow-lg border border-gray-200 dark:border-[#3a3a3a] overflow-hidden max-h-64 overflow-y-auto">
                <button
                  onClick={() => {
                    setAdminFilter('all');
                    setShowAdminDropdown(false);
                  }}
                  className={`flex items-center justify-between w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors ${
                    adminFilter === 'all' ? 'bg-gray-50 dark:bg-[#3a3a3a]/50' : ''
                  }`}
                >
                  <span className="text-gray-900 dark:text-white">All Admins</span>
                  {adminFilter === 'all' && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                </button>
                {admins.map((admin) => (
                  <button
                    key={admin.id}
                    onClick={() => {
                      setAdminFilter(admin.id);
                      setShowAdminDropdown(false);
                    }}
                    className={`flex items-center justify-between w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors ${
                      adminFilter === admin.id ? 'bg-gray-50 dark:bg-[#3a3a3a]/50' : ''
                    }`}
                  >
                    <span className="text-gray-900 dark:text-white">{admin.name}</span>
                    {adminFilter === admin.id && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}


        {activeTab === 'tracking' && (
          <div className="flex flex-row gap-2 sm:gap-3">
            <div className="relative" ref={carrierDropdownRef}>
              <FilterButton
                icon={Truck}
                label="Carrier"
                selectedLabel={carrierFilter === 'all' ? 'All' : carrierFilter}
                onClick={() => setShowCarrierDropdown(!showCarrierDropdown)}
                isActive={carrierFilter !== 'all'}
                activeCount={carrierFilter !== 'all' ? 1 : 0}
                hideLabel="md"
                isOpen={showCarrierDropdown}
              />
              {showCarrierDropdown && (
                <div className="absolute right-0 sm:left-0 z-50 w-48 mt-2 bg-white dark:bg-dark rounded-lg shadow-lg border border-gray-200 dark:border-[#3a3a3a] overflow-hidden max-h-64 overflow-y-auto">
                  <button
                    onClick={() => {
                      setCarrierFilter('all');
                      setShowCarrierDropdown(false);
                    }}
                    className={`flex items-center justify-between w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors ${
                      carrierFilter === 'all' ? 'bg-gray-50 dark:bg-[#3a3a3a]/50' : ''
                    }`}
                  >
                    <span className="text-gray-900 dark:text-white">All Carriers</span>
                    {carrierFilter === 'all' && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                  </button>
                  {availableCarriers.map((carrier) => (
                    <button
                      key={carrier}
                      onClick={() => {
                        setCarrierFilter(carrier);
                        setShowCarrierDropdown(false);
                      }}
                      className={`flex items-center justify-between w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors ${
                        carrierFilter === carrier ? 'bg-gray-50 dark:bg-[#3a3a3a]/50' : ''
                      }`}
                    >
                      <span className="text-gray-900 dark:text-white">{carrier}</span>
                      {carrierFilter === carrier && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative" ref={syncStatusDropdownRef}>
              <FilterButton
                icon={RefreshCw}
                label="Sync"
                selectedLabel={syncStatusFilter === 'all' ? 'All' : syncStatusFilter.charAt(0).toUpperCase() + syncStatusFilter.slice(1)}
                onClick={() => setShowSyncStatusDropdown(!showSyncStatusDropdown)}
                isActive={syncStatusFilter !== 'all'}
                activeCount={syncStatusFilter !== 'all' ? 1 : 0}
                hideLabel="md"
                isOpen={showSyncStatusDropdown}
              />
              {showSyncStatusDropdown && (
                <div className="absolute right-0 sm:left-0 z-50 w-48 mt-2 bg-white dark:bg-dark rounded-lg shadow-lg border border-gray-200 dark:border-[#3a3a3a] overflow-hidden">
                  {[
                    { value: 'all', label: 'All Sync Status' },
                    { value: 'synced', label: 'Synced' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'failed', label: 'Failed' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSyncStatusFilter(option.value);
                        setShowSyncStatusDropdown(false);
                      }}
                      className={`flex items-center justify-between w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors ${
                        syncStatusFilter === option.value ? 'bg-gray-50 dark:bg-[#3a3a3a]/50' : ''
                      }`}
                    >
                      <span className="text-gray-900 dark:text-white">{option.label}</span>
                      {syncStatusFilter === option.value && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'all' && (
          <div className="flex flex-row gap-2 sm:gap-3">
            <div className="relative" ref={fulfillmentStatusDropdownRef}>
              <FilterButton
                icon={Package}
                label="Fulfillment"
                selectedLabel={
                  fulfillmentStatusFilter === 'all' ? 'All' :
                  fulfillmentStatusFilter === 'UNFULFILLED' ? 'Unfulfilled' :
                  fulfillmentStatusFilter === 'FULFILLED' ? 'Fulfilled' : 'Partial'
                }
                onClick={() => setShowFulfillmentStatusDropdown(!showFulfillmentStatusDropdown)}
                isActive={fulfillmentStatusFilter !== 'all'}
                activeCount={fulfillmentStatusFilter !== 'all' ? 1 : 0}
                hideLabel="md"
                isOpen={showFulfillmentStatusDropdown}
              />
              {showFulfillmentStatusDropdown && (
                <div className="absolute right-0 sm:left-0 z-50 w-52 mt-2 bg-white dark:bg-dark rounded-lg shadow-lg border border-gray-200 dark:border-[#3a3a3a] overflow-hidden">
                  {[
                    { value: 'all', label: 'All Fulfillment Status' },
                    { value: 'UNFULFILLED', label: 'Unfulfilled' },
                    { value: 'FULFILLED', label: 'Fulfilled' },
                    { value: 'PARTIALLY_FULFILLED', label: 'Partially Fulfilled' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setFulfillmentStatusFilter(option.value);
                        setShowFulfillmentStatusDropdown(false);
                      }}
                      className={`flex items-center justify-between w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors ${
                        fulfillmentStatusFilter === option.value ? 'bg-gray-50 dark:bg-[#3a3a3a]/50' : ''
                      }`}
                    >
                      <span className="text-gray-900 dark:text-white">{option.label}</span>
                      {fulfillmentStatusFilter === option.value && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative" ref={allOrdersExportDropdownRef}>
              <FilterButton
                icon={Download}
                label="Export"
                selectedLabel={
                  allOrdersExportFilter === 'all' ? 'All' :
                  allOrdersExportFilter === 'exported' ? 'Exported' :
                  allOrdersExportFilter === 'not_exported' ? 'Not Exported' :
                  allOrdersExportFilter === 'has_tracking' ? 'Has Tracking' : 'No Tracking'
                }
                onClick={() => setShowAllOrdersExportDropdown(!showAllOrdersExportDropdown)}
                isActive={allOrdersExportFilter !== 'all'}
                activeCount={allOrdersExportFilter !== 'all' ? 1 : 0}
                hideLabel="md"
                isOpen={showAllOrdersExportDropdown}
              />
              {showAllOrdersExportDropdown && (
                <div className="absolute right-0 sm:left-0 z-50 w-48 mt-2 bg-white dark:bg-dark rounded-lg shadow-lg border border-gray-200 dark:border-[#3a3a3a] overflow-hidden">
                  {[
                    { value: 'all', label: 'All Export Status' },
                    { value: 'exported', label: 'Exported to 3PL' },
                    { value: 'not_exported', label: 'Not Exported' },
                    { value: 'has_tracking', label: 'Has Tracking' },
                    { value: 'no_tracking', label: 'No Tracking' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setAllOrdersExportFilter(option.value);
                        setShowAllOrdersExportDropdown(false);
                      }}
                      className={`flex items-center justify-between w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors ${
                        allOrdersExportFilter === option.value ? 'bg-gray-50 dark:bg-[#3a3a3a]/50' : ''
                      }`}
                    >
                      <span className="text-gray-900 dark:text-white">{option.label}</span>
                      {allOrdersExportFilter === option.value && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tabs and Table */}
      <div className="bg-gray-50/50 dark:bg-dark/50 rounded-xl border border-gray-200 dark:border-[#3a3a3a] overflow-hidden">
        <div className="border-b border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-dark px-2 sm:px-4">
          <div className="flex items-center gap-1 sm:gap-2 py-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
            <button
              onClick={() => setActiveTab('payments')}
              className={`relative flex items-center gap-2 py-2 px-3 sm:px-4 rounded-lg transition-all ${
                activeTab === 'payments'
                  ? 'bg-gray-100 dark:bg-[#3a3a3a] text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/30'
              }`}
            >
              <span className="font-medium text-sm whitespace-nowrap">Waiting Payment</span>
              {(hasSelectedMerchant || filteredUserId) && stats.pendingPayments > 0 && (
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  activeTab === 'payments'
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white'
                    : 'bg-gray-200 dark:bg-[#4a4a4a] text-gray-600 dark:text-gray-300'
                }`}>
                  {stats.pendingPayments}
                </span>
              )}
            </button>

            <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0 hidden sm:block" />

            <button
              onClick={() => setActiveTab('factory')}
              className={`relative flex items-center gap-2 py-2 px-3 sm:px-4 rounded-lg transition-all ${
                activeTab === 'factory'
                  ? 'bg-gray-100 dark:bg-[#3a3a3a] text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/30'
              }`}
            >
              <span className="font-medium text-sm whitespace-nowrap">Ready To Order</span>
              {(hasSelectedMerchant || filteredUserId) && stats.awaitingFactoryOrder > 0 && (
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  activeTab === 'factory'
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white'
                    : 'bg-gray-200 dark:bg-[#4a4a4a] text-gray-600 dark:text-gray-300'
                }`}>
                  {stats.awaitingFactoryOrder}
                </span>
              )}
            </button>

            <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0 hidden sm:block" />

            <button
              onClick={() => setActiveTab('unfulfilled')}
              className={`relative flex items-center gap-2 py-2 px-3 sm:px-4 rounded-lg transition-all ${
                activeTab === 'unfulfilled'
                  ? 'bg-gray-100 dark:bg-[#3a3a3a] text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/30'
              }`}
            >
              <span className="font-medium text-sm whitespace-nowrap">Ready To Export</span>
              {(hasSelectedMerchant || filteredUserId) && stats.readyToExport > 0 && (
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  activeTab === 'unfulfilled'
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white'
                    : 'bg-gray-200 dark:bg-[#4a4a4a] text-gray-600 dark:text-gray-300'
                }`}>
                  {stats.readyToExport}
                </span>
              )}
            </button>

            <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0 hidden sm:block" />

            <button
              onClick={() => setActiveTab('tracking')}
              className={`relative flex items-center gap-2 py-2 px-3 sm:px-4 rounded-lg transition-all ${
                activeTab === 'tracking'
                  ? 'bg-gray-100 dark:bg-[#3a3a3a] text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/30'
              }`}
            >
              <span className="font-medium text-sm whitespace-nowrap">Needs Tracking</span>
              {(hasSelectedMerchant || filteredUserId) && stats.needsTrackingNotSynced > 0 && (
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  activeTab === 'tracking'
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white'
                    : 'bg-gray-200 dark:bg-[#4a4a4a] text-gray-600 dark:text-gray-300'
                }`}>
                  {stats.needsTrackingNotSynced}
                </span>
              )}
            </button>
          </div>
        </div>

        <div>
          {(isSuperAdmin || permissions?.can_view_all_merchants) && !hasSelectedMerchant && !filteredUserId ? (
            <div className="py-8">
              <div className="max-w-md mx-auto">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    Select a Merchant
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Choose a merchant to view their orders and invoices
                  </p>
                </div>

                <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a] overflow-hidden">
                  <div className="p-3 border-b border-gray-200 dark:border-[#3a3a3a]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={merchantSearchTerm}
                        onChange={(e) => setMerchantSearchTerm(e.target.value)}
                        placeholder="Search merchants..."
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
                      />
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {loadingMerchants ? (
                      <div className="flex justify-center py-8">
                        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleSelectMerchant(null)}
                          className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors"
                        >
                          <span className="text-gray-900 dark:text-white font-medium">All Merchants</span>
                        </button>

                        <div className="border-t border-gray-200 dark:border-[#3a3a3a]" />

                        {filteredMerchants.length === 0 ? (
                          <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                            No merchants found
                          </div>
                        ) : (
                          filteredMerchants.map((merchant) => (
                            <button
                              key={merchant.id}
                              onClick={() => handleSelectMerchant(merchant.id)}
                              className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-gray-900 dark:text-white truncate">{merchant.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  {merchant.orderCount} {merchant.orderCount === 1 ? 'order' : 'orders'} ready
                                </p>
                              </div>
                            </button>
                          ))
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'payments' && isSuperAdminLoaded && (
                <PendingPaymentsTab
                  filteredUserId={filteredUserId || undefined}
                  isSuperAdmin={isSuperAdmin}
                  permissions={permissions}
                  refreshKey={refreshKey}
                  searchTerm={searchTerm}
                  statusFilter={invoiceStatusFilter}
                  adminFilter={adminFilter}
                  onRefresh={handleRefreshAll}
                />
              )}
              {activeTab === 'payments' && !isSuperAdminLoaded && (
                <div className="p-8 text-center">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto" />
                </div>
              )}
          {activeTab === 'factory' && (
            <OrderFromFactoryTab
              filteredUserId={filteredUserId || undefined}
              isSuperAdmin={isSuperAdmin}
              permissions={permissions}
              refreshKey={refreshKey}
              searchTerm={searchTerm}
              adminFilter={adminFilter}
              onRefresh={handleRefreshAll}
            />
          )}
          {activeTab === 'unfulfilled' && (
            <UnfulfilledOrdersTab
              filteredUserId={filteredUserId || undefined}
              isSuperAdmin={isSuperAdmin}
              permissions={permissions}
              onExport={() => setShowExportModal(true)}
              refreshKey={refreshKey}
              searchTerm={searchTerm}
              selectedOrders={selectedOrders}
              onSelectedOrdersChange={setSelectedOrders}
              onRefresh={handleRefreshAll}
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
              onImport={() => setShowImportModal(true)}
              onRefresh={handleRefreshAll}
            />
          )}
            </>
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
