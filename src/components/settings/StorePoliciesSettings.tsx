import { useState, useEffect } from 'react';
import { DollarSign, Percent, X, MapPin, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '../../lib/toast';

interface StoreConfig {
  restocking_fee_type: 'none' | 'percentage' | 'fixed';
  restocking_fee_percent: number;
  restocking_fee_fixed: number;
  return_warehouse_address: string;
}

export function StorePoliciesSettings({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<StoreConfig>({
    restocking_fee_type: 'none',
    restocking_fee_percent: 0,
    restocking_fee_fixed: 0,
    return_warehouse_address: ''
  });
  const [originalConfig, setOriginalConfig] = useState<StoreConfig>({
    restocking_fee_type: 'none',
    restocking_fee_percent: 0,
    restocking_fee_fixed: 0,
    return_warehouse_address: ''
  });

  useEffect(() => {
    loadConfig();
  }, [userId]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_store_configurations')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const configData = {
          restocking_fee_type: data.restocking_fee_type || 'none',
          restocking_fee_percent: data.restocking_fee_percent || 0,
          restocking_fee_fixed: data.restocking_fee_fixed || 0,
          return_warehouse_address: data.return_warehouse_address || '43100 Christy St., Fremont CA 94538 US'
        };
        setConfig(configData);
        setOriginalConfig(configData);
      } else {
        const defaultConfig = {
          restocking_fee_type: 'none' as const,
          restocking_fee_percent: 0,
          restocking_fee_fixed: 0,
          return_warehouse_address: '43100 Christy St., Fremont CA 94538 US'
        };
        setConfig(defaultConfig);
        setOriginalConfig(defaultConfig);
      }
    } catch (error) {
      console.error('Error loading store config:', error);
      toast.error('Failed to load store configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('user_store_configurations')
        .upsert({
          user_id: userId,
          ...config
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setOriginalConfig(config);
      toast.success('Store policies saved successfully');
    } catch (error) {
      console.error('Error saving store config:', error);
      toast.error('Failed to save store configuration');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    config.restocking_fee_type !== originalConfig.restocking_fee_type ||
    config.restocking_fee_percent !== originalConfig.restocking_fee_percent ||
    config.restocking_fee_fixed !== originalConfig.restocking_fee_fixed ||
    config.return_warehouse_address !== originalConfig.return_warehouse_address;

  const getRestockingFeePreview = () => {
    if (config.restocking_fee_type === 'percentage' && config.restocking_fee_percent > 0) {
      return `${config.restocking_fee_percent}%`;
    } else if (config.restocking_fee_type === 'fixed' && config.restocking_fee_fixed > 0) {
      return `$${Number(config.restocking_fee_fixed).toFixed(2)}`;
    }
    return 'no restocking fee';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-rose-600" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1f1f1f] rounded-xl border border-gray-200 dark:border-[#333333]">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-[#333333]">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Store Policies</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Configure your return policies and fees used in email templates
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Restocking Fee Section */}
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Restocking Fee</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Configure the fee charged for returns when customers change their mind
              </p>
            </div>
          </div>

          {/* Fee Type Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Fee Type</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setConfig({ ...config, restocking_fee_type: 'none' })}
                className={`
                  flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all
                  ${config.restocking_fee_type === 'none'
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300'
                    : 'border-gray-200 dark:border-[#333333] hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                <X className="w-4 h-4" />
                <span className="text-sm font-medium">None</span>
              </button>

              <button
                onClick={() => setConfig({ ...config, restocking_fee_type: 'percentage' })}
                className={`
                  flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all
                  ${config.restocking_fee_type === 'percentage'
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300'
                    : 'border-gray-200 dark:border-[#333333] hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                <Percent className="w-4 h-4" />
                <span className="text-sm font-medium">Percentage</span>
              </button>

              <button
                onClick={() => setConfig({ ...config, restocking_fee_type: 'fixed' })}
                className={`
                  flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all
                  ${config.restocking_fee_type === 'fixed'
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300'
                    : 'border-gray-200 dark:border-[#333333] hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                <DollarSign className="w-4 h-4" />
                <span className="text-sm font-medium">Fixed Amount</span>
              </button>
            </div>
          </div>

          {/* Fee Amount Input */}
          {config.restocking_fee_type === 'percentage' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Percentage (%)
              </label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={config.restocking_fee_percent}
                  onChange={(e) => setConfig({ ...config, restocking_fee_percent: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500"
                  placeholder="15"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Enter a value between 0-100
              </p>
            </div>
          )}

          {config.restocking_fee_type === 'fixed' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fixed Amount ($)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={config.restocking_fee_fixed}
                  onChange={(e) => setConfig({ ...config, restocking_fee_fixed: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500"
                  placeholder="25.00"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Enter the dollar amount to charge
              </p>
            </div>
          )}

          {/* Preview */}
          <div className="info-banner info-banner-red p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-rose-900 dark:text-rose-100">Email Preview</p>
                <p className="text-sm text-rose-700 dark:text-rose-300 mt-1">
                  In your emails, <code className="bg-rose-100 dark:bg-rose-800/40 px-1.5 py-0.5 rounded">{'{{restocking_fee}}'}</code> will display as: <span className="font-semibold">{getRestockingFeePreview()}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Return Warehouse Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Return Warehouse Address
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <textarea
              value={config.return_warehouse_address}
              onChange={(e) => setConfig({ ...config, return_warehouse_address: e.target.value })}
              rows={3}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500"
              placeholder="43100 Christy St., Fremont CA 94538 US"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            This address will be included in return instructions sent to customers
          </p>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-[#333333]">
          <button
            onClick={saveConfig}
            disabled={saving || !hasChanges}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="btn-icon w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Save Changes
                <ArrowRight className="btn-icon btn-icon-arrow" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
