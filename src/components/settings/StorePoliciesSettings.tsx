import { useState, useEffect } from 'react';
import { DollarSign, Percent, Package, MapPin, Phone, Save, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface StoreConfig {
  restocking_fee_type: 'none' | 'percentage' | 'fixed';
  restocking_fee_percent: number;
  restocking_fee_fixed: number;
  return_warehouse_address: string;
  carrier_name: string;
  carrier_phone_number: string;
}

export function StorePoliciesSettings({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<StoreConfig>({
    restocking_fee_type: 'none',
    restocking_fee_percent: 0,
    restocking_fee_fixed: 0,
    return_warehouse_address: '',
    carrier_name: '',
    carrier_phone_number: ''
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
        setConfig({
          restocking_fee_type: data.restocking_fee_type || 'none',
          restocking_fee_percent: data.restocking_fee_percent || 0,
          restocking_fee_fixed: data.restocking_fee_fixed || 0,
          return_warehouse_address: data.return_warehouse_address || '',
          carrier_name: data.carrier_name || '',
          carrier_phone_number: data.carrier_phone_number || ''
        });
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

      toast.success('Store policies saved successfully');
    } catch (error) {
      console.error('Error saving store config:', error);
      toast.error('Failed to save store configuration');
    } finally {
      setSaving(false);
    }
  };

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
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
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
                  flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all
                  ${config.restocking_fee_type === 'none'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                <Package className="w-4 h-4" />
                <span className="text-sm font-medium">None</span>
              </button>

              <button
                onClick={() => setConfig({ ...config, restocking_fee_type: 'percentage' })}
                className={`
                  flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all
                  ${config.restocking_fee_type === 'percentage'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                <Percent className="w-4 h-4" />
                <span className="text-sm font-medium">Percentage</span>
              </button>

              <button
                onClick={() => setConfig({ ...config, restocking_fee_type: 'fixed' })}
                className={`
                  flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all
                  ${config.restocking_fee_type === 'fixed'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
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
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
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
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="25.00"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Enter the dollar amount to charge
              </p>
            </div>
          )}

          {/* Preview */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Email Preview</p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  In your emails, <code className="bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded">{'{{restocking_fee}}'}</code> will display as: <span className="font-semibold">{getRestockingFeePreview()}</span>
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              placeholder="5130 E. Santa Ana Street, Ontario, CA 91761"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            This address will be included in return instructions sent to customers
          </p>
        </div>

        {/* Carrier Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Carrier Name
            </label>
            <input
              type="text"
              value={config.carrier_name}
              onChange={(e) => setConfig({ ...config, carrier_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              placeholder="YunExpress, USPS, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Carrier Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                value={config.carrier_phone_number}
                onChange={(e) => setConfig({ ...config, carrier_phone_number: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="1-800-123-4567"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={saveConfig}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Policies
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
