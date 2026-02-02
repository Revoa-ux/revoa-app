import React, { useState, useEffect } from 'react';
import { X, Package, Download, Upload, RefreshCw, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../Modal';
import Button from '../Button';
import { toast } from '../../lib/toast';

interface OrderPermissionsModalProps {
  adminId: string;
  adminName: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface Permissions {
  can_export_orders: boolean;
  can_import_tracking: boolean;
  can_sync_to_shopify: boolean;
  can_view_all_merchants: boolean;
}

export default function OrderPermissionsModal({
  adminId,
  adminName,
  onClose,
  onSuccess
}: OrderPermissionsModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState<Permissions>({
    can_export_orders: false,
    can_import_tracking: false,
    can_sync_to_shopify: true,
    can_view_all_merchants: false,
  });

  useEffect(() => {
    loadPermissions();
  }, [adminId]);

  const loadPermissions = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('order_operation_permissions')
        .select('*')
        .eq('admin_id', adminId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPermissions({
          can_export_orders: data.can_export_orders,
          can_import_tracking: data.can_import_tracking,
          can_sync_to_shopify: data.can_sync_to_shopify,
          can_view_all_merchants: data.can_view_all_merchants,
        });
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setSaving(true);

    try {
      // Check if record exists
      const { data: existing } = await supabase
        .from('order_operation_permissions')
        .select('id')
        .eq('admin_id', adminId)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('order_operation_permissions')
          .update({
            ...permissions,
            updated_at: new Date().toISOString(),
          })
          .eq('admin_id', adminId);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('order_operation_permissions')
          .insert({
            admin_id: adminId,
            ...permissions,
            created_by_super_admin_id: user.id,
          });

        if (error) throw error;
      }

      toast.success('Permissions updated successfully');
      onSuccess();
    } catch (error: any) {
      console.error('Error saving permissions:', error);
      toast.error(error.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (key: keyof Permissions) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (loading) {
    return (
      <Modal onClose={onClose} size="md">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">Loading permissions...</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} size="md">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Order Operation Permissions
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Set permissions for {adminName}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="space-y-4 mb-6">
        {/* Export Orders Permission */}
        <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-dark rounded-lg">
          <div className="flex-shrink-0 mt-1">
            <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Export Orders to Mabang
              </h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.can_export_orders}
                  onChange={() => togglePermission('can_export_orders')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-[#3a3a3a] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-[#4a4a4a] peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Allow this admin to export unfulfilled orders to Mabang 3PL in Excel format
            </p>
          </div>
        </div>

        {/* Import Tracking Permission */}
        <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-dark rounded-lg">
          <div className="flex-shrink-0 mt-1">
            <Upload className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Import Tracking from Mabang
              </h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.can_import_tracking}
                  onChange={() => togglePermission('can_import_tracking')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-[#3a3a3a] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-[#4a4a4a] peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Allow this admin to import tracking numbers from Mabang Excel/CSV files
            </p>
          </div>
        </div>

        {/* Sync to Shopify Permission */}
        <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-dark rounded-lg">
          <div className="flex-shrink-0 mt-1">
            <RefreshCw className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Sync Fulfillments to Shopify
              </h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.can_sync_to_shopify}
                  onChange={() => togglePermission('can_sync_to_shopify')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-[#3a3a3a] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-[#4a4a4a] peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Allow this admin to manually sync tracking numbers back to Shopify stores
            </p>
          </div>
        </div>

        {/* View All Merchants Permission */}
        <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-dark rounded-lg">
          <div className="flex-shrink-0 mt-1">
            <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                View All Merchants
              </h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.can_view_all_merchants}
                  onChange={() => togglePermission('can_view_all_merchants')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-[#3a3a3a] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-[#4a4a4a] peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Allow this admin to view orders from all merchants (not just assigned ones)
            </p>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-xs text-blue-800 dark:text-blue-200">
          <strong>Note:</strong> Super admins automatically have all permissions enabled regardless of these settings.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onClose}
          disabled={saving}
          className="btn btn-secondary flex-1"
        >
          Cancel
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary flex-1"
        >
          <Package className="btn-icon" />
          {saving ? 'Saving...' : 'Save Permissions'}
        </button>
      </div>
    </Modal>
  );
}
