import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, Download, Upload, RefreshCw, Filter, X, TrendingUp, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import GlassCard from '../../components/GlassCard';
import Button from '../../components/Button';
import { toast } from 'sonner';
import UnfulfilledOrdersTab from '../../components/orders/UnfulfilledOrdersTab';
import FulfillmentTrackingTab from '../../components/orders/FulfillmentTrackingTab';
import AllOrdersTab from '../../components/orders/AllOrdersTab';
import ExportToMabangModal from '../../components/orders/ExportToMabangModal';
import ImportTrackingModal from '../../components/orders/ImportTrackingModal';
import MerchantFilterDropdown from '../../components/orders/MerchantFilterDropdown';

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
  const [refreshKey, setRefreshKey] = useState(0);

  const filteredUserId = searchParams.get('userId');

  useEffect(() => {
    if (user?.id) {
      loadPermissions();
      loadStats();
      checkSuperAdmin();
    }
  }, [user?.id, filteredUserId]);

  useEffect(() => {
    if (filteredUserId) {
      loadMerchantName(filteredUserId);
    } else {
      setFilteredMerchantName('');
    }
  }, [filteredUserId]);

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
      .select('first_name, last_name, business_name')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      const name = data.business_name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Unknown Merchant';
      setFilteredMerchantName(name);
    }
  };

  const loadStats = async () => {
    if (!user?.id) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Build query based on permissions
      let query = supabase.from('shopify_orders').select('*', { count: 'exact', head: false });

      // Filter by merchant if specified
      if (filteredUserId) {
        query = query.eq('user_id', filteredUserId);
      } else if (!isSuperAdmin) {
        // Regular admins see only assigned merchants
        const { data: assignments } = await supabase
          .from('user_assignments')
          .select('user_id')
          .eq('admin_id', user.id);

        if (assignments && assignments.length > 0) {
          const merchantIds = assignments.map(a => a.user_id);
          query = query.in('user_id', merchantIds);
        } else {
          // No assignments, show no orders
          setStats({
            readyToExport: 0,
            exportedAwaitingTracking: 0,
            trackingImportedToday: 0,
            autoSyncedToday: 0,
          });
          return;
        }
      }

      // Ready to export: unfulfilled, not exported, paid, not cancelled
      const { count: readyToExport } = await query
        .eq('fulfillment_status', 'UNFULFILLED')
        .eq('exported_to_3pl', false)
        .in('financial_status', ['PAID', 'AUTHORIZED'])
        .is('cancelled_at', null);

      // Exported awaiting tracking
      const { count: exportedAwaitingTracking } = await query
        .eq('exported_to_3pl', true)
        .eq('tracking_imported', false);

      // Tracking imported today
      const { count: trackingImportedToday } = await query
        .eq('tracking_imported', true)
        .gte('tracking_imported_at', today.toISOString());

      // Auto-synced today
      const { count: autoSyncedToday } = await query
        .gte('last_synced_to_shopify_at', today.toISOString());

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

  const handleManualSync = async () => {
    if (!permissions?.can_sync_to_shopify) {
      toast.error('You do not have permission to sync to Shopify');
      return;
    }

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('shopify-sync-fulfillments', {
        body: { userId: filteredUserId || undefined }
      });

      if (error) throw error;

      toast.success(`Synced ${data.synced || 0} fulfillments to Shopify`);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Order Fulfillment Management
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Export to Mabang 3PL, import tracking, and sync to Shopify
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Merchant Filter */}
          {(isSuperAdmin || permissions?.can_view_all_merchants) && (
            <MerchantFilterDropdown
              currentUserId={filteredUserId}
              onSelectMerchant={(userId) => {
                if (userId) {
                  searchParams.set('userId', userId);
                } else {
                  searchParams.delete('userId');
                }
                setSearchParams(searchParams);
              }}
            />
          )}

          {/* Action Buttons */}
          {permissions?.can_export_orders && (
            <Button
              onClick={() => setShowExportModal(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              <Download className="w-4 h-4 mr-2" />
              Export to Mabang
            </Button>
          )}

          {permissions?.can_import_tracking && (
            <Button
              onClick={() => setShowImportModal(true)}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Tracking
            </Button>
          )}

          {permissions?.can_sync_to_shopify && (
            <Button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync to Shopify'}
            </Button>
          )}
        </div>
      </div>

      {/* Merchant Filter Badge */}
      {filteredUserId && filteredMerchantName && (
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Filtering by: {filteredMerchantName}
            </span>
            <button
              onClick={clearMerchantFilter}
              className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Ready to Export</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats.readyToExport}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${stats.readyToExport > 10 ? 'bg-red-100 dark:bg-red-900/20' : 'bg-blue-100 dark:bg-blue-900/20'}`}>
              <TrendingUp className={`w-6 h-6 ${stats.readyToExport > 10 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`} />
            </div>
          </div>
          {stats.readyToExport > 10 && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-medium">
              High volume - export soon!
            </p>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Awaiting Tracking</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats.exportedAwaitingTracking}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${stats.exportedAwaitingTracking > 5 ? 'bg-orange-100 dark:bg-orange-900/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
              <Clock className={`w-6 h-6 ${stats.exportedAwaitingTracking > 5 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'}`} />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Tracking Imported Today</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats.trackingImportedToday}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/20">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Auto-Synced Today</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats.autoSyncedToday}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/20">
              <RefreshCw className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Tabs */}
      <GlassCard>
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('unfulfilled')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'unfulfilled'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Unfulfilled Orders
              {stats.readyToExport > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-full">
                  {stats.readyToExport}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('tracking')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'tracking'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Fulfillment Tracking
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'all'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              All Orders
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'unfulfilled' && (
            <UnfulfilledOrdersTab
              filteredUserId={filteredUserId || undefined}
              isSuperAdmin={isSuperAdmin}
              permissions={permissions}
              onExport={() => setShowExportModal(true)}
              refreshKey={refreshKey}
            />
          )}
          {activeTab === 'tracking' && (
            <FulfillmentTrackingTab
              filteredUserId={filteredUserId || undefined}
              isSuperAdmin={isSuperAdmin}
              permissions={permissions}
              refreshKey={refreshKey}
            />
          )}
          {activeTab === 'all' && (
            <AllOrdersTab
              filteredUserId={filteredUserId || undefined}
              isSuperAdmin={isSuperAdmin}
              permissions={permissions}
              refreshKey={refreshKey}
            />
          )}
        </div>
      </GlassCard>

      {/* Modals */}
      {showExportModal && (
        <ExportToMabangModal
          filteredUserId={filteredUserId || undefined}
          onClose={() => setShowExportModal(false)}
          onSuccess={() => {
            setShowExportModal(false);
            loadStats();
            setRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {showImportModal && (
        <ImportTrackingModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            loadStats();
            setRefreshKey(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
}
