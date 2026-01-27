import React, { useState } from 'react';
import { X, Building2, Truck, FileText, Check, AlertCircle, Loader2 } from 'lucide-react';
import Modal from '@/components/Modal';
import { toast } from '../../lib/toast';
import { supabase } from '@/lib/supabase';

interface ProductConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  userId: string;
  onComplete: () => void;
}

interface FactoryConfig {
  factoryName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  notes: string;
}

interface LogisticsConfig {
  providerName: string;
  contactEmail: string;
  contactPhone: string;
  coversLost: boolean;
  coversDamaged: boolean;
  coversLate: boolean;
  deliveryDays: string;
  notes: string;
}

interface PolicyVariable {
  key: string;
  value: string;
  category: string;
  label: string;
  placeholder?: string;
}

const DEFAULT_POLICY_VARIABLES: PolicyVariable[] = [
  { key: 'defect_coverage_days', value: '30', category: 'warranty', label: 'Defect Coverage (days)', placeholder: '30' },
  { key: 'return_window_days', value: '30', category: 'returns', label: 'Return Window (days)', placeholder: '30' },
  { key: 'replacement_ship_time_days', value: '7-10', category: 'shipping', label: 'Replacement Ship Time', placeholder: '7-10 days' },
  { key: 'damage_claim_deadline_days', value: '14', category: 'quality', label: 'Damage Claim Deadline (days)', placeholder: '14' },
  { key: 'restocking_fee_amount', value: '0', category: 'fees', label: 'Restocking Fee ($)', placeholder: '0' },
  { key: 'customer_pays_return_shipping', value: 'yes', category: 'returns', label: 'Customer Pays Return Shipping?', placeholder: 'yes/no' },
  { key: 'return_warehouse_address', value: '', category: 'returns', label: 'Return Warehouse Address', placeholder: 'Enter warehouse address' },
];

export function ProductConfigurationModal({
  isOpen,
  onClose,
  productId,
  productName,
  userId,
  onComplete,
}: ProductConfigurationModalProps) {
  const [activeTab, setActiveTab] = useState<'factory' | 'logistics' | 'policies'>('factory');
  const [isSaving, setIsSaving] = useState(false);

  const [factoryConfig, setFactoryConfig] = useState<FactoryConfig>({
    factoryName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    notes: '',
  });

  const [logisticsConfig, setLogisticsConfig] = useState<LogisticsConfig>({
    providerName: 'YunExpress',
    contactEmail: '',
    contactPhone: '',
    coversLost: false,
    coversDamaged: false,
    coversLate: false,
    deliveryDays: '7-14 days',
    notes: '',
  });

  const [policyVariables, setPolicyVariables] = useState<PolicyVariable[]>(DEFAULT_POLICY_VARIABLES);

  const canProceed = factoryConfig.factoryName.trim().length > 0;

  const handleSave = async () => {
    if (!canProceed) {
      toast.error('Factory name is required');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Save factory config
      const { error: factoryError } = await supabase
        .from('product_factory_configs')
        .upsert({
          product_id: productId,
          user_id: userId,
          factory_name: factoryConfig.factoryName,
          contact_name: factoryConfig.contactName || null,
          contact_email: factoryConfig.contactEmail || null,
          contact_phone: factoryConfig.contactPhone || null,
          address: factoryConfig.address || null,
          notes: factoryConfig.notes || null,
          created_by_admin_id: user.id,
        }, {
          onConflict: 'product_id'
        });

      if (factoryError) throw factoryError;

      // Save logistics config
      const { error: logisticsError } = await supabase
        .from('product_logistics_configs')
        .upsert({
          product_id: productId,
          user_id: userId,
          provider_name: logisticsConfig.providerName,
          contact_email: logisticsConfig.contactEmail || null,
          contact_phone: logisticsConfig.contactPhone || null,
          covers_lost_items: logisticsConfig.coversLost,
          covers_damaged_items: logisticsConfig.coversDamaged,
          covers_late_delivery: logisticsConfig.coversLate,
          typical_delivery_days: logisticsConfig.deliveryDays,
          notes: logisticsConfig.notes || null,
          created_by_admin_id: user.id,
        }, {
          onConflict: 'product_id'
        });

      if (logisticsError) throw logisticsError;

      // Save policy variables (delete existing and insert new)
      const { error: deleteError } = await supabase
        .from('product_policy_variables')
        .delete()
        .eq('product_id', productId);

      if (deleteError) throw deleteError;

      const variablesToInsert = policyVariables
        .filter(v => v.value.trim().length > 0)
        .map(v => ({
          product_id: productId,
          user_id: userId,
          variable_key: v.key,
          variable_value: v.value,
          variable_category: v.category,
          created_by_admin_id: user.id,
        }));

      if (variablesToInsert.length > 0) {
        const { error: variablesError } = await supabase
          .from('product_policy_variables')
          .insert(variablesToInsert);

        if (variablesError) throw variablesError;
      }

      toast.success('Product configuration saved successfully');

      // Now generate templates
      await generateTemplates();

      onComplete();
      onClose();
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const generateTemplates = async () => {
    try {
      // This will call a service to generate all the starter templates
      // We'll implement this in the next step
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-email-templates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: productId,
          user_id: userId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate templates');
      }

      const result = await response.json();
      toast.success(`${result.count || 15} email templates generated`);
    } catch (error) {
      console.error('Error generating templates:', error);
      // Don't fail the whole operation if template generation fails
      toast.warning('Configuration saved, but template generation failed. You can generate them later.');
    }
  };

  const handleClose = () => {
    if (!canProceed) {
      if (confirm('Product configuration is required. Are you sure you want to skip? Templates won\'t work until this is configured.')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="" maxWidth="max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-[#3a3a3a] pb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Configure Product
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {productName}
          </p>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span className="text-amber-600 dark:text-amber-400">
              Required before sending quote to merchant
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-[#3a3a3a]">
          <button
            onClick={() => setActiveTab('factory')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'factory'
                ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span className="font-medium">Factory Partner</span>
            {factoryConfig.factoryName && (
              <Check className="w-4 h-4 text-green-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('logistics')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'logistics'
                ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span className="font-medium">Logistics</span>
            {logisticsConfig.providerName && (
              <Check className="w-4 h-4 text-green-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('policies')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'policies'
                ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="font-medium">Policy Variables</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'factory' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Factory Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={factoryConfig.factoryName}
                  onChange={(e) => setFactoryConfig({ ...factoryConfig, factoryName: e.target.value })}
                  placeholder="e.g., ABC Manufacturing Co."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg focus:ring-2 focus:ring-rose-500 dark:bg-dark dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={factoryConfig.contactName}
                    onChange={(e) => setFactoryConfig({ ...factoryConfig, contactName: e.target.value })}
                    placeholder="John Smith"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg focus:ring-2 focus:ring-rose-500 dark:bg-dark dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={factoryConfig.contactEmail}
                    onChange={(e) => setFactoryConfig({ ...factoryConfig, contactEmail: e.target.value })}
                    placeholder="contact@factory.com"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg focus:ring-2 focus:ring-rose-500 dark:bg-dark dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={factoryConfig.contactPhone}
                  onChange={(e) => setFactoryConfig({ ...factoryConfig, contactPhone: e.target.value })}
                  placeholder="+86 123 4567 8900"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg focus:ring-2 focus:ring-rose-500 dark:bg-dark dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Factory Address
                </label>
                <textarea
                  value={factoryConfig.address}
                  onChange={(e) => setFactoryConfig({ ...factoryConfig, address: e.target.value })}
                  placeholder="123 Industrial Road, Guangzhou, China"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg focus:ring-2 focus:ring-rose-500 dark:bg-dark dark:text-white resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (Internal)
                </label>
                <textarea
                  value={factoryConfig.notes}
                  onChange={(e) => setFactoryConfig({ ...factoryConfig, notes: e.target.value })}
                  placeholder="Any internal notes about this factory..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg focus:ring-2 focus:ring-rose-500 dark:bg-dark dark:text-white resize-none"
                />
              </div>
            </div>
          )}

          {activeTab === 'logistics' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Logistics Provider <span className="text-red-500">*</span>
                </label>
                <select
                  value={logisticsConfig.providerName}
                  onChange={(e) => setLogisticsConfig({ ...logisticsConfig, providerName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg focus:ring-2 focus:ring-rose-500 dark:bg-dark dark:text-white"
                >
                  <option value="YunExpress">YunExpress</option>
                  <option value="FedEx International">FedEx International</option>
                  <option value="DHL Express">DHL Express</option>
                  <option value="UPS Worldwide">UPS Worldwide</option>
                  <option value="China Post">China Post</option>
                  <option value="SF Express">SF Express</option>
                  <option value="Custom">Custom (Enter Manually)</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  This is the freight forwarder we work with. Last-mile carriers (USPS, Australia Post, etc.) are handled separately and are out of our control.
                </p>
              </div>

              {logisticsConfig.providerName === 'Custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Custom Provider Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter provider name"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg focus:ring-2 focus:ring-rose-500 dark:bg-dark dark:text-white"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={logisticsConfig.contactEmail}
                    onChange={(e) => setLogisticsConfig({ ...logisticsConfig, contactEmail: e.target.value })}
                    placeholder="logistics@provider.com"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg focus:ring-2 focus:ring-rose-500 dark:bg-dark dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={logisticsConfig.contactPhone}
                    onChange={(e) => setLogisticsConfig({ ...logisticsConfig, contactPhone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg focus:ring-2 focus:ring-rose-500 dark:bg-dark dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Typical Delivery Time
                </label>
                <input
                  type="text"
                  value={logisticsConfig.deliveryDays}
                  onChange={(e) => setLogisticsConfig({ ...logisticsConfig, deliveryDays: e.target.value })}
                  placeholder="7-14 days"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg focus:ring-2 focus:ring-rose-500 dark:bg-dark dark:text-white"
                />
              </div>

              <div className="border border-gray-200 dark:border-[#3a3a3a] rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Coverage (What the freight forwarder covers)
                </h4>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={logisticsConfig.coversLost}
                    onChange={(e) => setLogisticsConfig({ ...logisticsConfig, coversLost: e.target.checked })}
                    className="w-5 h-5 text-rose-600 border-gray-300 rounded focus:ring-rose-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Covers Lost Items
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Provider compensates if package is lost during transit
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={logisticsConfig.coversDamaged}
                    onChange={(e) => setLogisticsConfig({ ...logisticsConfig, coversDamaged: e.target.checked })}
                    className="w-5 h-5 text-rose-600 border-gray-300 rounded focus:ring-rose-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Covers Damaged Items
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Provider compensates if items arrive damaged
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={logisticsConfig.coversLate}
                    onChange={(e) => setLogisticsConfig({ ...logisticsConfig, coversLate: e.target.checked })}
                    className="w-5 h-5 text-rose-600 border-gray-300 rounded focus:ring-rose-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Covers Late Delivery
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Provider compensates for significant delays
                    </p>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (Internal)
                </label>
                <textarea
                  value={logisticsConfig.notes}
                  onChange={(e) => setLogisticsConfig({ ...logisticsConfig, notes: e.target.value })}
                  placeholder="Any internal notes about logistics..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg focus:ring-2 focus:ring-rose-500 dark:bg-dark dark:text-white resize-none"
                />
              </div>
            </div>
          )}

          {activeTab === 'policies' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                These variables will be used in email templates. You can edit them later.
              </p>

              {policyVariables.map((variable, index) => (
                <div key={variable.key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {variable.label}
                  </label>
                  {variable.key === 'return_warehouse_address' ? (
                    <textarea
                      value={variable.value}
                      onChange={(e) => {
                        const updated = [...policyVariables];
                        updated[index].value = e.target.value;
                        setPolicyVariables(updated);
                      }}
                      placeholder={variable.placeholder}
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg focus:ring-2 focus:ring-rose-500 dark:bg-dark dark:text-white resize-none"
                    />
                  ) : (
                    <input
                      type="text"
                      value={variable.value}
                      onChange={(e) => {
                        const updated = [...policyVariables];
                        updated[index].value = e.target.value;
                        setPolicyVariables(updated);
                      }}
                      placeholder={variable.placeholder}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg focus:ring-2 focus:ring-rose-500 dark:bg-dark dark:text-white"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-[#3a3a3a]/50 px-6 py-4 -mx-6 -mb-6">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canProceed || isSaving}
            className="px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving & Generating Templates...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save & Continue
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
